import Phaser from 'phaser'
import { GameAction, inputManager } from '../input/InputManager'
import { useGameStore } from '../store/gameStore'

export class ThunderFlightScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container
  private obstacles: Phaser.GameObjects.Rectangle[] = []
  private sparks: Phaser.GameObjects.Image[] = []
  private cleanupInput: (() => void) | null = null
  private spawnEvent!: Phaser.Time.TimerEvent
  private sparkEvent!: Phaser.Time.TimerEvent
  private scoreText!: Phaser.GameObjects.Text
  private heartsText!: Phaser.GameObjects.Text
  private score = 0
  private hearts = 3
  private gameEnded = false

  constructor() {
    super({ key: 'ThunderFlightScene' })
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#16234C')
    this.createSky(width, height)
    this.createBackButton()
    this.add.text(width / 2, 42, '雷光飞行', {
      fontSize: '31px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(width / 2, 76, '左右移动，按确认键释放闪电', {
      fontSize: '17px',
      color: '#BFD5FF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)

    this.scoreText = this.add.text(width - 30, 29, '', {
      fontSize: '20px',
      color: '#FFD740',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0)
    this.heartsText = this.add.text(width - 30, 55, '', {
      fontSize: '16px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(1, 0)

    this.player = this.createPlayer(width / 2, height - 105)
    this.createMoveButtons(width, height)
    this.refreshHud()
    this.spawnEvent = this.time.addEvent({ delay: 850, loop: true, callback: () => this.spawnCloud() })
    this.sparkEvent = this.time.addEvent({ delay: 1180, loop: true, callback: () => this.spawnSpark() })
    this.cleanupInput = inputManager.onInput((action) => this.handleInput(action))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())
  }

  update(_time: number, delta: number) {
    if (this.gameEnded) return
    const speed = delta * 0.24
    this.obstacles = this.obstacles.filter((cloud) => {
      cloud.y += speed
      if (this.intersects(this.player.x, this.player.y, 32, cloud.x, cloud.y, 34)) {
        cloud.destroy()
        this.loseHeart()
        return false
      }
      if (cloud.y > this.scale.height + 60) {
        cloud.destroy()
        return false
      }
      return true
    })
    this.sparks = this.sparks.filter((spark) => {
      spark.y += speed * 0.88
      if (this.intersects(this.player.x, this.player.y, 32, spark.x, spark.y, 23)) {
        spark.destroy()
        this.score += 1
        this.refreshHud()
        if (this.score >= 10) this.finishGame(true)
        return false
      }
      if (spark.y > this.scale.height + 40) {
        spark.destroy()
        return false
      }
      return true
    })
  }

  private createSky(width: number, height: number) {
    const graphics = this.add.graphics()
    graphics.fillStyle(0x16234C, 1)
    graphics.fillRect(0, 0, width, height)
    for (let index = 0; index < 45; index += 1) {
      const x = (index * 83) % width
      const y = 95 + ((index * 53) % (height - 150))
      graphics.fillStyle(0xDCEBFF, 0.65)
      graphics.fillCircle(x, y, index % 4 === 0 ? 3 : 1.5)
    }
  }

  private createBackButton() {
    const button = this.add.text(72, 42, '放松站', {
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
    const body = this.add.circle(0, 0, 30, 0xF7D857).setStrokeStyle(3, 0xFFFFFF, 0.85)
    const core = this.add.circle(0, -3, 12, 0xFFFFFF)
    const leftWing = this.add.rectangle(-34, 12, 30, 14, 0x73B6FF)
    const rightWing = this.add.rectangle(34, 12, 30, 14, 0x73B6FF)
    const lightning = this.add.text(0, 3, 'Z', {
      fontSize: '25px',
      color: '#F28A19',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    return this.add.container(x, y, [leftWing, rightWing, body, core, lightning])
  }

  private createMoveButtons(width: number, height: number) {
    const createButton = (x: number, label: string, callback: () => void) => {
      const button = this.add.text(x, height - 54, label, {
        fontSize: '24px',
        color: '#FFFFFF',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontStyle: 'bold',
        backgroundColor: '#4065B6',
        padding: { x: 28, y: 13 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      button.on('pointerdown', callback)
    }
    createButton(130, '左', () => this.movePlayer(-1))
    createButton(width - 130, '右', () => this.movePlayer(1))
    const lightningButton = this.add.text(width / 2, height - 54, '闪电', {
      fontSize: '22px',
      color: '#253B68',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#F7D857',
      padding: { x: 28, y: 13 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    lightningButton.on('pointerdown', () => this.castLightning())
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
    if (action === GameAction.CONFIRM || action === GameAction.OPTION_1) this.castLightning()
  }

  private movePlayer(direction: number) {
    if (this.gameEnded) return
    this.player.x = Phaser.Math.Clamp(this.player.x + direction * 105, 72, this.scale.width - 72)
  }

  private castLightning() {
    if (this.gameEnded) return
    const beam = this.add.rectangle(this.player.x, this.player.y - 155, 18, 300, 0xF7D857, 0.82)
    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 160,
      onComplete: () => beam.destroy(),
    })
    this.obstacles = this.obstacles.filter((cloud) => {
      if (Math.abs(cloud.x - this.player.x) > 68 || cloud.y > this.player.y) return true
      cloud.destroy()
      this.score += 1
      return false
    })
    this.refreshHud()
    if (this.score >= 10) this.finishGame(true)
  }

  private spawnCloud() {
    if (this.gameEnded) return
    const cloud = this.add.rectangle(Phaser.Math.Between(65, this.scale.width - 65), -32, 62, 38, 0x7586A9, 1)
      .setStrokeStyle(2, 0xC5D3EE, 0.9)
    this.obstacles.push(cloud)
  }

  private spawnSpark() {
    if (this.gameEnded) return
    const spark = this.add.image(Phaser.Math.Between(50, this.scale.width - 50), -22, 'star')
      .setScale(0.85)
    this.sparks.push(spark)
  }

  private loseHeart() {
    if (this.gameEnded) return
    this.hearts -= 1
    this.player.setAlpha(0.45)
    this.tweens.add({ targets: this.player, alpha: 1, duration: 280 })
    this.refreshHud()
    if (this.hearts <= 0) this.finishGame(false)
  }

  private refreshHud() {
    this.scoreText.setText(`星芽 ${this.score}/10`)
    this.heartsText.setText(`能量 ${'●'.repeat(this.hearts)}${'○'.repeat(3 - this.hearts)}`)
  }

  private finishGame(success: boolean) {
    if (this.gameEnded) return
    this.gameEnded = true
    this.spawnEvent.remove(false)
    this.sparkEvent.remove(false)
    if (success) useGameStore.getState().addStars(2)
    const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 430, 210, 0xFFFFFF, 0.96)
      .setStrokeStyle(4, success ? 0xF7D857 : 0xAFC8D2)
    this.add.text(panel.x, panel.y - 43, success ? '雷光守护成功！' : '先休息一下，再来一局', {
      fontSize: '31px',
      color: '#304A66',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(panel.x, panel.y + 3, `本局收集 ${this.score} 枚星芽`, {
      fontSize: '20px',
      color: '#587389',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    const restart = this.add.text(panel.x, panel.y + 62, '再玩一次', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#4065B6',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    restart.on('pointerdown', () => this.scene.restart())
  }

  private intersects(ax: number, ay: number, ar: number, bx: number, by: number, br: number) {
    return Phaser.Math.Distance.Between(ax, ay, bx, by) < ar + br
  }

  private returnToHub() {
    this.scene.start('RelaxationHubScene')
  }

  private cleanup() {
    this.cleanupInput?.()
    this.cleanupInput = null
    this.spawnEvent?.remove(false)
    this.sparkEvent?.remove(false)
  }
}