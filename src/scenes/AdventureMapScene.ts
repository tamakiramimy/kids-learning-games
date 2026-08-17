import Phaser from 'phaser'
import { audioManager } from '../audio/AudioManager'
import { getNextPlayableNode, getWorld, WORLD_ORDER, type GameModule } from '../config/gameContent'
import { GameAction, inputManager } from '../input/InputManager'
import { useGameStore } from '../store/gameStore'

interface WorldCard {
  panel: Phaser.GameObjects.Rectangle
  outline: Phaser.GameObjects.Rectangle
  statusText: Phaser.GameObjects.Text
  actionText: Phaser.GameObjects.Text
  nodeDots: Phaser.GameObjects.Arc[]
  nodeLabels: Phaser.GameObjects.Text[]
}

export class AdventureMapScene extends Phaser.Scene {
  private cards: WorldCard[] = []
  private selectedIndex = 0
  private cleanupInput: (() => void) | null = null
  private unsubscribeStore: (() => void) | null = null
  private transitioning = false
  private starsText!: Phaser.GameObjects.Text
  private fragmentsText!: Phaser.GameObjects.Text
  private learningText!: Phaser.GameObjects.Text
  private relaxationText!: Phaser.GameObjects.Text
  private companionText!: Phaser.GameObjects.Text
  private soundText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'AdventureMapScene' })
  }

  create() {
    const { width, height } = this.scale
    this.cards = []
    this.transitioning = false
    useGameStore.getState().setScreen('map')
    this.syncAudio()
    this.cameras.main.setBackgroundColor('#EAF8FF')
    this.createLandscape(width, height)

    this.createHeader(width)

    const cardY = 410
    WORLD_ORDER.forEach((module, index) => {
      const card = this.createWorldCard(width * ((index + 1) / 4), cardY, module, index)
      this.cards.push(card)
    })

    this.cleanupInput = inputManager.onInput((action) => {
      switch (action) {
        case GameAction.LEFT:
        case GameAction.UP:
          this.updateSelection((this.selectedIndex - 1 + this.cards.length) % this.cards.length)
          break
        case GameAction.RIGHT:
        case GameAction.DOWN:
          this.updateSelection((this.selectedIndex + 1) % this.cards.length)
          break
        case GameAction.CONFIRM:
          this.confirmSelection()
          break
        case GameAction.OPTION_4:
          this.openCompanionBook()
          break
        case GameAction.OPTION_3:
          this.openLearningHub()
          break
        case GameAction.OPTION_2:
          this.openRelaxationHub()
          break
      }
    })

    this.unsubscribeStore = useGameStore.subscribe(() => this.refreshState())
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.releaseBindings()
    })

    this.refreshState()
    this.updateSelection(0)
    this.cameras.main.fadeIn(260)
    audioManager.speak('欢迎来到星芽奇旅，选一座小岛开始探索吧')
  }

  private createLandscape(width: number, height: number) {
    const sky = this.add.graphics()
    sky.fillStyle(0xEAF8FF, 1)
    sky.fillRect(0, 0, width, height)
    sky.fillStyle(0xC6EDFF, 0.75)
    sky.fillCircle(width * 0.12, 130, 92)
    sky.fillCircle(width * 0.82, 120, 120)
    sky.fillStyle(0xBFEAC9, 1)
    sky.fillEllipse(width * 0.2, height + 60, width * 0.72, 250)
    sky.fillStyle(0x95D8AA, 1)
    sky.fillEllipse(width * 0.82, height + 90, width * 0.65, 250)
    sky.fillStyle(0xA8E5F6, 1)
    sky.fillRect(0, height - 122, width, 122)
    sky.fillStyle(0xFFFFFF, 0.8)
    sky.fillCircle(width * 0.12, 190, 16)
    sky.fillCircle(width * 0.14, 186, 23)
    sky.fillCircle(width * 0.16, 193, 17)
    sky.fillCircle(width * 0.76, 200, 14)
    sky.fillCircle(width * 0.78, 194, 20)
    sky.fillCircle(width * 0.8, 201, 14)
  }

  private createHeader(width: number) {
    this.add.rectangle(width / 2, 0, width, 132, 0xF8FDFF, 0.86).setOrigin(0.5, 0)
    this.add.rectangle(width / 2, 131, width, 1, 0xB7DCEA, 0.72).setOrigin(0.5, 0)

    this.add.text(42, 34, '星芽奇旅', {
      fontSize: '36px',
      color: '#154B67',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5)
    this.add.text(44, 77, '探索学习岛', {
      fontSize: '16px',
      color: '#4E7B8E',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0, 0.5)
    this.add.text(width / 2, 105, '选一座小岛，开启今天的探索', {
      fontSize: '20px',
      color: '#3C7186',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)

    this.createStatusBar(width)
  }

  private createStatusBar(width: number) {
    this.add.rectangle(width - 158, 54, 280, 64, 0xFFFFFF, 0.9)
      .setStrokeStyle(2, 0xB7DCEA, 1)
      .setDepth(1)

    this.starsText = this.add.text(width - 283, 44, '', {
      fontSize: '19px',
      color: '#A76400',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(2)

    this.fragmentsText = this.add.text(width - 283, 67, '', {
      fontSize: '15px',
      color: '#436C7D',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0, 0.5).setDepth(2)

    this.relaxationText = this.add.text(385, 51, '放松站', {
      fontSize: '16px',
      color: '#304A66',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#EEF3FF',
      padding: { x: 13, y: 9 },
    }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true })
    this.relaxationText.on('pointerdown', () => this.openRelaxationHub())

    this.learningText = this.add.text(500, 51, '学习馆', {
      fontSize: '16px',
      color: '#7A4A17',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFF8E9',
      padding: { x: 13, y: 9 },
    }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true })
    this.learningText.on('pointerdown', () => this.openLearningHub())

    this.companionText = this.add.text(615, 51, '伙伴册', {
      fontSize: '16px',
      color: '#17465E',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 13, y: 9 },
    }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true })
    this.companionText.on('pointerdown', () => this.openCompanionBook())

    this.soundText = this.add.text(width - 78, 55, '', {
      fontSize: '16px',
      color: '#154B67',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      backgroundColor: '#DDF4FF',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true })
    this.soundText.on('pointerdown', () => this.toggleSound())
  }

  private createWorldCard(x: number, y: number, module: GameModule, index: number): WorldCard {
    const world = getWorld(module)
    const panel = this.add.rectangle(x, y, 316, 300, 0xFFFFFF, 0.92)
      .setStrokeStyle(3, world.primaryColor, 0.45)
      .setInteractive({ useHandCursor: true })
    const outline = this.add.rectangle(x, y, 328, 312, world.primaryColor, 0)
      .setStrokeStyle(5, world.primaryColor, 0)

    this.add.circle(x, y - 98, 36, world.primaryColor, 1)
    this.add.text(x, y - 98, world.shortName, {
      fontSize: '30px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(x, y - 45, world.name, {
      fontSize: '31px',
      color: '#1B4658',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.add.text(x, y - 12, world.description, {
      fontSize: '15px',
      color: '#527485',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      align: 'center',
      wordWrap: { width: 255 },
    }).setOrigin(0.5)

    const nodeDots: Phaser.GameObjects.Arc[] = []
    const nodeLabels: Phaser.GameObjects.Text[] = []
    const startX = x - 92
    world.nodes.forEach((node, nodeIndex) => {
      const nodeX = startX + nodeIndex * 46
      const dot = this.add.circle(nodeX, y + 42, 14, 0xDCEAF0, 1)
        .setStrokeStyle(2, 0xAFC8D2, 1)
      const label = this.add.text(nodeX, y + 42, String(node.order), {
        fontSize: '13px',
        color: '#527485',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5)
      nodeDots.push(dot)
      nodeLabels.push(label)
    })

    const statusText = this.add.text(x, y + 82, '', {
      fontSize: '16px',
      color: '#315F73',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    const actionText = this.add.text(x, y + 119, '进入探索', {
      fontSize: '19px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: `#${world.primaryColor.toString(16).padStart(6, '0')}`,
      padding: { x: 30, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    panel.on('pointerdown', () => {
      this.updateSelection(index)
      this.confirmSelection()
    })
    actionText.on('pointerdown', () => {
      this.updateSelection(index)
      this.confirmSelection()
    })

    return { panel, outline, statusText, actionText, nodeDots, nodeLabels }
  }

  private refreshState() {
    const state = useGameStore.getState()
    this.starsText.setText(`星芽 ${state.stars}`)
    const fragmentCount = Object.values(state.companionFragments).reduce((sum, count) => sum + count, 0)
    this.fragmentsText.setText(`伙伴碎片 ${fragmentCount}`)
    this.soundText.setText(state.isMuted ? '声音：关' : '声音：开')

    WORLD_ORDER.forEach((module, index) => {
      const world = getWorld(module)
      const progress = state.progress[module]
      const card = this.cards[index]
      const nextNode = getNextPlayableNode(module, progress.completedNodeIds)
      const isComplete = progress.completedNodeIds.length === world.nodes.length

      card.statusText.setText(isComplete
        ? '世界已修复，可以继续练习'
        : `下一站：${nextNode?.title ?? '探索完成'}`)
      card.actionText.setText(isComplete ? '自由练习' : '进入探索')

      world.nodes.forEach((node, nodeIndex) => {
        const dot = card.nodeDots[nodeIndex]
        const label = card.nodeLabels[nodeIndex]
        const isCompleteNode = progress.completedNodeIds.includes(node.id)
        const isUnlocked = node.order <= progress.unlockedNodeCount
        if (isCompleteNode) {
          dot.setFillStyle(world.primaryColor, 1).setStrokeStyle(2, world.primaryColor, 1)
          label.setColor('#FFFFFF')
        } else if (isUnlocked) {
          dot.setFillStyle(world.accentColor, 1).setStrokeStyle(2, world.primaryColor, 1)
          label.setColor('#1B4658')
        } else {
          dot.setFillStyle(0xDCEAF0, 1).setStrokeStyle(2, 0xAFC8D2, 1)
          label.setColor('#527485')
        }
      })
    })
  }

  private updateSelection(index: number) {
    this.selectedIndex = index
    this.cards.forEach((card, cardIndex) => {
      const world = getWorld(WORLD_ORDER[cardIndex])
      const selected = cardIndex === index
      card.panel.setScale(selected ? 1.025 : 1)
      card.outline.setAlpha(selected ? 1 : 0)
      card.outline.setStrokeStyle(5, world.primaryColor, selected ? 1 : 0)
    })
  }

  private confirmSelection() {
    if (this.transitioning) return
    const module = WORLD_ORDER[this.selectedIndex]
    const state = useGameStore.getState()
    const node = getNextPlayableNode(module, state.progress[module].completedNodeIds)
    if (!node) return

    const world = getWorld(module)
    this.transitioning = true
    state.startNode(module, node.id)
    this.releaseBindings()
    this.scene.start(world.sceneKey)
  }

  private releaseBindings() {
    this.cleanupInput?.()
    this.cleanupInput = null
    this.unsubscribeStore?.()
    this.unsubscribeStore = null
  }

  private toggleSound() {
    const state = useGameStore.getState()
    state.toggleMute()
    this.syncAudio()
    if (!useGameStore.getState().isMuted) audioManager.speak('声音已打开')
  }

  private openCompanionBook() {
    if (this.transitioning) return
    this.transitioning = true
    this.releaseBindings()
    this.scene.start('CompanionScene')
  }

  private openLearningHub() {
    if (this.transitioning) return
    this.transitioning = true
    this.releaseBindings()
    this.scene.start('LearningHubScene')
  }

  private openRelaxationHub() {
    if (this.transitioning) return
    this.transitioning = true
    this.releaseBindings()
    this.scene.start('RelaxationHubScene')
  }

  private syncAudio() {
    const state = useGameStore.getState()
    audioManager.setMuted(state.isMuted)
    audioManager.setVolume(state.volume)
  }
}