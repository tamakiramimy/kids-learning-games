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

interface LearningQuestionSeed {
  imageKey: string
  prompt: string
  clue: string
  answer: string
  spokenText: string
  language: 'zh-CN' | 'en-US'
}

// 每个知识点都会和不同干扰项、不同选项顺序组合。题目不会再按固定的 5 题循环。
function createQuestionBank(prefix: string, seeds: LearningQuestionSeed[]): LearningQuestion[] {
  const answers = seeds.map((seed) => seed.answer)
  return seeds.flatMap((seed, seedIndex) => {
    return Array.from({ length: 3 }, (_, variantIndex) => {
      const distractors = answers.filter((answer) => answer !== seed.answer)
      const first = distractors[(seedIndex * 5 + variantIndex * 3) % distractors.length]
      const secondIndex = (seedIndex * 7 + variantIndex * 5 + 1) % distractors.length
      const secondCandidate = distractors[secondIndex]
      const second = secondCandidate === first
        ? distractors[(secondIndex + 1) % distractors.length]
        : secondCandidate
      const options = [first, second]
      options.splice((seedIndex + variantIndex) % 3, 0, seed.answer)
      return {
        id: `${prefix}-${seedIndex + 1}-${variantIndex + 1}`,
        imageKey: seed.imageKey,
        prompt: seed.prompt,
        clue: seed.clue,
        answer: seed.answer,
        options,
        spokenText: seed.spokenText,
        language: seed.language,
      }
    })
  })
}

