import node from '../src/node'
import fs from 'fs'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import filesize from 'filesize'
//import ItemSuffixType from 'libclassic/src/enum/ItemSuffixType'
import ItemSuffixJSON from '../src/interface/ItemSuffixJSON'
import ItemJSON from '../src/interface/ItemJSON'
import lc from 'libclassic'

import ItemSuffixType from '../src/enum/ItemSuffixType'

const testWowheadItemName = () => {
  const testItems = [
    `Monster - Spear, Broad Notched`,
    `Atiesh, Greatstaff of the Guardian`,
    `Monster - Throwing Axe`,
    `Well-stitched Robe`
  ]
  console.log(`test wowheadItemName()`)
  console.log(`======================`)
  for (let i = 0; i < testItems.length; i++) {
    console.log(`${testItems[i]} = ${node.wowheadItemName(testItems[i])}`)
  }
  console.log(``)
}

const testParse = async () => {
  const masterSuffixes: ItemSuffixJSON[] = JSON.parse(node.stringFromFile(`src/masterItemSuffix.json`))

  const p = async (id: number, name: string) => {
    console.log(`-- ${name}`)
    const item = await node.wowheadParseItem(id, name, masterSuffixes)
    console.log(JSON.parse(JSON.stringify(item)))
  }

  console.log(`test parse`)
  console.log(`==========`)
  await p(21186, 'Rockfury Bracers')
  await p(14152, 'Robe of the Archmage')
  await p(11118, `Archaedic Stone`)
  await p(10250, `Master's Hat`)
  await p(23207, `Mark of the Champion`)
  await p(833, `Lifestone`)
  await p(21269, `Blessed Qiraji Bulwark`)
  await p(21598, `Royal Qiraji Belt`)
  await p(18713, `Rhokdelar Longbow of the Ancient Keepers`)
  await p(22732, `Mark of Cthun`)
  await p(12632, `Storm Gauntlets`)
  await p(21836, `Ritssyns Ring of Chaos`)
  await p(942, `Freezing Band`)
  await p(17741, `Natures Embrace`)
  await p(6898, `Orb of Soranruk`)
  await p(22632, `Atiesh Greatstaff of the Guardian`)
  await p(21128, `Staff of the Qiraji Prophets`)
  await p(18545, `Leggings of Arcane Supremacy`)
  await p(21565, `Rune of Perfection`)
  await p(19379, `Neltharions Tear`)
  await p(23455, `Grand Marshals Demolisher`)
}

const testShowSuffixTypes = async () => {
  const suffixTypeSet: Set<ItemSuffixType> = new Set()
  const itemSuffixes: ItemSuffixJSON[] = JSON.parse(node.stringFromFile(`dist/full/itemSuffix.json`))
  const usedSuffixTypes: string[] = []
  const unusedSuffixTypes: string[] = []

  for (let i = 0; i < itemSuffixes.length; i++) {
    suffixTypeSet.add(itemSuffixes[i].type)
  }

  // used suffixes
  const validSuffixTypes = Array.from(suffixTypeSet)
  for (let i = 0; i < validSuffixTypes.length; i++) {
    usedSuffixTypes.push(lc.utils.getEnumKeyByEnumValue(lc.common.ItemSuffixType, validSuffixTypes[i]))
  }

  // unused suffixes
  const allSuffixTypes = lc.utils.getAllEnumValues(lc.common.ItemSuffixType)
  for (let i = 0; i < allSuffixTypes.length; i++) {
    if (!validSuffixTypes.includes(allSuffixTypes[i])) {
      unusedSuffixTypes.push(lc.utils.getEnumKeyByEnumValue(lc.common.ItemSuffixType, allSuffixTypes[i]))
    }
  }

  console.log(`usedSuffixTypes: ${usedSuffixTypes}`)
  console.log(`unusedSuffixTypes: ${unusedSuffixTypes}`)
}

const testCreateDBMoonkin = async () => {
  node.createDBMoonkin()
}

const testCreateDBWarlock = async () => {
  node.createDBMoonkin()
}

//const testCreateHTML = async () => {}

const convertTextToBaseItems = async (txtFilePath: string) => {
  // await fsPromises.writeFile(itemListFile, JSON.stringify(await parseTXT(customTXTFile)))
  const txtArray = fs.readFileSync(txtFilePath).toString().split('\n')
  for (let i = 0; i < txtArray.length; i++) {
    const itemName = lc.common.itemBaseName(txtArray[i])
    if (itemName !== '') {
      console.log(itemName)
    }
  }
}

