import common from '../src/common'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import fs from 'fs'

const build = async (dbName: string, itemListFile: string) => {
  console.log(`creating '${dbName}' database...`)
  rimraf.sync(`dist/${dbName}`)
  mkdirp.sync(`dist/${dbName}`)
  await common.createDB(`dist/${dbName}`, itemListFile)
}

const buildAll = async () => {
  await build('full', 'cache/masterList.json')
  fs.copyFileSync(`src/interface/ItemJSON.ts`, `dist/ItemJSON.ts`)
  fs.copyFileSync(`src/interface/ItemSuffixJSON.ts`, `dist/ItemSuffixJSON.ts`)
}

void buildAll()
