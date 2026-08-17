import Phaser from 'phaser'
import { GameAction, inputManager } from '../input/InputManager'
import { useGameStore } from '../store/gameStore'

type MoleKind = 'normal' | 'gold' | 'helmet' | 'bomb' | 'clock'
type MoleState = 'idle' | 'rising' | 'up' | 'hiding'
type MoleDifficulty = 'easy' | 'normal' | 'hard'

interface MoleSlot {
  index: number
  x: number
  y: number
  state: MoleState
  stateTime: number
  activeDuration: number
  kind: MoleKind | null
  health: number
  mole: Phaser.GameObjects.Container
  hitZone: Phaser.GameObjects.Ellipse
  selector: Phaser.GameObjects.Ellipse
}

const MOLE_DETAILS: Record<MoleKind, { label: string; color: number; value: number; health: number; duration: number }> = {
  normal: { label: '地鼠', color: 0xA96D3E, value: 1, health: 1, duration: 1.55 },
  gold: { label: '金鼠', color: 0xF5C84B, value: 3, health: 1, duration: 1.1 },
  helmet: { label: '头盔鼠', color: 0x8D9AA6, value: 2, health: 2, duration: 1.8 },
  bomb: { label: '炸弹', color: 0x3F4650, value: 0, health: 1, duration: 1.45 },
  clock: { label: '时钟鼠', color: 0x65B7DE, value: 1, health: 1, duration: 1.35 },
}

export class WhackAMoleScene extends Phaser.Scene {
  private slots: MoleSlot[] = []
  private cleanupInput: (() => void) | null = null
  private scoreText!: Phaser.GameObjects.Text
  private timerText!: Phaser.GameObjects.Text
  private livesText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text
  private accuracyText!: Phaser.GameObjects.Text
  private timerFill!: Phaser.GameObjects.Rectangle
  private feedbackText!: Phaser.GameObjects.Text
  private hammer!: Phaser.GameObjects.Container
  private startOverlay?: Phaser.GameObjects.Container
  private pauseOverlay?: Phaser.GameObjects.Container
  private selectedIndex = 4
  private score = 0
  private combo = 0
  private maxCombo = 0
  private lives = 4
  private timeLeft = 45
  private roundDuration = 45
  private spawnTimer = 0.6
  private attempts = 0
  private hits = 0
  private difficulty: MoleDifficulty = 'normal'
  private gameStarted = false
  private paused = false
  private gameEnded = false

