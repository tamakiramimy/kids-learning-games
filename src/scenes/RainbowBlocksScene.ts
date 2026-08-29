import Phaser from 'phaser'
import { Engine, type TetrisGameState } from 'tetris-engine'
import { GameAction, inputManager } from '../input/InputManager'
import { useGameStore } from '../store/gameStore'

const BLOCK_COLORS: Record<string, number> = {
  IShape: 0x52B6FF,
  JShape: 0x5474E9,
  LShape: 0xF49A45,
  OShape: 0xF7D857,
  SShape: 0x66C97B,
  TShape: 0xB27CE3,
  ZShape: 0xE86C78,
}

const BLOCK_NAMES: Record<string, string> = {
  IShape: '长条块',
  JShape: '蓝色钩钩块',
  LShape: '橙色钩钩块',
  OShape: '方方块',
  SShape: '彩虹 S 块',
  TShape: '小 T 块',
  ZShape: '闪电 Z 块',
}

export class RainbowBlocksScene extends Phaser.Scene {
  private readonly columns = 8
  private readonly rows = 14
  private readonly cellSize = 30
  private boardLeft = 0
  private boardTop = 0
  private engine!: Engine
  private engineState!: TetrisGameState
  private cells: Phaser.GameObjects.Rectangle[][] = []
  private cleanupInput: (() => void) | null = null
  private dropEvent!: Phaser.Time.TimerEvent
  private linesText!: Phaser.GameObjects.Text
  private nextText!: Phaser.GameObjects.Text
  private tutorialOverlay?: Phaser.GameObjects.Container
  private gameEnded = false

  constructor() {
    super({ key: 'RainbowBlocksScene' })
  }

