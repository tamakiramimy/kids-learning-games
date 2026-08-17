import type { GameActivity } from '../config/gameContent'

export type MathActivity = Extract<GameActivity, 'count' | 'addition' | 'subtraction' | 'mixed'>

export interface MathQuestion {
  a: number
  b: number
  operator: '+' | '-' | '×' | '÷' | 'count'
  answer: number
  options: number[]
}

export class MathGenerator {
  generate(level: number, activity: MathActivity = this.getDefaultActivity(level)): MathQuestion {
    switch (activity) {
      case 'count':
        return this.genCount(Math.min(10, 3 + level * 2))
      case 'addition':
        return this.genAddition(1, Math.min(level * 5, 10), Math.min(level * 5, 12))
      case 'subtraction':
        return this.genSubtraction(1, Math.min(level * 5, 12))
      case 'mixed':
        return this.genMixed(1, Math.min(level * 5, 12))
    }
  }

  private getDefaultActivity(level: number): MathActivity {
    if (level === 1) return 'count'
    if (level === 2) return 'addition'
    if (level === 3) return 'subtraction'
    return 'mixed'
  }

  private genCount(max: number): MathQuestion {
    const count = this.rand(1, max)
    return { a: count, b: 0, operator: 'count', answer: count, options: this.generateOptions(count) }
  }

  private genAddition(min: number, max: number, maxSum: number): MathQuestion {
    let a: number, b: number
    do {
      a = this.rand(min, max)
      b = this.rand(min, max)
    } while (a + b > maxSum)
    const answer = a + b
    return { a, b, operator: '+', answer, options: this.generateOptions(answer) }
  }

  private genSubtraction(min: number, max: number): MathQuestion {
    let a: number, b: number
    do {
      a = this.rand(min + 1, max)
      b = this.rand(min, a)
    } while (a - b < 0)
    const answer = a - b
    return { a, b, operator: '-', answer, options: this.generateOptions(answer) }
  }

  private genMixed(min: number, max: number): MathQuestion {
    return Math.random() < 0.5
      ? this.genAddition(min, max, max)
      : this.genSubtraction(min, max)
  }

  private generateOptions(answer: number): number[] {
    const options = new Set<number>()
    options.add(answer)
    const offsets = this.shuffle([-3, -2, -1, 1, 2, 3])
    for (const offset of offsets) {
      const option = answer + offset
      if (option >= 0) options.add(option)
      if (options.size === 4) break
    }
    let fallback = Math.max(answer + 4, 4)
    while (options.size < 4) {
      options.add(fallback)
      fallback += 1
    }
    return this.shuffle([...options])
  }

  private rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
}

export const mathGenerator = new MathGenerator()