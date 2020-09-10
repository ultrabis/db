import * as utils from '../src/utils'

const testString = `Master's Hat of Arcane Wrath`

console.log(`fuzzifyString(\`${testString}\`) = '${utils.fuzzifyString(testString)}'`)
console.log(`dashifyString(\`${testString}\`) = '${utils.dashifyString(testString)}'`)

console.log(
    `fuzzyIncludes(\`${testString}\`, 'masters hat') = ` +
    `${utils.fuzzyIncludes(testString, 'masters hat')}`
)