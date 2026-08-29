import Phaser from 'phaser'
import { audioManager } from '../audio/AudioManager'
import { getNode } from '../config/gameContent'
import { pinyinGenerator, type PinyinActivity, type PinyinQuestion } from '../generators/PinyinGenerator'
import { GameAction, inputManager } from '../input/InputManager'
import { CONTROL_PROFILES } from '../input/controlProfiles'
import { useGameStore } from '../store/gameStore'
import { createGameHud, showQuestCheckpoint, syncAudioSettings } from './GameHud'

export class SoundHarborScene extends Phaser.Scene {
  private question: PinyinQuestion | null = null
  private optionButtons: Phaser.GameObjects.Container[] = []
  private selectedIndex = 0
  private cleanupInput: (() => void) | null = null
  private promptText!: Phaser.GameObjects.Text
  private imageDisplay!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private activity: PinyinActivity = 'listen'
  private level = 1
  private answering = false
  private hintShown = false

  constructor() {
    super({ key: 'SoundHarborScene' })
  }

  create() {
    inputManager.setControlProfile(CONTROL_PROFILES.question)
    const node = this.getActiveNode()
    if (!node) {
      this.scene.start('AdventureMapScene')
      return
    }

    const { width, height } = this.scale
    this.level = node.level
    this.activity = node.activity as PinyinActivity
    syncAudioSettings()
    this.cameras.main.setBackgroundColor('#FFF1F7')
    this.cameras.main.fadeIn(220)
    this.createCloudBackground(width, height)

    this.add.rectangle(width / 2, 0, width, 92, 0xFFE0EC, 1).setOrigin(0.5, 0)
    this.createBackButton()
    this.add.text(width / 2, 26, `声音云港 · ${node.title}`, {
      fontSize: '28px',
      color: '#A53460',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    createGameHud(this, '#9A6500')

    this.promptText = this.add.text(width / 2, 145, '', {
      fontSize: '34px',
      color: '#79364F',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 820 },
    }).setOrigin(0.5)

    this.imageDisplay = this.add.text(width / 2, 260, '', {
      fontSize: '94px',
    }).setOrigin(0.5)

    const listenButton = this.add.text(width / 2, 355, '再听一次', {
      fontSize: '22px',
      color: '#A53460',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 26, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    listenButton.on('pointerdown', () => this.replaySound())

    this.feedbackText = this.add.text(width / 2, 460, '', {
      fontSize: '25px',
      color: '#A53460',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      align: 'center',
      wordWrap: { width: 850 },
    }).setOrigin(0.5).setAlpha(0)

    this.cleanupInput = inputManager.onInput((action) => this.handleInput(action))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      inputManager.setControlProfile(null)
      this.cleanupInput?.()
      this.cleanupInput = null
      audioManager.stop()
    })

    this.nextQuestion()
  }

  private createCloudBackground(width: number, height: number) {
    const graphics = this.add.graphics()
    graphics.fillStyle(0xFCD7E6, 0.62)
    graphics.fillCircle(100, 160, 72)
    graphics.fillCircle(width - 100, 210, 90)
    graphics.fillStyle(0xFFFFFF, 0.78)
    graphics.fillCircle(130, height - 130, 34)
    graphics.fillCircle(165, height - 145, 44)
    graphics.fillCircle(205, height - 128, 32)
    graphics.fillCircle(width - 190, height - 120, 38)
    graphics.fillCircle(width - 148, height - 138, 48)
    graphics.fillCircle(width - 105, height - 118, 34)
  }

  private createBackButton() {
    const backBg = this.add.rectangle(64, 42, 108, 46, 0xFFFFFF, 0.94)
      .setStrokeStyle(2, 0xE6A7C0)
      .setInteractive({ useHandCursor: true })
    const backText = this.add.text(64, 42, '返回地图', {
      fontSize: '17px',
      color: '#A53460',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    backBg.on('pointerdown', () => this.goBack())
    backText.on('pointerdown', () => this.goBack())
  }

  private handleInput(action: GameAction) {
    if (action === GameAction.BACK) {
      this.goBack()
      return
    }
    if (this.answering) return

    switch (action) {
      case GameAction.LEFT:
        this.updateSelection(Math.max(0, this.selectedIndex - 1))
        break
      case GameAction.RIGHT:
        this.updateSelection(Math.min(this.optionButtons.length - 1, this.selectedIndex + 1))
        break
      case GameAction.CONFIRM:
        this.checkAnswer()
        break
      case GameAction.OPTION_1:
      case GameAction.OPTION_2:
      case GameAction.OPTION_3:
      case GameAction.OPTION_4:
        this.selectNumberAction(action)
        break
    }
  }

  private selectNumberAction(action: GameAction) {
    const optionIndexByAction: Partial<Record<GameAction, number>> = {
      [GameAction.OPTION_1]: 0,
      [GameAction.OPTION_2]: 1,
      [GameAction.OPTION_3]: 2,
      [GameAction.OPTION_4]: 3,
    }
    const optionIndex = optionIndexByAction[action]
    if (optionIndex === undefined || optionIndex >= this.optionButtons.length) return
    this.updateSelection(optionIndex)
    this.checkAnswer()
  }

  private nextQuestion() {
    this.answering = false
    this.hintShown = false
    this.question = pinyinGenerator.generate(this.level, this.activity)
    this.feedbackText.setAlpha(0)
    this.optionButtons.forEach((button) => button.destroy())
    this.optionButtons = []
    this.selectedIndex = 0

    const question = this.question
    this.imageDisplay.setText(question.image)
    this.promptText.setText(this.activity === 'picture'
      ? '看一看图片，听一听声音，再选出正确的拼音'
      : '听一听云朵里的声音，选出正确的拼音')

    const optionSpacing = 142
    const startX = this.scale.width / 2 - optionSpacing * 1.5
    question.options.forEach((option, index) => {
      const button = this.createOptionButton(startX + index * optionSpacing, 555, option, index)
      this.optionButtons.push(button)
    })
    this.updateSelection(0)
    this.time.delayedCall(350, () => this.replaySound())
  }

  private replaySound() {
    if (this.question && !this.answering) audioManager.speakPinyin(this.question.pinyin)
  }

  private createOptionButton(x: number, y: number, pinyin: string, index: number) {
    const background = this.add.rectangle(0, 0, 112, 70, 0xFFFFFF, 0.95)
      .setStrokeStyle(3, 0xE4AAC0)
      .setInteractive({ useHandCursor: true })
    const label = this.add.text(0, 0, pinyin, {
      fontSize: '33px',
      color: '#79364F',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    const button = this.add.container(x, y, [background, label])
    background.on('pointerdown', () => {
      this.updateSelection(index)
      this.checkAnswer()
    })
    return button
  }

  private updateSelection(index: number) {
    this.selectedIndex = index
    this.optionButtons.forEach((button, buttonIndex) => {
      const background = button.getAt(0) as Phaser.GameObjects.Rectangle
      const selected = buttonIndex === index
      background.setStrokeStyle(3, selected ? 0xA53460 : 0xE4AAC0)
      button.setScale(selected ? 1.08 : 1)
    })
  }

  private checkAnswer() {
    if (!this.question || this.answering) return
    this.answering = true
    const isCorrect = this.selectedIndex === this.question.correctIndex
    const selectedButton = this.optionButtons[this.selectedIndex]
    const selectedBackground = selectedButton.getAt(0) as Phaser.GameObjects.Rectangle

    if (isCorrect) {
      selectedBackground.setFillStyle(0xF9D7E4, 1).setStrokeStyle(3, 0xA53460)
      this.feedbackText.setText('听得真认真，云朵为你点亮啦！').setColor('#A53460').setAlpha(1)
      const state = useGameStore.getState()
      state.addCorrect()
      showQuestCheckpoint(this, useGameStore.getState().nodeCorrect, this.getActiveNode()?.questionsRequired ?? 0)
      this.showParticles(selectedButton.x, selectedButton.y)
      audioManager.speakEncouragement()
      this.finishAfterDelay(true)
      return
    }

    selectedBackground.setFillStyle(0xFFE5E0, 1).setStrokeStyle(3, 0xD35B47)
    if (!this.hintShown) {
      this.hintShown = true
      this.feedbackText.setText('看看图片，再按“再听一次”听一听。').setColor('#B45C24').setAlpha(1)
      audioManager.speak('再听一次，慢慢听')
      this.time.delayedCall(950, () => {
        if (!this.scene.isActive()) return
        selectedBackground.setFillStyle(0xFFFFFF, 0.95).setStrokeStyle(3, 0xE4AAC0)
        this.feedbackText.setAlpha(0)
        this.answering = false
        this.replaySound()
      })
      return
    }

    useGameStore.getState().addWrong()
    const correctButton = this.optionButtons[this.question.correctIndex]
    const correctBackground = correctButton.getAt(0) as Phaser.GameObjects.Rectangle
    correctBackground.setFillStyle(0xF9D7E4, 1).setStrokeStyle(3, 0xA53460)
    this.feedbackText.setText('粉色边框就是这朵云的声音。').setColor('#B45C24').setAlpha(1)
    audioManager.speakTryAgain()
    this.finishAfterDelay(false)
  }

  private finishAfterDelay(isCorrect: boolean) {
    this.time.delayedCall(1250, () => {
      if (!this.scene.isActive()) return
      const state = useGameStore.getState()
      const node = this.getActiveNode()
      if (isCorrect && node && state.nodeCorrect >= node.questionsRequired) {
        state.completeCurrentNode()
        this.scene.start('RewardScene', { returnScene: 'AdventureMapScene' })
      } else {
        this.nextQuestion()
      }
    })
  }

  private showParticles(x: number, y: number) {
    const particles = this.add.particles(x, y, 'star', {
      speed: { min: 90, max: 260 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      lifespan: 800,
      quantity: 14,
      emitting: false,
      tint: [0xFFD740, 0xE56B8B, 0xAA6CD7],
    })
    particles.explode()
    this.time.delayedCall(950, () => particles.destroy())
  }

  private getActiveNode() {
    const state = useGameStore.getState()
    return state.currentModule === 'pinyin' && state.currentNodeId
      ? getNode('pinyin', state.currentNodeId)
      : undefined
  }

  private goBack() {
    this.cleanupInput?.()
    useGameStore.getState().setScreen('map')
    this.scene.start('AdventureMapScene')
  }
}
