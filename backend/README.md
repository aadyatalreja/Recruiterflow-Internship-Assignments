# Recruiter Bot

A small backend that stores candidates and job openings and ranks the best matches between them.
Node + Express + TypeScript, SQLite via better-sqlite3. Every query is hand-written SQL; there is no
ORM or query builder.

## Install and run

Requires Node 22.

```bash
cd backend
npm install
npm run db:init   # create (or reset) the schema in recruiter-bot.sqlite
npm run db:seed   # load the 15 candidates and 6 jobs
npm run dev       # http://localhost:3000
```

`npm test` runs the matching unit tests and API tests against a fresh in-memory database.
`npm run typecheck` checks the types.

## Schema

The DDL is in [`sql/schema.sql`](sql/schema.sql); the seed data is in [`sql/seed.sql`](sql/seed.sql).

| Table | Holds |
|---|---|
| `candidates` | name, years of experience, availability, quirk |
| `candidate_skills`, `candidate_traits` | one row per skill / trait of a candidate |
| `jobs` | title, minimum experience, tagline |
| `job_required_skills`, `job_culture_keywords` | one row per required skill / keyword of a job |
| `matches` | one scored candidate–job pair: score (0–100) and its reason |

**Skills and traits are their own rows.** A candidate has many skills, so they live in a child
table with one row per skill rather than a comma-separated column. Matching then compares sets of
exact labels instead of splitting and `LIKE`-matching strings, "who has skill X" is an indexed
lookup, and the primary key `(candidate_id, skill)` stops a skill being listed twice. Traits,
required skills and culture keywords work the same way.

I considered a separate `skills` table with join tables pointing at skill ids. I kept plain labels
because a skill here has no attributes of its own (no category, no synonyms), so a lookup table
would add a join to every query without adding information. The risk with labels is drift
("Research" vs "research"), so a `CHECK` requires every label to be lowercase and trimmed, and the
seed writes them hyphenated exactly as the brief does (`pattern-recognition`). If skills later
gained synonyms or categories, moving to a `skills` table would be a contained change.

Other choices:
- **Availability is a fixed code** (`immediate`, `two_weeks`, `not_looking`) enforced by a `CHECK`,
  so matching can rely on exact values. The API shows it in the brief's wording.
- **`matches` is a table, not a view**, so each scored pair keeps its reason and can be queried
  with SQL. Its primary key `(candidate_id, job_id)` doubles as the unique constraint.
- **The database guards itself:** foreign keys are on, deleting a candidate or job cascades to its
  labels and matches, `STRICT` tables reject wrongly typed values, and `CHECK`s keep experience
  non-negative and scores between 0 and 100.
- **Seeding is repeatable:** fixed ids (so `/jobs/1` is always Backend Detective), every table
  emptied first, all in one transaction.

## The matching algorithm

The model is in [`src/matching.ts`](src/matching.ts) as pure functions: a candidate and a job go in,
a score and a reason come out. No SQL lives there, so every rule is unit-tested with plain objects.

```
score = 100 × (0.60·skill + 0.25·experience + 0.10·culture + 0.05·availability)
```

Each component is between 0 and 1 and the weights sum to 1, so a perfect match scores 100.

- **Skill coverage, 0.60** — required skills the candidate has ÷ required skills. Skills are the
  most direct evidence someone can do the job, so they outweigh everything else combined: on every
  seeded job one more required skill is worth at least 20 points, more than culture and
  availability can add together (15).
- **Experience fit, 0.25** — 1 at or above the job's minimum, otherwise years ÷ minimum. Experience
  is the brief's other hard requirement, but a minimum is a threshold, not a ladder: a 20-year
  veteran shouldn't bury a well-matched 4-year candidate, and a near miss (2 of 4 years = 0.5)
  should still be shown to a recruiter rather than scored zero.
- **Culture fit, 0.10** — culture keywords matched by the candidate's traits ÷ keywords. One-word
  labels say much less than a skill, so culture can separate close candidates but never rescue a
  weak one.
- **Availability, 0.05** — immediate 1.0, 2 weeks 0.6, not looking 0.2. It is about timing, not
  ability, so it only decides near ties, and "not looking" isn't zero because people who aren't
  looking can still be approached.

**Ties** go to skill coverage, then experience fit, then availability, then the lower id, so the
order never changes between requests. Scores are rounded to one decimal place. **A candidate with
none of a job's required skills is left out**: experience and availability alone would still give
them up to 40, filling every list with people who can't do the job. Quirks are returned for colour
but never scored.

