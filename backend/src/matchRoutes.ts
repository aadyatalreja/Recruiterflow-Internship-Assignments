import { Router, type Response } from 'express'
import { rankMatches, scoreMatch, type Availability } from './matching.ts'
import { findCandidate, findJob, listCandidates, listJobs, saveMatches } from './repository.ts'

/** Availability in the brief's wording; the database stores the code. */
const AVAILABILITY_TEXT: Record<Availability, string> = {
  immediate: 'Immediate',
  two_weeks: '2 weeks',
  not_looking: 'Not looking',
}

/** Ids are positive integers. Anything else ("abc", "1.5", "-1") is a bad request, not a miss. */
function parseId(raw: string, res: Response): number | undefined {
  if (/^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw))) return Number(raw)
  res.status(400).json({ error: `Invalid id "${raw}": expected a positive integer` })
  return undefined
}

export const matchRoutes = Router()

matchRoutes.get('/jobs/:id/matches', (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === undefined) return

  const job = findJob(id)
  if (!job) {
    res.status(404).json({ error: `Job ${id} not found` })
    return
  }

  const ranked = rankMatches(
    listCandidates().map((candidate) => ({ ...scoreMatch(candidate, job), tieBreakId: candidate.id, candidate })),
  )
  saveMatches(
    { jobId: job.id },
    ranked.map((m) => ({ ...m, candidateId: m.candidate.id, jobId: job.id })),
  )

  res.json({
    job: { id: job.id, title: job.title, minExperience: job.minExperience, tagline: job.tagline },
    matches: ranked.map((m, i) => ({
      rank: i + 1,
      candidate: {
        id: m.candidate.id,
        name: m.candidate.name,
        experienceYears: m.candidate.experienceYears,
        availability: AVAILABILITY_TEXT[m.candidate.availability],
      },
      score: m.score,
      reason: m.reason,
    })),
  })
})

matchRoutes.get('/candidates/:id/matches', (req, res) => {
  const id = parseId(req.params.id, res)
  if (id === undefined) return

  const candidate = findCandidate(id)
  if (!candidate) {
    res.status(404).json({ error: `Candidate ${id} not found` })
    return
  }

  const ranked = rankMatches(listJobs().map((job) => ({ ...scoreMatch(candidate, job), tieBreakId: job.id, job })))
  saveMatches(
    { candidateId: candidate.id },
    ranked.map((m) => ({ ...m, candidateId: candidate.id, jobId: m.job.id })),
  )

  res.json({
    candidate: {
      id: candidate.id,
      name: candidate.name,
      experienceYears: candidate.experienceYears,
      availability: AVAILABILITY_TEXT[candidate.availability],
      quirk: candidate.quirk,
    },
    matches: ranked.map((m, i) => ({
      rank: i + 1,
      job: { id: m.job.id, title: m.job.title, minExperience: m.job.minExperience, tagline: m.job.tagline },
      score: m.score,
      reason: m.reason,
    })),
  })
})
