import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'

// db.ts opens the database when it is imported, so point it at a fresh in-memory one first.
// node --test runs each test file in its own process, so this doesn't leak into other files.
process.env.DB_PATH = ':memory:'
const { exec, query } = await import('./db.ts')
const { createApp } = await import('./app.ts')

const sql = (file: string) => readFileSync(new URL(`../sql/${file}`, import.meta.url), 'utf8')
exec(sql('schema.sql'))
exec(sql('seed.sql'))

let baseUrl = ''
let close = () => {}

before(async () => {
  const server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  close = () => server.close()
})
after(() => close())

interface JobMatches {
  job: { title: string }
  matches: Array<{ rank: number; candidate: { name: string; availability: string }; score: number; reason: string }>
}

interface CandidateMatches {
  candidate: { name: string; availability: string }
  matches: Array<{ rank: number; job: { title: string }; score: number; reason: string }>
}

interface ErrorBody {
  error: string
}

async function get<T>(path: string): Promise<{ status: number; body: T }> {
  const res = await fetch(baseUrl + path)
  // Cast: each test states the response shape it expects; assertions then check the values.
  return { status: res.status, body: (await res.json()) as T }
}

describe('GET /jobs/:id/matches', () => {
  it('ranks candidates for Backend Detective, best first', async () => {
    const { status, body } = await get<JobMatches>('/jobs/1/matches')
    assert.equal(status, 200)
    assert.equal(body.job.title, 'Backend Detective')
    assert.deepEqual(
      body.matches.map((m) => [m.candidate.name, m.score]),
      [
        ['Sherlock H.', 95],
        ['Sheldon C.', 50],
      ],
    )
    const [top] = body.matches
    assert.ok(top)
    assert.equal(top.rank, 1)
    assert.equal(top.candidate.availability, 'Immediate')
    assert.match(top.reason, /^3\/3 skills/)
  })

  it('stores the ranking in the matches table', async () => {
    await get('/jobs/1/matches')
    const rows = query<{ candidate_id: number; score: number }>(
      'SELECT candidate_id, score FROM matches WHERE job_id = 1 ORDER BY score DESC',
    )
    assert.deepEqual(rows, [
      { candidate_id: 1, score: 95 },
      { candidate_id: 9, score: 50 },
    ])
  })

  it('returns 404 for a job that does not exist', async () => {
    const { status, body } = await get<ErrorBody>('/jobs/999/matches')
    assert.equal(status, 404)
    assert.equal(body.error, 'Job 999 not found')
  })

  it('returns 400 for an id that is not a positive integer', async () => {
    for (const bad of ['abc', '1.5', '-1', '0']) {
      assert.equal((await get(`/jobs/${bad}/matches`)).status, 400, bad)
    }
  })
})

describe('GET /candidates/:id/matches', () => {
  it('ranks jobs for Olivia, leaving out jobs where she has none of the skills', async () => {
    const { status, body } = await get<CandidateMatches>('/candidates/12/matches')
    assert.equal(status, 200)
    assert.equal(body.candidate.name, 'Olivia P.')
    assert.equal(body.candidate.availability, '2 weeks')
    const titles = body.matches.map((m) => m.job.title)
    assert.equal(titles[0], 'Incident Commander')
    assert.ok(!titles.includes('Backend Detective'))
  })

  it('returns 404 for a candidate that does not exist', async () => {
    const { status, body } = await get<ErrorBody>('/candidates/999/matches')
    assert.equal(status, 404)
    assert.equal(body.error, 'Candidate 999 not found')
  })
})
