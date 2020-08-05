import common from './common'
import lc from 'libclassic'
import { exit } from 'process'

const argv = require('minimist')(process.argv.slice(2))

const itemName = argv._[0]
const bonusValue = argv._[1]

if (!itemName || !bonusValue) {
  console.error(`Usage: getSuffix <itemName> <bonusValue>`)
  console.error(``)
  console.error(`EXAMPLE: getSuffix "Blesswind Hammer of Arcane Wrath" "14"`)
  exit(1)
}

const itemSuffix = lc.itemSuffix.fromItemNameAndBonusValue(itemName, Number(bonusValue))
if (!itemSuffix) {
  console.error(`can't find suffix`)
  exit(1)
}

// console.log(JSON.stringify(itemSuffix, null, 2))
console.log(itemSuffix.id)

/*
return libclassic.gearItemSuffix.fromItemNameAndBonusValue(
  this.itemName,
  this.bonusValue
)
*/