export const LEARNING_MODULES: Record<LearningModuleId, LearningModuleDefinition> = {
  pinyin: {
    id: 'pinyin',
    shortName: '拼',
    name: '拼音小耳朵',
    description: '看图、听音，找到正确拼音',
    accentColor: 0xD7567F,
    accentHex: '#D7567F',
    sessionQuestions: 5,
    questions: createQuestionBank('pinyin', [
      { imageKey: 'learning-cat', prompt: '这是什么小动物？', clue: '它会“喵喵”叫。', answer: 'māo', spokenText: 'māo', language: 'zh-CN' },
      { imageKey: 'learning-dog', prompt: '这是什么小动物？', clue: '它会“汪汪”叫。', answer: 'gǒu', spokenText: 'gǒu', language: 'zh-CN' },
      { imageKey: 'learning-fox', prompt: '这是什么小动物？', clue: '它有毛茸茸的大尾巴。', answer: 'hú li', spokenText: 'hú li', language: 'zh-CN' },
      { imageKey: 'learning-apple', prompt: '这是什么水果？', clue: '红红的，圆圆的。', answer: 'píng guǒ', spokenText: 'píng guǒ', language: 'zh-CN' },
      { imageKey: 'learning-watermelon', prompt: '这是什么水果？', clue: '夏天吃起来甜甜的。', answer: 'xī guā', spokenText: 'xī guā', language: 'zh-CN' },
      { imageKey: 'learning-pizza', prompt: '这是什么食物？', clue: '圆圆的，可以切成小块。', answer: 'pī sà', spokenText: 'pī sà', language: 'zh-CN' },
      { imageKey: 'learning-car', prompt: '这是什么交通工具？', clue: '它在马路上开。', answer: 'qì chē', spokenText: 'qì chē', language: 'zh-CN' },
      { imageKey: 'learning-bus', prompt: '这是什么交通工具？', clue: '它可以坐很多人。', answer: 'bā shì', spokenText: 'bā shì', language: 'zh-CN' },
      { imageKey: 'learning-bicycle', prompt: '这是什么交通工具？', clue: '要用脚踩踏板。', answer: 'zì xíng chē', spokenText: 'zì xíng chē', language: 'zh-CN' },
      { imageKey: 'learning-school', prompt: '这是哪里？', clue: '小朋友在这里学习。', answer: 'xué xiào', spokenText: 'xué xiào', language: 'zh-CN' },
      { imageKey: 'learning-books', prompt: '这是什么？', clue: '里面有很多故事和知识。', answer: 'shū', spokenText: 'shū', language: 'zh-CN' },
      { imageKey: 'learning-sunrise', prompt: '天空中出现了什么？', clue: '它带来光和温暖。', answer: 'tài yáng', spokenText: 'tài yáng', language: 'zh-CN' },
      { imageKey: 'learning-beach', prompt: '这是哪里？', clue: '有沙滩，也有大海。', answer: 'hǎi biān', spokenText: 'hǎi biān', language: 'zh-CN' },
      { imageKey: 'learning-boy', prompt: '这是谁？', clue: '这是一个男孩子。', answer: 'nán hái', spokenText: 'nán hái', language: 'zh-CN' },
      { imageKey: 'learning-woman', prompt: '这是谁？', clue: '这是一位女士。', answer: 'nǚ shì', spokenText: 'nǚ shì', language: 'zh-CN' },
      { imageKey: 'learning-waving-hand', prompt: '这是什么？', clue: '我们用它挥手打招呼。', answer: 'shǒu', spokenText: 'shǒu', language: 'zh-CN' },
    ]),
  },
  hanzi: {
    id: 'hanzi',
    shortName: '字',
    name: '汉字小屋',
    description: '从图片里认识常用汉字',
    accentColor: 0x3F8DE3,
    accentHex: '#3F8DE3',
    sessionQuestions: 5,
    questions: createQuestionBank('hanzi', [
      { imageKey: 'learning-boy', prompt: '看图选汉字', clue: '这是一个小朋友。', answer: '人', spokenText: '人', language: 'zh-CN' },
      { imageKey: 'learning-woman', prompt: '看图选汉字', clue: '她是一位女士。', answer: '女', spokenText: '女', language: 'zh-CN' },
      { imageKey: 'learning-waving-hand', prompt: '看图选汉字', clue: '我们用它挥手。', answer: '手', spokenText: '手', language: 'zh-CN' },
      { imageKey: 'learning-school', prompt: '看图选汉字', clue: '我们去这里上课。', answer: '学', spokenText: '学', language: 'zh-CN' },
      { imageKey: 'learning-books', prompt: '看图选汉字', clue: '它里面有故事和知识。', answer: '书', spokenText: '书', language: 'zh-CN' },
      { imageKey: 'learning-apple', prompt: '看图选汉字', clue: '这是一个水果。', answer: '果', spokenText: '果', language: 'zh-CN' },
      { imageKey: 'learning-watermelon', prompt: '看图选汉字', clue: '这是夏天常吃的水果。', answer: '瓜', spokenText: '瓜', language: 'zh-CN' },
      { imageKey: 'learning-pizza', prompt: '看图选汉字', clue: '这是圆圆的食物。', answer: '饼', spokenText: '饼', language: 'zh-CN' },
      { imageKey: 'learning-dog', prompt: '看图选汉字', clue: '它会看家。', answer: '狗', spokenText: '狗', language: 'zh-CN' },
      { imageKey: 'learning-cat', prompt: '看图选汉字', clue: '它会“喵喵”叫。', answer: '猫', spokenText: '猫', language: 'zh-CN' },
      { imageKey: 'learning-fox', prompt: '看图选汉字', clue: '它有一条大尾巴。', answer: '狐', spokenText: '狐', language: 'zh-CN' },
      { imageKey: 'learning-car', prompt: '看图选汉字', clue: '它在路上跑。', answer: '车', spokenText: '车', language: 'zh-CN' },
      { imageKey: 'learning-bus', prompt: '看图选汉字', clue: '它可以坐很多人。', answer: '巴', spokenText: '巴', language: 'zh-CN' },
      { imageKey: 'learning-bicycle', prompt: '看图选汉字', clue: '自行车的第一个字。', answer: '自', spokenText: '自', language: 'zh-CN' },
      { imageKey: 'learning-sunrise', prompt: '看图选汉字', clue: '它照亮天空。', answer: '日', spokenText: '日', language: 'zh-CN' },
      { imageKey: 'learning-beach', prompt: '看图选汉字', clue: '这里有大海和沙滩。', answer: '海', spokenText: '海', language: 'zh-CN' },
    ]),
  },
  'english-word': {
    id: 'english-word',
    shortName: 'A',
    name: '英语单词岛',
    description: '看图认识身边的英文单词',
    accentColor: 0x36A968,
    accentHex: '#36A968',
    sessionQuestions: 5,
    questions: createQuestionBank('word', [
      { imageKey: 'learning-apple', prompt: 'Which word means this fruit?', clue: 'It is red and round.', answer: 'apple', spokenText: 'apple', language: 'en-US' },
      { imageKey: 'learning-watermelon', prompt: 'Which word means this fruit?', clue: 'It is big, green and sweet.', answer: 'watermelon', spokenText: 'watermelon', language: 'en-US' },
      { imageKey: 'learning-pizza', prompt: 'Which word means this food?', clue: 'It is round and has slices.', answer: 'pizza', spokenText: 'pizza', language: 'en-US' },
      { imageKey: 'learning-dog', prompt: 'Which word means this animal?', clue: 'It says woof.', answer: 'dog', spokenText: 'dog', language: 'en-US' },
      { imageKey: 'learning-cat', prompt: 'Which word means this animal?', clue: 'It says meow.', answer: 'cat', spokenText: 'cat', language: 'en-US' },
      { imageKey: 'learning-fox', prompt: 'Which word means this animal?', clue: 'It has a fluffy tail.', answer: 'fox', spokenText: 'fox', language: 'en-US' },
      { imageKey: 'learning-car', prompt: 'Which word means this vehicle?', clue: 'It drives on a road.', answer: 'car', spokenText: 'car', language: 'en-US' },
      { imageKey: 'learning-bus', prompt: 'Which word means this vehicle?', clue: 'It can carry many children.', answer: 'bus', spokenText: 'bus', language: 'en-US' },
      { imageKey: 'learning-bicycle', prompt: 'Which word means this vehicle?', clue: 'You ride it with pedals.', answer: 'bicycle', spokenText: 'bicycle', language: 'en-US' },
      { imageKey: 'learning-school', prompt: 'Which word means this place?', clue: 'Children learn here.', answer: 'school', spokenText: 'school', language: 'en-US' },
      { imageKey: 'learning-books', prompt: 'Which word means this?', clue: 'We read them for stories.', answer: 'books', spokenText: 'books', language: 'en-US' },
      { imageKey: 'learning-sunrise', prompt: 'Which word means this?', clue: 'It shines in the sky.', answer: 'sun', spokenText: 'sun', language: 'en-US' },
      { imageKey: 'learning-beach', prompt: 'Which word means this place?', clue: 'It has sand and sea.', answer: 'beach', spokenText: 'beach', language: 'en-US' },
      { imageKey: 'learning-boy', prompt: 'Which word means this child?', clue: 'He is a young male child.', answer: 'boy', spokenText: 'boy', language: 'en-US' },
      { imageKey: 'learning-woman', prompt: 'Which word means this person?', clue: 'She is an adult woman.', answer: 'woman', spokenText: 'woman', language: 'en-US' },
      { imageKey: 'learning-waving-hand', prompt: 'Which word means this?', clue: 'You wave it to say hello.', answer: 'hand', spokenText: 'hand', language: 'en-US' },
    ]),
  },
  'english-phrase': {
    id: 'english-phrase',
    shortName: 'Hi',
    name: '英语短句站',
    description: '在日常场景中学习常用短句',
    accentColor: 0xF28A19,
    accentHex: '#F28A19',
    sessionQuestions: 5,
    questions: createQuestionBank('phrase', [
      { imageKey: 'learning-waving-hand', prompt: 'How do you greet a friend?', clue: 'Wave your hand and say it.', answer: 'Hello!', spokenText: 'Hello!', language: 'en-US' },
      { imageKey: 'learning-waving-hand', prompt: 'What do you say when leaving?', clue: 'Say it before you go.', answer: 'Goodbye!', spokenText: 'Goodbye!', language: 'en-US' },
      { imageKey: 'learning-sunrise', prompt: 'What do you say in the morning?', clue: 'The sun is coming up.', answer: 'Good morning!', spokenText: 'Good morning!', language: 'en-US' },
      { imageKey: 'learning-sunrise', prompt: 'What do you say before sleeping?', clue: 'Say it at bedtime.', answer: 'Good night!', spokenText: 'Good night!', language: 'en-US' },
      { imageKey: 'learning-boy', prompt: 'How do you introduce yourself?', clue: 'Tell people your name.', answer: 'My name is Tom.', spokenText: 'My name is Tom.', language: 'en-US' },
      { imageKey: 'learning-woman', prompt: 'How do you say thanks?', clue: 'Use it when someone helps you.', answer: 'Thank you!', spokenText: 'Thank you!', language: 'en-US' },
      { imageKey: 'learning-woman', prompt: 'How do you answer "Thank you"?', clue: 'It means 不客气。', answer: "You're welcome!", spokenText: "You're welcome!", language: 'en-US' },
      { imageKey: 'learning-school', prompt: 'What can you say before class?', clue: 'You are going to learn.', answer: "Let's go to school.", spokenText: "Let's go to school.", language: 'en-US' },
      { imageKey: 'learning-school', prompt: 'What do you say to a teacher?', clue: 'Use it to be polite.', answer: 'Good morning, teacher!', spokenText: 'Good morning, teacher!', language: 'en-US' },
      { imageKey: 'learning-bus', prompt: 'What can you say when you spot this?', clue: 'It is a school vehicle.', answer: 'I see a bus.', spokenText: 'I see a bus.', language: 'en-US' },
      { imageKey: 'learning-car', prompt: 'What can you say about this?', clue: 'It has four wheels.', answer: 'This is a car.', spokenText: 'This is a car.', language: 'en-US' },
      { imageKey: 'learning-bicycle', prompt: 'What can you say about this?', clue: 'You can ride it.', answer: 'I ride a bicycle.', spokenText: 'I ride a bicycle.', language: 'en-US' },
      { imageKey: 'learning-dog', prompt: 'What can you say about this animal?', clue: 'It says woof.', answer: 'I see a dog.', spokenText: 'I see a dog.', language: 'en-US' },
      { imageKey: 'learning-cat', prompt: 'What can you say about this animal?', clue: 'It says meow.', answer: 'I see a cat.', spokenText: 'I see a cat.', language: 'en-US' },
      { imageKey: 'learning-apple', prompt: 'What can you say about this fruit?', clue: 'It is red and round.', answer: 'I like apples.', spokenText: 'I like apples.', language: 'en-US' },
      { imageKey: 'learning-pizza', prompt: 'What can you say about this food?', clue: 'It is yummy.', answer: 'I like pizza.', spokenText: 'I like pizza.', language: 'en-US' },
      { imageKey: 'learning-beach', prompt: 'What can you say before a trip outside?', clue: 'The weather looks nice.', answer: "Let's go outside.", spokenText: "Let's go outside.", language: 'en-US' },
      { imageKey: 'learning-books', prompt: 'What can you say when you want to read?', clue: 'Choose a story.', answer: 'I like books.', spokenText: 'I like books.', language: 'en-US' },
    ]),
  },
  poetry: {
    id: 'poetry',
    shortName: '诗',
    name: '古诗小灯',
    description: '从名篇名句里找回缺少的字',
    accentColor: 0x8B5FBF,
    accentHex: '#8B5FBF',
    sessionQuestions: 5,
    questions: createQuestionBank('poetry', [
      { imageKey: 'learning-sunrise', prompt: '春眠不觉 ___', clue: '《春晓》孟浩然', answer: '晓', spokenText: '春眠不觉晓', language: 'zh-CN' },
      { imageKey: 'learning-sunrise', prompt: '处处闻啼 ___', clue: '《春晓》孟浩然', answer: '鸟', spokenText: '处处闻啼鸟', language: 'zh-CN' },
      { imageKey: 'learning-sunrise', prompt: '夜来风雨 ___', clue: '《春晓》孟浩然', answer: '声', spokenText: '夜来风雨声', language: 'zh-CN' },
      { imageKey: 'learning-books', prompt: '床前明月 ___', clue: '《静夜思》李白', answer: '光', spokenText: '床前明月光', language: 'zh-CN' },
      { imageKey: 'learning-books', prompt: '疑是地上 ___', clue: '《静夜思》李白', answer: '霜', spokenText: '疑是地上霜', language: 'zh-CN' },
      { imageKey: 'learning-books', prompt: '低头思故 ___', clue: '《静夜思》李白', answer: '乡', spokenText: '低头思故乡', language: 'zh-CN' },
      { imageKey: 'learning-beach', prompt: '白毛浮绿 ___', clue: '《咏鹅》骆宾王', answer: '水', spokenText: '白毛浮绿水', language: 'zh-CN' },
      { imageKey: 'learning-beach', prompt: '红掌拨清 ___', clue: '《咏鹅》骆宾王', answer: '波', spokenText: '红掌拨清波', language: 'zh-CN' },
      { imageKey: 'learning-apple', prompt: '粒粒皆辛 ___', clue: '《悯农》李绅', answer: '苦', spokenText: '粒粒皆辛苦', language: 'zh-CN' },
      { imageKey: 'learning-apple', prompt: '谁知盘中 ___', clue: '《悯农》李绅', answer: '餐', spokenText: '谁知盘中餐', language: 'zh-CN' },
      { imageKey: 'learning-school', prompt: '更上 ___ 层楼', clue: '《登鹳雀楼》王之涣', answer: '一', spokenText: '更上一层楼', language: 'zh-CN' },
      { imageKey: 'learning-school', prompt: '欲穷千里 ___', clue: '《登鹳雀楼》王之涣', answer: '目', spokenText: '欲穷千里目', language: 'zh-CN' },
      { imageKey: 'learning-sunrise', prompt: '白日依山 ___', clue: '《登鹳雀楼》王之涣', answer: '尽', spokenText: '白日依山尽', language: 'zh-CN' },
      { imageKey: 'learning-bicycle', prompt: '小荷才露尖尖 ___', clue: '《小池》杨万里', answer: '角', spokenText: '小荷才露尖尖角', language: 'zh-CN' },
      { imageKey: 'learning-bicycle', prompt: '早有蜻蜓立上 ___', clue: '《小池》杨万里', answer: '头', spokenText: '早有蜻蜓立上头', language: 'zh-CN' },
      { imageKey: 'learning-dog', prompt: '春风吹又 ___', clue: '《赋得古原草送别》白居易', answer: '生', spokenText: '春风吹又生', language: 'zh-CN' },
      { imageKey: 'learning-dog', prompt: '野火烧不 ___', clue: '《赋得古原草送别》白居易', answer: '尽', spokenText: '野火烧不尽', language: 'zh-CN' },
      { imageKey: 'learning-car', prompt: '远上寒山石径 ___', clue: '《山行》杜牧', answer: '斜', spokenText: '远上寒山石径斜', language: 'zh-CN' },
      { imageKey: 'learning-car', prompt: '霜叶红于二月 ___', clue: '《山行》杜牧', answer: '花', spokenText: '霜叶红于二月花', language: 'zh-CN' },
      { imageKey: 'learning-watermelon', prompt: '碧玉妆成一树 ___', clue: '《咏柳》贺知章', answer: '高', spokenText: '碧玉妆成一树高', language: 'zh-CN' },
    ]),
  },
}

export function getLearningModule(moduleId: LearningModuleId) {
  return LEARNING_MODULES[moduleId]
}
