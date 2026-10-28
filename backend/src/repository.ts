import { query, run, transaction } from './db.ts'
import type { Availability, Candidate, Job, MatchResult } from './matching.ts'

/**
 * Every SQL statement the match endpoints use. Each candidate or job comes back in one query:
 * its labels are collected with a correlated subquery and json_group_array, so there is no N+1
 * and no string splitting. Labels come out in insertion order, which is the brief's order.
 */

export interface CandidateRecord extends Candidate {
  quirk: string | null
}

export interface JobRecord extends Job {
  tagline: string | null
}

interface CandidateRow {
  id: number
  name: string
  experience_years: number
  availability: Availability
  quirk: string | null
  skills: string
  traits: string
}

interface JobRow {
  id: number
  title: string
  min_experience: number
  tagline: string | null
  required_skills: string
  culture_keywords: string
}

const CANDIDATE_SQL = `
  SELECT c.id, c.name, c.experience_years, c.availability, c.quirk,
         (SELECT json_group_array(skill)
            FROM (SELECT skill FROM candidate_skills WHERE candidate_id = c.id ORDER BY rowid)) AS skills,
         (SELECT json_group_array(trait)
            FROM (SELECT trait FROM candidate_traits WHERE candidate_id = c.id ORDER BY rowid)) AS traits
    FROM candidates AS c`

const JOB_SQL = `
  SELECT j.id, j.title, j.min_experience, j.tagline,
         (SELECT json_group_array(skill)
            FROM (SELECT skill FROM job_required_skills WHERE job_id = j.id ORDER BY rowid)) AS required_skills,
         (SELECT json_group_array(keyword)
            FROM (SELECT keyword FROM job_culture_keywords WHERE job_id = j.id ORDER BY rowid)) AS culture_keywords
    FROM jobs AS j`

/** json_group_array always returns a JSON array of text labels. */
function parseLabels(json: string): string[] {
  // Cast: the SQL above only ever builds arrays of TEXT values.
  return JSON.parse(json) as string[]
}

function toCandidate(row: CandidateRow): CandidateRecord {
  return {
    id: row.id,
    name: row.name,
    experienceYears: row.experience_years,
    availability: row.availability,
    quirk: row.quirk,
    skills: parseLabels(row.skills),
    traits: parseLabels(row.traits),
  }
}

function toJob(row: JobRow): JobRecord {
  return {
    id: row.id,
    title: row.title,
    minExperience: row.min_experience,
    tagline: row.tagline,
    requiredSkills: parseLabels(row.required_skills),
    cultureKeywords: parseLabels(row.culture_keywords),
  }
}

export function findCandidate(id: number): CandidateRecord | undefined {
  const [row] = query<CandidateRow>(`${CANDIDATE_SQL} WHERE c.id = ?`, [id])
  return row && toCandidate(row)
}

export function findJob(id: number): JobRecord | undefined {
  const [row] = query<JobRow>(`${JOB_SQL} WHERE j.id = ?`, [id])
  return row && toJob(row)
}

export function listCandidates(): CandidateRecord[] {
  return query<CandidateRow>(`${CANDIDATE_SQL} ORDER BY c.id`).map(toCandidate)
}

export function listJobs(): JobRecord[] {
  return query<JobRow>(`${JOB_SQL} ORDER BY j.id`).map(toJob)
}

export interface StoredMatch extends MatchResult {
  candidateId: number
  jobId: number
}

/**
 * Replaces the stored matches for one side (a job's column or a candidate's row) with a fresh
 * ranking, in one transaction. Deleting first also removes pairs that no longer qualify, so the
 * table always agrees with what the endpoint last returned.
 */
export function saveMatches(side: { jobId: number } | { candidateId: number }, matches: readonly StoredMatch[]): void {
  transaction(() => {
    if ('jobId' in side) run('DELETE FROM matches WHERE job_id = ?', [side.jobId])
    else run('DELETE FROM matches WHERE candidate_id = ?', [side.candidateId])

    for (const match of matches) {
      run(
        `INSERT INTO matches (candidate_id, job_id, score, reason)
         VALUES (@candidateId, @jobId, @score, @reason)`,
        { candidateId: match.candidateId, jobId: match.jobId, score: match.score, reason: match.reason },
      )
    }
  })
}
