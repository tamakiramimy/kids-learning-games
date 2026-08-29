const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const packageJson = JSON.parse(read('package.json'))
const packageLock = JSON.parse(read('package-lock.json'))
const androidGradle = read('android/app/build.gradle')
const xcodeProject = read('ios/App/App.xcodeproj/project.pbxproj')

const failures = []
const uniqueMatches = (content, expression, label) => {
  const values = [...content.matchAll(expression)].map((match) => match[1])
  const unique = [...new Set(values)]

  if (values.length === 0) {
    failures.push(`Could not find ${label}.`)
  } else if (unique.length !== 1) {
    failures.push(`${label} has inconsistent values: ${unique.join(', ')}.`)
  }

  return unique[0]
}

const version = packageJson.version
const lockVersion = packageLock.version
const workspaceLockVersion = packageLock.packages?.['']?.version
const androidVersion = uniqueMatches(androidGradle, /versionName\s+["']([^"']+)["']/g, 'Android versionName')
const androidBuild = uniqueMatches(androidGradle, /versionCode\s+(\d+)/g, 'Android versionCode')
const appleVersion = uniqueMatches(xcodeProject, /MARKETING_VERSION = ([^;]+);/g, 'Apple MARKETING_VERSION')
const appleBuild = uniqueMatches(xcodeProject, /CURRENT_PROJECT_VERSION = ([^;]+);/g, 'Apple CURRENT_PROJECT_VERSION')

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  failures.push(`Package version must use X.Y.Z format, received ${version}.`)
}

for (const [label, value] of [
  ['package-lock version', lockVersion],
  ['package-lock workspace version', workspaceLockVersion],
  ['Android versionName', androidVersion],
  ['Apple MARKETING_VERSION', appleVersion],
]) {
  if (value !== version) {
    failures.push(`${label} must match package version ${version}, received ${value}.`)
  }
}

if (androidBuild !== appleBuild) {
  failures.push(`Android versionCode ${androidBuild} must match Apple build ${appleBuild}.`)
}

const tagArgument = process.argv.indexOf('--tag')
const tag = tagArgument >= 0 ? process.argv[tagArgument + 1] : process.env.GITHUB_REF_NAME
if (tag && tag !== `v${version}`) {
  failures.push(`Release tag must be v${version}, received ${tag}.`)
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`Release version verification passed: v${version} (build ${androidBuild}).`)