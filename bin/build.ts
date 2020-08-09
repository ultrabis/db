import common from '../src/common'
import fs from 'fs'
import rimraf from 'rimraf'

const build = async () => {
  // clean destination
  console.log(`cleaning dist...`)
  rimraf.sync(`dist`)

  console.log(`creating 'full' database`)
  await common.createDB(`full`, `cache/masterList.json`)

  console.log(`creating 'moonkin' database`)
  await common.moonkinCreateDB(`custom/moonkin.csv`)

  console.log(`copying interfaces`)
  fs.copyFileSync(`src/interface/ItemJSON.ts`, `dist/ItemJSON.ts`)
  fs.copyFileSync(`src/interface/ItemSuffixJSON.ts`, `dist/ItemSuffixJSON.ts`)

  console.log(`complete`)
}

void build()
