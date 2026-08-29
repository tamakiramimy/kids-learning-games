import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getNextNode, getNode, getWorld, type GameModule } from '../config/gameContent'

export type { GameModule } from '../config/gameContent'

export type ActiveGameModule = GameModule | null
export type GameScreen = 'map' | 'playing' | 'reward'

export interface WorldProgress {
  unlockedNodeCount: number
  completedNodeIds: string[]
  correctAnswers: number
  wrongAnswers: number
  recentResults: boolean[]
}

export interface RewardSummary {
  worldName: string
  nodeTitle: string
  starsEarned: number
  fragmentsEarned: number
  nextUnlockedTitle?: string
  worldComplete: boolean
}

interface GameState {
  currentScreen: GameScreen
  currentModule: ActiveGameModule
  currentNodeId: string | null
  difficulty: number
  score: number
  combo: number
  maxCombo: number
  nodeCorrect: number
  nodeAttempts: number
  totalCorrect: number
  totalWrong: number
  stars: number
  companionFragments: Record<GameModule, number>
  progress: Record<GameModule, WorldProgress>
  lastReward: RewardSummary | null
  isMuted: boolean
  volume: number

  setScreen: (screen: GameScreen) => void
  setModule: (mod: ActiveGameModule) => void
  setDifficulty: (level: number) => void
  startNode: (module: GameModule, nodeId: string) => void
  addCorrect: () => void
  addWrong: () => void
  completeCurrentNode: () => void
  addStars: (amount: number) => void
  resetCombo: () => void
  resetScore: () => void
  setMuted: (muted: boolean) => void
  toggleMute: () => void
  setVolume: (v: number) => void
}

function createInitialProgress(): Record<GameModule, WorldProgress> {
  return {
    math: { unlockedNodeCount: 1, completedNodeIds: [], correctAnswers: 0, wrongAnswers: 0, recentResults: [] },
    comparison: { unlockedNodeCount: 1, completedNodeIds: [], correctAnswers: 0, wrongAnswers: 0, recentResults: [] },
    pinyin: { unlockedNodeCount: 1, completedNodeIds: [], correctAnswers: 0, wrongAnswers: 0, recentResults: [] },
  }
}

function appendResult(results: boolean[], isCorrect: boolean) {
  return [...results, isCorrect].slice(-5)
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentScreen: 'map',
      currentModule: null,
      currentNodeId: null,
      difficulty: 1,
      score: 0,
      combo: 0,
      maxCombo: 0,
      nodeCorrect: 0,
      nodeAttempts: 0,
      totalCorrect: 0,
      totalWrong: 0,
      stars: 0,
      companionFragments: { math: 0, comparison: 0, pinyin: 0 },
      progress: createInitialProgress(),
      lastReward: null,
      isMuted: true,
      volume: 1,

      setScreen: (screen) => set({ currentScreen: screen }),
      setModule: (mod) => set({ currentModule: mod }),
      setDifficulty: (level) => set({ difficulty: level }),
      startNode: (module, nodeId) => {
        const node = getNode(module, nodeId)
        const moduleProgress = get().progress[module]
        if (!node || node.order > moduleProgress.unlockedNodeCount) return

        set({
          currentScreen: 'playing',
          currentModule: module,
          currentNodeId: nodeId,
          difficulty: node.level,
          score: 0,
          combo: 0,
          nodeCorrect: 0,
          nodeAttempts: 0,
          lastReward: null,
        })
      },
      addCorrect: () => set((state) => {
        if (!state.currentModule) return {}
        const newCombo = state.combo + 1
        const moduleProgress = state.progress[state.currentModule]
        return {
          score: state.score + 10 + newCombo * 2,
          combo: newCombo,
          maxCombo: Math.max(state.maxCombo, newCombo),
          nodeCorrect: state.nodeCorrect + 1,
          nodeAttempts: state.nodeAttempts + 1,
          totalCorrect: state.totalCorrect + 1,
          progress: {
            ...state.progress,
            [state.currentModule]: {
              ...moduleProgress,
              correctAnswers: moduleProgress.correctAnswers + 1,
              recentResults: appendResult(moduleProgress.recentResults, true),
            },
          },
        }
      }),
      addWrong: () => set((state) => {
        if (!state.currentModule) return {}
        const moduleProgress = state.progress[state.currentModule]
        return {
          combo: 0,
          nodeAttempts: state.nodeAttempts + 1,
          totalWrong: state.totalWrong + 1,
          progress: {
            ...state.progress,
            [state.currentModule]: {
              ...moduleProgress,
              wrongAnswers: moduleProgress.wrongAnswers + 1,
              recentResults: appendResult(moduleProgress.recentResults, false),
            },
          },
        }
      }),
      completeCurrentNode: () => {
        const state = get()
        if (!state.currentModule || !state.currentNodeId) return

        const world = getWorld(state.currentModule)
        const node = getNode(state.currentModule, state.currentNodeId)
        if (!node) return

        const moduleProgress = state.progress[state.currentModule]
        const isFirstCompletion = !moduleProgress.completedNodeIds.includes(node.id)
        const completedNodeIds = isFirstCompletion
          ? [...moduleProgress.completedNodeIds, node.id]
          : moduleProgress.completedNodeIds
        const nextNode = getNextNode(state.currentModule, node.id)
        const unlockedNodeCount = Math.min(
          world.nodes.length,
          Math.max(moduleProgress.unlockedNodeCount, node.order + 1),
        )
        const nextUnlockedTitle = nextNode && nextNode.order <= unlockedNodeCount
          ? nextNode.title
          : undefined
        const starsEarned = isFirstCompletion ? node.starReward : 0
        const fragmentsEarned = isFirstCompletion ? node.fragmentReward : 0

        set({
          currentScreen: 'reward',
          stars: state.stars + starsEarned,
          companionFragments: {
            ...state.companionFragments,
            [state.currentModule]: state.companionFragments[state.currentModule] + fragmentsEarned,
          },
          progress: {
            ...state.progress,
            [state.currentModule]: {
              ...moduleProgress,
              unlockedNodeCount,
              completedNodeIds,
            },
          },
          lastReward: {
            worldName: world.name,
            nodeTitle: node.title,
            starsEarned,
            fragmentsEarned,
            nextUnlockedTitle,
            worldComplete: completedNodeIds.length === world.nodes.length,
          },
        })
      },
      addStars: (amount) => set((state) => ({
        stars: state.stars + Math.max(0, amount),
      })),
      resetCombo: () => set({ combo: 0 }),
      resetScore: () => set({ score: 0, combo: 0, nodeCorrect: 0, nodeAttempts: 0 }),
      setMuted: (isMuted) => set({ isMuted }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
    }),
    {
      name: 'xingya-quest-progress-v1',
      partialize: (state) => ({
        maxCombo: state.maxCombo,
        totalCorrect: state.totalCorrect,
        totalWrong: state.totalWrong,
        stars: state.stars,
        companionFragments: state.companionFragments,
        progress: state.progress,
        isMuted: state.isMuted,
        volume: state.volume,
      }),
    },
  ),
)
