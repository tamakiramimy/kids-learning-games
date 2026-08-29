export const GameAction = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  CONFIRM: 'confirm',
  BACK: 'back',
  PAUSE: 'pause',
  OPTION_1: 'option1',
  OPTION_2: 'option2',
  OPTION_3: 'option3',
  OPTION_4: 'option4',
} as const

export type GameAction = typeof GameAction[keyof typeof GameAction]

type InputCallback = (action: GameAction) => void
type DirectionState = Record<'up' | 'down' | 'left' | 'right', boolean>

const AXIS_PRESS_THRESHOLD = 0.5
const DIRECTION_REPEAT_DELAY = 320
const DIRECTION_REPEAT_INTERVAL = 110

export class InputManager {
  private callbacks: Set<InputCallback> = new Set()
  private keysDown = new Set<string>()
  private gamepadConnected = false
  private gamepadIndex: number | null = null
  private pollInterval: number | null = null
  private prevButtons = new Set<number>()
  private prevDpad: DirectionState = { up: false, down: false, left: false, right: false }
  private directionRepeatAt: Partial<Record<keyof DirectionState, number>> = {}

  private readonly KEY_MAP: Record<string, GameAction> = {
    ArrowUp: GameAction.UP,
    ArrowDown: GameAction.DOWN,
    ArrowLeft: GameAction.LEFT,
    ArrowRight: GameAction.RIGHT,
    KeyW: GameAction.UP,
    KeyS: GameAction.DOWN,
    KeyA: GameAction.LEFT,
    KeyD: GameAction.RIGHT,
    Enter: GameAction.CONFIRM,
    Escape: GameAction.BACK,
    KeyP: GameAction.PAUSE,
    Space: GameAction.OPTION_1,
    KeyJ: GameAction.OPTION_1,
    Digit1: GameAction.OPTION_1,
    Digit2: GameAction.OPTION_2,
    Digit3: GameAction.OPTION_3,
    Digit4: GameAction.OPTION_4,
  }

  private readonly GAMEPAD_BUTTON_MAP: Record<number, GameAction> = {
    0: GameAction.CONFIRM,  // A (Xbox/Switch) / Cross (PS)
    1: GameAction.BACK,      // B (Xbox/Switch) / Circle (PS)
    2: GameAction.OPTION_1,  // X (Xbox/Switch) / Square (PS)
    3: GameAction.OPTION_2,  // Y (Xbox/Switch) / Triangle (PS)
    4: GameAction.OPTION_3,  // L1
    5: GameAction.OPTION_4,  // R1
  }

