export type GameModule = 'math' | 'comparison' | 'pinyin'

export type GameActivity =
  | 'count'
  | 'addition'
  | 'subtraction'
  | 'mixed'
  | 'more'
  | 'less'
  | 'order'
  | 'listen'
  | 'picture'

export interface GameNode {
  id: string
  order: number
  title: string
  subtitle: string
  level: number
  activity: GameActivity
  questionsRequired: number
  starReward: number
  fragmentReward: number
}

export interface WorldDefinition {
  id: GameModule
  sceneKey: 'MathGardenScene' | 'ForestCompareScene' | 'SoundHarborScene'
  name: string
  shortName: string
  description: string
  companionName: string
  companionUnlockFragments: number
  primaryColor: number
  accentColor: number
  nodes: GameNode[]
}

export const WORLD_ORDER: GameModule[] = ['math', 'comparison', 'pinyin']

export const WORLDS: Record<GameModule, WorldDefinition> = {
  math: {
    id: 'math',
    sceneKey: 'MathGardenScene',
    name: '数字花园',
    shortName: '数',
    description: '数一数，帮花园收集星光果实',
    companionName: '豆豆兔',
    companionUnlockFragments: 4,
    primaryColor: 0x36a968,
    accentColor: 0xe8f8b6,
    nodes: [
      { id: 'math-1', order: 1, title: '果实数数', subtitle: '数一数有几个', level: 1, activity: 'count', questionsRequired: 6, starReward: 3, fragmentReward: 1 },
      { id: 'math-2', order: 2, title: '花朵相加', subtitle: '把两簇花合在一起', level: 1, activity: 'addition', questionsRequired: 7, starReward: 4, fragmentReward: 1 },
      { id: 'math-3', order: 3, title: '松果减法', subtitle: '数一数还剩几个', level: 2, activity: 'subtraction', questionsRequired: 8, starReward: 5, fragmentReward: 1 },
      { id: 'math-4', order: 4, title: '小径算术', subtitle: '加法和减法一起玩', level: 3, activity: 'mixed', questionsRequired: 9, starReward: 6, fragmentReward: 1 },
      { id: 'math-5', order: 5, title: '花园守护', subtitle: '完成数字花园的挑战', level: 4, activity: 'mixed', questionsRequired: 10, starReward: 8, fragmentReward: 2 },
    ],
  },
  comparison: {
    id: 'comparison',
    sceneKey: 'ForestCompareScene',
    name: '大小森林',
    shortName: '比',
    description: '帮助森林朋友找到更多的食物',
    companionName: '咚咚鳄',
    companionUnlockFragments: 4,
    primaryColor: 0x3f8de3,
    accentColor: 0xcfeeff,
    nodes: [
      { id: 'comparison-1', order: 1, title: '谁更多', subtitle: '选出更多的一边', level: 1, activity: 'more', questionsRequired: 6, starReward: 3, fragmentReward: 1 },
      { id: 'comparison-2', order: 2, title: '谁更少', subtitle: '找出更少的一边', level: 2, activity: 'less', questionsRequired: 7, starReward: 4, fragmentReward: 1 },
      { id: 'comparison-3', order: 3, title: '森林排队', subtitle: '从小到大排一排', level: 3, activity: 'order', questionsRequired: 8, starReward: 5, fragmentReward: 1 },
      { id: 'comparison-4', order: 4, title: '小河两岸', subtitle: '快速辨认更多和更少', level: 4, activity: 'more', questionsRequired: 9, starReward: 6, fragmentReward: 1 },
      { id: 'comparison-5', order: 5, title: '森林守护', subtitle: '完成大小森林的挑战', level: 5, activity: 'order', questionsRequired: 10, starReward: 8, fragmentReward: 2 },
    ],
  },
  pinyin: {
    id: 'pinyin',
    sceneKey: 'SoundHarborScene',
    name: '声音云港',
    shortName: '音',
    description: '听一听，找到藏在云朵里的声音',
    companionName: '朵朵鸟',
    companionUnlockFragments: 4,
    primaryColor: 0xd7567f,
    accentColor: 0xffd8e3,
    nodes: [
      { id: 'pinyin-1', order: 1, title: '元音云朵', subtitle: '听音找韵母', level: 1, activity: 'listen', questionsRequired: 6, starReward: 3, fragmentReward: 1 },
      { id: 'pinyin-2', order: 2, title: '声母风铃', subtitle: '听音找声母', level: 2, activity: 'listen', questionsRequired: 7, starReward: 4, fragmentReward: 1 },
      { id: 'pinyin-3', order: 3, title: '声音邮局', subtitle: '看图配对声音', level: 3, activity: 'picture', questionsRequired: 8, starReward: 5, fragmentReward: 1 },
      { id: 'pinyin-4', order: 4, title: '云端回声', subtitle: '听一听，再找一找', level: 5, activity: 'listen', questionsRequired: 9, starReward: 6, fragmentReward: 1 },
      { id: 'pinyin-5', order: 5, title: '云港守护', subtitle: '完成声音云港的挑战', level: 7, activity: 'picture', questionsRequired: 10, starReward: 8, fragmentReward: 2 },
    ],
  },
}

export function getWorld(module: GameModule) {
  return WORLDS[module]
}

export function getNode(module: GameModule, nodeId: string) {
  return getWorld(module).nodes.find((node) => node.id === nodeId)
}

export function getNextNode(module: GameModule, nodeId: string) {
  const node = getNode(module, nodeId)
  return node ? getWorld(module).nodes.find((candidate) => candidate.order === node.order + 1) : undefined
}

export function getNextPlayableNode(module: GameModule, completedNodeIds: string[]) {
  return getWorld(module).nodes.find((node) => !completedNodeIds.includes(node.id))
    ?? getWorld(module).nodes.at(-1)
}