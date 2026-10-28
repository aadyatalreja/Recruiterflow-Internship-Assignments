/**
 * The matching model. Pure functions only: no database, no Express. The caller reads candidates
 * and jobs with SQL and passes them in, so every rule here can be unit-tested with plain objects.
 *
 *   score = 100 × (0.60·skill + 0.25·experience + 0.10·culture + 0.05·availability)
 *
 * Each component is between 0 and 1, and the weights sum to 1, so the score is between 0 and 100.
 */

export type Availability = 'immediate' | 'two_weeks' | 'not_looking'

export interface Candidate {
  id: number
  name: string
  experienceYears: number
  availability: Availability
  skills: readonly string[]
  traits: readonly string[]
}

export interface Job {
  id: number
  title: string
  minExperience: number
  requiredSkills: readonly string[]
  cultureKeywords: readonly string[]
}

/** Each part of the score, 0–1, before weighting. Kept so ties can be broken on them. */
export interface ScoreComponents {
  skill: number
  experience: number
  culture: number
  availability: number
}

export interface MatchResult {
  score: number
  reason: string
  components: ScoreComponents
}

export const WEIGHTS = {
  // Skills dominate: a candidate who can't do the job shouldn't win on anything else.
  skill: 0.6,
  // Experience is the second hard requirement in the brief, but below the bar earns partial credit.
  experience: 0.25,
  // Culture is a soft signal from one- or two-word labels: enough to separate close candidates.
  culture: 0.1,
  // Availability is about timing, not ability, so it can only ever decide a near tie.
  availability: 0.05,
} as const satisfies ScoreComponents

export const AVAILABILITY_SCORE = {
  immediate: 1,
  two_weeks: 0.6,
  // Not zero: someone not looking can still be approached, they're just less likely to move.
  not_looking: 0.2,
} as const satisfies Record<Availability, number>

const AVAILABILITY_LABEL: Record<Availability, string> = {
  immediate: 'available immediately',
  two_weeks: 'available in 2 weeks',
  not_looking: 'not looking',
}

/** The labels in `wanted` that also appear in `have`, in `wanted`'s order. */
function overlap(wanted: readonly string[], have: readonly string[]): string[] {
  const haveSet = new Set(have)
  return wanted.filter((label) => haveSet.has(label))
}

/**
 * Share of `wanted` that is covered. A job that asks for nothing has nothing unmet, so it counts
 * as full coverage rather than dividing by zero.
 */
function coverage(matched: number, wanted: number): number {
  return wanted === 0 ? 1 : matched / wanted
}

/** Full credit at or above the minimum; below it, years ÷ minimum. Capped at 1. */
export function experienceFit(candidateYears: number, minYears: number): number {
  if (candidateYears >= minYears) return 1
  return candidateYears / minYears
}

/** Rounds to one decimal place, which is as precise as the inputs justify. */
function roundScore(raw: number): number {
  return Math.round(raw * 10) / 10
}

export function scoreMatch(candidate: Candidate, job: Job): MatchResult {
  const matchedSkills = overlap(job.requiredSkills, candidate.skills)
  const matchedCulture = overlap(job.cultureKeywords, candidate.traits)

  const components: ScoreComponents = {
    skill: coverage(matchedSkills.length, job.requiredSkills.length),
    experience: experienceFit(candidate.experienceYears, job.minExperience),
    culture: coverage(matchedCulture.length, job.cultureKeywords.length),
    availability: AVAILABILITY_SCORE[candidate.availability],
  }

  const raw =
    WEIGHTS.skill * components.skill +
    WEIGHTS.experience * components.experience +
    WEIGHTS.culture * components.culture +
    WEIGHTS.availability * components.availability

  return { score: roundScore(100 * raw), reason: buildReason(candidate, job, matchedSkills, matchedCulture), components }
}

function buildReason(
  candidate: Candidate,
  job: Job,
  matchedSkills: readonly string[],
  matchedCulture: readonly string[],
): string {
  const skills = `${matchedSkills.length}/${job.requiredSkills.length} skills`
  const parts = [matchedSkills.length > 0 ? `${skills} (${matchedSkills.join(', ')})` : skills]

  const meetsBar = candidate.experienceYears >= job.minExperience
  parts.push(`${candidate.experienceYears}y ${meetsBar ? '≥' : '<'} ${job.minExperience}y required`)

  if (matchedCulture.length > 0) parts.push(`culture fit: ${matchedCulture.join(', ')}`)

  parts.push(AVAILABILITY_LABEL[candidate.availability])
  return parts.join('; ')
}

/**
 * Sort order for ranked matches: highest score first, then skill coverage, experience fit and
 * availability. The rounded score is compared first because that is what the user sees; the
 * components then decide between equal scores. A final comparison on `tieBreakId` (the other
 * side's id) keeps the order stable when everything else is equal.
 */
export function compareMatches(
  a: MatchResult & { tieBreakId: number },
  b: MatchResult & { tieBreakId: number },
): number {
  return (
    b.score - a.score ||
    b.components.skill - a.components.skill ||
    b.components.experience - a.components.experience ||
    b.components.availability - a.components.availability ||
    a.tieBreakId - b.tieBreakId
  )
}

/**
 * Turns scored pairs into a ranked list. Pairs with none of the job's required skills are left
 * out: they would still score up to 40 from experience and availability alone, which would put
 * people who can't do the job on the list. A job that requires no skills keeps everyone, since
 * its skill coverage is 1.
 */
export function rankMatches<T extends MatchResult & { tieBreakId: number }>(matches: readonly T[]): T[] {
  return matches.filter((match) => match.components.skill > 0).sort(compareMatches)
}
