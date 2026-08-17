import type { GameActivity } from '../config/gameContent'

export type ComparisonActivity = Extract<GameActivity, 'more' | 'less' | 'order'>

export interface ComparisonQuestion {
  left: number
  right: number
  answer: 'greater' | 'less'
  target: 'greater' | 'less'
  activity: ComparisonActivity
  prompt: string
  orderValues?: number[]
  leftLabel?: string
  rightLabel?: string
}

export class ComparisonGenerator {
  generate(level: number, activity: ComparisonActivity = 'more'): ComparisonQuestion {
    const max = level <= 2 ? 5 : level <= 3 ? 10 : 20
    const left = this.rand(1, max)
    const candidates = Array.from({ length: max }, (_value, index) => index + 1)
      .filter((value) => value !== left)
    const right = candidates[this.rand(0, candidates.length - 1)]
    const answer = left > right ? 'greater' : 'less'
    const target = activity === 'more' ? 'greater' : 'less'
    const prompt = activity === 'more'
      ? '哪边更多？'
      : activity === 'less'
        ? '哪边更少？'
        : '先找到最小的数字'

    return {
      left,
      right,
      answer,
      target,
      activity,
      prompt,
      orderValues: activity === 'order' ? this.generateOrderValues(max) : undefined,
    }
  }

  private generateOrderValues(max: number) {
    const values = new Set<number>()
    while (values.size < 3) values.add(this.rand(1, max))
    return [...values].sort(() => Math.random() - 0.5)
  }

  private rand(min: number, max: number): number {
    if (min > max) [min, max] = [max, min]
    if (min === max) return min
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}

export const comparisonGenerator = new ComparisonGenerator()