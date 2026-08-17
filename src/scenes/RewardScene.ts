import Phaser from 'phaser'
import { audioManager } from '../audio/AudioManager'
import { getNextNode, getWorld } from '../config/gameContent'
import { GameAction, inputManager } from '../input/InputManager'
import { useGameStore } from '../store/gameStore'
import { syncAudioSettings } from './GameHud'

export class RewardScene extends Phaser.Scene {
  private cleanupInput: (() => void) | null = null

  constructor() {
    super({ key: 'RewardScene' })
  }

  create() {
    const { width, height } = this.scale
    const reward = useGameStore.getState().lastReward
    syncAudioSettings()
    this.cameras.main.setBackgroundColor('#FFF8E1')
    this.cameras.main.fadeIn(200)

    const mapLink = this.add.text(72, 42, '地图', {
      fontSize: '19px',
      color: '#6C5E42',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 16, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    mapLink.on('pointerdown', () => this.returnToMap())

    // Rainbow arcs
    const colors = [0xFF5252, 0xFF9100, 0xFFD740, 0x69F0AE, 0x448AFF, 0xB388FF]
    colors.forEach((color, i) => {
      const arc = this.add.arc(width / 2, height + 200, 600 + i * 40, 180, 360, false, color, 0.3)
      this.tweens.add({
        targets: arc, y: height - 100, alpha: 0.6,
        duration: 600, delay: i * 100, ease: 'Back.easeOut',
      })
    })

    const congrats = this.add.text(width / 2, -50, '探索完成！', {
      fontSize: '52px',
      color: '#FF6F00',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.tweens.add({
      targets: congrats, y: 180,
      duration: 800, ease: 'Bounce.easeOut',
    })

    this.add.text(width / 2, 250, `${reward?.worldName ?? '探索岛'} · ${reward?.nodeTitle ?? '学习挑战'}`, {
      fontSize: '25px',
      color: '#6C5E42',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    const rewardPanel = this.add.rectangle(width / 2, 360, 500, 132, 0xFFFFFF, 0.9)
      .setStrokeStyle(3, 0xFFD05B, 0.9)
    const starsEarned = reward?.starsEarned ?? 0
    const fragmentsEarned = reward?.fragmentsEarned ?? 0
    this.add.text(width / 2 - 116, 338, `星芽 +${starsEarned}`, {
      fontSize: '28px',
      color: '#A76400',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(width / 2 + 116, 338, `碎片 +${fragmentsEarned}`, {
      fontSize: '28px',
      color: '#A53460',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(width / 2, 390, reward?.worldComplete
      ? '这座小岛已修复，伙伴正在等你！'
      : reward?.nextUnlockedTitle
        ? `新路线已开启：${reward.nextUnlockedTitle}`
        : '这次练习已经记入探索地图', {
      fontSize: '19px',
      color: '#6C5E42',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      align: 'center',
      wordWrap: { width: rewardPanel.width - 48 },
    }).setOrigin(0.5)

    // Star burst
    this.time.delayedCall(200, () => {
      this.add.particles(width / 2, height / 2, 'star', {
        speed: { min: 50, max: 400 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.2, end: 0 },
        lifespan: 2000,
        quantity: 30,
        emitting: false,
        tint: [0xFFD740, 0xFF5252, 0x448AFF, 0x69F0AE, 0xFF9100, 0xB388FF],
      }).explode()
    })

    const continueBtn = this.add.text(width / 2, height + 50, this.getNextActionLabel(), {
      fontSize: '30px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#F28A19',
      padding: { x: 54, y: 17 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    this.tweens.add({
      targets: continueBtn, y: height - 120,
      duration: 500, delay: 1000, ease: 'Back.easeOut',
    })

    continueBtn.on('pointerdown', () => {
      this.continueAdventure()
    })

    this.cleanupInput = inputManager.onInput((action) => {
      if (action === GameAction.CONFIRM) this.continueAdventure()
      if (action === GameAction.BACK) this.returnToMap()
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupInput?.()
      this.cleanupInput = null
    })

    this.time.delayedCall(400, () => audioManager.speak('太厉害了，新的路线已经开启'))
  }

  private getNextActionLabel() {
    const state = useGameStore.getState()
    if (!state.currentModule || !state.currentNodeId) return '返回探索地图'
    const nextNode = getNextNode(state.currentModule, state.currentNodeId)
    return nextNode ? `前往下一站：${nextNode.title}` : '完成本世界，返回地图'
  }

  private continueAdventure() {
    const state = useGameStore.getState()
    if (!state.currentModule || !state.currentNodeId) {
      this.returnToMap()
      return
    }

    const world = getWorld(state.currentModule)
    const nextNode = getNextNode(state.currentModule, state.currentNodeId)
    if (!nextNode) {
      this.returnToMap()
      return
    }

    state.startNode(state.currentModule, nextNode.id)
    this.scene.start(world.sceneKey)
  }

  private returnToMap() {
    useGameStore.getState().setScreen('map')
    this.scene.start('AdventureMapScene')
  }
}