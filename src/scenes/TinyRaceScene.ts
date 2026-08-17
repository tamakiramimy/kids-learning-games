import Phaser from 'phaser'
import { GameAction, inputManager } from '../input/InputManager'
import { useGameStore } from '../store/gameStore'

type RoadEntityKind = 'coin' | 'barrier' | 'shield' | 'turbo' | 'magnet'

interface RoadEntity {
  kind: RoadEntityKind
  lane: number
  sprite: Phaser.GameObjects.Container
  speed: number
}

export class TinyRaceScene extends Phaser.Scene {
  private readonly playerY = 583
  private readonly finishDistance = 540
  private roadGraphics!: Phaser.GameObjects.Graphics
  private player!: Phaser.GameObjects.Container
  private entities: RoadEntity[] = []
  private cleanupInput: (() => void) | null = null
  private obstacleEvent!: Phaser.Time.TimerEvent
  private coinEvent!: Phaser.Time.TimerEvent
  private itemEvent!: Phaser.Time.TimerEvent
  private coinText!: Phaser.GameObjects.Text
  private distanceText!: Phaser.GameObjects.Text
  private heartsText!: Phaser.GameObjects.Text
  private itemText!: Phaser.GameObjects.Text
  private turnText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private laneIndex = 1
  private coins = 0
  private distance = 0
  private hearts = 3
  private shieldTime = 0
  private magnetTime = 0
  private boostCharges = 0
  private boostTime = 0
  private elapsed = 0
  private gameEnded = false

