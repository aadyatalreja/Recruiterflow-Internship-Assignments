# Build-a-Recruiter-Bot

Recruiter Bot is a small backend that stores candidates and job openings and ranks the best
matches between them, so Sherlock finally gets his backend detective job. It's Node, Express and
TypeScript on top of SQLite (via better-sqlite3). Every query is SQL I wrote by hand; there's no
ORM or query builder anywhere.

## Install and run

You'll need Node 22.

```bash
cd backend
npm install
npm run db:init   # creates (or resets) the schema in recruiter-bot.sqlite
npm run db:seed   # loads the 15 candidates and 6 jobs
npm run dev       # starts the API on http://localhost:3000
```

`npm test` runs the matching unit tests and the API tests against a fresh in-memory database, and
`npm run typecheck` checks the types.

## Schema

The DDL is in [`sql/schema.sql`](sql/schema.sql) and the seed data is in [`sql/seed.sql`](sql/seed.sql).

| Table | Holds |
|---|---|
| `candidates` | name, years of experience, availability, quirk |
| `candidate_skills`, `candidate_traits` | one row per skill / trait of a candidate |
| `jobs` | title, minimum experience, tagline |
| `job_required_skills`, `job_culture_keywords` | one row per required skill / keyword of a job |
| `matches` | one scored candidate–job pair: its score (0–100) and the reason |

**Each skill gets its own row.** A candidate has several skills, so instead of cramming them into
one comma-separated column I gave them a child table with one row per skill. That way matching
compares exact labels rather than splitting strings and using `LIKE`, "who has skill X" is a quick
indexed lookup, and the primary key `(candidate_id, skill)` stops the same skill being listed twice.
Traits, required skills and culture keywords work the same way.

I did think about a separate `skills` table with join tables pointing at skill ids. I went with
plain labels because a skill here doesn't have anything else attached to it (no category, no
synonyms), so a lookup table would add a join to every query without adding any information. The
risk with plain labels is drift ("Research" vs "research"), so a `CHECK` makes every label lowercase
and trimmed, and the seed spells them exactly as the brief does (`pattern-recognition`). If skills
ever needed synonyms or categories, switching to a `skills` table would be a contained change.

A few other choices:
- **Availability is a fixed code** (`immediate`, `two_weeks`, `not_looking`) enforced by a `CHECK`,
  so the matching code can rely on exact values. The API turns it back into the brief's wording.
- **`matches` is a real table, not a view**, so every scored pair keeps its reason and can be
  queried with SQL later. Its primary key `(candidate_id, job_id)` doubles as the unique constraint.
- **The database protects itself.** Foreign keys are on, deleting a candidate or job cascades to
  its labels and matches, `STRICT` tables reject values of the wrong type, and `CHECK`s keep
  experience non-negative and scores between 0 and 100.
- **Seeding can be run again safely.** Ids are fixed (so `/jobs/1` is always Backend Detective),
  every table is emptied first, and it all happens in one transaction.

## The matching algorithm

The scoring lives in [`src/matching.ts`](src/matching.ts) as pure functions: a candidate and a job
go in, a score and a reason come out. There's no SQL in there, so every rule can be unit-tested
with plain objects.

```
score = 100 × (0.60·skill + 0.25·experience + 0.10·culture + 0.05·availability)
```

Each part is a number between 0 and 1 and the weights add up to 1, so a perfect match scores 100.

- **Skill coverage (0.60):** the share of the job's required skills the candidate has. Skills are
  the most direct evidence that someone can actually do the job, so they outweigh everything else
  put together. On every seeded job, one extra required skill is worth at least 20 points, more
  than culture and availability can add between them (15).
- **Experience fit (0.25):** 1 if the candidate meets the job's minimum, otherwise years ÷ minimum.
  Experience is the brief's other hard requirement, but I treat the minimum as a threshold rather
  than a ladder. A 20-year veteran shouldn't bury a well-matched 4-year candidate, and someone just
  short (2 of 4 years = 0.5) should still show up for a recruiter instead of scoring zero.
- **Culture fit (0.10):** the share of the job's culture keywords that match the candidate's traits.
  A one-word trait says much less than a skill, so culture can separate close candidates but never
  rescue a weak one.