  start() {
    if (this.pollInterval !== null) return
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.clearHeldInput)
    window.addEventListener('gamepadconnected', this.onGamepadConnected)
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected)
    window.addEventListener('touchstart', this.onTouchStart, { passive: false })
    this.selectActiveGamepad()
    this.pollInterval = window.setInterval(() => this.pollGamepad(), 16)
  }

  stop() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.clearHeldInput)
    window.removeEventListener('gamepadconnected', this.onGamepadConnected)
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected)
    window.removeEventListener('touchstart', this.onTouchStart)
    if (this.pollInterval !== null) clearInterval(this.pollInterval)
    this.pollInterval = null
    this.keysDown.clear()
    this.gamepadConnected = false
    this.gamepadIndex = null
    this.resetGamepadEdges()
  }

  onInput(cb: InputCallback) {
    this.callbacks.add(cb)
    return () => this.callbacks.delete(cb)
  }

  isGamepadConnected() {
    return this.gamepadConnected
  }

  getDirection() {
    const gamepad = this.getActiveGamepad()
    const gamepadX = gamepad ? this.axisDirection(gamepad.axes[0] ?? 0) : 0
    const gamepadY = gamepad ? this.axisDirection(gamepad.axes[1] ?? 0) : 0
    const dpadX = gamepad ? (gamepad.buttons[15]?.pressed ? 1 : gamepad.buttons[14]?.pressed ? -1 : 0) : 0
    const dpadY = gamepad ? (gamepad.buttons[13]?.pressed ? 1 : gamepad.buttons[12]?.pressed ? -1 : 0) : 0
    const keyboardX = Number(this.keysDown.has('ArrowRight') || this.keysDown.has('KeyD'))
      - Number(this.keysDown.has('ArrowLeft') || this.keysDown.has('KeyA'))
    const keyboardY = Number(this.keysDown.has('ArrowDown') || this.keysDown.has('KeyS'))
      - Number(this.keysDown.has('ArrowUp') || this.keysDown.has('KeyW'))
    return {
      x: keyboardX || dpadX || gamepadX,
      y: keyboardY || dpadY || gamepadY,
    }
  }

  private emit(action: GameAction) {
    for (const cb of this.callbacks) cb(action)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.keysDown.has(e.code)) return
    this.keysDown.add(e.code)
    const action = this.KEY_MAP[e.code]
    if (action) {
      e.preventDefault()
      this.emit(action)
    }
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysDown.delete(e.code)
  }

  private clearHeldInput = () => {
    this.keysDown.clear()
    this.resetGamepadEdges()
  }

  private onGamepadConnected = (e: GamepadEvent) => {
    if (this.getActiveGamepad()) return
    this.gamepadConnected = true
    this.gamepadIndex = e.gamepad.index
    this.resetGamepadEdges()
  }

  private onGamepadDisconnected = (e: GamepadEvent) => {
    if (e.gamepad.index !== this.gamepadIndex) return
    this.gamepadIndex = null
    this.gamepadConnected = false
    this.resetGamepadEdges()
    this.selectActiveGamepad()
  }

  private selectActiveGamepad() {
    const gamepads = Array.from(navigator.getGamepads?.() ?? [])
    const gamepad = gamepads.find((item): item is Gamepad => item !== null && item.connected)
    this.gamepadConnected = Boolean(gamepad)
    this.gamepadIndex = gamepad?.index ?? null
    if (!gamepad) this.resetGamepadEdges()
    return gamepad ?? null
  }

  private pollGamepad() {
    const gamepad = this.getActiveGamepad()
    if (!gamepad) return

    const axisX = this.axisDirection(gamepad.axes[0] ?? 0)
    const axisY = this.axisDirection(gamepad.axes[1] ?? 0)
    const dpad: DirectionState = {
      up: Boolean(gamepad.buttons[12]?.pressed) || axisY < 0,
      down: Boolean(gamepad.buttons[13]?.pressed) || axisY > 0,
      left: Boolean(gamepad.buttons[14]?.pressed) || axisX < 0,
      right: Boolean(gamepad.buttons[15]?.pressed) || axisX > 0,
    }

    this.emitDirections(dpad)
    this.prevDpad = dpad

    for (const [btnIdx, action] of Object.entries(this.GAMEPAD_BUTTON_MAP)) {
      const idx = Number(btnIdx)
      if (gamepad.buttons[idx]?.pressed && !this.prevButtons.has(idx)) this.emit(action)
    }

    this.prevButtons.clear()
    for (let index = 0; index < gamepad.buttons.length; index += 1) {
      if (gamepad.buttons[index]?.pressed) this.prevButtons.add(index)
    }
  }

  private emitDirections(dpad: DirectionState) {
    const now = performance.now()
    const actionForDirection: Record<keyof DirectionState, GameAction> = {
      up: GameAction.UP,
      down: GameAction.DOWN,
      left: GameAction.LEFT,
      right: GameAction.RIGHT,
    }

    for (const direction of Object.keys(dpad) as Array<keyof DirectionState>) {
      if (!dpad[direction]) {
        delete this.directionRepeatAt[direction]
        continue
      }
      if (!this.prevDpad[direction]) {
        this.emit(actionForDirection[direction])
        this.directionRepeatAt[direction] = now + DIRECTION_REPEAT_DELAY
      } else if (now >= (this.directionRepeatAt[direction] ?? Infinity)) {
        this.emit(actionForDirection[direction])
        this.directionRepeatAt[direction] = now + DIRECTION_REPEAT_INTERVAL
      }
    }
  }

  private getActiveGamepad() {
    if (this.gamepadIndex !== null) {
      const gamepad = navigator.getGamepads?.()[this.gamepadIndex] ?? null
      if (gamepad?.connected) return gamepad
    }
    return this.selectActiveGamepad()
  }

  private axisDirection(value: number) {
    if (Math.abs(value) < AXIS_PRESS_THRESHOLD) return 0
    return value < 0 ? -1 : 1
  }

  private resetGamepadEdges() {
    this.prevButtons.clear()
    this.prevDpad = { up: false, down: false, left: false, right: false }
    this.directionRepeatAt = {}
  }

  private onTouchStart = () => {
    // Touch is handled by Phaser's built-in input system.
  }
}

export const inputManager = new InputManager()
