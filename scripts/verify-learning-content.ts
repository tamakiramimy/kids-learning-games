import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  LEARNING_IMAGE_ASSETS,
  LEARNING_MODULE_ORDER,
  LEARNING_MODULES,
} from '../src/config/learningContent.ts'

const assetKeys = new Set(LEARNING_IMAGE_ASSETS.map((asset) => asset.key))

for (const asset of LEARNING_IMAGE_ASSETS) {
  const assetFile = fileURLToPath(new URL(`../public/${asset.path}`, import.meta.url))
  assert.ok(existsSync(assetFile), `Missing local learning asset: ${asset.path}`)
}

for (const moduleId of LEARNING_MODULE_ORDER) {
  const module = LEARNING_MODULES[moduleId]
  assert.ok(module.questions.length >= module.sessionQuestions, `${module.name} needs enough questions for one session`)
  for (const question of module.questions) {
    assert.ok(assetKeys.has(question.imageKey), `${question.id} references an unknown image key`)
    assert.equal(question.options.length, 3, `${question.id} must offer three child-friendly choices`)
    assert.equal(new Set(question.options).size, 3, `${question.id} choices must be unique`)
    assert.ok(question.options.includes(question.answer), `${question.id} must include the answer`)
    assert.ok(question.spokenText.trim().length > 0, `${question.id} needs optional speech text`)
  }
}

console.log(`Learning content verification passed: ${LEARNING_MODULE_ORDER.length} modules, ${LEARNING_IMAGE_ASSETS.length} local images.`)