  create() {
    this.cleanupInput?.()
    this.cleanupInput = null
    this.dropEvent?.remove(false)
    this.cells = []
    this.tutorialOverlay = undefined
    this.gameEnded = false

    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#FAF7FF')
    this.createBackground(width, height)
    this.createBackButton()
    this.add.text(width / 2, 42, '彩虹方块', {
      fontSize: '31px',
      color: '#5A3C7D',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(width / 2, 76, '左右移动，向上旋转，向下快速落下', {
      fontSize: '17px',
      color: '#775F92',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)

    this.boardLeft = width / 2 - 185
    this.boardTop = 118
    this.createBoard()
    this.createInfoPanel(width)
    this.createControlButtons(width, height)

    this.engine = new Engine(this.columns, this.rows, (state) => {
      this.engineState = state
      this.renderBoard()
    })
    this.engine.start()
    for (let step = 0; step < 4; step += 1) {
      this.engine.moveDown()
    }
    this.engineState = this.engine.state
    this.renderBoard()

    this.dropEvent = this.time.addEvent({
      delay: 820,
      loop: true,
      callback: () => this.moveDown(),
    })
    this.cleanupInput = inputManager.onInput((action) => this.handleInput(action))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())
    this.createTutorial(width, height)
  }

  private createBackground(width: number, height: number) {
    const graphics = this.add.graphics()
    graphics.fillStyle(0xFAF7FF, 1)
    graphics.fillRect(0, 0, width, height)
    graphics.fillStyle(0xEFDFFF, 0.72)
    graphics.fillCircle(120, 175, 100)
    graphics.fillCircle(width - 105, 175, 110)
    graphics.fillStyle(0xE8F8D8, 0.74)
    graphics.fillEllipse(width / 2, height + 55, width * 1.2, 220)
  }

  private createBackButton() {
    const button = this.add.text(72, 42, '放松站', {
      fontSize: '17px',
      color: '#5A3C7D',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    button.on('pointerdown', () => this.returnToHub())
  }

  private createBoard() {
    const boardWidth = this.columns * this.cellSize
    const boardHeight = this.rows * this.cellSize
    this.add.rectangle(this.boardLeft + boardWidth / 2, this.boardTop + boardHeight / 2, boardWidth + 18, boardHeight + 18, 0xFFFFFF, 0.96)
      .setStrokeStyle(4, 0xB785E2, 0.82)

    for (let row = 0; row < this.rows; row += 1) {
      const cells: Phaser.GameObjects.Rectangle[] = []
      for (let column = 0; column < this.columns; column += 1) {
        const cell = this.add.rectangle(
          this.boardLeft + column * this.cellSize + this.cellSize / 2,
          this.boardTop + row * this.cellSize + this.cellSize / 2,
          this.cellSize - 3,
          this.cellSize - 3,
          0xEEF3F6,
          1,
        ).setStrokeStyle(1, 0xD5E0E6, 1)
        cells.push(cell)
      }
      this.cells.push(cells)
    }
  }

  private createInfoPanel(width: number) {
    const panelX = width / 2 + 205
    this.add.rectangle(panelX, 235, 245, 208, 0xFFFFFF, 0.95)
      .setStrokeStyle(3, 0xC4A4EA, 0.78)
    this.add.text(panelX, 166, '下一块', {
      fontSize: '20px',
      color: '#5A3C7D',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.nextText = this.add.text(panelX, 213, '', {
      fontSize: '26px',
      color: '#775F92',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 200 },
    }).setOrigin(0.5)
    this.linesText = this.add.text(panelX, 282, '', {
      fontSize: '20px',
      color: '#775F92',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      align: 'center',
      wordWrap: { width: 200 },
    }).setOrigin(0.5)
    this.add.text(panelX, 350, '拼满一行会自动消除', {
      fontSize: '15px',
      color: '#8798A4',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      align: 'center',
      wordWrap: { width: 190 },
    }).setOrigin(0.5)
  }

  private createControlButtons(width: number, height: number) {
    const createButton = (x: number, label: string, callback: () => void) => {
      const button = this.add.text(x, height - 54, label, {
        fontSize: '21px',
        color: '#FFFFFF',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontStyle: 'bold',
        backgroundColor: '#9C71D0',
        padding: { x: 22, y: 13 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      button.on('pointerdown', callback)
    }
    createButton(width / 2 - 190, '左', () => this.moveLeft())
    createButton(width / 2 - 65, '转一转', () => this.rotate())
    createButton(width / 2 + 90, '右', () => this.moveRight())
    createButton(width / 2 + 210, '落下', () => this.moveDown())
  }

  private createTutorial(width: number, height: number) {
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0xFAF7FF, 0.9)
    const panel = this.add.rectangle(width / 2, height / 2, 560, 330, 0xFFFFFF, 0.98)
      .setStrokeStyle(4, 0xB785E2, 0.9)
    const title = this.add.text(width / 2, height / 2 - 118, '彩虹方块怎么玩？', {
      fontSize: '34px', color: '#5A3C7D', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)
    const instructions = this.add.text(width / 2, height / 2 - 30, '鼠标/触摸：点击下方「左、转一转、右、落下」按钮\n键盘：← → 移动，↑ / Enter / 空格旋转，↓ 加速落下\n手柄：摇杆或十字键移动，A / X 旋转', {
      fontSize: '17px', color: '#775F92', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', align: 'center', lineSpacing: 11,
    }).setOrigin(0.5)
    const start = this.add.text(width / 2, height / 2 + 102, '开始拼一拼', {
      fontSize: '22px', color: '#FFFFFF', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold', backgroundColor: '#9C71D0', padding: { x: 32, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    start.on('pointerdown', () => this.dismissTutorial())
    this.tutorialOverlay = this.add.container(0, 0, [shade, panel, title, instructions, start]).setDepth(30)
  }

  private dismissTutorial() {
    this.tutorialOverlay?.destroy(true)
    this.tutorialOverlay = undefined
  }

  private handleInput(action: GameAction) {
    if (this.tutorialOverlay) {
      if (action === GameAction.CONFIRM || action === GameAction.OPTION_1) this.dismissTutorial()
      return
    }
    if (action === GameAction.BACK) {
      this.returnToHub()
      return
    }
    if (this.gameEnded) {
      if (action === GameAction.CONFIRM) this.scene.restart()
      return
    }
    if (action === GameAction.LEFT) this.moveLeft()
    if (action === GameAction.RIGHT) this.moveRight()
    if (action === GameAction.UP || action === GameAction.CONFIRM || action === GameAction.OPTION_1) this.rotate()
    if (action === GameAction.DOWN) this.moveDown()
  }

  private moveLeft() {
    if (!this.gameEnded && !this.tutorialOverlay) this.engine.moveLeft()
  }

  private moveRight() {
    if (!this.gameEnded && !this.tutorialOverlay) this.engine.moveRight()
  }

  private rotate() {
    if (!this.gameEnded && !this.tutorialOverlay) this.engine.rotate()
  }

  private moveDown() {
    if (!this.gameEnded && !this.tutorialOverlay) this.engine.moveDown()
  }

  private renderBoard() {
    if (!this.engineState) return
    this.engineState.body.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        const target = this.cells[rowIndex]?.[columnIndex]
        if (!target) return
        if (cell.val === 0) {
          target.setFillStyle(0xEEF3F6, 1).setStrokeStyle(1, 0xD5E0E6, 1)
          return
        }
        const shapeName = cell.cssClasses.find((cssClass) => cssClass?.endsWith('Shape')) ?? ''
        const color = BLOCK_COLORS[shapeName] ?? 0x9C71D0
        target.setFillStyle(color, cell.val === 1 ? 0.94 : 0.7).setStrokeStyle(1, 0xFFFFFF, 0.9)
      })
    })
    const nextShapeName = this.engineState.nextShape.name ?? ''
    this.nextText.setText(BLOCK_NAMES[nextShapeName] ?? '准备中')
    this.linesText.setText(`消除 ${this.engineState.statistic.countLinesReduced} 行\n落下 ${this.engineState.statistic.countShapesFalled} 块`)
    if (this.engineState.gameStatus === 3) this.finishGame()
  }

  private finishGame() {
    if (this.gameEnded) return
    this.gameEnded = true
    this.dropEvent.remove(false)
    const lines = this.engineState.statistic.countLinesReduced
    if (lines > 0) useGameStore.getState().addStars(Math.min(3, lines))
    const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 450, 215, 0xFFFFFF, 0.97)
      .setStrokeStyle(4, 0xB785E2, 0.9)
    this.add.text(panel.x, panel.y - 46, '这一局完成啦！', {
      fontSize: '31px',
      color: '#5A3C7D',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(panel.x, panel.y + 2, `你消除了 ${lines} 行彩虹方块`, {
      fontSize: '20px',
      color: '#775F92',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    const restart = this.add.text(panel.x, panel.y + 64, '再玩一次', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#9C71D0',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    restart.on('pointerdown', () => this.scene.restart())
  }

  private returnToHub() {
    this.scene.start('RelaxationHubScene')
  }

  private cleanup() {
    this.cleanupInput?.()
    this.cleanupInput = null
    this.dropEvent?.remove(false)
  }
}
