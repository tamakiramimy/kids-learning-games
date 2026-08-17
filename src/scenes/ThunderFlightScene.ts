import Phaser from 'phaser'
import { GameAction, inputManager } from '../input/InputManager'
import { useGameStore } from '../store/gameStore'

type FlightItemKind = 'power' | 'shield' | 'turbo' | 'magnet' | 'star'

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
  private enemyEvent!: Phaser.Time.TimerEvent
  private itemEvent!: Phaser.Time.TimerEvent
  private fireEvent!: Phaser.Time.TimerEvent
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
  private hearts = 4
  private power = 1
  private storms = 2
  private combo = 0
  private comboTimer = 0
  private shieldTime = 0
  private turboTime = 0
  private magnetTime = 0
  private elapsed = 0
  private gameEnded = false

  constructor() {
    super({ key: 'ThunderFlightScene' })
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#0E1740')
    this.createSky(width, height)
    this.createHeader(width)
    this.createBackButton()
    this.player = this.createPlayer(width / 2, height - 118)
    this.createControls(width, height)
    this.enemyEvent = this.time.addEvent({ delay: 820, loop: true, callback: () => this.spawnEnemy() })
    this.itemEvent = this.time.addEvent({ delay: 2300, loop: true, callback: () => this.spawnItem() })
    this.fireEvent = this.time.addEvent({ delay: 280, loop: true, callback: () => this.autoFire() })
    this.spawnEnemy(170, width * 0.28)
    this.spawnEnemy(230, width * 0.5)
    this.spawnEnemy(170, width * 0.72)
    this.spawnItem('power', 120, width * 0.14)
    this.cleanupInput = inputManager.onInput((action) => this.handleInput(action))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())
    this.announceWave()
    this.refreshHud()
  }

  update(_time: number, delta: number) {
    if (this.gameEnded) return
    const seconds = delta / 1000
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
    const wings = this.add.triangle(0, 16, -45, 26, 45, 26, 0, -8, 0x4AA7F2)
      .setStrokeStyle(3, 0xC6EDFF, 0.9)
    const hull = this.add.triangle(0, -8, 0, -50, -22, 32, 22, 32, 0xF4F8FF)
      .setStrokeStyle(3, 0x5A93DC, 0.9)
    const cockpit = this.add.ellipse(0, -12, 18, 28, 0x7FE4FF)
      .setStrokeStyle(2, 0xFFFFFF, 0.8)
    const engine = this.add.triangle(0, 40, -10, 26, 10, 26, 0, 53, 0xF7C85A)
    const aura = this.add.circle(0, 0, 48, 0x7FE4FF, 0).setStrokeStyle(3, 0x7FE4FF, 0)
    return this.add.container(x, y, [aura, engine, wings, hull, cockpit])
  }

  private createControls(width: number, height: number) {
    const createButton = (x: number, label: string, color: string, callback: () => void) => {
      const button = this.add.text(x, height - 52, label, {
        fontSize: '22px',
        color: '#FFFFFF',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontStyle: 'bold',
        backgroundColor: color,
        padding: { x: 25, y: 13 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      button.on('pointerdown', callback)
    }
    createButton(126, '左', '#456DB7', () => this.movePlayer(-1))
    createButton(width - 126, '右', '#456DB7', () => this.movePlayer(1))
    createButton(width / 2, '雷暴', '#D77B3A', () => this.useStorm())
    this.add.text(width / 2, height - 91, '飞船会自动发射闪电', {
      fontSize: '15px',
      color: '#C5D8FF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
  }

  private spawnEnemy(startY = -54, startX?: number) {
    if (this.gameEnded || this.enemies.length >= 7) return
    const width = this.scale.width
    const health = this.wave >= 3 && Math.random() < 0.25 ? 2 : 1
    const hue = health === 2 ? 0xF4A761 : 0xBE91F0
    const hull = this.add.triangle(0, 0, 0, 42, -27, -24, 27, -24, hue)
      .setStrokeStyle(3, 0xF6F2FF, 0.72)
    const core = this.add.circle(0, -6, 10, health === 2 ? 0xFFE28B : 0xA8E4FF)
    const sprite = this.add.container(startX ?? Phaser.Math.Between(80, width - 80), startY, [hull, core])
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
    if (this.gameEnded || this.items.length >= 3) return
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
    if (this.gameEnded) return
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

  private destroyEnemy(enemy: FlightEnemy) {
    const index = this.enemies.indexOf(enemy)
    if (index >= 0) this.enemies.splice(index, 1)
    this.combo += 1
    this.comboTimer = 2.7
    const multiplier = 1 + Math.floor(this.combo / 5) * 0.25
    this.score += Math.round(enemy.points * multiplier)
    this.defeatedInWave += 1
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
    this.showFeedback(`第 ${this.wave} 波开始！`, '#FFE58A')
    this.announceWave()
  }

  private useStorm() {
    if (this.gameEnded || this.storms <= 0) return
    this.storms -= 1
    const beam = this.add.rectangle(this.player.x, this.player.y - 260, 52, 500, 0xF7D857, 0.72)
    this.cameras.main.flash(140, 255, 236, 152)
    this.tweens.add({ targets: beam, alpha: 0, duration: 220, onComplete: () => beam.destroy() })
    const targets = [...this.enemies]
    targets.forEach((enemy) => this.destroyEnemy(enemy))
    this.showFeedback('雷暴清空天空！', '#FFE58A')
  }

  private damagePlayer() {
    if (this.shieldTime > 0) {
      this.showFeedback('护盾挡住了撞击', '#A9F5DB')
      return
    }
    this.hearts -= 1
    this.combo = 0
    this.player.setAlpha(0.35)
    this.cameras.main.shake(180, 0.008)
    this.tweens.add({ targets: this.player, alpha: 1, duration: 300 })
    if (this.hearts <= 0) this.finishGame(false)
  }

  private movePlayer(direction: number) {
    if (this.gameEnded) return
    const distance = this.turboTime > 0 ? 150 : 104
    const targetX = Phaser.Math.Clamp(this.player.x + direction * distance, 76, this.scale.width - 76)
    this.tweens.add({ targets: this.player, x: targetX, duration: 130, ease: 'Sine.easeOut' })
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
    if (action === GameAction.LEFT) this.movePlayer(-1)
    if (action === GameAction.RIGHT) this.movePlayer(1)
    if (action === GameAction.CONFIRM || action === GameAction.OPTION_1) this.useStorm()
  }

  private refreshHud() {
    const effects: string[] = []
    if (this.shieldTime > 0) effects.push(`护盾 ${Math.ceil(this.shieldTime)}s`)
    if (this.turboTime > 0) effects.push(`加速 ${Math.ceil(this.turboTime)}s`)
    if (this.magnetTime > 0) effects.push(`吸附 ${Math.ceil(this.magnetTime)}s`)
    this.scoreText.setText(`得分 ${this.score}`)
    this.waveText.setText(`第 ${this.wave} 波 ${this.defeatedInWave}/${this.goalForWave}`)
    this.heartsText.setText(`护航 ${'●'.repeat(this.hearts)}${'○'.repeat(4 - this.hearts)}`)
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
    this.enemyEvent.remove(false)
    this.itemEvent.remove(false)
    this.fireEvent.remove(false)
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
    this.cleanupInput?.()
    this.cleanupInput = null
    this.enemyEvent?.remove(false)
    this.itemEvent?.remove(false)
    this.fireEvent?.remove(false)
  }
}