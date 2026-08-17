import Phaser from 'phaser'
import { LEARNING_IMAGE_ASSETS } from '../config/learningContent'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    // Show loading bar
    const { width, height } = this.scale
    const barW = 400
    const barH = 30
    const barX = (width - barW) / 2
    const barY = height / 2

    const bg = this.add.rectangle(width / 2, height / 2, barW, barH, 0xE0E0E0)
    bg.setStrokeStyle(3, 0xBDBDBD)

    const fill = this.add.rectangle(barX, barY, 0, barH, 0x448AFF)
    fill.setOrigin(0, 0.5)

    const text = this.add.text(width / 2, barY - 40, '加载中...', {
      fontSize: '28px',
      color: '#666666',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)

    this.load.on('progress', (v: number) => {
      fill.width = barW * v
    })

    this.load.on('complete', () => {
      bg.destroy()
      fill.destroy()
      text.destroy()
    })

    LEARNING_IMAGE_ASSETS.forEach((asset) => {
      this.load.svg(asset.key, asset.path, { width: 256, height: 256 })
    })

    this.createTextures()
  }

  create() {
    this.scene.start('AdventureMapScene')
  }

  private createTextures() {
    // Star texture for particles (drawn manually as polygon)
    const starGfx = this.add.graphics()
    starGfx.fillStyle(0xFFD740, 1)
    this.drawStar(starGfx, 16, 16, 5, 16, 8)
    starGfx.generateTexture('star', 32, 32)
    starGfx.destroy()

    // Circle dot for counting
    const dotGfx = this.add.graphics()
    dotGfx.fillStyle(0xFFFFFF, 1)
    dotGfx.fillCircle(20, 20, 20)
    dotGfx.generateTexture('dot', 40, 40)
    dotGfx.destroy()

    // Particle for effects
    const particleGfx = this.add.graphics()
    particleGfx.fillStyle(0xFFFFFF, 1)
    particleGfx.fillCircle(4, 4, 4)
    particleGfx.generateTexture('particle', 8, 8)
    particleGfx.destroy()
  }

  private drawStar(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, points: number, outerR: number, innerR: number) {
    const step = Math.PI / points
    const vertices: { x: number; y: number }[] = []
    for (let i = 0; i < 2 * points; i++) {
      const r = i % 2 === 0 ? outerR : innerR
      const angle = i * step - Math.PI / 2
      vertices.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r })
    }
    gfx.beginPath()
    gfx.moveTo(vertices[0].x, vertices[0].y)
    for (let i = 1; i < vertices.length; i++) {
      gfx.lineTo(vertices[i].x, vertices[i].y)
    }
    gfx.closePath()
    gfx.fillPath()
  }
}