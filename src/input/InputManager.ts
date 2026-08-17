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

export class InputManager {
  private callbacks: Set<InputCallback> = new Set()
  private keysDown = new Set<string>()
  private gamepadConnected = false
  private gamepadIndex: number | null = null
  private pollInterval: number | null = null
  private prevButtons = new Set<number>()
  private prevDpad = { up: false, down: false, left: false, right: false }

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
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('gamepadconnected', this.onGamepadConnected)
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected)
    window.addEventListener('touchstart', this.onTouchStart, { passive: false })
    this.detectConnectedGamepad()
    this.pollInterval = window.setInterval(() => this.pollGamepad(), 16)
  }

  stop() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('gamepadconnected', this.onGamepadConnected)
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected)
    window.removeEventListener('touchstart', this.onTouchStart)
    if (this.pollInterval) clearInterval(this.pollInterval)
    this.pollInterval = null
    this.gamepadConnected = false
    this.gamepadIndex = null
    this.prevButtons.clear()
    this.prevDpad = { up: false, down: false, left: false, right: false }
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
    const gamepadX = gamepad
      ? PhaserLikeClamp((gamepad.axes[0] ?? 0) || (gamepad.buttons[15]?.pressed ? 1 : gamepad.buttons[14]?.pressed ? -1 : 0))
      : 0
    const gamepadY = gamepad
      ? PhaserLikeClamp((gamepad.axes[1] ?? 0) || (gamepad.buttons[13]?.pressed ? 1 : gamepad.buttons[12]?.pressed ? -1 : 0))
      : 0
    const keyboardX = (this.keysDown.has('ArrowRight') ? 1 : 0) - (this.keysDown.has('ArrowLeft') ? 1 : 0)
    const keyboardY = (this.keysDown.has('ArrowDown') ? 1 : 0) - (this.keysDown.has('ArrowUp') ? 1 : 0)
    return {
      x: keyboardX || gamepadX,
      y: keyboardY || gamepadY,
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

  private onGamepadConnected = (e: GamepadEvent) => {
    this.gamepadConnected = true
    this.gamepadIndex = e.gamepad.index
  }

  private onGamepadDisconnected = () => {
    this.gamepadConnected = false
    this.gamepadIndex = null
  }

  private detectConnectedGamepad() {
    const gamepad = navigator.getGamepads?.().find((item) => item !== null)
    if (!gamepad) return
    this.gamepadConnected = true
    this.gamepadIndex = gamepad.index
  }

  private pollGamepad() {
    const gamepad = this.getActiveGamepad()
    if (!gamepad) return

    // D-pad
    const dpad = {
      up: gamepad.buttons[12]?.pressed || gamepad.axes[1] < -0.5,
      down: gamepad.buttons[13]?.pressed || gamepad.axes[1] > 0.5,
      left: gamepad.buttons[14]?.pressed || gamepad.axes[0] < -0.5,
      right: gamepad.buttons[15]?.pressed || gamepad.axes[0] > 0.5,
    }

    if (dpad.up && !this.prevDpad.up) this.emit(GameAction.UP)
    if (dpad.down && !this.prevDpad.down) this.emit(GameAction.DOWN)
    if (dpad.left && !this.prevDpad.left) this.emit(GameAction.LEFT)
    if (dpad.right && !this.prevDpad.right) this.emit(GameAction.RIGHT)
    this.prevDpad = dpad

    // Buttons
    for (const [btnIdx, action] of Object.entries(this.GAMEPAD_BUTTON_MAP)) {
      const idx = Number(btnIdx)
      if (gamepad.buttons[idx]?.pressed && !this.prevButtons.has(idx)) {
        this.emit(action)
      }
    }

    this.prevButtons.clear()
    for (let i = 0; i < gamepad.buttons.length; i++) {
      if (gamepad.buttons[i]?.pressed) this.prevButtons.add(i)
    }
  }

  private getActiveGamepad() {
    if (this.gamepadIndex === null) return null
    return navigator.getGamepads?.()[this.gamepadIndex] ?? null
  }

  private onTouchStart = () => {
    // Touch is handled by Phaser's built-in input system
    // We just ensure the AudioContext is unlocked on first touch
  }
}

function PhaserLikeClamp(value: number) {
  return Math.max(-1, Math.min(1, value))
}

export const inputManager = new InputManager()