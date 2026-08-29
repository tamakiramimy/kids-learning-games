import Phaser from 'phaser'
import { audioManager } from '../audio/AudioManager'
import { GameAction, inputManager } from '../input/InputManager'
import { CONTROL_PROFILES } from '../input/controlProfiles'
import { useGameStore } from '../store/gameStore'

type FlightItemKind = 'power' | 'shield' | 'turbo' | 'magnet' | 'star'
type FlightDifficulty = 'easy' | 'normal' | 'hard'

interface FlightEnemy {
  sprite: Phaser.GameObjects.Container
  health: number
  speed: number
  drift: number
  phase: number
  points: number
}

interface FlightItem {
  kind: FlightItemKind
  sprite: Phaser.GameObjects.Container
  speed: number
}

export class ThunderFlightScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container
  private enemyBullets: Phaser.GameObjects.Rectangle[] = []
  private enemies: FlightEnemy[] = []
  private items: FlightItem[] = []
  private stars: Phaser.GameObjects.Arc[] = []
  private cleanupInput: (() => void) | null = null
  private enemyEvent?: Phaser.Time.TimerEvent
  private itemEvent?: Phaser.Time.TimerEvent
  private fireEvent?: Phaser.Time.TimerEvent
  private startOverlay?: Phaser.GameObjects.Container
  private pauseOverlay?: Phaser.GameObjects.Container
  private scoreText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text
  private heartsText!: Phaser.GameObjects.Text
  private powerText!: Phaser.GameObjects.Text
  private effectText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text
  private score = 0
  private wave = 1
  private defeatedInWave = 0
  private goalForWave = 6
  private power = 1
  private storms = 2
  private combo = 0
  private comboTimer = 0
  private shieldTime = 0
  private turboTime = 0
  private magnetTime = 0
  private elapsed = 0
  private difficulty: FlightDifficulty = 'normal'
  private gameStarted = false
  private paused = false
  private gameEnded = false

  constructor() {
    super({ key: 'ThunderFlightScene' })
  }

  create() {
    this.cleanupInput?.()
    this.cleanupInput = null
    this.enemyEvent?.remove(false)
    this.itemEvent?.remove(false)
    this.fireEvent?.remove(false)
    this.enemyBullets = []
    this.enemies = []
    this.items = []
    this.stars = []
    this.startOverlay = undefined
    this.pauseOverlay = undefined
    this.score = 0
    this.wave = 1
    this.defeatedInWave = 0
    this.goalForWave = 6
    this.power = 1
    this.storms = 2
    this.combo = 0
    this.comboTimer = 0
    this.shieldTime = 0
    this.turboTime = 0
    this.magnetTime = 0
    this.elapsed = 0
    this.difficulty = 'normal'
    this.gameStarted = false
    this.paused = false
    this.gameEnded = false

    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#0E1740')
    this.createSky(width, height)
    this.createHeader(width)
    this.createBackButton()
    this.createFlightZone(width, height)
    this.player = this.createPlayer(width / 2, height - 118)
    this.cleanupInput = inputManager.onInput((action) => this.handleInput(action))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())
    this.createStartScreen(width, height)
    inputManager.setControlProfile(CONTROL_PROFILES.flightStart)
    this.refreshHud()
  }

  update(_time: number, delta: number) {
    if (!this.gameStarted || this.paused || this.gameEnded) return
    const seconds = delta / 1000
    const direction = inputManager.getDirection()
    if (Math.abs(direction.x) > 0.1 || Math.abs(direction.y) > 0.1) this.movePlayerByAxis(direction.x, direction.y, seconds)
    this.elapsed += seconds
    this.comboTimer = Math.max(0, this.comboTimer - seconds)
    if (this.comboTimer === 0) this.combo = 0
    this.shieldTime = Math.max(0, this.shieldTime - seconds)
    this.turboTime = Math.max(0, this.turboTime - seconds)
    this.magnetTime = Math.max(0, this.magnetTime - seconds)
    this.updateStarfield(delta)
    this.updateBullets(delta)
    this.updateEnemies(delta)
    this.updateItems(delta)
    this.refreshHud()
  }

  private createSky(width: number, height: number) {
    const graphics = this.add.graphics()
    const gradient = graphics.fillGradientStyle(0x0D1538, 0x0D1538, 0x211447, 0x211447, 1)
    gradient.fillRect(0, 0, width, height)
    for (let index = 0; index < 75; index += 1) {
      const star = this.add.circle(
        (index * 97) % width,
        95 + ((index * 57) % (height - 170)),
        index % 5 === 0 ? 2.4 : 1.2,
        index % 7 === 0 ? 0xF9E7A4 : 0xA8D8FF,
        0.75,
      )
      star.setData('speed', 22 + (index % 5) * 12)
      this.stars.push(star)
    }
  }

  private createHeader(width: number) {
    this.add.rectangle(width / 2, 49, 466, 74, 0x172553, 0.92)
      .setStrokeStyle(2, 0x668FDB, 0.78)
    this.add.text(width / 2, 29, '雷光飞行', {
      fontSize: '30px',
      color: '#F3F7FF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.scoreText = this.add.text(width / 2 - 212, 66, '', {
      fontSize: '18px',
      color: '#FFE58A',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5)
    this.waveText = this.add.text(width / 2, 66, '', {
      fontSize: '18px',
      color: '#B8D8FF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.heartsText = this.add.text(width / 2 + 212, 66, '', {
      fontSize: '17px',
      color: '#FFB9C4',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5)
    this.powerText = this.add.text(26, 115, '', {
      fontSize: '16px',
      color: '#D4E6FF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0, 0.5)
    this.effectText = this.add.text(this.scale.width - 26, 115, '', {
      fontSize: '16px',
      color: '#A9F5DB',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(1, 0.5)
    this.comboText = this.add.text(width / 2, 108, '', {
      fontSize: '19px',
      color: '#FFE58A',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    const pauseButton = this.add.text(width - 64, 42, 'II', {
      fontSize: '18px',
      color: '#DCEBFF',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#304A8A',
      padding: { x: 13, y: 9 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    pauseButton.on('pointerdown', () => this.togglePause())
  }

  private createBackButton() {
    const button = this.add.text(74, 42, '放松站', {
      fontSize: '17px',
      color: '#253B68',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    button.on('pointerdown', () => this.returnToHub())
  }

  private createPlayer(x: number, y: number) {
    const leftFlame = this.add.triangle(-9, 39, -7, 20, 4, 20, -9, 58, 0x66D8FF, 0.82)
    const rightFlame = this.add.triangle(9, 39, -4, 20, 7, 20, 9, 58, 0x66D8FF, 0.82)
    const aura = this.add.circle(0, 0, 48, 0x7FE4FF, 0).setStrokeStyle(3, 0x7FE4FF, 0)
    const leftWing = this.add.polygon(0, 0, [-5, -8, -52, 26, -19, 26, -4, 16], 0x71B5F2)
      .setStrokeStyle(3, 0xD7F0FF, 0.9)
    const rightWing = this.add.polygon(0, 0, [5, -8, 52, 26, 19, 26, 4, 16], 0x4D8DD3)
      .setStrokeStyle(3, 0xD7F0FF, 0.9)
    const hull = this.add.polygon(0, 0, [0, -54, 13, -17, 18, 30, 0, 43, -18, 30, -13, -17], 0xEEF8FF)
      .setStrokeStyle(3, 0x5B8ED2, 0.95)
    const hullShade = this.add.polygon(4, 3, [0, -49, 9, -16, 13, 25, 0, 35], 0x83B7E8)
    const cockpit = this.add.ellipse(0, -13, 19, 29, 0x8CE9FF)
      .setStrokeStyle(2, 0xFFFFFF, 0.9)
    const noseLight = this.add.circle(0, -23, 4, 0xFFFFFF, 0.95)
    this.tweens.add({ targets: [leftFlame, rightFlame], scaleY: 0.72, yoyo: true, repeat: -1, duration: 95 })
    return this.add.container(x, y, [aura, leftFlame, rightFlame, leftWing, rightWing, hull, hullShade, cockpit, noseLight])
  }

  private createFlightZone(width: number, height: number) {
    const zone = this.add.zone(width / 2, (height + 92) / 2, width, height - 236)
      .setInteractive({ useHandCursor: true })
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.movePlayerTo(pointer.x, pointer.y))
    zone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) this.movePlayerTo(pointer.x, pointer.y)
    })
  }

  private spawnEnemy(startY = -54, startX?: number) {
    if (!this.gameStarted || this.paused || this.gameEnded || this.enemies.length >= 7) return
    const width = this.scale.width
    const health = this.wave >= 3 && Math.random() < 0.25 ? 2 : 1
    const hue = health === 2 ? 0xEF8B61 : 0xA58AEB
    const shadow = this.add.ellipse(0, 19, 44, 15, 0x080D2B, 0.3)
    const leftWing = this.add.polygon(0, 0, [-4, -16, -34, 13, -13, 18, -2, 8], hue)
      .setStrokeStyle(2, 0xF7EDFF, 0.7)
    const rightWing = this.add.polygon(0, 0, [4, -16, 34, 13, 13, 18, 2, 8], hue)
      .setStrokeStyle(2, 0xF7EDFF, 0.7)
    const hull = this.add.polygon(0, 0, [0, -30, 15, -5, 11, 24, 0, 31, -11, 24, -15, -5], health === 2 ? 0xD9684F : 0x735FC4)
      .setStrokeStyle(3, 0xF8F4FF, 0.75)
    const core = this.add.ellipse(0, -3, 15, 20, health === 2 ? 0xFFE28B : 0xA8E4FF)
    const thruster = this.add.circle(0, 25, 5, 0xFFBF72, 0.88)
    const sprite = this.add.container(startX ?? Phaser.Math.Between(80, width - 80), startY, [shadow, leftWing, rightWing, hull, core, thruster])
    this.enemies.push({
      sprite,
      health,
      speed: Phaser.Math.Between(72, 112) + this.wave * 8,
      drift: Phaser.Math.FloatBetween(0.7, 1.45),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      points: health === 2 ? 2 : 1,
    })
  }

  private spawnItem(kindOverride?: FlightItemKind, startY = -38, startX?: number) {
    if (!this.gameStarted || this.paused || this.gameEnded || this.items.length >= 3) return
    const kinds: FlightItemKind[] = ['power', 'shield', 'turbo', 'magnet', 'star']
    const kind = kindOverride ?? Phaser.Utils.Array.GetRandom(kinds)
    const style: Record<FlightItemKind, { label: string; color: number }> = {
      power: { label: 'P', color: 0xE572A0 },
      shield: { label: '盾', color: 0x69C8A4 },
      turbo: { label: '快', color: 0xF0B554 },
      magnet: { label: '吸', color: 0x9E9BE8 },
      star: { label: '星', color: 0xF7D857 },
    }
    const itemStyle = style[kind]
    const orb = this.add.circle(0, 0, 22, itemStyle.color).setStrokeStyle(3, 0xFFFFFF, 0.9)
    const label = this.add.text(0, 1, itemStyle.label, {
      fontSize: '18px',
      color: '#24365F',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    const sprite = this.add.container(startX ?? Phaser.Math.Between(70, this.scale.width - 70), startY, [orb, label])
    this.items.push({ kind, sprite, speed: Phaser.Math.Between(72, 96) })
  }

  private autoFire() {
    if (!this.gameStarted || this.paused || this.gameEnded) return
    const offsets = this.power === 1 ? [0] : this.power === 2 ? [-13, 13] : [-26, 0, 26]
    offsets.forEach((offset) => {
      const bullet = this.add.rectangle(this.player.x + offset, this.player.y - 50, 7, 22, 0xB7F3FF)
        .setStrokeStyle(1, 0xFFFFFF, 0.9)
      this.enemyBullets.push(bullet)
    })
  }

  private updateStarfield(delta: number) {
    this.stars.forEach((star) => {
      star.y += (star.getData('speed') as number) * delta / 1000
      if (star.y > this.scale.height - 80) {
        star.y = 116
        star.x = Phaser.Math.Between(15, this.scale.width - 15)
      }
    })
  }

  private updateBullets(delta: number) {
    this.enemyBullets = this.enemyBullets.filter((bullet) => {
      bullet.y -= 580 * delta / 1000
      let hitEnemy: FlightEnemy | undefined
      for (const enemy of this.enemies) {
        if (Phaser.Math.Distance.Between(bullet.x, bullet.y, enemy.sprite.x, enemy.sprite.y) < 36) {
          hitEnemy = enemy
          break
        }
      }
      if (hitEnemy) {
        bullet.destroy()
        hitEnemy.health -= 1
        audioManager.playEffect('hit')
        this.showImpact(hitEnemy.sprite.x, hitEnemy.sprite.y, 0xB7F3FF)
        if (hitEnemy.health <= 0) this.destroyEnemy(hitEnemy)
        return false
      }
      if (bullet.y < 106) {
        bullet.destroy()
        return false
      }
      return true
    })
  }

  private updateEnemies(delta: number) {
    const seconds = delta / 1000
    this.enemies = this.enemies.filter((enemy) => {
      enemy.sprite.y += enemy.speed * seconds
      enemy.sprite.x += Math.sin(this.elapsed * enemy.drift + enemy.phase) * 34 * seconds
      enemy.sprite.rotation = Math.sin(this.elapsed * enemy.drift + enemy.phase) * 0.18
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y) < 55) {
        enemy.sprite.destroy()
        this.damagePlayer()
        return false
      }
      if (enemy.sprite.y > this.scale.height + 70) {
        enemy.sprite.destroy()
        return false
      }
      return true
    })
  }

  private updateItems(delta: number) {
    const seconds = delta / 1000
    this.items = this.items.filter((item) => {
      if (this.magnetTime > 0 && item.sprite.y > this.player.y - 260) {
        item.sprite.x += (this.player.x - item.sprite.x) * Math.min(1, seconds * 4)
      }
      item.sprite.y += item.speed * seconds
      item.sprite.rotation += seconds * 1.8
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, item.sprite.x, item.sprite.y) < 54) {
        this.collectItem(item.kind)
        item.sprite.destroy()
        return false
      }
      if (item.sprite.y > this.scale.height + 55) {
        item.sprite.destroy()
        return false
      }
      return true
    })
  }

  private destroyEnemy(enemy: FlightEnemy, playSound = true) {
    if (this.gameEnded) return
    const index = this.enemies.indexOf(enemy)
    if (index >= 0) this.enemies.splice(index, 1)
    this.combo += 1
    this.comboTimer = 2.7
    const multiplier = 1 + Math.floor(this.combo / 5) * 0.25
    this.score += Math.round(enemy.points * multiplier)
    this.defeatedInWave += 1
    if (playSound) audioManager.playEffect('correct')
    this.showImpact(enemy.sprite.x, enemy.sprite.y, 0xFFE58A)
    enemy.sprite.destroy()
    if (Math.random() < 0.28) this.spawnItem()
    if (this.defeatedInWave >= this.goalForWave) this.completeWave()
  }

  private collectItem(kind: FlightItemKind) {
    const labels: Record<FlightItemKind, string> = {
      power: '火力提升',
      shield: '护盾开启',
      turbo: '飞行加速',
      magnet: '星芽吸附',
      star: '获得星芽',
    }
    if (kind === 'power') this.power = Math.min(3, this.power + 1)
    if (kind === 'shield') this.shieldTime = 7
    if (kind === 'turbo') this.turboTime = 6
    if (kind === 'magnet') this.magnetTime = 7
    if (kind === 'star') this.score += 2
    audioManager.playEffect('collect')
    this.showFeedback(labels[kind], '#A9F5DB')
  }

  private completeWave() {
    this.wave += 1
    this.defeatedInWave = 0
    if (this.wave > 3) {
      this.finishGame(true)
      return
    }
    this.goalForWave = 5 + this.wave * 2
    audioManager.playEffect('success')
    this.showFeedback(`第 ${this.wave} 波开始！`, '#FFE58A')
    this.announceWave()
  }

  private useStorm() {
    if (!this.gameStarted || this.paused || this.gameEnded || this.storms <= 0) return
    this.storms -= 1
    audioManager.playEffect('storm')
    const beam = this.add.rectangle(this.player.x, this.player.y - 260, 52, 500, 0xF7D857, 0.72)
    this.cameras.main.flash(140, 255, 236, 152)
    this.tweens.add({ targets: beam, alpha: 0, duration: 220, onComplete: () => beam.destroy() })
    const targets = [...this.enemies]
    for (const enemy of targets) {
      if (this.gameEnded) break
      this.destroyEnemy(enemy, false)
    }
    this.showFeedback('雷暴清空天空！', '#FFE58A')
  }

  private damagePlayer() {
    if (this.gameEnded) return
    if (this.shieldTime > 0) {
      audioManager.playEffect('hit')
      this.showFeedback('护盾挡住了撞击', '#A9F5DB')
      return
    }
    this.combo = 0
    audioManager.playEffect('wrong')
    this.player.setAlpha(0.35)
    this.cameras.main.shake(180, 0.008)
    this.tweens.add({ targets: this.player, alpha: 1, duration: 300 })
    this.showFeedback('没关系，继续飞行！', '#A9F5DB')
  }

  private movePlayer(direction: number) {
    if (this.gameEnded) return
    const distance = this.turboTime > 0 ? 150 : 104
    this.movePlayerTo(this.player.x + direction * distance, this.player.y)
  }

  private movePlayerTo(x: number, y: number) {
    if (!this.gameStarted || this.paused || this.gameEnded) return
    const targetX = Phaser.Math.Clamp(x, 76, this.scale.width - 76)
    const targetY = Phaser.Math.Clamp(y, 178, this.scale.height - 132)
    this.tweens.killTweensOf(this.player)
    this.tweens.add({ targets: this.player, x: targetX, y: targetY, duration: 90, ease: 'Sine.easeOut' })
  }

  private movePlayerByAxis(horizontal: number, vertical: number, seconds: number) {
    const speed = this.turboTime > 0 ? 520 : 360
    const targetX = Phaser.Math.Clamp(this.player.x + horizontal * speed * seconds, 76, this.scale.width - 76)
    const targetY = Phaser.Math.Clamp(this.player.y + vertical * speed * seconds, 178, this.scale.height - 132)
    this.tweens.killTweensOf(this.player)
    this.player.x = targetX
    this.player.y = targetY
    this.player.rotation = horizontal * 0.14
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
    if (action === GameAction.LEFT) this.movePlayer(-1)
    if (action === GameAction.RIGHT) this.movePlayer(1)
    if (action === GameAction.CONFIRM || action === GameAction.OPTION_1) this.useStorm()
  }

  private createStartScreen(width: number, height: number) {
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x07102D, 0.92)
    const title = this.add.text(width / 2, 168, '雷光飞行', {
      fontSize: '54px',
      color: '#EDF5FF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      stroke: '#426EBD',
      strokeThickness: 8,
    }).setOrigin(0.5)
    const subtitle = this.add.text(width / 2, 228, '自动射击 · 收集道具 · 守护星芽', {
      fontSize: '18px',
      color: '#9EC4FF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    const hint = this.add.text(width / 2, 566, '怎么玩\n鼠标/触摸：拖动飞船，点「雷暴」\n键盘：方向键移动，空格/J 雷暴　·　手柄：摇杆/十字键移动，A/X 雷暴', {
      fontSize: '14px',
      color: '#B9D2FF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      align: 'center',
      lineSpacing: 5,
    }).setOrigin(0.5)
    this.startOverlay = this.add.container(0, 0, [shade, title, subtitle, hint]).setDepth(30)
    const choices: Array<{ difficulty: FlightDifficulty; label: string; detail: string; color: number }> = [
      { difficulty: 'easy', label: '轻松起飞', detail: '适合第一次飞行', color: 0x4DAA87 },
      { difficulty: 'normal', label: '星际巡航', detail: '推荐的冒险节奏', color: 0x547FDB },
      { difficulty: 'hard', label: '闪电挑战', detail: '更多敌机，更快节奏', color: 0xD25B78 },
    ]
    choices.forEach((choice, index) => {
      const y = 318 + index * 76
      const button = this.add.rectangle(width / 2, y, 340, 58, choice.color, 0.94)
        .setStrokeStyle(2, 0xEAF4FF, 0.8)
        .setInteractive({ useHandCursor: true })
      const label = this.add.text(width / 2 - 130, y - 8, choice.label, {
        fontSize: '23px',
        color: '#FFFFFF',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5)
      const detail = this.add.text(width / 2 - 130, y + 16, choice.detail, {
        fontSize: '14px',
        color: '#EAF3FF',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      }).setOrigin(0, 0.5)
      button.on('pointerdown', () => {
        this.startGame(choice.difficulty)
      })
      this.startOverlay?.add([button, label, detail])
    })
  }

  private startGame(difficulty: FlightDifficulty) {
    this.difficulty = difficulty
    this.gameStarted = true
    audioManager.playEffect('tap')
    this.storms = difficulty === 'easy' ? 3 : 2
    this.goalForWave = difficulty === 'hard' ? 8 : 6
    this.startOverlay?.destroy(true)
    this.startOverlay = undefined
    inputManager.setControlProfile(CONTROL_PROFILES.flightPlay)
    const enemyDelay = difficulty === 'easy' ? 1020 : difficulty === 'hard' ? 620 : 820
    const itemDelay = difficulty === 'easy' ? 1900 : difficulty === 'hard' ? 2700 : 2300
    this.enemyEvent = this.time.addEvent({ delay: enemyDelay, loop: true, callback: () => this.spawnEnemy() })
    this.itemEvent = this.time.addEvent({ delay: itemDelay, loop: true, callback: () => this.spawnItem() })
    this.fireEvent = this.time.addEvent({ delay: 280, loop: true, callback: () => this.autoFire() })
    const { width } = this.scale
    this.spawnEnemy(170, width * 0.28)
    this.spawnEnemy(230, width * 0.5)
    this.spawnEnemy(170, width * 0.72)
    this.spawnItem('power', 120, width * 0.14)
    this.announceWave()
  }

  private togglePause() {
    if (!this.gameStarted || this.gameEnded) return
    this.paused = !this.paused
    if (!this.paused) {
      this.pauseOverlay?.destroy(true)
      this.pauseOverlay = undefined
      inputManager.setControlProfile(CONTROL_PROFILES.flightPlay)
      return
    }
    inputManager.setControlProfile(CONTROL_PROFILES.flightPaused)
    const { width, height } = this.scale
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x07102D, 0.8)
    const panel = this.add.rectangle(width / 2, height / 2, 430, 250, 0x172553, 0.98)
      .setStrokeStyle(3, 0x86B6FF, 0.9)
    const title = this.add.text(width / 2, height / 2 - 66, '暂停飞行', {
      fontSize: '34px', color: '#EDF5FF', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5)
    const resume = this.add.text(width / 2, height / 2 + 6, '继续飞行', {
      fontSize: '22px', color: '#102043', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontStyle: 'bold', backgroundColor: '#A8D8FF', padding: { x: 34, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    const home = this.add.text(width / 2, height / 2 + 72, '返回放松站', {
      fontSize: '18px', color: '#D2E3FF', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', backgroundColor: '#304A8A', padding: { x: 26, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    resume.on('pointerdown', () => this.togglePause())
    home.on('pointerdown', () => this.returnToHub())
    this.pauseOverlay = this.add.container(0, 0, [shade, panel, title, resume, home]).setDepth(30)
  }

  private refreshHud() {
    const effects: string[] = []
    if (this.shieldTime > 0) effects.push(`护盾 ${Math.ceil(this.shieldTime)}s`)
    if (this.turboTime > 0) effects.push(`加速 ${Math.ceil(this.turboTime)}s`)
    if (this.magnetTime > 0) effects.push(`吸附 ${Math.ceil(this.magnetTime)}s`)
    this.scoreText.setText(`得分 ${this.score}`)
    const difficultyLabel = this.difficulty === 'easy' ? '轻松' : this.difficulty === 'hard' ? '挑战' : '巡航'
    this.waveText.setText(`${difficultyLabel} · 第 ${this.wave} 波 ${this.defeatedInWave}/${this.goalForWave}`)
    this.heartsText.setText('护航 ∞')
    this.powerText.setText(`火力 Lv${this.power} · 雷暴 ${this.storms}`)
    this.effectText.setText(effects.join(' · '))
    this.comboText.setText(this.combo >= 3 ? `${this.combo} 连击` : '')
    const aura = this.player?.getAt(0) as Phaser.GameObjects.Arc | undefined
    if (aura) aura.setStrokeStyle(3, 0x7FE4FF, this.shieldTime > 0 ? 0.9 : 0)
  }

  private announceWave() {
    const banner = this.add.text(this.scale.width / 2, 164, `第 ${this.wave} 波`, {
      fontSize: '34px',
      color: '#F3F7FF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#304A8A',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setAlpha(0)
    this.tweens.add({
      targets: banner,
      alpha: 1,
      y: 182,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: banner, alpha: 0, delay: 620, duration: 220, onComplete: () => banner.destroy() }),
    })
  }

  private showFeedback(message: string, color: string) {
    const text = this.add.text(this.scale.width / 2, this.player.y - 98, message, {
      fontSize: '21px',
      color,
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.tweens.add({ targets: text, y: text.y - 40, alpha: 0, duration: 700, ease: 'Sine.easeOut', onComplete: () => text.destroy() })
  }

  private showImpact(x: number, y: number, color: number) {
    const particles = this.add.particles(x, y, 'star', {
      speed: { min: 90, max: 260 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.55, end: 0 },
      lifespan: 440,
      quantity: 8,
      emitting: false,
      tint: [color, 0xFFFFFF],
    })
    particles.explode()
    this.time.delayedCall(540, () => particles.destroy())
  }

  private finishGame(success: boolean) {
    if (this.gameEnded) return
    this.gameEnded = true
    inputManager.setControlProfile(CONTROL_PROFILES.flightResult)
    this.enemyEvent?.remove(false)
    this.itemEvent?.remove(false)
    this.fireEvent?.remove(false)
    audioManager.playEffect(success ? 'success' : 'fail')
    const starsEarned = success ? 3 : Math.min(2, Math.floor(this.score / 8))
    if (starsEarned > 0) useGameStore.getState().addStars(starsEarned)
    const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 480, 240, 0xFFFFFF, 0.97)
      .setStrokeStyle(4, success ? 0xF7D857 : 0x668FDB)
    this.add.text(panel.x, panel.y - 66, success ? '天空守护完成！' : '飞船先回到云港休息', {
      fontSize: '32px',
      color: '#304A66',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(panel.x, panel.y - 14, `得分 ${this.score} · 到达第 ${this.wave} 波`, {
      fontSize: '20px',
      color: '#587389',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    this.add.text(panel.x, panel.y + 22, starsEarned > 0 ? `获得 ${starsEarned} 枚星芽` : '再多收集一些道具吧', {
      fontSize: '18px',
      color: '#A87722',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    const restart = this.add.text(panel.x, panel.y + 77, '再飞一次', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#456DB7',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    restart.on('pointerdown', () => this.scene.restart())
  }

  private returnToHub() {
    this.scene.start('RelaxationHubScene')
  }

  private cleanup() {
    inputManager.setControlProfile(null)
    this.cleanupInput?.()
    this.cleanupInput = null
    this.enemyEvent?.remove(false)
    this.itemEvent?.remove(false)
    this.fireEvent?.remove(false)
    this.startOverlay?.destroy(true)
    this.pauseOverlay?.destroy(true)
  }
}
