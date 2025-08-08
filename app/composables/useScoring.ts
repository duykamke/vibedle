export interface CalculatePointsInput {
  clueIndex: number
  totalClues: number
  elapsedMs: number
  clueDurationMs: number
  correctRankInRound: number // 0 for first correct, 1 for second, etc.
}

export interface UseScoringApi {
  calculatePoints: (input: CalculatePointsInput) => number
}

/**
 * Simple speed-based scoring composable.
 *
 * Rules:
 * - Earlier clues are worth more than later clues
 * - Faster answers inside a clue window get more points
 * - Small bonus for early correct answers in a round
 */
export function useScoring(): UseScoringApi {
  function calculatePoints(input: CalculatePointsInput): number {
    const { clueIndex, totalClues, elapsedMs, clueDurationMs, correctRankInRound } = input

    // Safety guards
    const safeTotalClues = Math.max(1, totalClues)
    const safeClueIndex = Math.min(Math.max(0, clueIndex), safeTotalClues - 1)
    const safeElapsed = Math.max(0, elapsedMs)
    const safeDuration = Math.max(1, clueDurationMs)

    // Clue weight: first clue ~ 1.0, last clue ~ 0.2
    const clueWeight = 0.2 + 0.8 * (1 - safeClueIndex / (safeTotalClues - 1 || 1))

    // Time factor inside the clue: between 0.2 and 1.0
    const timeProgress = Math.min(1, safeElapsed / safeDuration)
    const timeFactor = Math.max(0.2, 1 - timeProgress)

    // Base points scaled by clue and time
    const baseMax = 120 // soft cap per clue
    const basePoints = Math.round(baseMax * clueWeight * timeFactor)

    // Early-correct bonus: 15, 10, 5, then 0
    const bonusByRank = [15, 10, 5]
    const rankBonus = bonusByRank[Math.min(correctRankInRound, bonusByRank.length - 1)] || 0

    const total = basePoints + rankBonus
    return Math.max(5, total)
  }

  return { calculatePoints }
}



