import Phaser from 'phaser'
import { GameAction, inputManager } from '../input/InputManager'
import { useGameStore } from '../store/gameStore'

type MoleKind = 'normal' | 'gold' | 'helmet' | 'bomb' | 'clock'
type MoleState = 'idle' | 'rising' | 'up' | 'hiding'

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
  private timerFill!: Phaser.GameObjects.Rectangle
  private feedbackText!: Phaser.GameObjects.Text
  private selectedIndex = 4
  private score = 0
  private combo = 0
  private maxCombo = 0
  private lives = 4
  private timeLeft = 45
  private spawnTimer = 0.6
  private gameEnded = false

  constructor() {
    super({ key: 'WhackAMoleScene' })
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#DFF3B7')
    this.createGarden(width, height)
    this.createBackButton()
    this.createHud(width)
    this.createSlots(width, height)
    this.createTouchHint(width, height)
    this.cleanupInput = inputManager.onInput((action) => this.handleInput(action))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())
    this.updateSelection(this.selectedIndex)
    this.refreshHud()
  }

  update(_time: number, delta: number) {
    if (this.gameEnded) return
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
    graphics.fillStyle(0xDFF3B7, 1)
    graphics.fillRect(0, 0, width, height)
    graphics.fillStyle(0xA9D66D, 0.85)
    graphics.fillEllipse(width * 0.2, height + 40, width * 0.65, 260)
    graphics.fillEllipse(width * 0.8, height + 45, width * 0.7, 270)
    graphics.fillStyle(0xF7DB73, 0.65)
    graphics.fillCircle(110, 160, 76)
    graphics.fillStyle(0xFFFFFF, 0.72)
    graphics.fillCircle(width - 135, 130, 55)
    graphics.fillCircle(width - 80, 142, 43)
    graphics.fillCircle(width - 185, 146, 35)
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
    }).setOrigin(0.5)
    this.feedbackText = this.add.text(width / 2, 640, '', {
      fontSize: '22px',
      color: '#6A4A27',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0)
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
      hitZone.on('pointerdown', () => {
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
    const bodyColor = kind === 'bomb' ? 0x414852 : detail.color
    items.push(
      this.add.circle(0, 0, 43, bodyColor).setStrokeStyle(3, 0xFFFFFF, 0.78),
      this.add.circle(-29, -35, 15, bodyColor).setStrokeStyle(2, 0xFFFFFF, 0.7),
      this.add.circle(29, -35, 15, bodyColor).setStrokeStyle(2, 0xFFFFFF, 0.7),
      this.add.ellipse(-15, -7, 10, 14, 0x263340),
      this.add.ellipse(15, -7, 10, 14, 0x263340),
      this.add.ellipse(0, 14, 24, 14, 0xF1CFB3),
      this.add.circle(0, 10, 4, 0x603A2B),
    )
    if (kind === 'gold') {
      items.push(this.add.text(0, -66, '+3', { fontSize: '17px', color: '#8A561F', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold' }).setOrigin(0.5))
    }
    if (kind === 'helmet') {
      items.push(this.add.arc(0, -31, 34, 200, 340, false, 0xBFC9D0).setStrokeStyle(3, 0x687985))
    }
    if (kind === 'bomb') {
      items.push(
        this.add.circle(0, -4, 14, 0x262B31),
        this.add.rectangle(0, -52, 5, 18, 0xC67A35),
        this.add.circle(5, -63, 5, 0xF2C34D),
      )
    }
    if (kind === 'clock') {
      items.push(
        this.add.circle(0, -2, 23, 0xF7FBFF).setStrokeStyle(3, 0x367AA2),
        this.add.rectangle(0, -8, 3, 17, 0x367AA2),
        this.add.rectangle(7, 3, 13, 3, 0x367AA2),
      )
    }
    return this.add.container(x, y, items)
  }

  private createTouchHint(width: number, height: number) {
    this.add.text(width / 2, height - 26, '敲金鼠得高分 · 头盔鼠要敲两次 · 看见炸弹别点', {
      fontSize: '16px',
      color: '#4B6630',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
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
    const pace = this.timeLeft < 18 ? 0.48 : this.timeLeft < 32 ? 0.66 : 0.86
    this.spawnTimer = Phaser.Math.FloatBetween(pace, pace + 0.26)
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
    if (this.gameEnded) return
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
      this.returnToHub()
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
    this.timerFill.width = 190 * Phaser.Math.Clamp(this.timeLeft / 45, 0, 1)
    this.comboText.setText(this.combo >= 3 ? `${this.combo} 连击 · 得分翻倍` : '')
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
    const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 460, 235, 0xFFFFFF, 0.97)
      .setStrokeStyle(4, 0x85B557, 0.9)
    this.add.text(panel.x, panel.y - 62, '这一轮结束啦！', {
      fontSize: '32px',
      color: '#4B6630',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(panel.x, panel.y - 11, `得分 ${this.score} · 最高连击 ${this.maxCombo}`, {
      fontSize: '21px',
      color: '#6E7F5A',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    this.add.text(panel.x, panel.y + 24, starsEarned > 0 ? `获得 ${starsEarned} 枚星芽` : '再多敲几只地鼠就能获得星芽', {
      fontSize: '18px',
      color: '#A87722',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    const restart = this.add.text(panel.x, panel.y + 76, '再玩一次', {
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
  }
}