**Trade-offs.** Because availability is worth so little, Tony (not looking) edges out Rick
(available now) for Rapid Prototyping Engineer, 91 to 90: they tie on skills and experience, and
Tony's "innovative" trait is worth 5 points against Rick's 4-point availability lead. That's
deliberate, since I'd rather rank on fit and let the recruiter decide whether to approach someone,
but a team hiring urgently would raise the availability weight. Skill matching is exact, so
`calm` doesn't count towards `calm-under-pressure` and related skills earn nothing; synonyms would
need a skills table. Every required skill weighs the same, and extra experience is never rewarded,
so the model can't express "must have X, nice to have Y" or prefer seniority. Those are the first
things I'd add with real hiring data.

## API

Ids follow the seed order: candidates 1–15 (1 = Sherlock H.), jobs 1–6 (1 = Backend Detective).

| Request | Returns |
|---|---|
| `GET /jobs/:id/matches` | the job, and candidates ranked for it |
| `GET /candidates/:id/matches` | the candidate, and jobs ranked for them |
| `GET /health` | `{"status":"ok","db":true}` |

An id that isn't a positive integer returns `400`; one that doesn't exist returns `404`. Both have
the body `{"error": "..."}`.

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

**How a request works.** The route loads the job (or candidate) and every candidate (or job) with
the hand-written SQL in [`src/repository.ts`](src/repository.ts). Each row comes back with its
labels already attached, collected by `json_group_array` in a subquery, so there's one query rather
than one per candidate. The pairs are scored with `scoreMatch`, ranked with `rankMatches`, and
returned.

**Matches are computed on every request, then stored.** Scoring 15 × 6 pairs takes well under a
millisecond, and computing fresh means a result can never be stale after the data changes. The
ranking is also written to `matches`: that job's (or candidate's) rows are deleted and re-inserted
in one transaction, so the table always holds what was last returned, and repeating a request just
writes the same rows. With much more data I'd flip this round: score when a candidate or job
changes, and have the endpoints read `matches` through its `(job_id, score DESC)` index.

## Part 2: SQL Detective

[`sql_detective.sql`](sql_detective.sql) is self-contained and separate from the Recruiter Bot
database. It creates the hiring-ops tables and inserts the data exactly as given, then answers
each question with one query, preceded by a comment with its number. It's standard SQL that runs
on SQLite. After `npm install`, this loads it into a throwaway in-memory database and prints each
answer as a table:

```bash
npm run detective
```

With the `sqlite3` command-line tool installed, `sqlite3 -header -column :memory: < sql_detective.sql`
does the same. Any SQLite GUI (e.g. DB Browser for SQLite) can also run the file as-is.

| Q | Answer |
|---|---|
| 1. Open postings and their recruiter | 1 Backend Engineer I (Priya Shah), 2 Backend Engineer I (Daniel Ortiz), 4 Backend Engineer II (Priya Shah), 5 DevOps Engineer (Wei Zhang) |
| 2. Applicants who reached Final, per posting | postings 1, 2, 4 and 7: 2 each; posting 3: 1; postings 5 and 6: 0 |
| 3. People who applied to more than one posting | Ananya Rao (1 and 4), Ben Turner (1 and 3), Elena Popescu (2 and 7) |
| 4. Final-stage conversion, recruiters with ≥ 3 Finals | Priya Shah 3/4 = 0.75, Daniel Ortiz 2/4 = 0.50 |
| 5. Top recruiter by placements, per department | Engineering: Priya Shah (3); Data: Fatima Al-Sayed (1) |

What the queries have to get right:
- **Q2 lists postings with no Finals.** The `stage = 'Final'` condition is in the `LEFT JOIN`'s `ON`
  clause; in `WHERE` it would turn the join back into an inner join and drop postings 5 and 6.
- **Q3's trap is a duplicate person.** Ananya Rao appears twice in `applicants` with
  `ananya.rao@mail.com` and `Ananya.Rao@mail.com`. Counted by applicant id she looks like two people
  with one posting each, so she'd be missed; grouping by `LOWER(email)` makes her one person with
  two. `applicants` has no job column, so which postings someone applied to comes from `interviews`.
- **Q4 avoids integer division.** It multiplies by `1.0` before dividing, otherwise SQLite would
  return 3/4 as 0. Fatima Al-Sayed has only one Final, so `HAVING COUNT(*) >= 3` leaves her out.
- **Q5 uses `RANK()`, not `ROW_NUMBER()`,** so a tie for the top spot returns both recruiters
  instead of an arbitrary one. Infrastructure has no placements, so it has no winner.
- **Two quirks are kept as they are.** Ben Turner's Final for posting 3 has no earlier rounds there,
  but it is a real Final, so it counts. Postings 1, 2 and 7 share the title "Backend Engineer I"
  but are separate postings, so they're counted separately.

## Where I used AI tools