import common from '../src/common'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import ItemSuffixType from 'libclassic/src/enum/ItemSuffixType'
import ItemSuffixJSON from '../src/interface/ItemSuffixJSON'
import lc from 'libclassic'

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
    console.log(`${testItems[i]} = ${common.wowheadItemName(testItems[i])}`)
  }
  console.log(``)
}

const testParse = async () => {
  const masterSuffixes: ItemSuffixJSON[] = JSON.parse(common.stringFromFile(`src/masterItemSuffix.json`))

  const p = async (id: number, name: string) => {
    console.log(`-- ${name}`)
    const item = await common.wowheadParseItem(id, name, masterSuffixes)
    console.log(JSON.parse(JSON.stringify(item)))
  }

  console.log(`test parse`)
  console.log(`==========`)
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
  const itemSuffixes: ItemSuffixJSON[] = JSON.parse(common.stringFromFile(`dist/full/itemSuffix.json`))
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
  common.createDBMoonkin()
}

const testCreateDBWarlock = async () => {
  common.createDBMoonkin()
}

const doIt = async () => {
  // testWowheadItemName()
  // testCreateItemDb()
  // testShowSuffixTypes()
  // testEluding()
  // testShowSuffixTypes()
  // testParse()
  testCreateDBMoonkin()
  // testCreateDBWarlock()
}

doIt()
