import Phaser from 'phaser'
import { GameAction, inputManager } from '../input/InputManager'

type RelaxationGameKey = 'ThunderFlightScene' | 'RainbowBlocksScene' | 'TinyRaceScene'

interface GameCard {
  panel: Phaser.GameObjects.Rectangle
  outline: Phaser.GameObjects.Rectangle
}

const GAMES: { key: RelaxationGameKey; shortName: string; name: string; description: string; color: number; colorHex: string }[] = [
  { key: 'ThunderFlightScene', shortName: '雷', name: '雷光飞行', description: '躲开云团，用闪电守护星芽', color: 0x5B7FE7, colorHex: '#5B7FE7' },
  { key: 'RainbowBlocksScene', shortName: '块', name: '彩虹方块', description: '转一转、放一放，拼出彩虹线', color: 0xD765A0, colorHex: '#D765A0' },
  { key: 'TinyRaceScene', shortName: '车', name: '小小赛车', description: '换车道、收星芽，平安到终点', color: 0xE88A31, colorHex: '#E88A31' },
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

    GAMES.forEach((game, index) => {
      this.cards.push(this.createCard(width * ((index + 1) / 4), 390, game, index))
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
    const panel = this.add.rectangle(x, y, 320, 300, 0xFFFFFF, 0.96)
      .setStrokeStyle(3, game.color, 0.45)
      .setInteractive({ useHandCursor: true })
    const outline = this.add.rectangle(x, y, 332, 312, game.color, 0)
      .setStrokeStyle(5, game.color, 0)
    this.add.circle(x, y - 80, 43, game.color, 1)
    this.add.text(x, y - 80, game.shortName, {
      fontSize: '31px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(x, y - 18, game.name, {
      fontSize: '30px',
      color: '#304A66',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(x, y + 31, game.description, {
      fontSize: '16px',
      color: '#647B8C',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      wordWrap: { width: 248 },
      align: 'center',
    }).setOrigin(0.5)
    this.add.text(x, y + 100, '轻松玩一局', {
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
    if (action === GameAction.LEFT || action === GameAction.UP) {
      this.updateSelection((this.selectedIndex - 1 + this.cards.length) % this.cards.length)
    }
    if (action === GameAction.RIGHT || action === GameAction.DOWN) {
      this.updateSelection((this.selectedIndex + 1) % this.cards.length)
    }
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