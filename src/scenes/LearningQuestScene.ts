import Phaser from 'phaser'
import { audioManager } from '../audio/AudioManager'
import { getLearningModule, type LearningModuleDefinition, type LearningModuleId, type LearningQuestion } from '../config/learningContent'
import { GameAction, inputManager } from '../input/InputManager'
import { useGameStore } from '../store/gameStore'
import { syncAudioSettings } from './GameHud'

export class LearningQuestScene extends Phaser.Scene {
  private moduleId: LearningModuleId = 'pinyin'
  private definition!: LearningModuleDefinition
  private questionOrder: LearningQuestion[] = []
  private questionIndex = 0
  private correctCount = 0
  private currentQuestion: LearningQuestion | null = null
  private optionButtons: Phaser.GameObjects.Container[] = []
  private selectedIndex = 0
  private cleanupInput: (() => void) | null = null
  private imageDisplay!: Phaser.GameObjects.Image
  private promptText!: Phaser.GameObjects.Text
  private progressText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private answering = false
  private hintShown = false
  private sessionComplete = false

  constructor() {
    super({ key: 'LearningQuestScene' })
  }

  init(data: { moduleId?: LearningModuleId }) {
    this.moduleId = data.moduleId ?? 'pinyin'
  }

  create() {
    const { width, height } = this.scale
    this.definition = getLearningModule(this.moduleId)
    this.cameras.main.setBackgroundColor('#FFFFFF')
    syncAudioSettings()
    this.createBackground(width, height)
    this.createBackButton()

    this.add.text(width / 2, 40, this.definition.name, {
      fontSize: '31px',
      color: '#314B59',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.progressText = this.add.text(width / 2, 77, '', {
      fontSize: '17px',
      color: '#527485',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    }).setOrigin(0.5)
    const listenButton = this.add.text(width - 110, 42, '听一听', {
      fontSize: '17px',
      color: '#FFFFFF',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: this.definition.accentHex,
      padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    listenButton.on('pointerdown', () => this.playCurrentQuestion())

    this.imageDisplay = this.add.image(width / 2, 245, this.definition.questions[0].imageKey)
      .setDisplaySize(156, 156)
    this.promptText = this.add.text(width / 2, 395, '', {
      fontSize: '31px',
      color: '#314B59',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 860 },
    }).setOrigin(0.5)
    this.feedbackText = this.add.text(width / 2, 458, '', {
      fontSize: '21px',
      color: '#8B5A25',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      align: 'center',
      wordWrap: { width: 840 },
    }).setOrigin(0.5).setAlpha(0)

    this.cleanupInput = inputManager.onInput((action) => this.handleInput(action))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupInput?.()
      this.cleanupInput = null
      audioManager.stop()
    })
    this.resetSession()
    this.cameras.main.fadeIn(220)
  }

  private createBackground(width: number, height: number) {
    const graphics = this.add.graphics()
    graphics.fillStyle(0xFFFFFF, 1)
    graphics.fillRect(0, 0, width, height)
    graphics.fillStyle(this.definition.accentColor, 0.12)
    graphics.fillCircle(100, 150, 110)
    graphics.fillCircle(width - 100, 150, 110)
    graphics.fillStyle(0xF7FBFD, 1)
    graphics.fillRoundedRect(width / 2 - 230, 125, 460, 235, 34)
  }

  private createBackButton() {
    const button = this.add.text(72, 42, '学习馆', {
      fontSize: '17px',
      color: '#314B59',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      backgroundColor: '#FFFFFF',
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    button.on('pointerdown', () => this.returnToHub())
  }

  private resetSession() {
    this.questionOrder = this.shuffle([...this.definition.questions])
    this.questionIndex = 0
    this.correctCount = 0
    this.sessionComplete = false
    this.nextQuestion()
  }

  private nextQuestion() {
    this.answering = false
    this.hintShown = false
    this.feedbackText.setAlpha(0)
    this.optionButtons.forEach((button) => button.destroy())
    this.optionButtons = []
    this.selectedIndex = 0
    this.currentQuestion = this.questionOrder[this.questionIndex % this.questionOrder.length]
    this.questionIndex += 1
    this.imageDisplay.setTexture(this.currentQuestion.imageKey)
    this.promptText.setText(this.currentQuestion.prompt)
    this.progressText.setText(`学习进度 ${this.correctCount}/${this.definition.sessionQuestions}`)

    const spacing = 250
    const startX = this.scale.width / 2 - spacing
    this.currentQuestion.options.forEach((option, index) => {
      this.optionButtons.push(this.createOptionButton(startX + index * spacing, 565, option, index))
    })
    this.updateSelection(0)
  }

  private createOptionButton(x: number, y: number, label: string, index: number) {
    const background = this.add.rectangle(0, 0, 210, 74, 0xFFFFFF, 0.96)
      .setStrokeStyle(3, this.definition.accentColor, 0.46)
      .setInteractive({ useHandCursor: true })
    const text = this.add.text(0, 0, label, {
      fontSize: label.length > 14 ? '20px' : '27px',
      color: '#314B59',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 180 },
    }).setOrigin(0.5)
    const button = this.add.container(x, y, [background, text])
    background.on('pointerdown', () => {
      this.updateSelection(index)
      this.checkAnswer()
    })
    return button
  }

  private handleInput(action: GameAction) {
    if (action === GameAction.BACK) {
      this.returnToHub()
      return
    }
    if (this.sessionComplete) {
      if (action === GameAction.CONFIRM) this.resetSession()
      return
    }
    if (this.answering) return
    if (action === GameAction.LEFT || action === GameAction.UP) {
      this.updateSelection(Math.max(0, this.selectedIndex - 1))
    }
    if (action === GameAction.RIGHT || action === GameAction.DOWN) {
      this.updateSelection(Math.min(this.optionButtons.length - 1, this.selectedIndex + 1))
    }
    if (action === GameAction.CONFIRM) this.checkAnswer()
    const optionActions = [GameAction.OPTION_1, GameAction.OPTION_2, GameAction.OPTION_3]
    const optionIndex = optionActions.indexOf(action as typeof optionActions[number])
    if (optionIndex >= 0 && optionIndex < this.optionButtons.length) {
      this.updateSelection(optionIndex)
      this.checkAnswer()
    }
  }

  private updateSelection(index: number) {
    this.selectedIndex = index
    this.optionButtons.forEach((button, buttonIndex) => {
      const background = button.getAt(0) as Phaser.GameObjects.Rectangle
      const selected = buttonIndex === index
      background.setStrokeStyle(3, selected ? this.definition.accentColor : 0xB4C9D2)
      button.setScale(selected ? 1.06 : 1)
    })
  }

  private checkAnswer() {
    if (!this.currentQuestion || this.answering) return
    this.answering = true
    const selected = this.currentQuestion.options[this.selectedIndex]
    const correct = selected === this.currentQuestion.answer
    const selectedButton = this.optionButtons[this.selectedIndex]
    const selectedBackground = selectedButton.getAt(0) as Phaser.GameObjects.Rectangle
    if (correct) {
      selectedBackground.setFillStyle(0xDCF4DE, 1).setStrokeStyle(3, 0x2F8751)
      this.correctCount += 1
      this.feedbackText.setText('答对啦，继续收集知识星芽！').setColor('#2F8751').setAlpha(1)
      this.showStars(selectedButton.x, selectedButton.y)
      this.time.delayedCall(780, () => {
        if (!this.scene.isActive()) return
        if (this.correctCount >= this.definition.sessionQuestions) {
          this.showCompletion()
        } else {
          this.nextQuestion()
        }
      })
      return
    }

    selectedBackground.setFillStyle(0xFFE8E3, 1).setStrokeStyle(3, 0xCF624F)
    if (!this.hintShown) {
      this.hintShown = true
      this.feedbackText.setText(this.currentQuestion.clue).setColor('#8B5A25').setAlpha(1)
      this.time.delayedCall(850, () => {
        if (!this.scene.isActive()) return
        selectedBackground.setFillStyle(0xFFFFFF, 0.96).setStrokeStyle(3, this.definition.accentColor, 0.46)
        this.feedbackText.setAlpha(0)
        this.answering = false
      })
      return
    }

    const correctIndex = this.currentQuestion.options.indexOf(this.currentQuestion.answer)
    const correctButton = this.optionButtons[correctIndex]
    const correctBackground = correctButton.getAt(0) as Phaser.GameObjects.Rectangle
    correctBackground.setFillStyle(0xDCF4DE, 1).setStrokeStyle(3, 0x2F8751)
    this.feedbackText.setText(`答案是：${this.currentQuestion.answer}`).setColor('#8B5A25').setAlpha(1)
    this.time.delayedCall(1100, () => {
      if (this.scene.isActive()) this.nextQuestion()
    })
  }

  private playCurrentQuestion() {
    if (!this.currentQuestion) return
    if (useGameStore.getState().isMuted) {
      this.feedbackText.setText('声音已关闭，可在探索地图右上角打开声音。').setColor('#8B5A25').setAlpha(1)
      return
    }
    audioManager.speak(this.currentQuestion.spokenText, 0.8, 1, this.currentQuestion.language)
  }

  private showCompletion() {
    this.sessionComplete = true
    this.optionButtons.forEach((button) => button.destroy())
    this.optionButtons = []
    this.progressText.setText(`本轮完成 ${this.definition.sessionQuestions}/${this.definition.sessionQuestions}`)
    this.promptText.setText('知识星芽收集完成！')
    this.feedbackText.setText('按 Enter 再来一轮，或按 Esc 返回学习馆。').setColor('#2F8751').setAlpha(1)
    useGameStore.getState().addStars(2)
  }

  private showStars(x: number, y: number) {
    const particles = this.add.particles(x, y, 'star', {
      speed: { min: 90, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.65, end: 0 },
      lifespan: 650,
      quantity: 10,
      emitting: false,
      tint: [0xFFD740, this.definition.accentColor],
    })
    particles.explode()
    this.time.delayedCall(760, () => particles.destroy())
  }

  private returnToHub() {
    this.scene.start('LearningHubScene')
  }

  private shuffle<T>(values: T[]) {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[values[index], values[swapIndex]] = [values[swapIndex], values[index]]
    }
    return values
  }
}