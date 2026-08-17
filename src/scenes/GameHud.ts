import Phaser from 'phaser'
import { audioManager } from '../audio/AudioManager'
import { getNode } from '../config/gameContent'
import { useGameStore } from '../store/gameStore'

export interface GameHud {
  update: () => void
}

export function showQuestCheckpoint(scene: Phaser.Scene, correctCount: number, questionsRequired: number) {
  if (correctCount === 0 || correctCount >= questionsRequired || correctCount % 3 !== 0) return

  const checkpoint = scene.add.container(scene.scale.width / 2, 430)
  const panel = scene.add.rectangle(0, 0, 340, 86, 0xFFFFFF, 0.96)
    .setStrokeStyle(3, 0xFFD05B, 1)
  const title = scene.add.text(0, -15, '星芽补给站', {
    fontSize: '27px',
    color: '#A76400',
    fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    fontStyle: 'bold',
  }).setOrigin(0.5)
  const detail = scene.add.text(0, 20, `已完成 ${correctCount}/${questionsRequired} 题`, {
    fontSize: '17px',
    color: '#6C5E42',
    fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
  }).setOrigin(0.5)
  checkpoint.add([panel, title, detail])
  checkpoint.setAlpha(0).setScale(0.88)

  scene.tweens.add({
    targets: checkpoint,
    alpha: 1,
    scale: 1,
    y: 400,
    duration: 220,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: checkpoint,
        alpha: 0,
        y: 382,
        delay: 550,
        duration: 180,
        onComplete: () => checkpoint.destroy(),
      })
    },
  })
}

export function createGameHud(scene: Phaser.Scene, color: string): GameHud {
  const { width } = scene.scale
  let progressDots: Phaser.GameObjects.Arc[] = []
  const scoreText = scene.add.text(width - 30, 28, '', {
    fontSize: '21px',
    color,
    fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    fontStyle: 'bold',
  }).setOrigin(1, 0)

  const progressText = scene.add.text(width / 2, 62, '', {
    fontSize: '18px',
    color: '#426273',
    fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
  }).setOrigin(0.5)

  const comboText = scene.add.text(width - 30, 55, '', {
    fontSize: '15px',
    color: '#B56B00',
    fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
  }).setOrigin(1, 0)

  const update = () => {
    const state = useGameStore.getState()
    const node = state.currentModule && state.currentNodeId
      ? getNode(state.currentModule, state.currentNodeId)
      : undefined
    scoreText.setText(`得分 ${state.score}`)
    comboText.setText(state.combo > 1 ? `连击 ${state.combo}` : '')
    if (!node) {
      progressText.setText('')
      return
    }

    if (progressDots.length !== node.questionsRequired) {
      progressDots.forEach((dot) => dot.destroy())
      progressDots = []
      const spacing = Math.min(26, 240 / Math.max(1, node.questionsRequired - 1))
      const startX = width / 2 - ((node.questionsRequired - 1) * spacing) / 2
      for (let index = 0; index < node.questionsRequired; index += 1) {
        progressDots.push(scene.add.circle(startX + index * spacing, 84, 6, 0xD8E6EC, 1)
          .setStrokeStyle(1, 0x8EB2C2, 1))
      }
    }

    progressText.setText(`星芽路线 ${state.nodeCorrect}/${node.questionsRequired}`)
    progressDots.forEach((dot, index) => {
      const complete = index < state.nodeCorrect
      dot.setFillStyle(complete ? 0xFFD740 : 0xD8E6EC, 1)
      dot.setStrokeStyle(1, complete ? 0xC89200 : 0x8EB2C2, 1)
    })
  }

  const unsubscribe = useGameStore.subscribe(update)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe)
  update()

  return { update }
}

export function syncAudioSettings() {
  const state = useGameStore.getState()
  audioManager.setMuted(state.isMuted)
  audioManager.setVolume(state.volume)
}