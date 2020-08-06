import common from '../src/common'
import mkdirp from 'mkdirp'
import fs from 'fs'

import ItemJSON from '../src/interface/ItemJSON'
import ItemSuffixJSON from '../src/interface/ItemSuffixJSON'

let itemJSONArray: ItemJSON[]
let itemSuffixJSONArray: ItemSuffixJSON[]
let outputFile: string

// the 'all' database includes every item
console.log(`creating 'all' database...`)
mkdirp.sync(`dist/all`)

outputFile = `dist/all/item.json`
if (!fs.existsSync(outputFile)) {
  console.log(`writing item database to ${outputFile}`)
  itemJSONArray = common.itemJSONArrayFromMasterList({
    outputFile: `dist/all/item.json`
  })
  console.log(`wrote ${itemJSONArray.length} items to ${outputFile}`)
} else {
  console.log(`${outputFile} exists, skipping`)
}

outputFile = `dist/all/item-modular.json`
if (!fs.existsSync(outputFile)) {
  console.log(`writing modular item database to ${outputFile}`)
  itemJSONArray = common.itemJSONArrayFromMasterList({
    outputFile: `dist/all/item-modular.json`,
    modular: true
  })
  console.log(`wrote ${itemJSONArray.length} items to ${outputFile}`)
} else {
  console.log(`${outputFile} exists, skipping`)
}

outputFile = 'dist/all/itemSuffix.json'
if (!fs.existsSync(outputFile)) {
  console.log(`writing itemSuffix to ${outputFile}`)
  itemSuffixJSONArray = common.itemSuffixJSONArrayFromItemFile(`dist/all/item.json`, outputFile)
} else {
  console.log(`${outputFile} exists, skipping`)
}

// the 'moonkin' database only includes items from keftenk spreadsheet
console.log(`creating 'moonkin' database...`)
mkdirp.sync(`dist/moonkin`)

// FIXME: copy interface files. this will probably change.
console.log(`copying interfaces...`)
fs.copyFileSync(`src/interface/ItemJSON.ts`, `dist/ItemJSON.ts`)
fs.copyFileSync(`src/interface/ItemSuffixJSON.ts`, `dist/ItemSuffixJSON.ts`)

console.log(`build completed succesfully`)
