import type { GameActivity } from '../config/gameContent'

export type PinyinActivity = Extract<GameActivity, 'listen' | 'picture'>

export interface PinyinQuestion {
  pinyin: string
  image: string
  options: string[]
  correctIndex: number
  activity: PinyinActivity
}

const PINYIN_DATA = [
  // Lv1: Single vowels
  { pinyin: 'a', image: '🅰️', level: 1 },
  { pinyin: 'o', image: '🅾️', level: 1 },
  { pinyin: 'e', image: '🐘', level: 1 },
  { pinyin: 'i', image: '👗', level: 1 },
  { pinyin: 'u', image: '🏠', level: 1 },
  { pinyin: 'ü', image: '🐟', level: 1 },
  // Lv2: b p m f
  { pinyin: 'b', image: '🌊', level: 2 },
  { pinyin: 'p', image: '🍎', level: 2 },
  { pinyin: 'm', image: '🚪', level: 2 },
  { pinyin: 'f', image: '🌸', level: 2 },
  // Lv3: d t n l
  { pinyin: 'd', image: '🥁', level: 3 },
  { pinyin: 't', image: '🌂', level: 3 },
  { pinyin: 'n', image: '👧', level: 3 },
  { pinyin: 'l', image: '🦌', level: 3 },
  // Lv4: g k h
  { pinyin: 'g', image: '🕊️', level: 4 },
  { pinyin: 'k', image: '🐛', level: 4 },
  { pinyin: 'h', image: '🐯', level: 4 },
  // Lv5: j q x
  { pinyin: 'j', image: '🐔', level: 5 },
  { pinyin: 'q', image: '🎈', level: 5 },
  { pinyin: 'x', image: '🍉', level: 5 },
  // Lv6: zh ch sh r z c s
  { pinyin: 'zh', image: '🕷️', level: 6 },
  { pinyin: 'ch', image: '🍚', level: 6 },
  { pinyin: 'sh', image: '🦁', level: 6 },
  { pinyin: 'r', image: '☀️', level: 6 },
  { pinyin: 'z', image: '🦓', level: 6 },
  { pinyin: 'c', image: '🌿', level: 6 },
  { pinyin: 's', image: '🐍', level: 6 },
  // Lv7: Compound vowels
  { pinyin: 'ai', image: '❤️', level: 7 },
  { pinyin: 'ei', image: '🐝', level: 7 },
  { pinyin: 'ui', image: '💧', level: 7 },
  { pinyin: 'ao', image: '🐱', level: 7 },
  { pinyin: 'ou', image: '🐦', level: 7 },
  { pinyin: 'iu', image: '⚽', level: 7 },
]

export class PinyinGenerator {
  generate(level: number, activity: PinyinActivity = 'listen'): PinyinQuestion {
    const pool = PINYIN_DATA.filter((p) => p.level <= level)
    const candidates = pool.length > 0 ? pool : PINYIN_DATA
    const correct = candidates[Math.floor(Math.random() * candidates.length)]

    const wrongPool = candidates.filter((p) => p.pinyin !== correct.pinyin)
    const wrongs = this.shuffle(wrongPool).slice(0, 3).map((p) => p.pinyin)

    const options = this.shuffle([correct.pinyin, ...wrongs])
    const correctIndex = options.indexOf(correct.pinyin)

    return {
      pinyin: correct.pinyin,
      image: correct.image,
      options,
      correctIndex,
      activity,
    }
  }

  getAllByLevel(level: number) {
    return PINYIN_DATA.filter((p) => p.level === level)
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
}

export const pinyinGenerator = new PinyinGenerator()