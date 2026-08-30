import { useRef, useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import Phaser from 'phaser'
import { audioManager } from '../audio/AudioManager'
import { createPhaserConfig } from '../config/phaserConfig'
import { inputManager } from '../input/InputManager'
import { useGameStore } from '../store/gameStore'
import { VirtualControls } from './VirtualControls'

export function GameContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const container = containerRef.current
    const syncAudioSettings = () => {
      const { isMuted, volume } = useGameStore.getState()
      audioManager.setVolume(volume)
      audioManager.setMuted(isMuted)
    }
    syncAudioSettings()
    void audioManager.resume().then(() => audioManager.startBackgroundMusic())
    const unsubscribeAudioSettings = useGameStore.subscribe((state, previousState) => {
      if (state.isMuted !== previousState.isMuted || state.volume !== previousState.volume) {
        syncAudioSettings()
      }
    })
    const game = new Phaser.Game(createPhaserConfig(container))
    gameRef.current = game
    game.canvas.style.position = 'absolute'
    game.canvas.style.zIndex = '1'
    game.canvas.style.backgroundColor = 'transparent'
    if (import.meta.env.DEV) {
      const debugWindow = window as Window & {
        __xingyaGame?: Phaser.Game
        __xingyaStore?: typeof useGameStore
        __xingyaAudio?: typeof audioManager
      }
      debugWindow.__xingyaGame = game
      debugWindow.__xingyaStore = useGameStore
      debugWindow.__xingyaAudio = audioManager
    }
    inputManager.start()

    const refreshInputBounds = () => game.scale.updateBounds()
    const refreshScale = () => {
      game.scale.refresh()
      window.requestAnimationFrame(refreshInputBounds)
      window.requestAnimationFrame(() => window.requestAnimationFrame(refreshInputBounds))
    }
    const animationFrame = window.requestAnimationFrame(refreshInputBounds)
    const resizeObserver = new ResizeObserver(refreshScale)
    const unlockAudio = () => { void audioManager.startBackgroundMusic() }
    const handleVisibilityChange = () => {
      if (document.hidden) audioManager.suspend()
      else void audioManager.resume()
    }
    const appStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void audioManager.resume()
      else audioManager.suspend()
    })
    resizeObserver.observe(container)
    window.addEventListener('resize', refreshScale)
    window.addEventListener('orientationchange', refreshScale)
    window.visualViewport?.addEventListener('resize', refreshScale)
    game.canvas.addEventListener('pointerdown', refreshInputBounds, true)
    game.canvas.addEventListener('touchstart', refreshInputBounds, true)
    container.addEventListener('pointerdown', unlockAudio, true)
    window.addEventListener('keydown', unlockAudio, true)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      window.removeEventListener('resize', refreshScale)
      window.removeEventListener('orientationchange', refreshScale)
      window.visualViewport?.removeEventListener('resize', refreshScale)
      game.canvas.removeEventListener('pointerdown', refreshInputBounds, true)
      game.canvas.removeEventListener('touchstart', refreshInputBounds, true)
      container.removeEventListener('pointerdown', unlockAudio, true)
      window.removeEventListener('keydown', unlockAudio, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void appStateListener.then((listener) => listener.remove())
      unsubscribeAudioSettings()
      audioManager.stopBackgroundMusic()
      audioManager.suspend()
      inputManager.stop()
      game.destroy(true)
      const debugWindow = window as Window & {
        __xingyaGame?: Phaser.Game
        __xingyaStore?: typeof useGameStore
        __xingyaAudio?: typeof audioManager
      }
      delete debugWindow.__xingyaGame
      delete debugWindow.__xingyaStore
      delete debugWindow.__xingyaAudio
      gameRef.current = null
    }
  }, [])

  return (
    <div
      id="game-container"
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    >
      <VirtualControls />
    </div>
  )
}