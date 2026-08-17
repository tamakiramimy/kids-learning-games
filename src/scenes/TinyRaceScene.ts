import Phaser from 'phaser'
import { GameAction, inputManager } from '../input/InputManager'
import { useGameStore } from '../store/gameStore'
import { ThreeRaceRenderer } from './ThreeRaceRenderer'
import type { RaceVisual, RaceVisualKind } from './ThreeRaceRenderer'

type RoadEntityKind = RaceVisualKind

interface RoadEntity {
  kind: RoadEntityKind
  lane: number
  visual: RaceVisual
  speed: number
  z: number
}

export class TinyRaceScene extends Phaser.Scene {
  private readonly finishDistance = 720
  private raceRenderer!: ThreeRaceRenderer
  private entities: RoadEntity[] = []
  private cleanupInput: (() => void) | null = null
  private obstacleEvent!: Phaser.Time.TimerEvent
  private coinEvent!: Phaser.Time.TimerEvent
  private itemEvent!: Phaser.Time.TimerEvent
  private speedText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private distanceText!: Phaser.GameObjects.Text
  private heartsText!: Phaser.GameObjects.Text
  private itemText!: Phaser.GameObjects.Text
  private turnText!: Phaser.GameObjects.Text
  private levelText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private pauseOverlay?: Phaser.GameObjects.Container
  private laneIndex = 1
  private coins = 0
  private score = 0
  private distance = 0
  private hearts = 3
  private level = 1
  private passedTraffic = 0
  private shieldTime = 0
  private magnetTime = 0
  private boostCharges = 0
  private boostTime = 0
  private paused = false
  private gameEnded = false

  constructor() {
    super({ key: 'TinyRaceScene' })
  }

