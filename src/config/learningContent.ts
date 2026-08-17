export type LearningModuleId = 'pinyin' | 'hanzi' | 'english-word' | 'english-phrase' | 'poetry'

export interface LearningImageAsset {
  key: string
  path: string
}

export const LEARNING_IMAGE_ASSETS: LearningImageAsset[] = [
  { key: 'learning-boy', path: 'assets/openmoji/boy.svg' },
  { key: 'learning-woman', path: 'assets/openmoji/woman.svg' },
  { key: 'learning-waving-hand', path: 'assets/openmoji/waving-hand.svg' },
  { key: 'learning-school', path: 'assets/openmoji/school.svg' },
  { key: 'learning-books', path: 'assets/openmoji/books.svg' },
  { key: 'learning-apple', path: 'assets/openmoji/red-apple.svg' },
  { key: 'learning-watermelon', path: 'assets/openmoji/watermelon.svg' },
  { key: 'learning-pizza', path: 'assets/openmoji/pizza.svg' },
  { key: 'learning-dog', path: 'assets/openmoji/dog.svg' },
  { key: 'learning-cat', path: 'assets/openmoji/cat.svg' },
  { key: 'learning-fox', path: 'assets/openmoji/fox.svg' },
  { key: 'learning-car', path: 'assets/openmoji/car.svg' },
  { key: 'learning-bus', path: 'assets/openmoji/bus.svg' },
  { key: 'learning-bicycle', path: 'assets/openmoji/bicycle.svg' },
  { key: 'learning-sunrise', path: 'assets/openmoji/sunrise.svg' },
  { key: 'learning-beach', path: 'assets/openmoji/beach.svg' },
]

export interface LearningQuestion {
  id: string
  imageKey: string
  prompt: string
  clue: string
  answer: string
  options: string[]
  spokenText: string
  language: 'zh-CN' | 'en-US'
}

export interface LearningModuleDefinition {
  id: LearningModuleId
  shortName: string
  name: string
  description: string
  accentColor: number
  accentHex: string
  sessionQuestions: number
  questions: LearningQuestion[]
}

export const LEARNING_MODULE_ORDER: LearningModuleId[] = [
  'pinyin',
  'hanzi',
  'english-word',
  'english-phrase',
  'poetry',
]

