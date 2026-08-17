import Phaser from 'phaser'
import { GameAction, inputManager } from '../input/InputManager'

type RelaxationGameKey = 'ThunderFlightScene' | 'WhackAMoleScene' | 'RainbowBlocksScene' | 'TinyRaceScene'

interface GameCard {
  panel: Phaser.GameObjects.Rectangle
  outline: Phaser.GameObjects.Rectangle
}

const GAMES: { key: RelaxationGameKey; shortName: string; name: string; description: string; color: number; colorHex: string }[] = [
  { key: 'ThunderFlightScene', shortName: '雷', name: '雷光飞行', description: '自动发射闪电，收集道具，守护星芽', color: 0x5B7FE7, colorHex: '#5B7FE7' },
  { key: 'WhackAMoleScene', shortName: '鼠', name: '打地鼠', description: '看准再敲，金鼠加分，炸弹要躲开', color: 0x75A848, colorHex: '#75A848' },
  { key: 'RainbowBlocksScene', shortName: '块', name: '彩虹方块', description: '转一转、放一放，拼出彩虹线', color: 0xD765A0, colorHex: '#D765A0' },
  { key: 'TinyRaceScene', shortName: '车', name: '弯道赛车', description: '过弯收金币，用道具越过路障', color: 0xE88A31, colorHex: '#E88A31' },
]

export class RelaxationHubScene extends Phaser.Scene {
  private cards: GameCard[] = []
  private selectedIndex = 0
  private cleanupInput: (() => void) | null = null

  constructor() {
    super({ key: 'RelaxationHubScene' })
  }

  create() {
    const { width, height } = this.scale
    this.cards = []
    this.cameras.main.setBackgroundColor('#F4F7FF')
    this.createBackground(width, height)
    this.createBackButton()

    this.add.text(width / 2, 68, '放松站', {
      fontSize: '48px',
      color: '#304A66',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(width / 2, 112, '完成学习后，玩一会儿再继续探索', {
      fontSize: '21px',
      color: '#587389',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)

    const positions = [
      { x: width * 0.3, y: 278 },
      { x: width * 0.7, y: 278 },
      { x: width * 0.3, y: 510 },
      { x: width * 0.7, y: 510 },
    ]
    GAMES.forEach((game, index) => {
      const position = positions[index]
      this.cards.push(this.createCard(position.x, position.y, game, index))
    })

    this.cleanupInput = inputManager.onInput((action) => this.handleInput(action))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupInput?.()
      this.cleanupInput = null
    })
    this.updateSelection(0)
    this.cameras.main.fadeIn(220)
  }

  private createBackground(width: number, height: number) {
    const graphics = this.add.graphics()
    graphics.fillStyle(0xF4F7FF, 1)
    graphics.fillRect(0, 0, width, height)
    graphics.fillStyle(0xDCE8FF, 0.86)
    graphics.fillCircle(120, 170, 100)
    graphics.fillCircle(width - 110, 150, 118)
    graphics.fillStyle(0xE3F7D6, 0.75)
    graphics.fillEllipse(width / 2, height + 80, width * 1.2, 250)
  }

  private createBackButton() {
    const button = this.add.text(72, 48, '返回地图', {
      fontSize: '17px',
      color: '#304A66',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    button.on('pointerdown', () => this.returnToMap())
  }

  private createCard(x: number, y: number, game: typeof GAMES[number], index: number): GameCard {
    const panel = this.add.rectangle(x, y, 420, 194, 0xFFFFFF, 0.96)
      .setStrokeStyle(3, game.color, 0.45)
      .setInteractive({ useHandCursor: true })
    const outline = this.add.rectangle(x, y, 432, 206, game.color, 0)
      .setStrokeStyle(5, game.color, 0)
    this.add.circle(x - 144, y, 42, game.color, 1)
    this.add.text(x - 144, y, game.shortName, {
      fontSize: '31px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(x - 62, y - 42, game.name, {
      fontSize: '27px',
      color: '#304A66',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5)
    this.add.text(x - 62, y - 1, game.description, {
      fontSize: '16px',
      color: '#647B8C',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      wordWrap: { width: 238 },
    }).setOrigin(0, 0.5)
    this.add.text(x + 115, y + 53, '开始游戏', {
      fontSize: '18px',
      color: game.colorHex,
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    panel.on('pointerdown', () => {
      this.updateSelection(index)
      this.startGame(game.key)
    })
    return { panel, outline }
  }

  private handleInput(action: GameAction) {
    if (action === GameAction.BACK) {
      this.returnToMap()
      return
    }
    if (action === GameAction.CONFIRM) {
      this.startGame(GAMES[this.selectedIndex].key)
      return
    }
    if (action === GameAction.LEFT) this.moveSelection(0, -1)
    if (action === GameAction.RIGHT) this.moveSelection(0, 1)
    if (action === GameAction.UP) this.moveSelection(-1, 0)
    if (action === GameAction.DOWN) this.moveSelection(1, 0)
  }

  private moveSelection(rowDelta: number, columnDelta: number) {
    const row = Math.floor(this.selectedIndex / 2)
    const column = this.selectedIndex % 2
    const nextRow = Phaser.Math.Wrap(row + rowDelta, 0, 2)
    const nextColumn = Phaser.Math.Wrap(column + columnDelta, 0, 2)
    this.updateSelection(nextRow * 2 + nextColumn)
  }

  private updateSelection(index: number) {
    this.selectedIndex = index
    this.cards.forEach((card, cardIndex) => {
      const game = GAMES[cardIndex]
      const selected = cardIndex === index
      card.panel.setScale(selected ? 1.025 : 1)
      card.outline.setAlpha(selected ? 1 : 0)
      card.outline.setStrokeStyle(5, game.color, selected ? 1 : 0)
    })
  }

  private startGame(key: RelaxationGameKey) {
    this.scene.start(key)
  }

  private returnToMap() {
    this.scene.start('AdventureMapScene')
  }
}