  constructor() {
    super({ key: 'WhackAMoleScene' })
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#DFF3B7')
    this.createGarden(width, height)
    this.createPlayArea(width, height)
    this.createBackButton()
    this.createHud(width)
    this.createSlots(width, height)
    this.createTouchHint(width, height)
    this.createHammer()
    this.cleanupInput = inputManager.onInput((action) => this.handleInput(action))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())
    this.updateSelection(this.selectedIndex)
    this.createStartScreen(width, height)
    this.refreshHud()
  }

  update(_time: number, delta: number) {
    if (!this.gameStarted || this.paused || this.gameEnded) return
    const seconds = delta / 1000
    this.timeLeft = Math.max(0, this.timeLeft - seconds)
    this.spawnTimer -= seconds
    this.slots.forEach((slot) => this.updateSlot(slot, seconds))
    if (this.spawnTimer <= 0) this.spawnMole()
    this.refreshHud()
    if (this.timeLeft <= 0) this.finishGame()
  }

  private createGarden(width: number, height: number) {
    const graphics = this.add.graphics()
    graphics.fillGradientStyle(0xBCEB92, 0xBCEB92, 0x7FC65B, 0x7FC65B, 1)
    graphics.fillRect(0, 0, width, height)
    graphics.fillStyle(0xF6D979, 0.82)
    graphics.fillCircle(122, 154, 70)
    graphics.fillStyle(0xFFFFFF, 0.72)
    graphics.fillCircle(width - 135, 124, 55)
    graphics.fillCircle(width - 80, 140, 43)
    graphics.fillCircle(width - 185, 142, 35)
    graphics.fillStyle(0x6FAD50, 0.86)
    graphics.fillEllipse(width * 0.2, height + 40, width * 0.65, 260)
    graphics.fillEllipse(width * 0.8, height + 45, width * 0.7, 270)
    for (let index = 0; index < 30; index += 1) {
      const x = 36 + (index * 113) % (width - 72)
      const y = 155 + (index * 71) % (height - 180)
      graphics.lineStyle(2, index % 2 ? 0x4F963F : 0xA7D869, 0.55)
      graphics.lineBetween(x, y, x + 7, y - 15)
      graphics.lineBetween(x + 7, y, x + 13, y - 12)
    }
    for (let index = 0; index < 12; index += 1) {
      const x = 50 + (index * 137) % (width - 100)
      const y = 182 + (index * 97) % (height - 230)
      const color = index % 2 ? 0xF2A8AE : 0xF8E479
      graphics.fillStyle(color, 0.8)
      graphics.fillCircle(x - 6, y, 5)
      graphics.fillCircle(x + 6, y, 5)
      graphics.fillCircle(x, y - 6, 5)
      graphics.fillCircle(x, y + 6, 5)
      graphics.fillStyle(0xFFF7CB, 0.95)
      graphics.fillCircle(x, y, 3)
    }
  }

  private createPlayArea(width: number, height: number) {
    const area = this.add.zone(width / 2, height / 2 + 36, width - 36, height - 160)
      .setInteractive({ useHandCursor: true })
    area.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.moveHammer(pointer)
      this.missAttempt()
    })
  }

  private createBackButton() {
    const button = this.add.text(72, 42, '放松站', {
      fontSize: '17px',
      color: '#4B6630',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    button.on('pointerdown', () => this.returnToHub())
  }

  private createHud(width: number) {
    this.add.rectangle(width / 2, 48, 450, 74, 0xFFFFFF, 0.88)
      .setStrokeStyle(3, 0x88B852, 0.75)
    this.add.text(width / 2, 29, '打地鼠', {
      fontSize: '30px',
      color: '#4B6630',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.scoreText = this.add.text(width / 2 - 190, 66, '', {
      fontSize: '18px',
      color: '#8A561F',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5)
    this.timerText = this.add.text(width / 2, 66, '', {
      fontSize: '25px',
      color: '#4B6630',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.livesText = this.add.text(width / 2 + 190, 66, '', {
      fontSize: '17px',
      color: '#BB4652',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5)
    this.add.rectangle(width / 2, 94, 190, 8, 0xDCE8C8, 1).setOrigin(0.5)
    this.timerFill = this.add.rectangle(width / 2 - 95, 94, 190, 8, 0x79B84C, 1).setOrigin(0, 0.5)
    this.comboText = this.add.text(width / 2, 126, '', {
      fontSize: '20px',
      color: '#D78522',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setX(26)
    this.accuracyText = this.add.text(width - 26, 126, '', {
      fontSize: '17px',
      color: '#5B7D40',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5)
    this.feedbackText = this.add.text(width / 2, 640, '', {
      fontSize: '22px',
      color: '#6A4A27',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0)
    const pauseButton = this.add.text(width - 62, 42, 'II', {
      fontSize: '18px',
      color: '#F7F0D1',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#658D3D',
      padding: { x: 13, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    pauseButton.on('pointerdown', () => this.togglePause())
  }

  private createSlots(width: number, height: number) {
    const positions = [
      { x: width * 0.28, y: height * 0.34 },
      { x: width * 0.5, y: height * 0.31 },
      { x: width * 0.72, y: height * 0.34 },
      { x: width * 0.22, y: height * 0.54 },
      { x: width * 0.5, y: height * 0.51 },
      { x: width * 0.78, y: height * 0.54 },
      { x: width * 0.28, y: height * 0.74 },
      { x: width * 0.5, y: height * 0.71 },
      { x: width * 0.72, y: height * 0.74 },
    ]
    positions.forEach((position, index) => {
      this.add.ellipse(position.x, position.y + 24, 148, 66, 0x8A633B, 1)
      this.add.ellipse(position.x, position.y + 20, 126, 48, 0x2D1C12, 1)
      const mole = this.createMoleArt(position.x, position.y + 68, 'normal')
      mole.setVisible(false)
      const selector = this.add.ellipse(position.x, position.y + 2, 156, 74, 0xFFFFFF, 0)
        .setStrokeStyle(4, 0xF5D15A, 0)
      const hitZone = this.add.ellipse(position.x, position.y - 12, 112, 114, 0xFFFFFF, 0.001)
        .setInteractive({ useHandCursor: true })
      hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.moveHammer(pointer)
        this.updateSelection(index)
        this.whack(index)
      })
      this.add.ellipse(position.x, position.y + 35, 142, 40, 0x714A29, 0.9)
      this.slots.push({
        index,
        x: position.x,
        y: position.y,
        state: 'idle',
        stateTime: 0,
        activeDuration: 0,
        kind: null,
        health: 0,
        mole,
        hitZone,
        selector,
      })
    })
  }

  private createMoleArt(x: number, y: number, kind: MoleKind) {
    const detail = MOLE_DETAILS[kind]
    const items: Phaser.GameObjects.GameObject[] = []
    if (kind === 'bomb') {
      const bomb = this.add.circle(0, 3, 42, 0x303A43).setStrokeStyle(4, 0x182129)
      const shine = this.add.ellipse(-15, -12, 18, 12, 0xFFFFFF, 0.34)
      const fuseBase = this.add.rectangle(0, -38, 18, 12, 0x56636D).setStrokeStyle(2, 0x1C242A)
      const fuse = this.add.line(0, 0, 0, -44, 12, -62, 0xC69152, 1).setLineWidth(4, 4)
      const flame = this.add.circle(14, -64, 7, 0xFFD46B).setStrokeStyle(3, 0xFF7D43, 0.8)
      const leftEye = this.add.ellipse(-14, 0, 10, 14, 0xFF604F)
      const rightEye = this.add.ellipse(14, 0, 10, 14, 0xFF604F)
      const mouth = this.add.arc(0, 26, 11, 195, 345, false, 0xFF604F).setStrokeStyle(3, 0xFF604F)
      return this.add.container(x, y, [bomb, shine, fuseBase, fuse, flame, leftEye, rightEye, mouth])
    }

    const fur = kind === 'gold' ? 0xF0B943 : kind === 'helmet' ? 0x9B7044 : kind === 'clock' ? 0x8CB4CA : detail.color
    const darkFur = kind === 'gold' ? 0xC88C1D : kind === 'clock' ? 0x608CA7 : 0x81502C
    const belly = kind === 'gold' ? 0xFFE5A0 : kind === 'clock' ? 0xD1EAF4 : 0xE7BA8C
    items.push(
      this.add.circle(-28, -34, 14, darkFur).setStrokeStyle(2, 0xFFFFFF, 0.65),
      this.add.circle(28, -34, 14, darkFur).setStrokeStyle(2, 0xFFFFFF, 0.65),
      this.add.circle(-28, -34, 7, 0xF0B2A0, 0.85),
      this.add.circle(28, -34, 7, 0xF0B2A0, 0.85),
      this.add.ellipse(0, 2, 84, 88, fur).setStrokeStyle(3, 0xFFFFFF, 0.78),
      this.add.ellipse(0, 21, 51, 48, belly),
      this.add.ellipse(-15, -7, 17, 20, 0xFFFDF5),
      this.add.ellipse(15, -7, 17, 20, 0xFFFDF5),
      this.add.circle(-13, -6, 6, 0x29313A),
      this.add.circle(17, -6, 6, 0x29313A),
      this.add.circle(-15, -8, 2, 0xFFFFFF),
      this.add.circle(15, -8, 2, 0xFFFFFF),
      this.add.ellipse(0, 10, 18, 12, 0xE98D94),
      this.add.circle(-24, 13, 6, 0xE99B91, 0.72),
      this.add.circle(24, 13, 6, 0xE99B91, 0.72),
      this.add.rectangle(-5, 20, 7, 12, 0xFFFDF4).setStrokeStyle(1, 0xC8A17B),
      this.add.rectangle(5, 20, 7, 12, 0xFFFDF4).setStrokeStyle(1, 0xC8A17B),
      this.add.ellipse(-31, 34, 19, 12, darkFur),
      this.add.ellipse(31, 34, 19, 12, darkFur),
    )
    for (const side of [-1, 1]) {
      items.push(
        this.add.line(0, 0, side * 9, 9, side * 39, 3, 0x6B452C, 0.54).setLineWidth(2, 2),
        this.add.line(0, 0, side * 9, 14, side * 39, 19, 0x6B452C, 0.54).setLineWidth(2, 2),
      )
    }
    if (kind === 'gold') {
      const crown = this.add.polygon(0, -54, [-23, 14, -23, -9, -10, 2, 0, -13, 10, 2, 23, -9, 23, 14], 0xFFE394)
        .setStrokeStyle(2, 0xB97A18)
      const gem = this.add.circle(0, -51, 4, 0xE96863)
      items.push(crown, gem, this.add.text(0, -83, '+3', { fontSize: '17px', color: '#8A561F', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold' }).setOrigin(0.5))
    }
    if (kind === 'helmet') {
      const helmet = this.add.arc(0, -28, 38, 194, 346, false, 0xBDC8D2).setStrokeStyle(3, 0x61727F)
      const brim = this.add.rectangle(0, -18, 76, 9, 0x748593).setStrokeStyle(2, 0x51616D)
      items.push(helmet, brim, this.add.circle(-24, -29, 3, 0x65727C), this.add.circle(0, -35, 3, 0x65727C), this.add.circle(24, -29, 3, 0x65727C))
    }
    if (kind === 'clock') {
      items.push(
        this.add.circle(0, 21, 22, 0xF7FBFF).setStrokeStyle(3, 0x367AA2),
        this.add.rectangle(0, 13, 3, 17, 0x367AA2),
        this.add.rectangle(7, 24, 13, 3, 0x367AA2),
        this.add.text(0, -67, '+3s', { fontSize: '15px', color: '#EAF8FF', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold', stroke: '#367AA2', strokeThickness: 3 }).setOrigin(0.5),
      )
    }
    return this.add.container(x, y, items)
  }

  private createTouchHint(width: number, height: number) {
    this.add.text(width / 2, height - 26, '点击或轻触地鼠 · 方向键/手柄选洞 · 敲金鼠得高分，炸弹别点', {
      fontSize: '16px',
      color: '#4B6630',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
  }

  private createHammer() {
    const handle = this.add.rectangle(14, 28, 15, 78, 0x9B6538).setAngle(-28)
      .setStrokeStyle(2, 0x5D391F)
    const head = this.add.rectangle(-10, -20, 76, 28, 0xD66E4E).setAngle(-28)
      .setStrokeStyle(3, 0xFFF0C7)
    const cap = this.add.rectangle(-39, -34, 20, 30, 0xF2B35A).setAngle(-28)
    this.hammer = this.add.container(-100, -100, [handle, head, cap]).setDepth(18).setVisible(false)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.moveHammer(pointer))
  }

  private moveHammer(pointer: Phaser.Input.Pointer) {
    if (!this.gameStarted || this.paused || this.gameEnded) return
    this.hammer.setPosition(pointer.x + 22, pointer.y + 24).setVisible(true)
  }

  private swingHammer() {
    if (!this.hammer.visible) return
    this.tweens.killTweensOf(this.hammer)
    this.hammer.setRotation(-0.42).setScale(1.14)
    this.tweens.add({ targets: this.hammer, rotation: -0.04, scale: 1, duration: 125, ease: 'Back.easeOut' })
  }

  private updateSlot(slot: MoleSlot, seconds: number) {
    if (slot.state === 'idle') return
    slot.stateTime += seconds
    if (slot.state === 'rising') {
      const progress = Phaser.Math.Clamp(slot.stateTime / 0.16, 0, 1)
      slot.mole.setVisible(true).setY(slot.y + 68 - progress * 78).setAlpha(progress)
      if (progress >= 1) {
        slot.state = 'up'
        slot.stateTime = 0
      }
      return
    }
    if (slot.state === 'up') {
      slot.mole.setY(slot.y - 10 + Math.sin(slot.stateTime * 6) * 3)
      if (slot.stateTime >= slot.activeDuration) {
        if (slot.kind !== 'bomb') this.combo = 0
        slot.state = 'hiding'
        slot.stateTime = 0
      }
      return
    }
    const progress = Phaser.Math.Clamp(slot.stateTime / 0.18, 0, 1)
    slot.mole.setY(slot.y - 10 + progress * 78).setAlpha(1 - progress)
    if (progress >= 1) this.resetSlot(slot)
  }

  private spawnMole() {
    if (!this.gameStarted || this.paused || this.gameEnded) return
    const active = this.slots.filter((slot) => slot.state !== 'idle').length
    const maxActive = this.timeLeft < 22 ? 3 : 2
    if (active < maxActive) {
      const freeSlots = this.slots.filter((slot) => slot.state === 'idle')
      const slot = Phaser.Utils.Array.GetRandom(freeSlots)
      if (slot) {
        const kind = this.rollMoleKind()
        const detail = MOLE_DETAILS[kind]
        slot.kind = kind
        slot.health = detail.health
        slot.activeDuration = detail.duration * Phaser.Math.FloatBetween(0.86, 1.12)
        slot.state = 'rising'
        slot.stateTime = 0
        slot.mole.destroy()
        slot.mole = this.createMoleArt(slot.x, slot.y + 68, kind)
        slot.mole.setVisible(false)
      }
    }
    const pace = this.timeLeft < this.roundDuration * 0.4 ? 0.48 : this.timeLeft < this.roundDuration * 0.72 ? 0.66 : 0.86
    const difficultyMultiplier = this.difficulty === 'easy' ? 1.24 : this.difficulty === 'hard' ? 0.7 : 1
    this.spawnTimer = Phaser.Math.FloatBetween(pace * difficultyMultiplier, (pace + 0.26) * difficultyMultiplier)
  }

  private rollMoleKind(): MoleKind {
    const roll = Math.random()
    if (roll < 0.08) return 'bomb'
    if (roll < 0.19) return 'gold'
    if (roll < 0.3) return 'helmet'
    if (roll < 0.38) return 'clock'
    return 'normal'
  }

  private whack(index: number) {
    if (!this.gameStarted || this.paused || this.gameEnded) return
    this.attempts += 1
    this.swingHammer()
    const slot = this.slots[index]
    if (!slot || slot.state !== 'rising' && slot.state !== 'up' || !slot.kind) {
      this.combo = 0
      this.showFeedback('慢一点，等地鼠冒头再敲。', '#8A6A48')
      return
    }
    if (slot.kind === 'bomb') {
      this.lives -= 1
      this.combo = 0
      this.cameras.main.shake(180, 0.009)
      this.showFeedback('小心炸弹，少一颗爱心。', '#C94C50')
      this.hideSlot(slot, true)
      if (this.lives <= 0) this.finishGame()
      return
    }
    slot.health -= 1
    this.hits += 1
    slot.mole.setScale(1.16, 0.8)
    this.tweens.add({ targets: slot.mole, scaleX: 1, scaleY: 1, duration: 130, ease: 'Back.easeOut' })
    if (slot.health > 0) {
      this.showFeedback('头盔裂开啦，再敲一下！', '#526F80')
      return
    }
    const detail = MOLE_DETAILS[slot.kind]
    this.combo += 1
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    const multiplier = 1 + Math.floor(this.combo / 4)
    const gained = detail.value * multiplier
    this.score += gained
    if (slot.kind === 'clock') {
      this.timeLeft = Math.min(60, this.timeLeft + 3)
      this.showFeedback('+3 秒，继续加油！', '#377FA4')
    } else if (slot.kind === 'gold') {
      this.showFeedback(`金鼠！+${gained} 星芽`, '#B67B18')
    } else {
      this.showFeedback(this.combo >= 3 ? `${this.combo} 连击！+${gained}` : `命中！+${gained}`, '#4B7A32')
    }
    this.showHitBurst(slot.x, slot.y - 22, detail.color)
    this.hideSlot(slot, false)
  }

  private missAttempt() {
    if (!this.gameStarted || this.paused || this.gameEnded) return
    this.attempts += 1
    this.combo = 0
    this.swingHammer()
    this.showFeedback('看准洞口再敲！', '#8A6A48')
  }

  private hideSlot(slot: MoleSlot, fast: boolean) {
    slot.state = 'hiding'
    slot.stateTime = fast ? 0.08 : 0
  }

  private resetSlot(slot: MoleSlot) {
    slot.state = 'idle'
    slot.stateTime = 0
    slot.kind = null
    slot.health = 0
    slot.mole.setVisible(false).setAlpha(1).setY(slot.y + 68)
  }

  private handleInput(action: GameAction) {
    if (action === GameAction.BACK) {
      if (this.gameStarted && !this.gameEnded) this.togglePause()
      else this.returnToHub()
      return
    }
    if (action === GameAction.PAUSE) {
      this.togglePause()
      return
    }
    if (!this.gameStarted) {
      if (action === GameAction.CONFIRM || action === GameAction.OPTION_1) this.startGame('normal')
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
    if (action === GameAction.LEFT) this.moveSelection(0, -1)
    if (action === GameAction.RIGHT) this.moveSelection(0, 1)
    if (action === GameAction.UP) this.moveSelection(-1, 0)
    if (action === GameAction.DOWN) this.moveSelection(1, 0)
    if (action === GameAction.CONFIRM || action === GameAction.OPTION_1) this.whack(this.selectedIndex)
  }

  private createStartScreen(width: number, height: number) {
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x29451D, 0.88)
    const title = this.add.text(width / 2, 164, '打地鼠', {
      fontSize: '56px', color: '#FFF3C7', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold', stroke: '#9B5725', strokeThickness: 8,
    }).setOrigin(0.5)
    const subtitle = this.add.text(width / 2, 226, '看准时机，连击得分翻倍', {
      fontSize: '19px', color: '#E3F4BF', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    const hint = this.add.text(width / 2, 566, '鼠标点击或轻触 · 方向键/手柄选择 · Enter/A 敲击', {
      fontSize: '17px', color: '#F0FFE1', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    this.startOverlay = this.add.container(0, 0, [shade, title, subtitle, hint]).setDepth(30)
    const choices: Array<{ difficulty: MoleDifficulty; label: string; detail: string; color: number }> = [
      { difficulty: 'easy', label: '悠闲敲打', detail: '地鼠停留更久', color: 0x7DBA51 },
      { difficulty: 'normal', label: '欢乐挑战', detail: '推荐的游戏节奏', color: 0xE7A443 },
      { difficulty: 'hard', label: '闪电手速', detail: '更快更多地鼠', color: 0xD76755 },
    ]
    choices.forEach((choice, index) => {
      const y = 318 + index * 76
      const button = this.add.rectangle(width / 2, y, 340, 58, choice.color, 0.98)
        .setStrokeStyle(2, 0xFFF6D2, 0.9)
        .setInteractive({ useHandCursor: true })
      const label = this.add.text(width / 2 - 130, y - 8, choice.label, {
        fontSize: '23px', color: '#4B2D10', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold',
      }).setOrigin(0, 0.5)
      const detail = this.add.text(width / 2 - 130, y + 16, choice.detail, {
        fontSize: '14px', color: '#69451D', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      }).setOrigin(0, 0.5)
      button.on('pointerdown', () => this.startGame(choice.difficulty))
      this.startOverlay?.add([button, label, detail])
    })
  }

  private startGame(difficulty: MoleDifficulty) {
    this.difficulty = difficulty
    this.gameStarted = true
    this.roundDuration = difficulty === 'easy' ? 60 : difficulty === 'hard' ? 35 : 45
    this.timeLeft = this.roundDuration
    this.lives = difficulty === 'easy' ? 5 : difficulty === 'hard' ? 3 : 4
    this.spawnTimer = 0.42
    this.startOverlay?.destroy(true)
    this.startOverlay = undefined
  }

  private togglePause() {
    if (!this.gameStarted || this.gameEnded) return
    this.paused = !this.paused
    if (!this.paused) {
      this.pauseOverlay?.destroy(true)
      this.pauseOverlay = undefined
      return
    }
    const { width, height } = this.scale
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x29451D, 0.8)
    const panel = this.add.rectangle(width / 2, height / 2, 430, 250, 0xF8FFE8, 0.98)
      .setStrokeStyle(4, 0x83B857, 0.95)
    const title = this.add.text(width / 2, height / 2 - 66, '暂停敲打', {
      fontSize: '34px', color: '#4B6630', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)
    const resume = this.add.text(width / 2, height / 2 + 6, '继续游戏', {
      fontSize: '22px', color: '#4A2C0C', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold', backgroundColor: '#F3BD56', padding: { x: 34, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    const home = this.add.text(width / 2, height / 2 + 72, '返回放松站', {
      fontSize: '18px', color: '#F4F9E8', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', backgroundColor: '#6A9345', padding: { x: 26, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    resume.on('pointerdown', () => this.togglePause())
    home.on('pointerdown', () => this.returnToHub())
    this.pauseOverlay = this.add.container(0, 0, [shade, panel, title, resume, home]).setDepth(30)
  }

  private moveSelection(rowDelta: number, columnDelta: number) {
    const row = Math.floor(this.selectedIndex / 3)
    const column = this.selectedIndex % 3
    const nextRow = Phaser.Math.Wrap(row + rowDelta, 0, 3)
    const nextColumn = Phaser.Math.Wrap(column + columnDelta, 0, 3)
    this.updateSelection(nextRow * 3 + nextColumn)
  }

  private updateSelection(index: number) {
    this.selectedIndex = index
    this.slots.forEach((slot, slotIndex) => {
      const selected = slotIndex === index
      slot.selector.setStrokeStyle(4, 0xF5D15A, selected ? 1 : 0)
      slot.selector.setAlpha(selected ? 1 : 0)
    })
  }

  private refreshHud() {
    this.scoreText.setText(`得分 ${this.score}`)
    this.timerText.setText(`${Math.ceil(this.timeLeft)} 秒`)
    this.livesText.setText(`爱心 ${'●'.repeat(this.lives)}${'○'.repeat(4 - this.lives)}`)
    this.timerFill.width = 190 * Phaser.Math.Clamp(this.timeLeft / this.roundDuration, 0, 1)
    this.comboText.setText(this.combo >= 3 ? `${this.combo} 连击` : '')
    const accuracy = this.attempts === 0 ? 100 : Math.round(this.hits / this.attempts * 100)
    this.accuracyText.setText(`命中率 ${accuracy}%`)
  }

  private showFeedback(message: string, color: string) {
    this.feedbackText.setText(message).setColor(color).setAlpha(1)
    this.tweens.killTweensOf(this.feedbackText)
    this.tweens.add({ targets: this.feedbackText, alpha: 0, delay: 720, duration: 210 })
  }

  private showHitBurst(x: number, y: number, color: number) {
    const particles = this.add.particles(x, y, 'star', {
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.55, end: 0 },
      lifespan: 520,
      quantity: 10,
      emitting: false,
      tint: [color, 0xFFFFFF, 0xF7D857],
    })
    particles.explode()
    this.time.delayedCall(620, () => particles.destroy())
  }

  private finishGame() {
    if (this.gameEnded) return
    this.gameEnded = true
    const starsEarned = Math.min(3, Math.floor(this.score / 8))
    if (starsEarned > 0) useGameStore.getState().addStars(starsEarned)
    const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 480, 270, 0xFFFFFF, 0.97)
      .setStrokeStyle(4, 0x85B557, 0.9)
    this.add.text(panel.x, panel.y - 62, '这一轮结束啦！', {
      fontSize: '32px',
      color: '#4B6630',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    const accuracy = this.attempts === 0 ? 0 : Math.round(this.hits / this.attempts * 100)
    this.add.text(panel.x, panel.y - 22, `得分 ${this.score} · 最高连击 ${this.maxCombo}`, {
      fontSize: '21px',
      color: '#6E7F5A',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    this.add.text(panel.x, panel.y + 15, `命中 ${this.hits}/${this.attempts} · 命中率 ${accuracy}%`, {
      fontSize: '18px',
      color: '#6E7F5A',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    this.add.text(panel.x, panel.y + 49, starsEarned > 0 ? `获得 ${starsEarned} 枚星芽` : '再多敲几只地鼠就能获得星芽', {
      fontSize: '18px',
      color: '#A87722',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    const restart = this.add.text(panel.x, panel.y + 101, '再玩一次', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#75A848',
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
    this.startOverlay?.destroy(true)
    this.pauseOverlay?.destroy(true)
  }
}