  constructor() {
    super({ key: 'TinyRaceScene' })
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#BFEAFF')
    this.roadGraphics = this.add.graphics()
    this.drawRoad()
    this.createHeader(width)
    this.createBackButton()
    this.player = this.createPlayer(width / 2, this.playerY)
    this.createControls(width, height)
    this.obstacleEvent = this.time.addEvent({ delay: 1080, loop: true, callback: () => this.spawnBarrier() })
    this.coinEvent = this.time.addEvent({ delay: 560, loop: true, callback: () => this.spawnCoin() })
    this.itemEvent = this.time.addEvent({ delay: 4300, loop: true, callback: () => this.spawnItem() })
    this.spawnCoin(190, -1)
    this.spawnCoin(290, 1)
    this.spawnBarrier(160, 0)
    this.spawnItem('shield', 250, -1)
    this.cleanupInput = inputManager.onInput((action) => this.handleInput(action))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())
    this.refreshHud()
  }

  update(_time: number, delta: number) {
    if (this.gameEnded) return
    const seconds = delta / 1000
    this.elapsed += seconds
    const pace = this.boostTime > 0 ? 1.65 : 1
    this.distance += seconds * 15 * pace
    this.shieldTime = Math.max(0, this.shieldTime - seconds)
    this.magnetTime = Math.max(0, this.magnetTime - seconds)
    this.boostTime = Math.max(0, this.boostTime - seconds)
    this.drawRoad()
    this.updatePlayer()
    this.updateEntities(seconds, pace)
    this.refreshHud()
    if (this.distance >= this.finishDistance) this.finishGame(true)
  }

  private createHeader(width: number) {
    this.add.rectangle(width / 2, 48, 510, 74, 0xFFFFFF, 0.93)
      .setStrokeStyle(3, 0x6AA7C3, 0.8)
    this.add.text(width / 2, 29, '弯道赛车', {
      fontSize: '31px',
      color: '#2E5E78',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.coinText = this.add.text(width / 2 - 232, 67, '', {
      fontSize: '18px',
      color: '#A86D00',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5)
    this.distanceText = this.add.text(width / 2, 67, '', {
      fontSize: '20px',
      color: '#2E5E78',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.heartsText = this.add.text(width / 2 + 232, 67, '', {
      fontSize: '17px',
      color: '#C54B50',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5)
    this.itemText = this.add.text(26, 114, '', {
      fontSize: '16px',
      color: '#276C69',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0, 0.5)
    this.turnText = this.add.text(width - 26, 114, '', {
      fontSize: '16px',
      color: '#2E5E78',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5)
    this.feedbackText = this.add.text(width / 2, 153, '', {
      fontSize: '21px',
      color: '#A86D00',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0)
  }

  private createBackButton() {
    const button = this.add.text(74, 42, '放松站', {
      fontSize: '17px',
      color: '#2E5E78',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    button.on('pointerdown', () => this.returnToHub())
  }

  private createPlayer(x: number, y: number) {
    const shadow = this.add.ellipse(0, 38, 90, 25, 0x1C2E39, 0.28)
    const body = this.add.rectangle(0, 0, 68, 118, 0xF0524D)
      .setStrokeStyle(4, 0xFFFFFF, 0.92)
    const windshield = this.add.rectangle(0, -21, 43, 38, 0xA6E9F4)
      .setStrokeStyle(3, 0x4F8AA6)
    const hood = this.add.rectangle(0, 30, 48, 34, 0xED3A42)
    const leftLight = this.add.circle(-19, 39, 7, 0xFFE58A)
    const rightLight = this.add.circle(19, 39, 7, 0xFFE58A)
    const leftWheel = this.add.rectangle(-39, 15, 12, 48, 0x26323D).setStrokeStyle(2, 0xFFFFFF, 0.6)
    const rightWheel = this.add.rectangle(39, 15, 12, 48, 0x26323D).setStrokeStyle(2, 0xFFFFFF, 0.6)
    const shield = this.add.circle(0, 0, 70, 0x77DFD3, 0).setStrokeStyle(4, 0x77DFD3, 0)
    return this.add.container(x, y, [shadow, shield, leftWheel, rightWheel, body, windshield, hood, leftLight, rightLight])
  }

  private createControls(width: number, height: number) {
    const createButton = (x: number, label: string, color: string, callback: () => void) => {
      const button = this.add.text(x, height - 53, label, {
        fontSize: '22px',
        color: '#FFFFFF',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontStyle: 'bold',
        backgroundColor: color,
        padding: { x: 25, y: 13 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      button.on('pointerdown', callback)
    }
    createButton(126, '左', '#4D89A5', () => this.changeLane(-1))
    createButton(width - 126, '右', '#4D89A5', () => this.changeLane(1))
    createButton(width / 2, '加速', '#E28B39', () => this.useBoost())
    this.add.text(width / 2, height - 91, '通过涡轮道具获得加速次数', {
      fontSize: '15px',
      color: '#2E5E78',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
  }

  private drawRoad() {
    const { width, height } = this.scale
    const graphics = this.roadGraphics
    graphics.clear()
    graphics.fillStyle(0xBFEAFF, 1)
    graphics.fillRect(0, 0, width, height)
    graphics.fillStyle(0x88C971, 1)
    graphics.fillRect(0, 118, width, height - 118)

    const left: { x: number; y: number }[] = []
    const right: { x: number; y: number }[] = []
    for (let y = 105; y <= height + 20; y += 14) {
      const roadWidth = this.roadWidthAt(y)
      const center = this.roadCenterAt(y)
      left.push({ x: center - roadWidth / 2, y })
      right.push({ x: center + roadWidth / 2, y })
    }
    graphics.fillStyle(0x5D6972, 1)
    graphics.beginPath()
    graphics.moveTo(left[0].x, left[0].y)
    left.slice(1).forEach((point) => graphics.lineTo(point.x, point.y))
    right.reverse().forEach((point) => graphics.lineTo(point.x, point.y))
    graphics.closePath()
    graphics.fillPath()

    for (let index = 0; index < left.length - 1; index += 1) {
      const highlighted = Math.floor((index + this.distance * 0.12) / 2) % 2 === 0
      graphics.lineStyle(10, highlighted ? 0xF8F2E7 : 0xD95D50, 1)
      graphics.lineBetween(left[index].x + 5, left[index].y, left[index + 1].x + 5, left[index + 1].y)
      graphics.lineBetween(right[index].x - 5, right[index].y, right[index + 1].x - 5, right[index + 1].y)
    }

    for (const laneOffset of [-0.23, 0.23]) {
      for (let y = 128; y < height; y += 48) {
        const stripePhase = Math.floor((y + this.distance * 4) / 48)
        if (stripePhase % 2 !== 0) continue
        const yEnd = Math.min(height, y + 26)
        graphics.lineStyle(5, 0xF7F1D8, 0.86)
        graphics.lineBetween(
          this.roadCenterAt(y) + this.roadWidthAt(y) * laneOffset,
          y,
          this.roadCenterAt(yEnd) + this.roadWidthAt(yEnd) * laneOffset,
          yEnd,
        )
      }
    }

    for (let y = 160; y < height; y += 95) {
      const phase = Math.floor((y + this.distance * 2) / 95)
      const roadWidth = this.roadWidthAt(y)
      const center = this.roadCenterAt(y)
      const side = phase % 2 === 0 ? -1 : 1
      const treeX = center + side * (roadWidth / 2 + 42)
      graphics.fillStyle(0x4A9B5E, 1)
      graphics.fillCircle(treeX, y, 19)
      graphics.fillStyle(0x6FC479, 1)
      graphics.fillCircle(treeX - 8, y - 11, 13)
      graphics.fillCircle(treeX + 9, y - 8, 15)
    }
  }

  private roadCenterAt(y: number) {
    const travel = this.distance * 0.017
    return this.scale.width / 2
      + Math.sin(travel + y * 0.008) * 94
      + Math.sin(travel * 0.55 + y * 0.017) * 37
  }

  private roadWidthAt(y: number) {
    return Phaser.Math.Linear(330, 690, Phaser.Math.Clamp((y - 105) / (this.scale.height - 105), 0, 1))
  }

  private laneX(lane: number, y: number) {
    return this.roadCenterAt(y) + lane * this.roadWidthAt(y) * 0.23
  }

  private updatePlayer() {
    const targetX = this.laneX(this.laneIndex - 1, this.playerY)
    this.player.x += (targetX - this.player.x) * 0.14
    this.player.rotation = (targetX - this.player.x) * 0.002
    const shield = this.player.getAt(1) as Phaser.GameObjects.Arc
    shield.setStrokeStyle(4, 0x77DFD3, this.shieldTime > 0 ? 0.95 : 0)
  }

  private spawnBarrier(startY = -40, laneOverride?: number) {
    if (this.gameEnded || this.entities.filter((entity) => entity.kind === 'barrier').length >= 4) return
    const lane = laneOverride ?? Phaser.Math.Between(-1, 1)
    const board = this.add.rectangle(0, 0, 82, 36, 0xF1A84F).setStrokeStyle(3, 0xFFFFFF, 0.9)
    const stripeA = this.add.rectangle(-19, 0, 10, 31, 0xFFFFFF).setAngle(-25)
    const stripeB = this.add.rectangle(19, 0, 10, 31, 0xFFFFFF).setAngle(-25)
    const warning = this.add.triangle(0, -26, 0, -17, -15, 10, 15, 10, 0xF4DA58).setStrokeStyle(2, 0xA86D00)
    const sprite = this.add.container(this.laneX(lane, startY), startY, [warning, board, stripeA, stripeB])
    this.entities.push({ kind: 'barrier', lane, sprite, speed: Phaser.Math.Between(154, 188) })
  }

  private spawnCoin(startY = -22, laneOverride?: number) {
    if (this.gameEnded || this.entities.filter((entity) => entity.kind === 'coin').length >= 7) return
    const lane = laneOverride ?? Phaser.Math.Between(-1, 1)
    const coin = this.add.circle(0, 0, 17, 0xF8CB4D).setStrokeStyle(4, 0xFFF4BE)
    const mark = this.add.text(0, 1, '★', {
      fontSize: '17px',
      color: '#A86D00',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    const sprite = this.add.container(this.laneX(lane, startY), startY, [coin, mark])
    this.entities.push({ kind: 'coin', lane, sprite, speed: Phaser.Math.Between(138, 162) })
  }

  private spawnItem(kindOverride?: Exclude<RoadEntityKind, 'coin' | 'barrier'>, startY = -35, laneOverride?: number) {
    if (this.gameEnded || this.entities.some((entity) => entity.kind === 'shield' || entity.kind === 'turbo' || entity.kind === 'magnet')) return
    const kind = kindOverride ?? Phaser.Utils.Array.GetRandom(['shield', 'turbo', 'magnet'] as const)
    const style: Record<RoadEntityKind, { label: string; color: number }> = {
      coin: { label: '★', color: 0xF8CB4D },
      barrier: { label: '', color: 0xF1A84F },
      shield: { label: '盾', color: 0x6ED0C2 },
      turbo: { label: '快', color: 0xE88A31 },
      magnet: { label: '吸', color: 0xA08CE5 },
    }
    const itemStyle = style[kind]
    const orb = this.add.circle(0, 0, 24, itemStyle.color).setStrokeStyle(4, 0xFFFFFF, 0.9)
    const label = this.add.text(0, 1, itemStyle.label, {
      fontSize: '18px',
      color: '#2E5E78',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    const lane = laneOverride ?? Phaser.Math.Between(-1, 1)
    const sprite = this.add.container(this.laneX(lane, startY), startY, [orb, label])
    this.entities.push({ kind, lane, sprite, speed: 146 })
  }

  private updateEntities(seconds: number, pace: number) {
    this.entities = this.entities.filter((entity) => {
      entity.sprite.y += entity.speed * seconds * pace
      entity.sprite.x = this.laneX(entity.lane, entity.sprite.y)
      entity.sprite.rotation += entity.kind === 'coin' ? seconds * 2.8 : seconds * 0.8
      if (entity.kind === 'coin' && this.magnetTime > 0 && entity.sprite.y > this.playerY - 230) {
        entity.sprite.x += (this.player.x - entity.sprite.x) * Math.min(1, seconds * 4)
      }
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, entity.sprite.x, entity.sprite.y) < 56) {
        this.resolveEntity(entity)
        entity.sprite.destroy()
        return false
      }
      if (entity.sprite.y > this.scale.height + 65) {
        entity.sprite.destroy()
        return false
      }
      return true
    })
  }

  private resolveEntity(entity: RoadEntity) {
    if (entity.kind === 'coin') {
      this.coins += this.boostTime > 0 ? 2 : 1
      this.showFeedback(`金币 +${this.boostTime > 0 ? 2 : 1}`, '#A86D00')
      return
    }
    if (entity.kind === 'barrier') {
      if (this.shieldTime > 0) {
        this.showFeedback('护盾撞开了路障', '#247E75')
        this.showBurst(entity.sprite.x, entity.sprite.y, 0x6ED0C2)
        return
      }
      this.hearts -= 1
      this.cameras.main.shake(180, 0.008)
      this.player.setAlpha(0.4)
      this.tweens.add({ targets: this.player, alpha: 1, duration: 300 })
      this.showFeedback('撞到路障，少一颗爱心', '#C54B50')
      if (this.hearts <= 0) this.finishGame(false)
      return
    }
    if (entity.kind === 'shield') {
      this.shieldTime = 7
      this.showFeedback('护盾开启 7 秒', '#247E75')
    }
    if (entity.kind === 'magnet') {
      this.magnetTime = 7
      this.showFeedback('金币吸附 7 秒', '#6C58B4')
    }
    if (entity.kind === 'turbo') {
      this.boostCharges = Math.min(3, this.boostCharges + 1)
      this.showFeedback('获得涡轮，按加速使用', '#C86B1F')
    }
  }

  private changeLane(direction: number) {
    if (this.gameEnded) return
    this.laneIndex = Phaser.Math.Clamp(this.laneIndex + direction, 0, 2)
  }

  private useBoost() {
    if (this.gameEnded || this.boostCharges <= 0 || this.boostTime > 0) return
    this.boostCharges -= 1
    this.boostTime = 4
    this.showFeedback('涡轮加速！金币双倍', '#C86B1F')
  }

  private handleInput(action: GameAction) {
    if (action === GameAction.BACK) {
      this.returnToHub()
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

  private refreshHud() {
    const effects: string[] = []
    if (this.shieldTime > 0) effects.push(`护盾 ${Math.ceil(this.shieldTime)}s`)
    if (this.magnetTime > 0) effects.push(`吸附 ${Math.ceil(this.magnetTime)}s`)
    if (this.boostTime > 0) effects.push(`加速 ${Math.ceil(this.boostTime)}s`)
    const wave = Math.sin(this.distance * 0.017 + this.playerY * 0.008)
    this.coinText.setText(`金币 ${this.coins}`)
    this.distanceText.setText(`${Math.min(this.finishDistance, Math.floor(this.distance))}/${this.finishDistance} 米`)
    this.heartsText.setText(`护航 ${'●'.repeat(this.hearts)}${'○'.repeat(3 - this.hearts)}`)
    this.itemText.setText(`涡轮 ${this.boostCharges} · ${effects.join(' · ')}`)
    this.turnText.setText(wave > 0.12 ? '前方右弯' : wave < -0.12 ? '前方左弯' : '前方直道')
    const shield = this.player?.getAt(1) as Phaser.GameObjects.Arc | undefined
    if (shield) shield.setStrokeStyle(4, 0x6ED0C2, this.shieldTime > 0 ? 0.92 : 0)
  }

  private showFeedback(message: string, color: string) {
    this.feedbackText.setText(message).setColor(color).setAlpha(1)
    this.tweens.killTweensOf(this.feedbackText)
    this.tweens.add({ targets: this.feedbackText, alpha: 0, delay: 600, duration: 200 })
  }

  private showBurst(x: number, y: number, color: number) {
    const particles = this.add.particles(x, y, 'star', {
      speed: { min: 70, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.55, end: 0 },
      lifespan: 480,
      quantity: 10,
      emitting: false,
      tint: [color, 0xFFFFFF],
    })
    particles.explode()
    this.time.delayedCall(580, () => particles.destroy())
  }

  private finishGame(success: boolean) {
    if (this.gameEnded) return
    this.gameEnded = true
    this.obstacleEvent.remove(false)
    this.coinEvent.remove(false)
    this.itemEvent.remove(false)
    const starsEarned = success ? Math.min(3, 1 + Math.floor(this.coins / 10)) : Math.min(2, Math.floor(this.coins / 8))
    if (starsEarned > 0) useGameStore.getState().addStars(starsEarned)
    const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 480, 240, 0xFFFFFF, 0.97)
      .setStrokeStyle(4, success ? 0xE88A31 : 0x83A8BA)
    this.add.text(panel.x, panel.y - 66, success ? '安全到达终点！' : '先停下来休息一下', {
      fontSize: '32px',
      color: '#2E5E78',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(panel.x, panel.y - 14, `收集 ${this.coins} 枚金币 · 行驶 ${Math.floor(this.distance)} 米`, {
      fontSize: '20px',
      color: '#587389',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    this.add.text(panel.x, panel.y + 22, starsEarned > 0 ? `获得 ${starsEarned} 枚星芽` : '再多收集一些金币吧', {
      fontSize: '18px',
      color: '#A87722',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    const restart = this.add.text(panel.x, panel.y + 77, '再跑一次', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#E88A31',
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
    this.obstacleEvent?.remove(false)
    this.coinEvent?.remove(false)
    this.itemEvent?.remove(false)
  }
}