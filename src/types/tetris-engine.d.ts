declare module 'tetris-engine' {
  export interface TetrisCell {
    val: number
    cssClasses: Array<string | null>
  }

  export interface TetrisGameState {
    gameStatus: 0 | 1 | 2 | 3
    body: TetrisCell[][]
    shapeName: string | null
    nextShape: {
      name: string | null
      body: number[][] | null
    }
    statistic: {
      countShapesFalled: number
      countShapesFalledByType: Record<string, number>
      countLinesReduced: number
      countDoubleLinesReduced: number
      countTrippleLinesReduced: number
      countQuadrupleLinesReduced: number
    }
  }

  export class Engine {
    constructor(
      width?: number,
      height?: number,
      renderHandle?: (state: TetrisGameState) => void,
      defaultHeap?: number[][],
      additionalShapes?: Record<string, number[][]>,
    )
    readonly state: TetrisGameState
    start(): boolean | void
    pause(): boolean | void
    moveLeft(): void
    moveRight(): void
    moveUp(): void
    moveDown(): void
    rotate(): void
    rotateBack(): void
  }
}