export const LEARNING_MODULES: Record<LearningModuleId, LearningModuleDefinition> = {
  pinyin: {
    id: 'pinyin',
    shortName: '拼',
    name: '拼音小耳朵',
    description: '看图、听音，找到正确拼音',
    accentColor: 0xD7567F,
    accentHex: '#D7567F',
    sessionQuestions: 5,
    questions: [
      { id: 'pinyin-cat', imageKey: 'learning-cat', prompt: '这是什么小动物？', clue: '它会“喵喵”叫。', answer: 'māo', options: ['māo', 'gǒu', 'chē'], spokenText: 'māo', language: 'zh-CN' },
      { id: 'pinyin-dog', imageKey: 'learning-dog', prompt: '这是什么小动物？', clue: '它会“汪汪”叫。', answer: 'gǒu', options: ['māo', 'gǒu', 'hú'], spokenText: 'gǒu', language: 'zh-CN' },
      { id: 'pinyin-apple', imageKey: 'learning-apple', prompt: '这是什么水果？', clue: '红红的，圆圆的。', answer: 'píng guǒ', options: ['xī guā', 'píng guǒ', 'pī sà'], spokenText: 'píng guǒ', language: 'zh-CN' },
      { id: 'pinyin-car', imageKey: 'learning-car', prompt: '这是什么交通工具？', clue: '它在马路上开。', answer: 'qì chē', options: ['qì chē', 'zì xíng chē', 'xué xiào'], spokenText: 'qì chē', language: 'zh-CN' },
      { id: 'pinyin-school', imageKey: 'learning-school', prompt: '这是哪里？', clue: '小朋友在这里学习。', answer: 'xué xiào', options: ['hǎi biān', 'xué xiào', 'pī sà'], spokenText: 'xué xiào', language: 'zh-CN' },
    ],
  },
  hanzi: {
    id: 'hanzi',
    shortName: '字',
    name: '汉字小屋',
    description: '从图片里认识常用汉字',
    accentColor: 0x3F8DE3,
    accentHex: '#3F8DE3',
    sessionQuestions: 5,
    questions: [
      { id: 'hanzi-person', imageKey: 'learning-boy', prompt: '看图选汉字', clue: '这是一个小朋友。', answer: '人', options: ['人', '车', '果'], spokenText: '人', language: 'zh-CN' },
      { id: 'hanzi-apple', imageKey: 'learning-apple', prompt: '看图选汉字', clue: '这是一个水果。', answer: '果', options: ['狗', '果', '校'], spokenText: '果', language: 'zh-CN' },
      { id: 'hanzi-car', imageKey: 'learning-car', prompt: '看图选汉字', clue: '它在路上跑。', answer: '车', options: ['车', '猫', '书'], spokenText: '车', language: 'zh-CN' },
      { id: 'hanzi-dog', imageKey: 'learning-dog', prompt: '看图选汉字', clue: '它会看家。', answer: '狗', options: ['狗', '人', '水'], spokenText: '狗', language: 'zh-CN' },
      { id: 'hanzi-school', imageKey: 'learning-school', prompt: '看图选汉字', clue: '我们去这里上课。', answer: '学', options: ['学', '天', '火'], spokenText: '学', language: 'zh-CN' },
    ],
  },
  'english-word': {
    id: 'english-word',
    shortName: 'A',
    name: '英语单词岛',
    description: '看图认识身边的英文单词',
    accentColor: 0x36A968,
    accentHex: '#36A968',
    sessionQuestions: 5,
    questions: [
      { id: 'word-apple', imageKey: 'learning-apple', prompt: 'Which word means this fruit?', clue: 'It is red and round.', answer: 'apple', options: ['apple', 'bus', 'dog'], spokenText: 'apple', language: 'en-US' },
      { id: 'word-bus', imageKey: 'learning-bus', prompt: 'Which word means this vehicle?', clue: 'It takes children to school.', answer: 'bus', options: ['cat', 'pizza', 'bus'], spokenText: 'bus', language: 'en-US' },
      { id: 'word-dog', imageKey: 'learning-dog', prompt: 'Which word means this animal?', clue: 'It says woof.', answer: 'dog', options: ['dog', 'car', 'apple'], spokenText: 'dog', language: 'en-US' },
      { id: 'word-cat', imageKey: 'learning-cat', prompt: 'Which word means this animal?', clue: 'It says meow.', answer: 'cat', options: ['bus', 'cat', 'pizza'], spokenText: 'cat', language: 'en-US' },
      { id: 'word-pizza', imageKey: 'learning-pizza', prompt: 'Which word means this food?', clue: 'It is a round food with slices.', answer: 'pizza', options: ['pizza', 'dog', 'school'], spokenText: 'pizza', language: 'en-US' },
    ],
  },
  'english-phrase': {
    id: 'english-phrase',
    shortName: 'Hi',
    name: '英语短句站',
    description: '在日常场景中学习常用短句',
    accentColor: 0xF28A19,
    accentHex: '#F28A19',
    sessionQuestions: 5,
    questions: [
      { id: 'phrase-hello', imageKey: 'learning-waving-hand', prompt: 'How do you greet a friend?', clue: 'Wave your hand and say it.', answer: 'Hello!', options: ['Hello!', 'Good night!', 'Thank you!'], spokenText: 'Hello!', language: 'en-US' },
      { id: 'phrase-morning', imageKey: 'learning-sunrise', prompt: 'What do you say in the morning?', clue: 'The sun is coming up.', answer: 'Good morning!', options: ['Good morning!', 'Goodbye!', 'I am fine.'], spokenText: 'Good morning!', language: 'en-US' },
      { id: 'phrase-school', imageKey: 'learning-school', prompt: 'What can you say before class?', clue: 'You are going to learn.', answer: "Let's go to school.", options: ["Let's go to school.", 'I see a cat.', 'Good night!'], spokenText: "Let's go to school.", language: 'en-US' },
      { id: 'phrase-bus', imageKey: 'learning-bus', prompt: 'What can you say when you spot this?', clue: 'It is a yellow school vehicle.', answer: 'I see a bus.', options: ['I see a bus.', 'I like pizza.', 'Hello!'], spokenText: 'I see a bus.', language: 'en-US' },
      { id: 'phrase-outside', imageKey: 'learning-beach', prompt: 'What can you say before a trip outside?', clue: 'The weather looks nice.', answer: "Let's go outside.", options: ["Let's go outside.", 'Good night!', 'I see a dog.'], spokenText: "Let's go outside.", language: 'en-US' },
    ],
  },
  poetry: {
    id: 'poetry',
    shortName: '诗',
    name: '古诗小灯',
    description: '从名篇名句里找回缺少的字',
    accentColor: 0x8B5FBF,
    accentHex: '#8B5FBF',
    sessionQuestions: 5,
    questions: [
      { id: 'poetry-spring', imageKey: 'learning-sunrise', prompt: '春眠不觉 ___', clue: '《春晓》孟浩然', answer: '晓', options: ['晓', '鸟', '花'], spokenText: '春眠不觉晓', language: 'zh-CN' },
      { id: 'poetry-moon', imageKey: 'learning-books', prompt: '床前明月 ___', clue: '《静夜思》李白', answer: '光', options: ['光', '山', '水'], spokenText: '床前明月光', language: 'zh-CN' },
      { id: 'poetry-goose', imageKey: 'learning-beach', prompt: '白毛浮绿 ___', clue: '《咏鹅》骆宾王', answer: '水', options: ['水', '天', '田'], spokenText: '白毛浮绿水', language: 'zh-CN' },
      { id: 'poetry-farmer', imageKey: 'learning-pizza', prompt: '粒粒皆辛 ___', clue: '《悯农》李绅', answer: '苦', options: ['苦', '乐', '甜'], spokenText: '粒粒皆辛苦', language: 'zh-CN' },
      { id: 'poetry-tower', imageKey: 'learning-school', prompt: '更上 ___ 层楼', clue: '《登鹳雀楼》王之涣', answer: '一', options: ['一', '三', '九'], spokenText: '更上一层楼', language: 'zh-CN' },
    ],
  },
}

export function getLearningModule(moduleId: LearningModuleId) {
  return LEARNING_MODULES[moduleId]
}