- **Availability (0.05):** immediate 1.0, 2 weeks 0.6, not looking 0.2. It's about timing, not
  ability, so it only settles near ties. "Not looking" isn't zero, because people who aren't
  actively looking can still be approached.

**Ties** go to skill coverage, then experience, then availability, then the lower id, so the order
never changes between requests. Scores are rounded to one decimal place. **A candidate with none
of a job's required skills is left out entirely.** Experience and availability alone could still
give them up to 40 points, and every list would fill up with people who can't do the job. Quirks are
returned for fun but never scored.

**Trade-offs.** Because availability is worth so little, Tony (not looking) just beats Rick
(available now) for Rapid Prototyping Engineer, 91 to 90. They tie on skills and experience, and
Tony's "innovative" trait is worth 5 points against Rick's 4-point availability lead. I'm fine with
that: I'd rather rank on fit and let the recruiter decide whether to reach out, but a team hiring
urgently would want a bigger availability weight. Skill matching is exact, so `calm` doesn't count
towards `calm-under-pressure`, and related skills earn nothing; synonyms would need a skills table.
Every required skill also counts the same, and extra experience is never rewarded, so the model
can't express "must have X, nice to have Y" or prefer seniority. Those are the first things I'd add
with real hiring data.

## API

Ids follow the seed order: candidates 1–15 (1 is Sherlock H.) and jobs 1–6 (1 is Backend Detective).

| Request | Returns |
|---|---|
| `GET /jobs/:id/matches` | the job, and the candidates ranked for it |
| `GET /candidates/:id/matches` | the candidate, and the jobs ranked for them |
| `GET /health` | `{"status":"ok","db":true}` |

An id that isn't a positive integer returns `400`, and one that doesn't exist returns `404`. Both
come back as `{"error": "..."}`.

**Best candidates for a job:**

```bash
curl http://localhost:3000/jobs/1/matches
```

```json
{
  "job": { "id": 1, "title": "Backend Detective", "minExperience": 3,
           "tagline": "We have a bug. We have no leads. We have you." },
  "matches": [
    { "rank": 1,
      "candidate": { "id": 1, "name": "Sherlock H.", "experienceYears": 8, "availability": "Immediate" },
      "score": 95,
      "reason": "3/3 skills (deduction, pattern-recognition, forensics); 8y ≥ 3y required; culture fit: analytical; available immediately" },
    { "rank": 2,
      "candidate": { "id": 9, "name": "Sheldon C.", "experienceYears": 9, "availability": "Immediate" },
      "score": 50,
      "reason": "1/3 skills (pattern-recognition); 9y ≥ 3y required; available immediately" }
  ]
}
```

**Best jobs for a candidate:**

```bash
curl http://localhost:3000/candidates/12/matches
```

```json
{
  "candidate": { "id": 12, "name": "Olivia P.", "experienceYears": 13, "availability": "2 weeks",
                 "quirk": "Handles it. Whatever it is." },
  "matches": [
    { "rank": 1,
      "job": { "id": 5, "title": "Incident Commander", "minExperience": 4,
               "tagline": "3am page. You're the one who picks up." },
      "score": 93,
      "reason": "3/3 skills (crisis-management, strategy, negotiation); 13y ≥ 4y required; culture fit: decisive; available in 2 weeks" },
    { "rank": 2,
      "job": { "id": 4, "title": "Engineering Manager, Chaos Team", "minExperience": 5,
               "tagline": "Herd cats. The cats are senior engineers." },
      "score": 48,
      "reason": "1/3 skills (leadership); 13y ≥ 5y required; available in 2 weeks" },
    { "rank": 3,
      "job": { "id": 6, "title": "Sales Engineer", "minExperience": 3,
               "tagline": "Sell the vision, then go build it." },
      "score": 48,
      "reason": "1/3 skills (negotiation); 13y ≥ 3y required; available in 2 weeks" }
  ]
}
```

**Errors:**

```bash
curl http://localhost:3000/jobs/42/matches    # 404 {"error":"Job 42 not found"}
curl http://localhost:3000/jobs/abc/matches   # 400 {"error":"Invalid id \"abc\": expected a positive integer"}
```

