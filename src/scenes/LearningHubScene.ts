import Phaser from 'phaser'
import { getLearningModule, LEARNING_MODULE_ORDER, type LearningModuleId } from '../config/learningContent'
import { GameAction, inputManager } from '../input/InputManager'

interface LearningCard {
  panel: Phaser.GameObjects.Rectangle
  outline: Phaser.GameObjects.Rectangle
}

export class LearningHubScene extends Phaser.Scene {
  private cards: LearningCard[] = []
  private selectedIndex = 0
  private cleanupInput: (() => void) | null = null

  constructor() {
    super({ key: 'LearningHubScene' })
  }

  create() {
    const { width, height } = this.scale
    this.cards = []
    this.cameras.main.setBackgroundColor('#FFF9EC')
    this.createBackground(width, height)
    this.createBackButton()

    this.add.text(width / 2, 60, '学习馆', {
      fontSize: '48px',
      color: '#7A4A17',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(width / 2, 105, '选一张学习卡，慢慢认识新知识', {
      fontSize: '21px',
      color: '#8B6B48',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)

    const positions = [
      { x: width * 0.21, y: 270 },
      { x: width * 0.5, y: 270 },
      { x: width * 0.79, y: 270 },
      { x: width * 0.355, y: 510 },
      { x: width * 0.645, y: 510 },
    ]
    LEARNING_MODULE_ORDER.forEach((moduleId, index) => {
      const position = positions[index]
      this.cards.push(this.createCard(position.x, position.y, moduleId, index))
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
    graphics.fillStyle(0xFFF9EC, 1)
    graphics.fillRect(0, 0, width, height)
    graphics.fillStyle(0xFFE6AE, 0.58)
    graphics.fillCircle(120, 180, 90)
    graphics.fillCircle(width - 110, 160, 100)
    graphics.fillStyle(0xE1F3C3, 0.72)
    graphics.fillEllipse(width / 2, height + 60, width * 1.2, 220)
  }

  private createBackButton() {
    const button = this.add.text(72, 48, '返回地图', {
      fontSize: '17px',
      color: '#7A4A17',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    button.on('pointerdown', () => this.returnToMap())
  }

  private createCard(x: number, y: number, moduleId: LearningModuleId, index: number): LearningCard {
    const module = getLearningModule(moduleId)
    const panel = this.add.rectangle(x, y, 300, 190, 0xFFFFFF, 0.96)
      .setStrokeStyle(3, module.accentColor, 0.5)
      .setInteractive({ useHandCursor: true })
    const outline = this.add.rectangle(x, y, 312, 202, module.accentColor, 0)
      .setStrokeStyle(5, module.accentColor, 0)
    this.add.circle(x, y - 45, 31, module.accentColor, 1)
    this.add.text(x, y - 45, module.shortName, {
      fontSize: '24px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(x, y + 2, module.name, {
      fontSize: '25px',
      color: '#394E5B',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(x, y + 42, module.description, {
      fontSize: '15px',
      color: '#6D7E87',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      wordWrap: { width: 240 },
      align: 'center',
    }).setOrigin(0.5)
    this.add.text(x, y + 76, `每轮随机 ${module.sessionQuestions} 题 · 题库 ${module.questions.length}+`, {
      fontSize: '15px',
      color: module.accentHex,
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    panel.on('pointerdown', () => {
      this.updateSelection(index)
      this.startModule(moduleId)
    })
    return { panel, outline }
  }

  private handleInput(action: GameAction) {
    if (action === GameAction.BACK) {
      this.returnToMap()
      return
    }
    if (action === GameAction.CONFIRM) {
      this.startModule(LEARNING_MODULE_ORDER[this.selectedIndex])
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
      const module = getLearningModule(LEARNING_MODULE_ORDER[cardIndex])
      const selected = cardIndex === index
      card.panel.setScale(selected ? 1.025 : 1)
      card.outline.setAlpha(selected ? 1 : 0)
      card.outline.setStrokeStyle(5, module.accentColor, selected ? 1 : 0)
    })
  }

  private startModule(moduleId: LearningModuleId) {
    this.scene.start('LearningQuestScene', { moduleId })
  }

  private returnToMap() {
    this.scene.start('AdventureMapScene')
  }
}
