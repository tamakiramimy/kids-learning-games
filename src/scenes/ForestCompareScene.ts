import Phaser from 'phaser'
import { audioManager } from '../audio/AudioManager'
import { getNode } from '../config/gameContent'
import { comparisonGenerator, type ComparisonActivity, type ComparisonQuestion } from '../generators/ComparisonGenerator'
import { GameAction, inputManager } from '../input/InputManager'
import { CONTROL_PROFILES } from '../input/controlProfiles'
import { useGameStore } from '../store/gameStore'
import { createGameHud, showQuestCheckpoint, syncAudioSettings } from './GameHud'

export class ForestCompareScene extends Phaser.Scene {
  private question: ComparisonQuestion | null = null
  private answerButtons: Phaser.GameObjects.Container[] = []
  private answerValues: number[] = []
  private selectedIndex = 0
  private cleanupInput: (() => void) | null = null
  private promptText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private level = 1
  private activity: ComparisonActivity = 'more'
  private answering = false
  private hintShown = false
  private orderStep = 0
  private completedOrderIndexes = new Set<number>()

  constructor() {
    super({ key: 'ForestCompareScene' })
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
    this.activity = node.activity as ComparisonActivity
    syncAudioSettings()
    this.cameras.main.setBackgroundColor('#EDF8FF')
    this.cameras.main.fadeIn(220)

    this.add.rectangle(width / 2, 0, width, 92, 0xD7EFFF, 1).setOrigin(0.5, 0)
    this.createBackButton()
    this.add.text(width / 2, 26, `大小森林 · ${node.title}`, {
      fontSize: '28px',
      color: '#2364A0',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    createGameHud(this, '#9A6500')

    this.promptText = this.add.text(width / 2, 150, '', {
      fontSize: '42px',
      color: '#234D6E',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5)
    this.feedbackText = this.add.text(width / 2, 580, '', {
      fontSize: '27px',
      color: '#27745B',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      align: 'center',
      wordWrap: { width: 820 },
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
      .setStrokeStyle(2, 0x91B9D2)
      .setInteractive({ useHandCursor: true })
    const backText = this.add.text(64, 42, '返回地图', {
      fontSize: '17px',
      color: '#2364A0',
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
        this.updateSelection(Math.min(this.answerButtons.length - 1, this.selectedIndex + 1))
        break
      case GameAction.UP:
        this.updateSelection(0)
        break
      case GameAction.DOWN:
        this.updateSelection(this.answerButtons.length - 1)
        break
      case GameAction.CONFIRM:
        this.checkAnswer()
        break
      case GameAction.OPTION_1:
      case GameAction.OPTION_2:
      case GameAction.OPTION_3:
        this.selectNumberAction(action)
        break
    }
  }

  private selectNumberAction(action: GameAction) {
    const optionIndexByAction: Partial<Record<GameAction, number>> = {
      [GameAction.OPTION_1]: 0,
      [GameAction.OPTION_2]: 1,
      [GameAction.OPTION_3]: 2,
    }
    const optionIndex = optionIndexByAction[action]
    if (optionIndex === undefined || optionIndex >= this.answerButtons.length) return
    this.updateSelection(optionIndex)
    this.checkAnswer()
  }

  private nextQuestion() {
    this.answering = false
    this.hintShown = false
    this.question = comparisonGenerator.generate(this.level, this.activity)
    this.feedbackText.setAlpha(0)
    this.answerButtons.forEach((button) => button.destroy())
    this.answerButtons = []
    this.answerValues = []
    this.selectedIndex = 0
    this.orderStep = 0
    this.completedOrderIndexes.clear()

    const question = this.question
    this.promptText.setText(question.prompt)
    if (question.activity === 'order') {
      this.createOrderChoices(question)
      audioManager.speak('找到最小的数字')
    } else {
      this.createGroupChoices(question)
      audioManager.speak(question.prompt)
    }
    this.updateSelection(0)
  }

  private createGroupChoices(question: ComparisonQuestion) {
    const positions = [this.scale.width / 4, (this.scale.width * 3) / 4]
    const colors = [0x4B9EE9, 0xE56B8B]
    this.answerValues = [question.left, question.right]

    this.answerValues.forEach((value, index) => {
      const container = this.createChoiceButton(positions[index], 355, 280, 290, index, colors[index])
      this.drawForestDots(container, value, colors[index])
      const label = this.add.text(0, 102, String(value), {
        fontSize: '48px',
        color: '#234D6E',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5)
      container.add(label)
      this.answerButtons.push(container)
    })
  }

  private createOrderChoices(question: ComparisonQuestion) {
    this.answerValues = question.orderValues ?? [question.left, question.right]
    const spacing = 190
    const startX = this.scale.width / 2 - ((this.answerValues.length - 1) * spacing) / 2
    this.answerValues.forEach((value, index) => {
      const container = this.createChoiceButton(startX + index * spacing, 350, 150, 200, index, 0x4B9EE9)
      const rankText = this.add.text(0, -52, ['一', '二', '三'][index] ?? '', {
        fontSize: '19px',
        color: '#547B94',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      }).setOrigin(0.5)
      const valueText = this.add.text(0, 12, String(value), {
        fontSize: '62px',
        color: '#234D6E',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5)
      const hintText = this.add.text(0, 65, '点我', {
        fontSize: '16px',
        color: '#547B94',
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      }).setOrigin(0.5)
      container.add([rankText, valueText, hintText])
      this.answerButtons.push(container)
    })
  }

  private createChoiceButton(x: number, y: number, width: number, height: number, index: number, color: number) {
    const background = this.add.rectangle(0, 0, width, height, 0xFFFFFF, 0.95)
      .setStrokeStyle(4, color, 0.45)
      .setInteractive({ useHandCursor: true })
    const container = this.add.container(x, y, [background])
    background.on('pointerdown', () => {
      this.updateSelection(index)
      this.checkAnswer()
    })
    return container
  }

  private drawForestDots(container: Phaser.GameObjects.Container, count: number, color: number) {
    const columns = 4
    const spacing = 38
    for (let index = 0; index < count; index += 1) {
      const column = index % columns
      const row = Math.floor(index / columns)
      const rowWidth = Math.min(count - row * columns, columns)
      const dot = this.add.circle((column - (rowWidth - 1) / 2) * spacing, row * spacing - 48, 13, color)
        .setStrokeStyle(2, 0xFFFFFF, 0.9)
      container.add(dot)
    }
  }

  private updateSelection(index: number) {
    this.selectedIndex = index
    this.answerButtons.forEach((button, buttonIndex) => {
      const background = button.getAt(0) as Phaser.GameObjects.Rectangle
      const selected = buttonIndex === index
      const complete = this.completedOrderIndexes.has(buttonIndex)
      background.setStrokeStyle(4, complete ? 0x27745B : selected ? 0x2364A0 : 0x9AC4E5, complete ? 1 : selected ? 1 : 0.55)
      button.setScale(complete ? 1 : selected ? 1.06 : 1)
      button.setAlpha(complete ? 0.7 : 1)
    })
  }

  private checkAnswer() {
    if (!this.question || this.answering) return
    if (this.question.activity === 'order') {
      this.checkOrderAnswer()
      return
    }
    this.answering = true

    const correctIndex = this.getCorrectIndex()
    const isCorrect = this.selectedIndex === correctIndex
    const selectedButton = this.answerButtons[this.selectedIndex]
    const selectedBackground = selectedButton.getAt(0) as Phaser.GameObjects.Rectangle

    if (isCorrect) {
      selectedBackground.setFillStyle(0xD7F4DC, 1).setStrokeStyle(4, 0x27745B)
      this.feedbackText.setText('森林朋友找到答案啦！').setColor('#27745B').setAlpha(1)
      const state = useGameStore.getState()
      state.addCorrect()
      showQuestCheckpoint(this, useGameStore.getState().nodeCorrect, this.getActiveNode()?.questionsRequired ?? 0)
      audioManager.speakEncouragement()
      this.showParticles(selectedButton.x, selectedButton.y)
      this.finishAfterDelay(true)
      return
    }

    selectedBackground.setFillStyle(0xFFE5E0, 1).setStrokeStyle(4, 0xD35B47)
    if (!this.hintShown) {
      this.hintShown = true
      const hint = this.question.target === 'greater'
        ? '数一数，选数量更多的一边。'
        : '数一数，选数量更少的一边。'
      this.feedbackText.setText(hint).setColor('#B45C24').setAlpha(1)
      audioManager.speak(hint)
      this.time.delayedCall(950, () => {
        if (!this.scene.isActive()) return
        selectedBackground.setFillStyle(0xFFFFFF, 0.95).setStrokeStyle(4, 0x9AC4E5, 0.55)
        this.feedbackText.setAlpha(0)
        this.answering = false
      })
      return
    }

    useGameStore.getState().addWrong()
    const correctButton = this.answerButtons[correctIndex]
    const correctBackground = correctButton.getAt(0) as Phaser.GameObjects.Rectangle
    correctBackground.setFillStyle(0xD7F4DC, 1).setStrokeStyle(4, 0x27745B)
    this.feedbackText.setText('看，绿色边框就是答案。下一题继续探索。').setColor('#B45C24').setAlpha(1)
    audioManager.speakTryAgain()
    this.finishAfterDelay(false)
  }

  private getCorrectIndex() {
    if (!this.question) return 0
    if (this.question.activity === 'order') {
      const orderedValues = [...this.answerValues].sort((left, right) => left - right)
      return this.answerValues.indexOf(orderedValues[this.orderStep])
    }
    const leftIsTarget = this.question.target === 'greater'
      ? this.question.left > this.question.right
      : this.question.left < this.question.right
    return leftIsTarget ? 0 : 1
  }

  private checkOrderAnswer() {
    if (!this.question || this.completedOrderIndexes.has(this.selectedIndex)) return
    this.answering = true

    const correctIndex = this.getCorrectIndex()
    const selectedButton = this.answerButtons[this.selectedIndex]
    const selectedBackground = selectedButton.getAt(0) as Phaser.GameObjects.Rectangle

    if (this.selectedIndex === correctIndex) {
      selectedBackground.setFillStyle(0xD7F4DC, 1).setStrokeStyle(4, 0x27745B)
      this.completedOrderIndexes.add(this.selectedIndex)
      this.orderStep += 1

      if (this.orderStep < this.answerValues.length) {
        this.promptText.setText(this.getOrderPrompt())
        this.feedbackText.setText('找对了，继续排下一位。').setColor('#27745B').setAlpha(1)
        audioManager.speak('找对了，继续排下一位')
        this.time.delayedCall(620, () => {
          if (!this.scene.isActive()) return
          this.feedbackText.setAlpha(0)
          this.hintShown = false
          this.answering = false
          this.updateSelection(this.getNextOrderIndex())
        })
        return
      }

      this.feedbackText.setText('顺序排好了，森林小径通啦！').setColor('#27745B').setAlpha(1)
      const state = useGameStore.getState()
      state.addCorrect()
      showQuestCheckpoint(this, useGameStore.getState().nodeCorrect, this.getActiveNode()?.questionsRequired ?? 0)
      audioManager.speakEncouragement()
      this.showParticles(selectedButton.x, selectedButton.y)
      this.finishAfterDelay(true)
      return
    }

    selectedBackground.setFillStyle(0xFFE5E0, 1).setStrokeStyle(4, 0xD35B47)
    if (!this.hintShown) {
      this.hintShown = true
      const hint = this.orderStep === 0
        ? '先找最小的数字。'
        : '看看还没有选的数字，找到下一个更大的。'
      this.feedbackText.setText(hint).setColor('#B45C24').setAlpha(1)
      audioManager.speak(hint)
      this.time.delayedCall(900, () => {
        if (!this.scene.isActive()) return
        selectedBackground.setFillStyle(0xFFFFFF, 0.95).setStrokeStyle(4, 0x9AC4E5, 0.55)
        this.feedbackText.setAlpha(0)
        this.answering = false
      })
      return
    }

    const state = useGameStore.getState()
    state.addWrong()
    const correctButton = this.answerButtons[correctIndex]
    const correctBackground = correctButton.getAt(0) as Phaser.GameObjects.Rectangle
    correctBackground.setFillStyle(0xD7F4DC, 1).setStrokeStyle(4, 0x27745B)
    this.feedbackText.setText('绿色边框是这一位应该选择的数字。').setColor('#B45C24').setAlpha(1)
    audioManager.speakTryAgain()
    this.finishAfterDelay(false)
  }

  private getOrderPrompt() {
    if (this.orderStep === 0) return '从小到大，先选最小的数字'
    if (this.orderStep === 1) return '很好，再选第二小的数字'
    return '最后选最大的数字'
  }

  private getNextOrderIndex() {
    return this.answerButtons.findIndex((_button, index) => !this.completedOrderIndexes.has(index))
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
      tint: [0xFFD740, 0x4B9EE9, 0xE56B8B],
    })
    particles.explode()
    this.time.delayedCall(950, () => particles.destroy())
  }

  private getActiveNode() {
    const state = useGameStore.getState()
    return state.currentModule === 'comparison' && state.currentNodeId
      ? getNode('comparison', state.currentNodeId)
      : undefined
  }

  private goBack() {
    this.cleanupInput?.()
    useGameStore.getState().setScreen('map')
    this.scene.start('AdventureMapScene')
  }
}