import Phaser from 'phaser'
import { audioManager } from '../audio/AudioManager'
import { getNode } from '../config/gameContent'
import { mathGenerator, type MathActivity, type MathQuestion } from '../generators/MathGenerator'
import { GameAction, inputManager } from '../input/InputManager'
import { CONTROL_PROFILES } from '../input/controlProfiles'
import { useGameStore } from '../store/gameStore'
import { createGameHud, showQuestCheckpoint, syncAudioSettings } from './GameHud'

export class MathGardenScene extends Phaser.Scene {
  private question: MathQuestion | null = null
  private optionButtons: Phaser.GameObjects.Container[] = []
  private selectedIndex = 0
  private cleanupInput: (() => void) | null = null
  private questionText!: Phaser.GameObjects.Text
  private dotsLeft!: Phaser.GameObjects.Container
  private dotsRight!: Phaser.GameObjects.Container
  private feedbackText!: Phaser.GameObjects.Text
  private level = 1
  private activity: MathActivity = 'count'
  private answering = false
  private hintShown = false

  constructor() {
    super({ key: 'MathGardenScene' })
  }

  create() {
    inputManager.setControlProfile(CONTROL_PROFILES.question)
    const node = this.getActiveNode()
    if (!node) {
      this.scene.start('AdventureMapScene')
      return
    }

    const { width } = this.scale
    this.level = node.level
    this.activity = node.activity as MathActivity
    syncAudioSettings()
    this.cameras.main.setBackgroundColor('#F4FBEA')
    this.cameras.main.fadeIn(220)

    this.add.rectangle(width / 2, 0, width, 92, 0xE1F5C6, 1).setOrigin(0.5, 0)
    this.createBackButton()
    this.add.text(width / 2, 26, `数字花园 · ${node.title}`, {
      fontSize: '28px',
      color: '#256B42',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    createGameHud(this, '#9A6500')

    this.questionText = this.add.text(width / 2, 142, '', {
      fontSize: '46px',
      color: '#254334',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.dotsLeft = this.add.container(width / 2 - 122, 235)
    this.dotsRight = this.add.container(width / 2 + 122, 235)
    this.feedbackText = this.add.text(width / 2, 390, '', {
      fontSize: '30px',
      color: '#2B8A55',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 760 },
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

  private createBackButton() {
    const backBg = this.add.rectangle(64, 42, 108, 46, 0xFFFFFF, 0.94)
      .setStrokeStyle(2, 0x91B89C)
      .setInteractive({ useHandCursor: true })
    const backText = this.add.text(64, 42, '返回地图', {
      fontSize: '17px',
      color: '#256B42',
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
      case GameAction.UP:
        this.updateSelection(Math.max(0, this.selectedIndex - 2))
        break
      case GameAction.DOWN:
        this.updateSelection(Math.min(this.optionButtons.length - 1, this.selectedIndex + 2))
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
    if (optionIndex === undefined) return
    if (optionIndex >= 0 && optionIndex < this.optionButtons.length) {
      this.updateSelection(optionIndex)
      this.checkAnswer()
    }
  }

  private nextQuestion() {
    this.answering = false
    this.hintShown = false
    this.question = mathGenerator.generate(this.level, this.activity)
    this.feedbackText.setAlpha(0)
    this.optionButtons.forEach((button) => button.destroy())
    this.optionButtons = []
    this.selectedIndex = 0

    const question = this.question
    if (question.operator === 'count') {
      this.questionText.setText('数一数，有几个星芽？')
      this.dotsLeft.setPosition(this.scale.width / 2, 235)
      this.drawDots(this.dotsLeft, question.a, 0x43A85F)
      this.dotsRight.removeAll(true)
      audioManager.speak('数一数，有几个星芽')
    } else {
      this.questionText.setText(`${question.a} ${question.operator} ${question.b} = ?`)
      this.dotsLeft.setPosition(this.scale.width / 2 - 122, 235)
      this.dotsRight.setPosition(this.scale.width / 2 + 122, 235)
      this.drawDots(this.dotsLeft, question.a, 0x43A85F)
      this.drawDots(this.dotsRight, question.b, 0xFF9A53)
      const operatorText = question.operator === '+' ? '加' : '减'
      audioManager.speak(`${question.a} ${operatorText} ${question.b} 等于多少`)
    }

    const optionY = 525
    const optionSpacing = 150
    const startX = this.scale.width / 2 - optionSpacing * 1.5
    question.options.forEach((option, index) => {
      const button = this.createOptionButton(startX + index * optionSpacing, optionY, option, index)
      this.optionButtons.push(button)
    })
    this.updateSelection(0)
  }

  private drawDots(container: Phaser.GameObjects.Container, count: number, color: number) {
    container.removeAll(true)
    const spacing = 34
    const columns = 4
    for (let index = 0; index < count; index += 1) {
      const column = index % columns
      const row = Math.floor(index / columns)
      const rowWidth = Math.min(count - row * columns, columns)
      const x = (column - (rowWidth - 1) / 2) * spacing
      const y = row * spacing
      const dot = this.add.circle(x, y, 12, color)
        .setStrokeStyle(2, 0xFFFFFF, 0.8)
      container.add(dot)
    }
  }

  private createOptionButton(x: number, y: number, value: number, index: number) {
    const background = this.add.rectangle(0, 0, 120, 78, 0xFFFFFF, 0.95)
      .setStrokeStyle(3, 0xAFC8B8)
      .setInteractive({ useHandCursor: true })
    const label = this.add.text(0, 0, String(value), {
      fontSize: '37px',
      color: '#254334',
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
      background.setStrokeStyle(3, selected ? 0x2B8A55 : 0xAFC8B8)
      button.setScale(selected ? 1.08 : 1)
    })
  }

  private checkAnswer() {
    if (!this.question || this.answering) return
    this.answering = true

    const selected = this.question.options[this.selectedIndex]
    const isCorrect = selected === this.question.answer
    const selectedButton = this.optionButtons[this.selectedIndex]
    const selectedBackground = selectedButton.getAt(0) as Phaser.GameObjects.Rectangle

    if (isCorrect) {
      selectedBackground.setFillStyle(0xBCE8C9, 1).setStrokeStyle(3, 0x2B8A55)
      this.feedbackText.setText('找到了，真棒！').setColor('#2B8A55').setAlpha(1)
      this.showParticles(selectedButton.x, selectedButton.y)
      const state = useGameStore.getState()
      state.addCorrect()
      showQuestCheckpoint(this, useGameStore.getState().nodeCorrect, this.getActiveNode()?.questionsRequired ?? 0)
      audioManager.speakEncouragement()
      this.finishAfterDelay(true)
      return
    }

    selectedBackground.setFillStyle(0xFFE5DC, 1).setStrokeStyle(3, 0xD35B47)
    if (!this.hintShown) {
      this.hintShown = true
      this.feedbackText.setText('先慢慢数一数，再试一次。').setColor('#B45C24').setAlpha(1)
      audioManager.speak('先慢慢数一数，再试一次')
      this.time.delayedCall(850, () => {
        if (!this.scene.isActive()) return
        selectedBackground.setFillStyle(0xFFFFFF, 0.95).setStrokeStyle(3, 0xAFC8B8)
        this.feedbackText.setAlpha(0)
        this.answering = false
      })
      return
    }

    useGameStore.getState().addWrong()
    const correctIndex = this.question.options.indexOf(this.question.answer)
    const correctButton = this.optionButtons[correctIndex]
    const correctBackground = correctButton.getAt(0) as Phaser.GameObjects.Rectangle
    correctBackground.setFillStyle(0xE1F5C6, 1).setStrokeStyle(3, 0x2B8A55)
    this.feedbackText.setText(`答案是 ${this.question.answer}，下一题继续加油。`).setColor('#B45C24').setAlpha(1)
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
      tint: [0xFFD740, 0x43A85F, 0xFF9A53],
    })
    particles.explode()
    this.time.delayedCall(950, () => particles.destroy())
  }

  private getActiveNode() {
    const state = useGameStore.getState()
    return state.currentModule === 'math' && state.currentNodeId
      ? getNode('math', state.currentNodeId)
      : undefined
  }

  private goBack() {
    this.cleanupInput?.()
    useGameStore.getState().setScreen('map')
    this.scene.start('AdventureMapScene')
  }
}