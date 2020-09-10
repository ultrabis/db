import * as node from '../src/node'
import fs from 'fs'
import rimraf from 'rimraf'

const argv = require('minimist')(process.argv.slice(2))
const dbName = argv._[0]

const build = async () => {
  if (dbName && dbName === 'moonkin') {
    return await node.createDBMoonkin()
  } else if (dbName && dbName === 'warlock') {
    return await node.createDBWarlock()
  } else if (dbName && dbName === 'feral') {
    return await node.createDBFeral()
  } else if (dbName && dbName === 'mage') {
    return await node.createDBMage()
  }

  // clean destination
  console.log(`cleaning dist...`)
  rimraf.sync(`dist`)

  console.log(`creating 'full' database`)
  await node.createDBFull()

  console.log(`creating 'moonkin' database`)
  await node.createDBMoonkin()

  console.log(`creating 'warlock' database`)
  await node.createDBWarlock()

  console.log(`creating 'feral' database`)
  await node.createDBFeral()

  console.log(`creating 'mage' database`)
  await node.createDBMage()

  console.log(`copying interfaces`)
  fs.copyFileSync(`src/interface/ItemJSON.ts`, `dist/ItemJSON.ts`)
  fs.copyFileSync(`src/interface/ItemSuffixJSON.ts`, `dist/ItemSuffixJSON.ts`)

  console.log(`complete`)
}

void build()
