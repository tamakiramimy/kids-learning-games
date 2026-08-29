import { GameAction, type ControlProfile } from './InputManager'

const actionButton = (action: GameAction, label: string, description: string) => ({ action, label, description })

export const CONTROL_PROFILES = {
  map: {
    id: 'map', direction: 'none', buttons: [],
    keyboardHint: '键盘：方向键选岛 · Enter 进入 · 数字 2/3/4 打开放松站/学习馆/伙伴册',
    gamepadHint: '手柄：十字键选岛 · A 进入 · Y/L1/R1 打开快捷入口',
  },
  navigation: {
    id: 'navigation', direction: 'none', buttons: [],
    keyboardHint: '键盘：方向键选择 · Enter 确认 · Esc 返回',
    gamepadHint: '手柄：摇杆/十字键选择 · A 确认 · B 返回',
  },
  question: {
    id: 'question', direction: 'none', buttons: [],
    keyboardHint: '键盘：方向键选择 · Enter 确认 · 数字键直选 · Esc 返回',
    gamepadHint: '手柄：十字键选择 · A 确认 · X/Y/L1/R1 直选 · B 返回',
  },
  reward: {
    id: 'reward', direction: 'none', buttons: [],
    keyboardHint: '键盘：Enter 继续 · Esc 返回地图',
    gamepadHint: '手柄：A 继续 · B 返回地图',
  },
  flightStart: {
    id: 'flight-start', direction: 'none',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '开始'), actionButton(GameAction.BACK, 'B', '返回')],
    keyboardHint: '键盘：Enter 开始 · Esc 返回', gamepadHint: '手柄：A 开始 · B 返回',
  },
  flightPlay: {
    id: 'flight-play', direction: 'stick',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '雷暴'), actionButton(GameAction.BACK, 'B', '暂停')],
    keyboardHint: '键盘：方向键移动 · 空格/J 雷暴 · P 暂停', gamepadHint: '手柄：左摇杆移动 · A 雷暴 · B 暂停',
  },
  flightPaused: {
    id: 'flight-paused', direction: 'none',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '继续'), actionButton(GameAction.BACK, 'B', '继续')],
    keyboardHint: '键盘：Enter 继续 · Esc 继续', gamepadHint: '手柄：A/B 继续',
  },
  flightResult: {
    id: 'flight-result', direction: 'none',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '再飞一次'), actionButton(GameAction.BACK, 'B', '返回')],
    keyboardHint: '键盘：Enter 再来一局 · Esc 返回', gamepadHint: '手柄：A 再来一局 · B 返回',
  },
  moleStart: {
    id: 'mole-start', direction: 'none',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '开始'), actionButton(GameAction.BACK, 'B', '返回')],
    keyboardHint: '键盘：Enter 开始 · Esc 返回', gamepadHint: '手柄：A 开始 · B 返回',
  },
  molePlay: {
    id: 'mole-play', direction: 'dpad',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '敲击'), actionButton(GameAction.BACK, 'B', '暂停')],
    keyboardHint: '键盘：方向键选洞 · Enter/空格敲击 · P 暂停', gamepadHint: '手柄：十字键选择 · A 敲击 · B 暂停',
  },
  molePaused: {
    id: 'mole-paused', direction: 'none',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '继续'), actionButton(GameAction.BACK, 'B', '继续')],
    keyboardHint: '键盘：Enter/Esc 继续', gamepadHint: '手柄：A/B 继续',
  },
  moleResult: {
    id: 'mole-result', direction: 'none',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '再玩一次'), actionButton(GameAction.BACK, 'B', '返回')],
    keyboardHint: '键盘：Enter 再来一局 · Esc 返回', gamepadHint: '手柄：A 再来一局 · B 返回',
  },
  blocksTutorial: {
    id: 'blocks-tutorial', direction: 'none',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '开始'), actionButton(GameAction.BACK, 'B', '返回')],
    keyboardHint: '键盘：Enter 开始 · Esc 返回', gamepadHint: '手柄：A 开始 · B 返回',
  },
  blocksPlay: {
    id: 'blocks-play', direction: 'dpad',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '旋转'), actionButton(GameAction.BACK, 'B', '返回')],
    keyboardHint: '键盘：←→移动 · ↑旋转 · ↓落下 · Esc 返回', gamepadHint: '手柄：十字键移动/落下 · A 旋转 · B 返回',
  },
  blocksResult: {
    id: 'blocks-result', direction: 'none',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '再玩一次'), actionButton(GameAction.BACK, 'B', '返回')],
    keyboardHint: '键盘：Enter 再来一局 · Esc 返回', gamepadHint: '手柄：A 再来一局 · B 返回',
  },
  raceTutorial: {
    id: 'race-tutorial', direction: 'none',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '开始'), actionButton(GameAction.BACK, 'B', '返回')],
    keyboardHint: '键盘：Enter 开始 · Esc 返回', gamepadHint: '手柄：A 开始 · B 返回',
  },
  racePlay: {
    id: 'race-play', direction: 'horizontal',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '加速'), actionButton(GameAction.BACK, 'B', '暂停')],
    keyboardHint: '键盘：←→换道 · Enter/空格加速 · P 暂停', gamepadHint: '手柄：左右换道 · A 加速 · B 暂停',
  },
  racePaused: {
    id: 'race-paused', direction: 'none',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '继续'), actionButton(GameAction.BACK, 'B', '继续')],
    keyboardHint: '键盘：Enter/Esc 继续', gamepadHint: '手柄：A/B 继续',
  },
  raceResult: {
    id: 'race-result', direction: 'none',
    buttons: [actionButton(GameAction.CONFIRM, 'A', '再跑一次'), actionButton(GameAction.BACK, 'B', '返回')],
    keyboardHint: '键盘：Enter 再来一局 · Esc 返回', gamepadHint: '手柄：A 再来一局 · B 返回',
  },
} as const satisfies Record<string, ControlProfile>