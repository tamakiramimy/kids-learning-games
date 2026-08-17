import Phaser from 'phaser'
import { GameAction, inputManager } from '../input/InputManager'
import { useGameStore } from '../store/gameStore'

export class TinyRaceScene extends Phaser.Scene {
  private laneXs: number[] = []
  private laneIndex = 1
  private player!: Phaser.GameObjects.Image
  private obstacles: Phaser.GameObjects.Image[] = []
  private stars: Phaser.GameObjects.Image[] = []
  private cleanupInput: (() => void) | null = null
  private obstacleEvent!: Phaser.Time.TimerEvent
  private starEvent!: Phaser.Time.TimerEvent
  private scoreText!: Phaser.GameObjects.Text
  private distanceText!: Phaser.GameObjects.Text
  private collected = 0
  private distance = 0
  private gameEnded = false

  constructor() {
    super({ key: 'TinyRaceScene' })
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#B8E4FF')
    this.laneXs = [width / 2 - 150, width / 2, width / 2 + 150]
    this.createRoad(width, height)
    this.createBackButton()
    this.add.text(width / 2, 42, '小小赛车', {
      fontSize: '31px',
      color: '#314B59',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(width / 2, 76, '左右换车道，收集星芽，避开其他车辆', {
      fontSize: '17px',
      color: '#476B80',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    this.scoreText = this.add.text(width - 30, 29, '', {
      fontSize: '20px',
      color: '#A76400',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(1, 0)
    this.distanceText = this.add.text(width - 30, 55, '', {
      fontSize: '16px',
      color: '#476B80',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(1, 0)

    this.player = this.add.image(this.laneXs[this.laneIndex], height - 105, 'learning-car')
      .setDisplaySize(92, 92)
      .setAngle(-90)
    this.createMoveButtons(width, height)
    this.refreshHud()
    this.obstacleEvent = this.time.addEvent({ delay: 900, loop: true, callback: () => this.spawnObstacle() })
    this.starEvent = this.time.addEvent({ delay: 1150, loop: true, callback: () => this.spawnStar() })
    this.cleanupInput = inputManager.onInput((action) => this.handleInput(action))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())
  }

  update(_time: number, delta: number) {
    if (this.gameEnded) return
    this.distance += delta * 0.012
    const speed = delta * 0.31
    this.obstacles = this.obstacles.filter((obstacle) => {
      obstacle.y += speed
      if (this.intersects(this.player, obstacle, 44)) {
        obstacle.destroy()
        this.finishGame(false)
        return false
      }
      if (obstacle.y > this.scale.height + 80) {
        obstacle.destroy()
        return false
      }
      return true
    })
    this.stars = this.stars.filter((star) => {
      star.y += speed * 0.92
      if (this.intersects(this.player, star, 38)) {
        star.destroy()
        this.collected += 1
        this.refreshHud()
        if (this.collected >= 8) this.finishGame(true)
        return false
      }
      if (star.y > this.scale.height + 60) {
        star.destroy()
        return false
      }
      return true
    })
    this.refreshHud()
  }

  private createRoad(width: number, height: number) {
    const road = this.add.graphics()
    road.fillStyle(0x6F7D88, 1)
    road.fillRect(width / 2 - 240, 90, 480, height - 90)
    road.fillStyle(0xE7F1F4, 1)
    road.fillRect(width / 2 - 4, 105, 8, height - 115)
    road.fillStyle(0xE7F1F4, 1)
    road.fillRect(width / 2 - 154, 105, 6, height - 115)
    road.fillRect(width / 2 + 148, 105, 6, height - 115)
    road.fillStyle(0x8DD48C, 1)
    road.fillRect(0, 90, width / 2 - 240, height - 90)
    road.fillRect(width / 2 + 240, 90, width / 2 - 240, height - 90)
  }

  private createBackButton() {
    const button = this.add.text(72, 42, '放松站', {
      fontSize: '17px',
      color: '#314B59',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    button.on('pointerdown', () => this.returnToHub())
  }

  private createMoveButtons(width: number, height: number) {
    const createButton = (x: number, label: string, callback: () => void) => {
      const button = this.add.text(x, height - 54, label, {
        fontSize: '24px',
        color: '#FFFFFF',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontStyle: 'bold',
        backgroundColor: '#E88A31',
        padding: { x: 28, y: 13 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      button.on('pointerdown', callback)
    }
    createButton(130, '左', () => this.changeLane(-1))
    createButton(width - 130, '右', () => this.changeLane(1))
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
  }

  private changeLane(direction: number) {
    if (this.gameEnded) return
    this.laneIndex = Phaser.Math.Clamp(this.laneIndex + direction, 0, this.laneXs.length - 1)
    this.tweens.add({ targets: this.player, x: this.laneXs[this.laneIndex], duration: 150, ease: 'Sine.easeOut' })
  }

  private spawnObstacle() {
    if (this.gameEnded) return
    const assetKey = Math.random() < 0.5 ? 'learning-bus' : 'learning-bicycle'
    const obstacle = this.add.image(Phaser.Utils.Array.GetRandom(this.laneXs), -70, assetKey)
      .setDisplaySize(82, 82)
      .setAngle(-90)
    this.obstacles.push(obstacle)
  }

  private spawnStar() {
    if (this.gameEnded) return
    const star = this.add.image(Phaser.Utils.Array.GetRandom(this.laneXs), -30, 'star').setScale(0.9)
    this.stars.push(star)
  }

  private refreshHud() {
    this.scoreText.setText(`星芽 ${this.collected}/8`)
    this.distanceText.setText(`行驶 ${Math.floor(this.distance)} 米`)
  }

  private finishGame(success: boolean) {
    if (this.gameEnded) return
    this.gameEnded = true
    this.obstacleEvent.remove(false)
    this.starEvent.remove(false)
    if (success) useGameStore.getState().addStars(2)
    const panel = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 440, 210, 0xFFFFFF, 0.96)
      .setStrokeStyle(4, success ? 0xE88A31 : 0xAFC8D2)
    this.add.text(panel.x, panel.y - 43, success ? '平安到终点啦！' : '小车先停一停', {
      fontSize: '31px',
      color: '#314B59',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.add.text(panel.x, panel.y + 3, `本局收集 ${this.collected} 枚星芽`, {
      fontSize: '20px',
      color: '#587389',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    const restart = this.add.text(panel.x, panel.y + 62, '再跑一次', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#E88A31',
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    restart.on('pointerdown', () => this.scene.restart())
  }

  private intersects(left: Phaser.GameObjects.Image, right: Phaser.GameObjects.Image, distance: number) {
    return Phaser.Math.Distance.Between(left.x, left.y, right.x, right.y) < distance
  }

  private returnToHub() {
    this.scene.start('RelaxationHubScene')
  }

  private cleanup() {
    this.cleanupInput?.()
    this.cleanupInput = null
    this.obstacleEvent?.remove(false)
    this.starEvent?.remove(false)
  }
}