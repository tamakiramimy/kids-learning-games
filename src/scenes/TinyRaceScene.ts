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

interface RoadSection {
  start: number
  end: number
  curve: number
}

const ROAD_SECTIONS: RoadSection[] = [
  { start: 0, end: 110, curve: 0 },
  { start: 110, end: 250, curve: 0.72 },
  { start: 250, end: 340, curve: 0 },
  { start: 340, end: 490, curve: -0.82 },
  { start: 490, end: 580, curve: 0.2 },
  { start: 580, end: 740, curve: 0.58 },
  { start: 740, end: 860, curve: -0.42 },
]

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
  private pauseOverlay?: Phaser.GameObjects.Container
  private laneIndex = 1
  private coins = 0
  private distance = 0
  private hearts = 3
  private shieldTime = 0
  private magnetTime = 0
  private boostCharges = 0
  private boostTime = 0
  private elapsed = 0
  private paused = false
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
    this.createRoadInput(width, height)
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
    if (this.paused || this.gameEnded) return
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
    this.add.rectangle(width / 2, 48, width - 42, 76, 0x1D2932, 0.96)
      .setStrokeStyle(3, 0xF4B044, 0.9)
    this.add.rectangle(width / 2, 84, width - 70, 4, 0x5ED2CE, 0.9)
    this.add.text(width / 2, 28, '星芽拉力赛', {
      fontSize: '31px',
      color: '#FFF5DA',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.coinText = this.add.text(width / 2 - 232, 67, '', {
      fontSize: '18px',
      color: '#FFD66B',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5)
    this.distanceText = this.add.text(width / 2, 67, '', {
      fontSize: '20px',
      color: '#DFFBFA',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.heartsText = this.add.text(width / 2 + 232, 67, '', {
      fontSize: '17px',
      color: '#FFB3A7',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5)
    this.itemText = this.add.text(26, 114, '', {
      fontSize: '16px',
      color: '#246761',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0, 0.5)
    this.turnText = this.add.text(width - 26, 114, '', {
      fontSize: '16px',
      color: '#245B72',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5)
    this.feedbackText = this.add.text(width / 2, 153, '', {
      fontSize: '21px',
      color: '#A86D00',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0)
    const pauseButton = this.add.text(width - 64, 42, 'II', {
      fontSize: '18px',
      color: '#FFF6DF',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#26323D',
      padding: { x: 13, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    pauseButton.on('pointerdown', () => this.togglePause())
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
    const shadow = this.add.ellipse(0, 50, 104, 28, 0x1C2E39, 0.32)
    const rearWing = this.add.rectangle(0, -42, 84, 13, 0x26323D).setStrokeStyle(2, 0xF2F7ED, 0.7)
    const body = this.add.polygon(0, 4, [-42, 52, -48, 16, -29, -50, 29, -50, 48, 16, 42, 52], 0xEC574B)
      .setStrokeStyle(4, 0xFFF6D9, 0.96)
    const windshield = this.add.polygon(0, -20, [-23, 9, -16, -28, 16, -28, 23, 9], 0x9DE5ED)
      .setStrokeStyle(3, 0x477D96)
    const stripe = this.add.rectangle(0, 13, 13, 68, 0xFFE16E, 0.92)
    const hood = this.add.polygon(0, 35, [-31, -3, 31, -3, 40, 20, -40, 20], 0xD9413D)
    const leftLight = this.add.circle(-23, 38, 8, 0xFFF0A1).setStrokeStyle(2, 0xF18D3C)
    const rightLight = this.add.circle(23, 38, 8, 0xFFF0A1).setStrokeStyle(2, 0xF18D3C)
    const leftWheel = this.add.rectangle(-47, 16, 14, 50, 0x26323D).setStrokeStyle(2, 0xFFFFFF, 0.6)
    const rightWheel = this.add.rectangle(47, 16, 14, 50, 0x26323D).setStrokeStyle(2, 0xFFFFFF, 0.6)
    const shield = this.add.circle(0, 0, 70, 0x77DFD3, 0).setStrokeStyle(4, 0x77DFD3, 0)
    return this.add.container(x, y, [shadow, shield, leftWheel, rightWheel, rearWing, body, windshield, stripe, hood, leftLight, rightLight]).setDepth(12)
  }

  private createRoadInput(width: number, height: number) {
    const roadInput = this.add.zone(width / 2, (height + 184) / 2, width, height - 240)
      .setInteractive({ useHandCursor: true })
    roadInput.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.paused || this.gameEnded) return
      const lane = pointer.x < width * 0.34 ? 0 : pointer.x > width * 0.66 ? 2 : 1
      this.laneIndex = lane
    })
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
    createButton(126, '<', '#377C9D', () => this.changeLane(-1))
    createButton(width - 126, '>', '#377C9D', () => this.changeLane(1))
    createButton(width / 2, '加速', '#E28B39', () => this.useBoost())
    this.add.text(width / 2, height - 91, '轻触道路选车道，方向键或手柄切换，获得涡轮后加速', {
      fontSize: '15px',
      color: '#2E5E78',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
  }

  private drawRoad() {
    const { width, height } = this.scale
    const graphics = this.roadGraphics
    const horizon = 126
    graphics.clear()
    graphics.fillGradientStyle(0x76D5F3, 0x76D5F3, 0xDFF8FF, 0xDFF8FF, 1)
    graphics.fillRect(0, 0, width, height)
    graphics.fillStyle(0xFEF0AF, 0.82)
    graphics.fillCircle(width * 0.16, 116, 54)
    graphics.fillStyle(0x8CCB77, 1)
    graphics.fillRect(0, horizon, width, height - horizon)
    graphics.fillStyle(0x68A861, 0.9)
    graphics.beginPath()
    graphics.moveTo(0, horizon + 50)
    graphics.lineTo(width * 0.14, horizon - 18)
    graphics.lineTo(width * 0.31, horizon + 42)
    graphics.lineTo(width * 0.5, horizon - 5)
    graphics.lineTo(width * 0.7, horizon + 46)
    graphics.lineTo(width * 0.88, horizon - 12)
    graphics.lineTo(width, horizon + 42)
    graphics.lineTo(width, horizon + 88)
    graphics.lineTo(0, horizon + 88)
    graphics.closePath()
    graphics.fillPath()

    const left: { x: number; y: number }[] = []
    const right: { x: number; y: number }[] = []
    for (let y = horizon; y <= height + 22; y += 14) {
      const roadWidth = this.roadWidthAt(y)
      const center = this.roadCenterAt(y)
      left.push({ x: center - roadWidth / 2, y })
      right.push({ x: center + roadWidth / 2, y })
    }
    for (let index = 0; index < left.length - 1; index += 1) {
      const current = { left: left[index], right: right[index] }
      const next = { left: left[index + 1], right: right[index + 1] }
      const worldDistance = this.distance + (1 - index / (left.length - 1)) * 330
      const stripe = Math.floor(worldDistance / 18) % 2 === 0
      this.fillRoadQuad(graphics, current.left, current.right, next.right, next.left, stripe ? 0x4A535B : 0x3E474F)
      const shoulderWidth = Phaser.Math.Linear(4, 36, index / (left.length - 1))
      this.fillRoadQuad(
        graphics,
        { x: current.left.x - shoulderWidth, y: current.left.y },
        current.left,
        next.left,
        { x: next.left.x - shoulderWidth, y: next.left.y },
        stripe ? 0xF7E9CF : 0xE46E58,
      )
      this.fillRoadQuad(
        graphics,
        current.right,
        { x: current.right.x + shoulderWidth, y: current.right.y },
        { x: next.right.x + shoulderWidth, y: next.right.y },
        next.right,
        stripe ? 0xF7E9CF : 0xE46E58,
      )
    }

    for (const laneOffset of [-0.23, 0.23]) {
      for (let y = horizon + 26; y < height; y += 46) {
        const stripePhase = Math.floor((y + this.distance * 4) / 46)
        if (stripePhase % 2 !== 0) continue
        const yEnd = Math.min(height, y + 28)
        const lineWidth = Phaser.Math.Linear(2, 12, (y - horizon) / (height - horizon))
        graphics.lineStyle(lineWidth, 0xFFF7D5, 0.9)
        graphics.lineBetween(this.roadCenterAt(y) + this.roadWidthAt(y) * laneOffset, y, this.roadCenterAt(yEnd) + this.roadWidthAt(yEnd) * laneOffset, yEnd)
      }
    }

    for (let y = horizon + 44; y < height; y += 82) {
      const phase = Math.floor((y + this.distance * 2) / 82)
      const roadWidth = this.roadWidthAt(y)
      const center = this.roadCenterAt(y)
      const side = phase % 2 === 0 ? -1 : 1
      const scale = Phaser.Math.Linear(0.36, 1.18, (y - horizon) / (height - horizon))
      const treeX = center + side * (roadWidth / 2 + 32 * scale)
      graphics.fillStyle(0x4A9B5E, 1)
      graphics.fillRect(treeX - 3 * scale, y - 34 * scale, 6 * scale, 38 * scale)
      graphics.fillStyle(0x6FC479, 1)
      graphics.fillCircle(treeX - 9 * scale, y - 28 * scale, 15 * scale)
      graphics.fillCircle(treeX + 9 * scale, y - 25 * scale, 17 * scale)
    }
  }

  private roadCenterAt(y: number) {
    const horizon = 126
    const perspective = Phaser.Math.Clamp((y - horizon) / (this.scale.height - horizon), 0, 1)
    const currentCurve = this.roadCurveAt(this.distance)
    const upcomingCurve = this.roadCurveAt(this.distance + (1 - perspective) * 330)
    const curve = Phaser.Math.Linear(upcomingCurve, currentCurve, perspective)
    return this.scale.width / 2 + curve * 166 * (0.38 + perspective * 0.62)
  }

  private roadWidthAt(y: number) {
    return Phaser.Math.Linear(176, 780, Phaser.Math.Clamp((y - 126) / (this.scale.height - 126), 0, 1))
  }

  private laneX(lane: number, y: number) {
    return this.roadCenterAt(y) + lane * this.roadWidthAt(y) * 0.23
  }

  private roadCurveAt(distance: number) {
    const loopDistance = ((distance % 860) + 860) % 860
    const section = ROAD_SECTIONS.find((candidate) => loopDistance >= candidate.start && loopDistance < candidate.end) ?? ROAD_SECTIONS[0]
    const progress = Phaser.Math.Clamp((loopDistance - section.start) / (section.end - section.start), 0, 1)
    const eased = Math.sin(progress * Math.PI)
    return section.curve * eased
  }

  private fillRoadQuad(
    graphics: Phaser.GameObjects.Graphics,
    first: { x: number; y: number },
    second: { x: number; y: number },
    third: { x: number; y: number },
    fourth: { x: number; y: number },
    color: number,
  ) {
    graphics.fillStyle(color, 1)
    graphics.beginPath()
    graphics.moveTo(first.x, first.y)
    graphics.lineTo(second.x, second.y)
    graphics.lineTo(third.x, third.y)
    graphics.lineTo(fourth.x, fourth.y)
    graphics.closePath()
    graphics.fillPath()
  }

  private updatePlayer() {
    const targetX = this.laneX(this.laneIndex - 1, this.playerY)
    this.player.x += (targetX - this.player.x) * 0.14
    this.player.rotation = (targetX - this.player.x) * 0.002
    const shield = this.player.getAt(1) as Phaser.GameObjects.Arc
    shield.setStrokeStyle(4, 0x77DFD3, this.shieldTime > 0 ? 0.95 : 0)
  }

  private spawnBarrier(startY = -40, laneOverride?: number) {
    if (this.paused || this.gameEnded || this.entities.filter((entity) => entity.kind === 'barrier').length >= 4) return
    const lane = laneOverride ?? Phaser.Math.Between(-1, 1)
    const board = this.add.rectangle(0, 0, 82, 36, 0xF1A84F).setStrokeStyle(3, 0xFFFFFF, 0.9)
    const stripeA = this.add.rectangle(-19, 0, 10, 31, 0xFFFFFF).setAngle(-25)
    const stripeB = this.add.rectangle(19, 0, 10, 31, 0xFFFFFF).setAngle(-25)
    const warning = this.add.triangle(0, -26, 0, -17, -15, 10, 15, 10, 0xF4DA58).setStrokeStyle(2, 0xA86D00)
    const sprite = this.add.container(this.laneX(lane, startY), startY, [warning, board, stripeA, stripeB])
    this.entities.push({ kind: 'barrier', lane, sprite, speed: Phaser.Math.Between(154, 188) })
  }

  private spawnCoin(startY = -22, laneOverride?: number) {
    if (this.paused || this.gameEnded || this.entities.filter((entity) => entity.kind === 'coin').length >= 7) return
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
    if (this.paused || this.gameEnded || this.entities.some((entity) => entity.kind === 'shield' || entity.kind === 'turbo' || entity.kind === 'magnet')) return
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
      const depth = Phaser.Math.Clamp((entity.sprite.y - 126) / (this.scale.height - 126), 0, 1)
      const scale = Phaser.Math.Linear(0.34, 1.12, depth)
      entity.sprite.setScale(scale).setDepth(2 + depth * 8)
      if (entity.kind === 'coin') entity.sprite.rotation += seconds * 2.8
      else entity.sprite.rotation = 0
      if (entity.kind === 'coin' && this.magnetTime > 0 && entity.sprite.y > this.playerY - 230) {
        entity.sprite.x += (this.player.x - entity.sprite.x) * Math.min(1, seconds * 4)
      }
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, entity.sprite.x, entity.sprite.y) < 42 + scale * 26) {
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
    if (this.paused || this.gameEnded) return
    this.laneIndex = Phaser.Math.Clamp(this.laneIndex + direction, 0, 2)
  }

  private useBoost() {
    if (this.paused || this.gameEnded || this.boostCharges <= 0 || this.boostTime > 0) return
    this.boostCharges -= 1
    this.boostTime = 4
    this.showFeedback('涡轮加速！金币双倍', '#C86B1F')
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
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x18212B, 0.76)
    const panel = this.add.rectangle(width / 2, height / 2, 430, 250, 0xFFF7E3, 0.98)
      .setStrokeStyle(4, 0xE78736, 0.92)
    const title = this.add.text(width / 2, height / 2 - 66, '暂停比赛', {
      fontSize: '34px', color: '#2E5E78', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)
    const resume = this.add.text(width / 2, height / 2 + 6, '继续冲刺', {
      fontSize: '22px', color: '#FFF8E8', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold', backgroundColor: '#E88A31', padding: { x: 34, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    const home = this.add.text(width / 2, height / 2 + 72, '返回放松站', {
      fontSize: '18px', color: '#F5FBFF', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', backgroundColor: '#47758F', padding: { x: 26, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    resume.on('pointerdown', () => this.togglePause())
    home.on('pointerdown', () => this.returnToHub())
    this.pauseOverlay = this.add.container(0, 0, [shade, panel, title, resume, home]).setDepth(30)
  }

  private refreshHud() {
    const effects: string[] = []
    if (this.shieldTime > 0) effects.push(`护盾 ${Math.ceil(this.shieldTime)}s`)
    if (this.magnetTime > 0) effects.push(`吸附 ${Math.ceil(this.magnetTime)}s`)
    if (this.boostTime > 0) effects.push(`加速 ${Math.ceil(this.boostTime)}s`)
    const upcomingCurve = this.roadCurveAt(this.distance + 210)
    this.coinText.setText(`金币 ${this.coins}`)
    this.distanceText.setText(`${Math.min(this.finishDistance, Math.floor(this.distance))}/${this.finishDistance} 米`)
    this.heartsText.setText(`护航 ${'●'.repeat(this.hearts)}${'○'.repeat(3 - this.hearts)}`)
    this.itemText.setText(`涡轮 ${this.boostCharges} · ${effects.join(' · ')}`)
    this.turnText.setText(upcomingCurve > 0.12 ? '前方右弯' : upcomingCurve < -0.12 ? '前方左弯' : '前方直道')
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
    this.pauseOverlay?.destroy(true)
  }
}