// generate list of random enchant base items that are usable by all casters
const casterRandoms = async () => {
  const itemNameSet: Set<string> = new Set()
  const itemsMoonkin: ItemJSON[] = JSON.parse(node.stringFromFile(`dist/moonkin/item-random.json`))
  const itemsWarlock: ItemJSON[] = JSON.parse(node.stringFromFile(`dist/mage/item-random.json`))
  const itemsMage: ItemJSON[] = JSON.parse(node.stringFromFile(`dist/warlock/item-random.json`))
  const items: ItemJSON[] = [...itemsMoonkin, ...itemsWarlock, ...itemsMage]

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    // not a random enchant
    if (!item.suffixId) {
      continue
    }

    // skip armor pieces that aren't cloth
    if (item.class == 4 && item.subclass != 1) {
      continue
    }

    // skip maces
    if (item.class == 2 && item.subclass == 4) {
      continue
    }

    itemNameSet.add(lc.common.itemBaseName(item.name))
  }

  const itemNameArr = Array.from(itemNameSet)
  for (let i = 0; i < itemNameArr.length; i++) {
    console.log(itemNameArr[i])
  }
}

const generateReadmeTable = async () => {
  const dbs: any[] = []
  const dbNames = ['full', 'moonkin', 'feral', 'warlock', 'mage']

  dbNames.forEach((dbName) => {
    dbs.push({
      name: dbName,
      mainSize: filesize(fs.statSync(`dist/${dbName}/item.json`).size, { unix: true, round: 0 }),
      modularSize: filesize(fs.statSync(`dist/${dbName}/item-modular.json`).size, { unix: true, round: 0 }),
      randomSize: filesize(fs.statSync(`dist/${dbName}/item-random.json`).size, { unix: true, round: 0 }),
      suffixSize: filesize(fs.statSync(`dist/${dbName}/itemSuffix.json`).size, { unix: true, round: 0 })
    })
  })

  console.log('| main | modular | suffix |')
  console.log('| ---- | ------- | ------ |')
  dbs.forEach((db) => {
    console.log(
      `| [${db.name} (${db.mainSize})][${db.name}-main] | [${db.name} (${db.modularSize})][${db.name}-modular] | [${db.name} (${db.suffixSize})][${db.name}-suffix] |`
    )
  })

  /*
  console.log('| full | moonkin | feral | warlock | mage | description |')
  console.log('|------|---------| ------|---------|------|-------------|')

  console.log(
    `| [main (${full.mainSize})][full-main] | [main (${moonkin.mainSize})][moonkin-main] | [main (${feral.mainSize})][feral-main] | [main (${warlock.mainSize})][warlock-main] | [main (${mage.mainSize})][mage-main] | all items |`
  )

  console.log(
    `| [modular (${full.modularSize})][full-modular] | [modular (${moonkin.modularSize})][moonkin-modular] | [modular (${feral.modularSize})][feral-modular] | [modular (${warlock.modularSize})][warlock-modular] | [modular (${mage.modularSize})][mage-modular] | no random enchants |`
  )

  console.log(
    `| [random (${full.randomSize})][full-random] | [random (${moonkin.randomSize})][moonkin-random] | [random (${feral.randomSize})][feral-random] | [random (${warlock.randomSize})][warlock-random] | [random (${mage.randomSize})][mage-random] | only random enchants |`
  )

  console.log(
    `| [suffix (${full.suffixSize})][full-suffix] | [suffix (${moonkin.suffixSize})][moonkin-suffix] | [suffix (${feral.suffixSize})][feral-suffix] | [suffix (${warlock.suffixSize})][warlock-suffix] | [suffix (${mage.suffixSize})][mage-suffix] | used with modular|`
  )
  */

  /*
  | full | moonkin | feral | warlock | mage | description |
|------|---------| ------|---------|------|-------------|
| [main (8.8MB)][full-main] | [main (178k)][moonkin-main] | [main (220k)][feral-main] | [main (121k)][warlock-main] | [main (63k)][mage-main] | all items including random enchants |
| [modular (2MB)][full-modular] | [modular (125k)][moonkin-modular] | [modular (130k)][feral-modular] | [modular (119k)][warlock-modular] | [modular (60k][mage-modular] | all items excluding random enchants |
| [random (7.3MB)][full-random] | [random (91k)][moonkin-random] | [random (110k)][feral-random] | [random (5k)][warlock-random] | [random (6K)][mage-random] | only random enchants |
| [itemSuffix (43k)][full-suffix] | [itemSuffix (3k)][moonkin-suffix] | [itemSuffix (7k)][feral-suffix] | [itemSuffix (1k)][warlock-suffix] | [itemSuffix (2K)][mage-suffix] | can be used in conjunction with `modular` to generate random enchants at run-time |
*/
}

const testUltraEnum = () => {


}

const doIt = async () => {
  // testWowheadItemName()
  // testCreateItemDb()
  // testShowSuffixTypes()
  // testEluding()
  // testShowSuffixTypes()
  // testParse()
  // testCreateDBMoonkin()
  // testCreateDBWarlock()
  // testCreateHTML()
  //convertTextToBaseItems('custom/y')
  //casterRandoms()
  //generateReadmeTable()
  //testUltraEnum()
}

doIt()