**What happens on a request.** The route loads the job (or candidate) and every candidate (or job)
using the SQL in [`src/repository.ts`](src/repository.ts). Each row comes back with its labels
already attached, gathered by `json_group_array` in a subquery, so it's one query instead of one
per candidate. The pairs are then scored with `scoreMatch`, ranked with `rankMatches`, and returned.

**Matches are worked out on every request, then saved.** Scoring all 15 × 6 pairs takes well under
a millisecond, and computing fresh means the result can never be stale after the data changes. The
ranking is also written to `matches`: that job's (or candidate's) rows are deleted and re-inserted
in one transaction, so the table always holds what was last returned, and repeating a request just
writes the same rows again. With a lot more data I'd turn this around: score whenever a candidate
or job changes, and have the endpoints read `matches` through its `(job_id, score DESC)` index.

## Part 2: SQL Detective

[`sql_detective.sql`](sql_detective.sql) stands on its own, separate from the Recruiter Bot
database. It creates the hiring-ops tables and inserts the data exactly as given, then answers each
question with one query, with a comment above it giving the question number. It's standard SQL that
runs on SQLite. After `npm install`, this runs it in a throwaway in-memory database and prints each
answer as a table:

```bash
npm run detective
```

If you have the `sqlite3` command-line tool, `sqlite3 -header -column :memory: < sql_detective.sql`
does the same thing, and any SQLite GUI (such as DB Browser for SQLite) can run the file as it is.

| Q | Answer |
|---|---|
| 1. Open postings and their recruiter | 1 Backend Engineer I (Priya Shah), 2 Backend Engineer I (Daniel Ortiz), 4 Backend Engineer II (Priya Shah), 5 DevOps Engineer (Wei Zhang) |
| 2. Applicants who reached Final, per posting | postings 1, 2, 4 and 7: 2 each; posting 3: 1; postings 5 and 6: 0 |
| 3. People who applied to more than one posting | Ananya Rao (1 and 4), Ben Turner (1 and 3), Elena Popescu (2 and 7) |
| 4. Final-stage conversion, recruiters with ≥ 3 Finals | Priya Shah 3/4 = 0.75, Daniel Ortiz 2/4 = 0.50 |
| 5. Top recruiter by placements, per department | Engineering: Priya Shah (3); Data: Fatima Al-Sayed (1) |

The parts that were easy to get wrong:
- **Q2 has to include postings with no Finals.** The `stage = 'Final'` condition sits in the
  `LEFT JOIN`'s `ON` clause. Putting it in `WHERE` would quietly turn it back into an inner join
  and drop postings 5 and 6.
- **Q3's trap is a duplicate person.** Ananya Rao appears twice in `applicants`, once as
  `ananya.rao@mail.com` and once as `Ananya.Rao@mail.com`. Counted by applicant id she looks like two
  people with one posting each and gets missed; grouping by `LOWER(email)` makes her one person with
  two. `applicants` has no job column, so which postings someone applied to comes from `interviews`.
- **Q4 avoids integer division.** It multiplies by `1.0` before dividing, otherwise SQLite would
  return 3/4 as 0. Fatima Al-Sayed has only one Final, so `HAVING COUNT(*) >= 3` leaves her out.
- **Q5 uses `RANK()` rather than `ROW_NUMBER()`,** so a tie for the top spot returns both recruiters
  instead of picking one at random. Infrastructure has no placements, so it has no winner.
- **I left two oddities as they are.** Ben Turner's Final for posting 3 has no earlier rounds, but it
  is still a real Final, so it counts. Postings 1, 2 and 7 share the title "Backend Engineer I" but
  are separate postings, so they're counted separately.

## Where I used AI tools

I used an AI assistant as a pair programmer throughout this project. I'd explain what a piece
should do and the trade-off I wanted (one row per skill, the scoring weights, leaving out
candidates with no matching skills, how to handle the duplicate applicant in Q3), and use it to
help draft the code and talk through alternatives. I then reviewed every change, ran the tests and
the API myself, and checked each SQL answer by hand against the data, so I can explain any line
and why it's there.
