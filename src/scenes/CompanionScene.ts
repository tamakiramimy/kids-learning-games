import Phaser from 'phaser'
import { getWorld, WORLD_ORDER, type GameModule } from '../config/gameContent'
import { GameAction, inputManager } from '../input/InputManager'
import { CONTROL_PROFILES } from '../input/controlProfiles'
import { useGameStore } from '../store/gameStore'

interface CompanionCard {
  panel: Phaser.GameObjects.Rectangle
  outline: Phaser.GameObjects.Rectangle
  statusText: Phaser.GameObjects.Text
  fragmentDots: Phaser.GameObjects.Arc[]
}

export class CompanionScene extends Phaser.Scene {
  private cards: CompanionCard[] = []
  private selectedIndex = 0
  private cleanupInput: (() => void) | null = null
  private unsubscribeStore: (() => void) | null = null
  private detailText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'CompanionScene' })
  }

  create() {
    inputManager.setControlProfile(CONTROL_PROFILES.navigation)
    const { width, height } = this.scale
    this.cards = []
    this.selectedIndex = 0
    this.cameras.main.setBackgroundColor('#F6FBFF')
    this.createBackground(width, height)

    this.add.text(width / 2, 68, '伙伴册', {
      fontSize: '48px',
      color: '#17465E',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(width / 2, 112, '收集碎片，让岛上的伙伴加入旅程', {
      fontSize: '21px',
      color: '#4F7485',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    this.createBackButton()

    WORLD_ORDER.forEach((module, index) => {
      this.cards.push(this.createCard(width * ((index + 1) / 4), 350, module, index))
    })

    this.detailText = this.add.text(width / 2, 610, '', {
      fontSize: '21px',
      color: '#315F73',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      align: 'center',
      wordWrap: { width: 760 },
    }).setOrigin(0.5)

    this.cleanupInput = inputManager.onInput((action) => this.handleInput(action))
    this.unsubscribeStore = useGameStore.subscribe(() => this.refreshState())
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      inputManager.setControlProfile(null)
      this.cleanupInput?.()
      this.cleanupInput = null
      this.unsubscribeStore?.()
      this.unsubscribeStore = null
    })

    this.refreshState()
    this.updateSelection(0)
    this.cameras.main.fadeIn(220)
  }

  private createBackground(width: number, height: number) {
    const graphics = this.add.graphics()
    graphics.fillStyle(0xF6FBFF, 1)
    graphics.fillRect(0, 0, width, height)
    graphics.fillStyle(0xD7F0FF, 0.75)
    graphics.fillCircle(115, 175, 86)
    graphics.fillCircle(width - 100, 150, 110)
    graphics.fillStyle(0xE7F7C9, 0.9)
    graphics.fillEllipse(width / 2, height + 75, width * 1.15, 250)
  }

  private createBackButton() {
    const button = this.add.text(72, 48, '返回地图', {
      fontSize: '17px',
      color: '#17465E',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    button.on('pointerdown', () => this.returnToMap())
  }

  private createCard(x: number, y: number, module: GameModule, index: number): CompanionCard {
    const world = getWorld(module)
    const panel = this.add.rectangle(x, y, 310, 330, 0xFFFFFF, 0.95)
      .setStrokeStyle(3, world.primaryColor, 0.45)
      .setInteractive({ useHandCursor: true })
    const outline = this.add.rectangle(x, y, 322, 342, world.primaryColor, 0)
      .setStrokeStyle(5, world.primaryColor, 0)

    this.createCompanionIllustration(module, x, y - 80, world.primaryColor)
    this.add.text(x, y + 2, world.companionName, {
      fontSize: '30px',
      color: '#1B4658',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(x, y + 37, world.name, {
      fontSize: '16px',
      color: '#527485',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)

    const statusText = this.add.text(x, y + 78, '', {
      fontSize: '18px',
      color: '#315F73',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    const fragmentDots: Phaser.GameObjects.Arc[] = []
    const startX = x - ((world.companionUnlockFragments - 1) * 20) / 2
    for (let index = 0; index < world.companionUnlockFragments; index += 1) {
      fragmentDots.push(this.add.circle(startX + index * 20, y + 112, 7, 0xDDE7EC)
        .setStrokeStyle(1, 0xAFC8D2, 1))
    }

    panel.on('pointerdown', () => this.updateSelection(index))
    return { panel, outline, statusText, fragmentDots }
  }

  private createCompanionIllustration(module: GameModule, x: number, y: number, color: number) {
    const items: Phaser.GameObjects.GameObject[] = []
    if (module === 'math') {
      items.push(
        this.add.ellipse(-18, -44, 22, 54, color),
        this.add.ellipse(18, -44, 22, 54, color),
        this.add.circle(0, 0, 50, color).setStrokeStyle(3, 0xFFFFFF, 0.92),
        this.add.circle(-18, -4, 5, 0x173C4B),
        this.add.circle(18, -4, 5, 0x173C4B),
        this.add.circle(0, 13, 5, 0xFFFFFF),
      )
    } else if (module === 'comparison') {
      items.push(
        this.add.ellipse(0, 6, 112, 64, color).setStrokeStyle(3, 0xFFFFFF, 0.92),
        this.add.circle(-28, -18, 19, color).setStrokeStyle(3, 0xFFFFFF, 0.92),
        this.add.circle(20, -20, 19, color).setStrokeStyle(3, 0xFFFFFF, 0.92),
        this.add.circle(-29, -20, 4, 0x173C4B),
        this.add.circle(20, -22, 4, 0x173C4B),
        this.add.rectangle(0, 22, 48, 7, 0xFFFFFF, 0.9),
      )
    } else {
      items.push(
        this.add.circle(0, 0, 50, color).setStrokeStyle(3, 0xFFFFFF, 0.92),
        this.add.ellipse(-42, 14, 38, 24, color),
        this.add.ellipse(42, 14, 38, 24, color),
        this.add.circle(-17, -5, 5, 0x173C4B),
        this.add.circle(17, -5, 5, 0x173C4B),
        this.add.rectangle(0, 14, 12, 9, 0xFFD740),
      )
    }
    return this.add.container(x, y, items)
  }

  private refreshState() {
    const state = useGameStore.getState()
    WORLD_ORDER.forEach((module, index) => {
      const world = getWorld(module)
      const fragments = state.companionFragments[module]
      const unlocked = fragments >= world.companionUnlockFragments
      const card = this.cards[index]
      card.statusText.setText(unlocked
        ? '已成为探索伙伴'
        : `${fragments}/${world.companionUnlockFragments} 碎片`)
      card.fragmentDots.forEach((dot, dotIndex) => {
        const complete = dotIndex < Math.min(fragments, world.companionUnlockFragments)
        dot.setFillStyle(complete ? world.primaryColor : 0xDDE7EC, 1)
        dot.setStrokeStyle(1, complete ? world.primaryColor : 0xAFC8D2, 1)
      })
    })
    this.updateDetail()
  }

  private handleInput(action: GameAction) {
    switch (action) {
      case GameAction.LEFT:
      case GameAction.UP:
        this.updateSelection((this.selectedIndex - 1 + this.cards.length) % this.cards.length)
        break
      case GameAction.RIGHT:
      case GameAction.DOWN:
        this.updateSelection((this.selectedIndex + 1) % this.cards.length)
        break
      case GameAction.BACK:
      case GameAction.OPTION_4:
        this.returnToMap()
        break
    }
  }

  private updateSelection(index: number) {
    this.selectedIndex = index
    this.cards.forEach((card, cardIndex) => {
      const module = WORLD_ORDER[cardIndex]
      if (!module) return
      const world = getWorld(module)
      const selected = cardIndex === index
      card.panel.setScale(selected ? 1.025 : 1)
      card.outline.setAlpha(selected ? 1 : 0)
      card.outline.setStrokeStyle(5, world.primaryColor, selected ? 1 : 0)
    })
    this.updateDetail()
  }

  private updateDetail() {
    if (!this.detailText || !this.cards.length) return
    const module = WORLD_ORDER[this.selectedIndex]
    if (!module) return
    const world = getWorld(module)
    const fragments = useGameStore.getState().companionFragments[module]
    const remaining = Math.max(0, world.companionUnlockFragments - fragments)
    this.detailText.setText(remaining === 0
      ? `${world.companionName} 已准备好陪你继续探索 ${world.name}`
      : `再收集 ${remaining} 枚 ${world.name} 碎片，就能认识 ${world.companionName}`)
  }

  private returnToMap() {
    this.scene.start('AdventureMapScene')
  }
}