  create() {
    const { width, height } = this.scale
    const host = this.game.canvas.parentElement
    if (!host) throw new Error('Racing scene requires a game container')

    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)')
    this.raceRenderer = new ThreeRaceRenderer(host, this.game.canvas)
    this.createHud(width)
    this.createBackButton()
    this.createRoadInput(width, height)
    this.createControls(width, height)
    this.obstacleEvent = this.time.addEvent({ delay: 1500, loop: true, callback: () => this.spawnBarrier() })
    this.coinEvent = this.time.addEvent({ delay: 740, loop: true, callback: () => this.spawnCoin() })
    this.itemEvent = this.time.addEvent({ delay: 5200, loop: true, callback: () => this.spawnItem() })
    this.spawnCoin(-42, -1)
    this.spawnCoin(-64, 1)
    this.spawnBarrier(-34, -1)
    this.spawnBarrier(-56, 1)
    this.spawnBarrier(-82, 0)
    this.spawnItem('shield', -118, -1)
    this.cleanupInput = inputManager.onInput((action) => this.handleInput(action))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())
    this.refreshHud()
  }

  update(_time: number, delta: number) {
    if (this.paused || this.gameEnded) return
    const seconds = delta / 1000
    const pace = this.boostTime > 0 ? 1.64 : 1
    this.distance += seconds * 18 * pace
    this.shieldTime = Math.max(0, this.shieldTime - seconds)
    this.magnetTime = Math.max(0, this.magnetTime - seconds)
    this.boostTime = Math.max(0, this.boostTime - seconds)
    this.raceRenderer.update(seconds, this.laneIndex - 1, this.shieldTime > 0, this.boostTime > 0)
    this.updateEntities(seconds, pace)
    this.refreshHud()
    if (this.distance >= this.finishDistance) this.finishGame(true)
  }

  private createHud(width: number) {
    this.add.rectangle(18, 18, 208, 236, 0x0e1a20, 0.93)
      .setOrigin(0)
      .setStrokeStyle(2, 0x31515d, 0.9)
    this.add.text(112, 42, '游戏状态', {
      fontSize: '22px',
      color: '#FFE05A',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5)
    this.add.rectangle(40, 66, 160, 1, 0x4a6d73, 0.75).setOrigin(0, 0.5)

    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '15px',
      color: '#B3C5C9',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }
    this.add.text(40, 92, '速度', labelStyle)
    this.add.text(40, 124, '得分', labelStyle)
    this.add.text(40, 156, '距离', labelStyle)
    this.add.text(40, 188, '护航', labelStyle)
    this.speedText = this.add.text(192, 92, '', { ...labelStyle, color: '#FF715F', fontSize: '20px', fontStyle: 'bold' }).setOrigin(1, 0)
    this.scoreText = this.add.text(192, 124, '', { ...labelStyle, color: '#61E1A2', fontSize: '20px', fontStyle: 'bold' }).setOrigin(1, 0)
    this.distanceText = this.add.text(192, 156, '', { ...labelStyle, color: '#E7F5F2', fontSize: '16px', fontStyle: 'bold' }).setOrigin(1, 0)
    this.heartsText = this.add.text(192, 188, '', { ...labelStyle, color: '#F4C0B8', fontSize: '16px', fontStyle: 'bold' }).setOrigin(1, 0)
    this.itemText = this.add.text(40, 222, '', { ...labelStyle, color: '#7CE4D7', fontSize: '14px', fontStyle: 'bold' })

    const levelPanel = this.add.rectangle(width - 58, 18, 84, 82, 0x0e1a20, 0.93)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, 0x31515d, 0.9)
    this.add.text(levelPanel.x, 40, 'LEVEL', {
      fontSize: '11px',
      color: '#B3C5C9',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.levelText = this.add.text(levelPanel.x, 68, '', {
      fontSize: '28px',
      color: '#D08AFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.turnText = this.add.text(width - 26, 122, '', {
      fontSize: '15px',
      color: '#F3FFE2',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#173D38',
      padding: { x: 12, y: 7 },
    }).setOrigin(1, 0.5)
    this.feedbackText = this.add.text(width / 2, 136, '', {
      fontSize: '22px',
      color: '#FFF0A5',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      stroke: '#162A31',
      strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0)

    const pauseButton = this.add.text(width - 152, 42, 'II', {
      fontSize: '18px',
      color: '#E9FBFF',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#17343E',
      padding: { x: 13, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    pauseButton.on('pointerdown', () => this.togglePause())
  }

  private createBackButton() {
    const button = this.add.text(72, 42, '<', {
      fontSize: '24px',
      color: '#F3FAFC',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#17343E',
      padding: { x: 13, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    button.on('pointerdown', () => this.returnToHub())
  }

  private createRoadInput(width: number, height: number) {
    const roadInput = this.add.zone(width / 2, (height + 118) / 2, width, height - 180)
      .setInteractive({ useHandCursor: true })
    roadInput.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.paused || this.gameEnded) return
      this.laneIndex = pointer.x < width * 0.34 ? 0 : pointer.x > width * 0.66 ? 2 : 1
    })
  }

  private createControls(width: number, height: number) {
    const createControl = (x: number, label: string, color: number, callback: () => void) => {
      const button = this.add.circle(x, height - 54, 35, color, 0.92)
        .setStrokeStyle(3, 0xEAF7F7, 0.84)
        .setInteractive({ useHandCursor: true })
      const text = this.add.text(x, height - 54, label, {
        fontSize: label === '加速' ? '16px' : '31px',
        color: '#FFFFFF',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5)
      button.on('pointerdown', callback)
      text.setDepth(2)
    }
    createControl(126, '<', 0x2b718f, () => this.changeLane(-1))
    createControl(width - 126, '>', 0x2b718f, () => this.changeLane(1))
    createControl(width / 2, '加速', 0xdf7d35, () => this.useBoost())
  }

  private spawnBarrier(startZ = -176, laneOverride?: number) {
    if (this.paused || this.gameEnded || this.entities.filter((entity) => entity.kind === 'barrier').length >= 4) return
    const lane = laneOverride ?? Phaser.Math.Between(-1, 1)
    const visual = this.raceRenderer.createVisual('barrier', lane, startZ)
    this.entities.push({ kind: 'barrier', lane, visual, speed: Phaser.Math.Between(28, 35) + this.level * 1.2, z: startZ })
  }

  private spawnCoin(startZ = -156, laneOverride?: number) {
    if (this.paused || this.gameEnded || this.entities.filter((entity) => entity.kind === 'coin').length >= 8) return
    const lane = laneOverride ?? Phaser.Math.Between(-1, 1)
    const visual = this.raceRenderer.createVisual('coin', lane, startZ)
    this.entities.push({ kind: 'coin', lane, visual, speed: Phaser.Math.Between(25, 30), z: startZ })
  }

  private spawnItem(kindOverride?: Exclude<RoadEntityKind, 'coin' | 'barrier'>, startZ = -184, laneOverride?: number) {
    if (this.paused || this.gameEnded || this.entities.some((entity) => entity.kind === 'shield' || entity.kind === 'turbo' || entity.kind === 'magnet')) return
    const kind = kindOverride ?? Phaser.Utils.Array.GetRandom(['shield', 'turbo', 'magnet'] as const)
    const lane = laneOverride ?? Phaser.Math.Between(-1, 1)
    const visual = this.raceRenderer.createVisual(kind, lane, startZ)
    this.entities.push({ kind, lane, visual, speed: 27, z: startZ })
  }

  private updateEntities(seconds: number, pace: number) {
    this.entities = this.entities.filter((entity) => {
      entity.z += entity.speed * seconds * pace
      let lane = entity.lane
      if (entity.kind === 'coin' && this.magnetTime > 0 && entity.z > this.raceRenderer.playerZ - 24) {
        const playerLane = this.laneIndex - 1
        if (Math.abs(entity.lane - playerLane) <= 1) lane = playerLane
      }
      this.raceRenderer.updateVisual(entity.visual, lane, entity.z, seconds)

      const laneDistance = Math.abs(this.raceRenderer.playerX - this.raceRenderer.laneToX(lane))
      const closeEnough = Math.abs(entity.z - this.raceRenderer.playerZ) < 2.1 && laneDistance < 1.55
      if (closeEnough) {
        this.resolveEntity(entity)
        this.raceRenderer.removeVisual(entity.visual)
        return false
      }

      if (entity.z > this.raceRenderer.playerZ + 8) {
        if (entity.kind === 'barrier') {
          this.passedTraffic += 1
          this.score += 150 * this.level
          if (this.passedTraffic % 12 === 0) {
            this.level += 1
            this.showFeedback(`LEVEL ${this.level} · 车流加速`, '#FFF0A5')
          }
        }
        this.raceRenderer.removeVisual(entity.visual)
        return false
      }
      return true
    })
  }

  private resolveEntity(entity: RoadEntity) {
    if (entity.kind === 'coin') {
      const gained = this.boostTime > 0 ? 2 : 1
      this.coins += gained
      this.score += gained * 60
      this.showFeedback(`金币 +${gained}`, '#FFD35C')
      return
    }
    if (entity.kind === 'barrier') {
      if (this.shieldTime > 0) {
        this.score += 80
        this.showFeedback('护盾撞开了障碍', '#82F1DD')
        return
      }
      this.hearts -= 1
      this.score = Math.max(0, this.score - 100)
      this.cameras.main.shake(220, 0.009)
      this.showFeedback('撞到障碍，少一颗爱心', '#FFB3A7')
      if (this.hearts <= 0) this.finishGame(false)
      return
    }
    if (entity.kind === 'shield') {
      this.shieldTime = 7
      this.showFeedback('护盾开启 7 秒', '#82F1DD')
    }
    if (entity.kind === 'magnet') {
      this.magnetTime = 7
      this.showFeedback('金币吸附 7 秒', '#D6B6FF')
    }
    if (entity.kind === 'turbo') {
      this.boostCharges = Math.min(3, this.boostCharges + 1)
      this.showFeedback('获得氮气加速', '#FFD39B')
    }
  }

  private changeLane(direction: number) {
    if (this.paused || this.gameEnded) return
    this.laneIndex = Phaser.Math.Clamp(this.laneIndex + direction, 0, 2)
  }

  private useBoost() {
    if (this.paused || this.gameEnded || this.boostCharges <= 0 || this.boostTime > 0) return
    this.boostCharges -= 1
    this.boostTime = 4
    this.showFeedback('氮气加速！金币双倍', '#FFD39B')
  }

  private handleInput(action: GameAction) {
    if (action === GameAction.BACK) {
      if (this.gameEnded) this.returnToHub()
      else this.togglePause()
      return
    }
    if (action === GameAction.PAUSE) {
      this.togglePause()
      return
    }
    if (this.paused) {
      if (action === GameAction.CONFIRM || action === GameAction.OPTION_1) this.togglePause()
      return
    }
    if (this.gameEnded) {
      if (action === GameAction.CONFIRM) this.scene.restart()
      return
    }
    if (action === GameAction.LEFT) this.changeLane(-1)
    if (action === GameAction.RIGHT) this.changeLane(1)
    if (action === GameAction.CONFIRM || action === GameAction.OPTION_1) this.useBoost()
  }

  private togglePause() {
    if (this.gameEnded) return
    this.paused = !this.paused
    if (!this.paused) {
      this.pauseOverlay?.destroy(true)
      this.pauseOverlay = undefined
      return
    }
    const { width, height } = this.scale
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x081317, 0.78)
    const panel = this.add.rectangle(width / 2, height / 2, 420, 236, 0x102228, 0.98)
      .setStrokeStyle(3, 0x5BC6C1, 0.92)
    const title = this.add.text(width / 2, height / 2 - 60, '暂停比赛', {
      fontSize: '34px', color: '#F2FFFF', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)
    const resume = this.add.text(width / 2, height / 2 + 2, '继续冲刺', {
      fontSize: '22px', color: '#0D2730', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold', backgroundColor: '#8FE4D8', padding: { x: 34, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    const home = this.add.text(width / 2, height / 2 + 70, '返回放松站', {
      fontSize: '18px', color: '#F5FBFF', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', backgroundColor: '#325362', padding: { x: 26, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    resume.on('pointerdown', () => this.togglePause())
    home.on('pointerdown', () => this.returnToHub())
    this.pauseOverlay = this.add.container(0, 0, [shade, panel, title, resume, home]).setDepth(30)
  }

  private refreshHud() {
    const effects: string[] = []
    if (this.shieldTime > 0) effects.push(`护盾 ${Math.ceil(this.shieldTime)}s`)
    if (this.magnetTime > 0) effects.push(`吸附 ${Math.ceil(this.magnetTime)}s`)
    if (this.boostTime > 0) effects.push(`氮气 ${Math.ceil(this.boostTime)}s`)
    const speed = Math.round((this.boostTime > 0 ? 164 : 108) + this.level * 4)
    this.speedText.setText(`${speed}`)
    this.scoreText.setText(`${this.score}`)
    this.distanceText.setText(`${Math.min(this.finishDistance, Math.floor(this.distance))}m`)
    this.heartsText.setText(`${'●'.repeat(this.hearts)}${'○'.repeat(3 - this.hearts)}`)
    this.itemText.setText(`氮气 ${this.boostCharges}  ${effects.join(' · ')}`)
    this.levelText.setText(`${this.level}`)
    this.turnText.setText(this.boostTime > 0 ? '氮气冲刺中' : '三车道躲避')
  }

  private showFeedback(message: string, color: string) {
    this.feedbackText.setText(message).setColor(color).setAlpha(1)
    this.tweens.killTweensOf(this.feedbackText)
    this.tweens.add({ targets: this.feedbackText, alpha: 0, delay: 650, duration: 200 })
  }

  private finishGame(success: boolean) {
    if (this.gameEnded) return
    this.gameEnded = true
    this.obstacleEvent.remove(false)
    this.coinEvent.remove(false)
    this.itemEvent.remove(false)
    const starsEarned = success ? Math.min(3, 1 + Math.floor(this.coins / 12)) : Math.min(2, Math.floor(this.coins / 8))
    if (starsEarned > 0) useGameStore.getState().addStars(starsEarned)
    const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 480, 254, 0x102228, 0.98)
      .setStrokeStyle(4, success ? 0xF1BB52 : 0x6EA8B5)
    this.add.text(panel.x, panel.y - 66, success ? '安全到达终点！' : '先停下来休息一下', {
      fontSize: '32px', color: '#F4FFFF', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(panel.x, panel.y - 16, `得分 ${this.score} · 金币 ${this.coins} · 躲过 ${this.passedTraffic} 辆车`, {
      fontSize: '19px', color: '#CDE8E7', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    this.add.text(panel.x, panel.y + 22, starsEarned > 0 ? `获得 ${starsEarned} 枚星芽` : '再多收集一些金币吧', {
      fontSize: '18px', color: '#FFD76B', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    const restart = this.add.text(panel.x, panel.y + 80, '再跑一次', {
      fontSize: '22px', color: '#0F2830', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold', backgroundColor: '#8FE4D8', padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    restart.on('pointerdown', () => this.scene.restart())
  }

  private returnToHub() {
    this.scene.start('RelaxationHubScene')
  }

  private cleanup() {
    this.cleanupInput?.()
    this.cleanupInput = null
    this.obstacleEvent?.remove(false)
    this.coinEvent?.remove(false)
    this.itemEvent?.remove(false)
    this.entities.forEach((entity) => this.raceRenderer?.removeVisual(entity.visual))
    this.entities = []
    this.raceRenderer?.dispose()
    this.pauseOverlay?.destroy(true)
  }
}
