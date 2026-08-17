import assert from 'node:assert/strict'
import { comparisonGenerator } from '../src/generators/ComparisonGenerator.ts'
import { mathGenerator, type MathActivity } from '../src/generators/MathGenerator.ts'
import { pinyinGenerator, type PinyinActivity } from '../src/generators/PinyinGenerator.ts'

const iterations = 1_000

function verifyMathQuestions() {
  const activities: MathActivity[] = ['count', 'addition', 'subtraction', 'mixed']
  for (const activity of activities) {
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const question = mathGenerator.generate((iteration % 4) + 1, activity)
      assert.equal(question.options.length, 4, `${activity} should create four options`)
      assert.equal(new Set(question.options).size, 4, `${activity} options must be unique`)
      assert.ok(question.options.includes(question.answer), `${activity} must include its answer`)
      assert.ok(question.options.every((option) => option >= 0), `${activity} options cannot be negative`)
      if (question.operator === 'count') assert.equal(question.answer, question.a)
      if (question.operator === '+') assert.equal(question.answer, question.a + question.b)
      if (question.operator === '-') assert.equal(question.answer, question.a - question.b)
    }
  }
}

function verifyComparisonQuestions() {
  for (const activity of ['more', 'less', 'order'] as const) {
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const question = comparisonGenerator.generate((iteration % 5) + 1, activity)
      assert.notEqual(question.left, question.right, `${activity} must never generate equal groups`)
      assert.equal(question.answer, question.left > question.right ? 'greater' : 'less')
      if (activity === 'order') {
        assert.ok(question.orderValues)
        assert.equal(question.orderValues.length, 3, 'order challenge requires three values')
        assert.equal(new Set(question.orderValues).size, 3, 'order values must be unique')
      }
    }
  }
}

function verifyPinyinQuestions() {
  const activities: PinyinActivity[] = ['listen', 'picture']
  for (const activity of activities) {
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const question = pinyinGenerator.generate((iteration % 7) + 1, activity)
      assert.equal(question.options.length, 4, `${activity} should create four options`)
      assert.equal(new Set(question.options).size, 4, `${activity} options must be unique`)
      assert.equal(question.options[question.correctIndex], question.pinyin, `${activity} correct index must match pinyin`)
    }
  }
}

verifyMathQuestions()
verifyComparisonQuestions()
verifyPinyinQuestions()

console.log(`Generator verification passed: ${iterations} iterations per activity.`)