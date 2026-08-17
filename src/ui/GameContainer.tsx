import { useRef, useEffect } from 'react'
import Phaser from 'phaser'
import { createPhaserConfig } from '../config/phaserConfig'
import { inputManager } from '../input/InputManager'
import { useGameStore } from '../store/gameStore'

export function GameContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const container = containerRef.current
    const game = new Phaser.Game(createPhaserConfig(container))
    gameRef.current = game
    if (import.meta.env.DEV) {
      const debugWindow = window as Window & {
        __xingyaGame?: Phaser.Game
        __xingyaStore?: typeof useGameStore
      }
      debugWindow.__xingyaGame = game
      debugWindow.__xingyaStore = useGameStore
    }
    inputManager.start()

    const refreshInputBounds = () => game.scale.updateBounds()
    const refreshScale = () => {
      game.scale.refresh()
      window.requestAnimationFrame(refreshInputBounds)
    }
    const animationFrame = window.requestAnimationFrame(refreshInputBounds)
    const resizeObserver = new ResizeObserver(refreshScale)
    resizeObserver.observe(container)
    game.canvas.addEventListener('pointerdown', refreshInputBounds, true)
    game.canvas.addEventListener('touchstart', refreshInputBounds, true)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      game.canvas.removeEventListener('pointerdown', refreshInputBounds, true)
      game.canvas.removeEventListener('touchstart', refreshInputBounds, true)
      inputManager.stop()
      game.destroy(true)
      const debugWindow = window as Window & {
        __xingyaGame?: Phaser.Game
        __xingyaStore?: typeof useGameStore
      }
      delete debugWindow.__xingyaGame
      delete debugWindow.__xingyaStore
      gameRef.current = null
    }
  }, [])

  return (
    <div
      id="game-container"
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  )
}