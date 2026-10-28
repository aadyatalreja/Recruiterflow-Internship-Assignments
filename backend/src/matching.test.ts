import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  compareMatches,
  experienceFit,
  rankMatches,
  scoreMatch,
  WEIGHTS,
  type Candidate,
  type Job,
} from './matching.ts'

const sherlock: Candidate = {
  id: 1,
  name: 'Sherlock H.',
  experienceYears: 8,
  availability: 'immediate',
  skills: ['deduction', 'pattern-recognition', 'forensics'],
  traits: ['analytical', 'blunt'],
}

const backendDetective: Job = {
  id: 1,
  title: 'Backend Detective',
  minExperience: 3,
  requiredSkills: ['deduction', 'pattern-recognition', 'forensics'],
  cultureKeywords: ['analytical', 'autonomous'],
}

function candidate(overrides: Partial<Candidate>): Candidate {
  return { ...sherlock, ...overrides }
}

describe('weights', () => {
  it('sum to 1, so a perfect match scores exactly 100', () => {
    const total = WEIGHTS.skill + WEIGHTS.experience + WEIGHTS.culture + WEIGHTS.availability
    assert.equal(Math.round(total * 1000), 1000)
    const perfect = candidate({ traits: ['analytical', 'autonomous'] })
    assert.equal(scoreMatch(perfect, backendDetective).score, 100)
  })
})

describe('scoreMatch', () => {
  it('scores Sherlock for Backend Detective: all skills, over the bar, half the culture', () => {
    const result = scoreMatch(sherlock, backendDetective)
    // 60 + 25 + 10 × 0.5 + 5 = 95
    assert.equal(result.score, 95)
    assert.equal(
      result.reason,
      '3/3 skills (deduction, pattern-recognition, forensics); 8y ≥ 3y required; culture fit: analytical; available immediately',
    )
  })

  it('gives skill coverage as a share of the job’s required skills', () => {
    const result = scoreMatch(candidate({ skills: ['deduction', 'cooking'] }), backendDetective)
    assert.equal(result.components.skill, 1 / 3)
    assert.match(result.reason, /^1\/3 skills \(deduction\);/)
  })

  it('ignores extra skills the job does not ask for', () => {
    const extra = candidate({ skills: [...sherlock.skills, 'chemistry', 'violin'] })
    assert.equal(scoreMatch(extra, backendDetective).score, scoreMatch(sherlock, backendDetective).score)
  })

  it('reports zero skills without an empty list', () => {
    const result = scoreMatch(candidate({ skills: ['woodworking'] }), backendDetective)
    assert.equal(result.components.skill, 0)
    assert.match(result.reason, /^0\/3 skills;/)
  })

  it('gives partial experience credit below the minimum', () => {
    const junior = scoreMatch(candidate({ experienceYears: 2 }), { ...backendDetective, minExperience: 4 })
    assert.equal(junior.components.experience, 0.5)
    assert.match(junior.reason, /2y < 4y required/)
  })

  it('does not reward years beyond the minimum', () => {
    const veteran = scoreMatch(candidate({ experienceYears: 20 }), backendDetective)
    const justEnough = scoreMatch(candidate({ experienceYears: 3 }), backendDetective)
    assert.equal(veteran.score, justEnough.score)
  })

  it('uses the availability scale 1 / 0.6 / 0.2', () => {
    const at = (availability: Candidate['availability']) =>
      scoreMatch(candidate({ availability }), backendDetective).components.availability
    assert.deepEqual([at('immediate'), at('two_weeks'), at('not_looking')], [1, 0.6, 0.2])
    assert.match(scoreMatch(candidate({ availability: 'two_weeks' }), backendDetective).reason, /available in 2 weeks$/)
  })

  it('leaves culture out of the reason when nothing matches', () => {
    const result = scoreMatch(candidate({ traits: ['chaotic'] }), backendDetective)
    assert.equal(result.components.culture, 0)
    assert.doesNotMatch(result.reason, /culture/)
  })

  it('treats a job with no requirements as fully met rather than dividing by zero', () => {
    const open: Job = { ...backendDetective, minExperience: 0, requiredSkills: [], cultureKeywords: [] }
    const result = scoreMatch(candidate({ experienceYears: 0 }), open)
    assert.equal(result.score, 100)
  })

  it('rounds the score to one decimal place', () => {
    // 60 × 1/3 + 25 + 0 + 5 = 50
    assert.equal(scoreMatch(candidate({ skills: ['deduction'], traits: [] }), backendDetective).score, 50)
    // 60 × 2/3 + 25 × 2/3 + 0 + 5 = 61.666… → 61.7
    const result = scoreMatch(
      candidate({ skills: ['deduction', 'forensics'], traits: [], experienceYears: 2 }),
      backendDetective,
    )
    assert.equal(result.score, 61.7)
  })

  it('a skill match always outweighs every other component combined', () => {
    // One more required skill (of 3) is worth 20 points; culture + availability together max out at 15.
    const skilled = scoreMatch(
      candidate({ traits: [], availability: 'not_looking' }),
      backendDetective,
    )
    const charming = scoreMatch(
      candidate({ skills: ['deduction', 'pattern-recognition'], traits: ['analytical', 'autonomous'] }),
      backendDetective,
    )
    assert.ok(skilled.score > charming.score)
  })
})

describe('experienceFit', () => {
  it('is 1 at the minimum and when no minimum is set', () => {
    assert.equal(experienceFit(3, 3), 1)
    assert.equal(experienceFit(0, 0), 1)
  })
})

describe('compareMatches', () => {
  const ranked = (...rows: Array<[number, number, number, number, number]>) =>
    rows
      .map(([tieBreakId, score, skill, experience, availability]) => ({
        tieBreakId,
        score,
        reason: '',
        components: { skill, experience, culture: 0, availability },
      }))
      .sort(compareMatches)
      .map((row) => row.tieBreakId)

  it('orders by score, then skill, experience, availability, then id', () => {
    assert.deepEqual(
      ranked(
        [1, 80, 0.5, 1, 1],
        [2, 90, 0.5, 1, 1],
        [3, 80, 1, 0.5, 1], // same score as 1, more skill
        [4, 80, 0.5, 1, 0.2], // same as 1 except availability
        [5, 80, 0.5, 1, 1], // identical to 1: lower id wins
      ),
      [2, 3, 1, 5, 4],
    )
  })
})

describe('rankMatches', () => {
  const scored = (c: Candidate, job: Job = backendDetective) => ({ ...scoreMatch(c, job), tieBreakId: c.id })

  it('drops candidates with none of the required skills and ranks the rest', () => {
    const sheldon = candidate({ id: 9, skills: ['pattern-recognition'], traits: [] })
    const ron = candidate({ id: 5, skills: ['woodworking'], experienceYears: 15 })
    const ranked = rankMatches([scored(sheldon), scored(ron), scored(sherlock)])
    assert.deepEqual(ranked.map((m) => m.tieBreakId), [1, 9])
  })

  it('keeps everyone for a job that requires no skills', () => {
    const open: Job = { ...backendDetective, requiredSkills: [] }
    const ron = candidate({ id: 5, skills: ['woodworking'] })
    assert.equal(rankMatches([scored(ron, open)]).length, 1)
  })
})
