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

  p(11118, `Archaedic Stone`)
  // console.log(await common.wowheadParseItem(11118, `Archaedic Stone`, masterSuffixes))

  return

  console.log(`-- masters hat`)
  console.log(await common.wowheadParseItem(10250, `Master's Hat`, masterSuffixes))

  console.log(`-- mark of the champion`)
  console.log(await common.wowheadParseItem(23207, `Mark of the Chamption`, masterSuffixes))

  console.log(`-- lifestone`)
  console.log(await common.wowheadParseItem(833, `Lifestone`, masterSuffixes))

  console.log(`-- blessed qiraji bulwark`)
  console.log(await common.wowheadParseItem(21269, `Blessed Qiraji Bulwark`, masterSuffixes))

  console.log(`-- royal qiraji belt`)
  console.log(await common.wowheadParseItem(21598, `Royal Qiraji Belt`, masterSuffixes))

  console.log(`-- rhokdelar longbow of the ancient keepers`)
  console.log(await common.wowheadParseItem(18713, `Rhokdelar Longbow of the Ancient Keepers`, masterSuffixes))

  console.log(`-- mark of cthun`)
  console.log(await common.wowheadParseItem(22732, `Mark of Cthun`, masterSuffixes))

  console.log(`-- storm gauntlets`)
  console.log(await common.wowheadParseItem(12632, `Storm Gauntlets`, masterSuffixes))

  console.log(`-- ritssyns ring of chaos`)
  console.log(await common.wowheadParseItem(21836, `Ritssyns Ring of Chaos`, masterSuffixes))

  console.log(`-- freezing band`)
  console.log(await common.wowheadParseItem(942, `Freezing Band`, masterSuffixes))

  console.log(`-- natures embrace`)
  console.log(await common.wowheadParseItem(17741, `Natures Embrace`, masterSuffixes))

  console.log(`-- orb of soranruk`)
  console.log(await common.wowheadParseItem(6898, `Orb of Soranruk`, masterSuffixes))

  console.log(`-- atiesh greatstaff of the guardian`)
  console.log(await common.wowheadParseItem(22632, `Atiesh Greatstaff of the Guardian`, masterSuffixes))

  console.log(`-- staff of the qiraji prophets`)
  console.log(await common.wowheadParseItem(21128, `Staff of the Qiraji Prophets`, masterSuffixes))

  console.log(`-- leggings of arcane supremacy`)
  console.log(await common.wowheadParseItem(18545, `Leggings of Arcane Supremacy`, masterSuffixes))

  console.log(`-- rune of perfection`)
  console.log(await common.wowheadParseItem(21565, `Rune of Perfection`, masterSuffixes))

  console.log(`-- neltharions tear`)
  console.log(await common.wowheadParseItem(19379, `Neltharions Tear`, masterSuffixes))

  console.log(`-- grand marshals demolisher`)
  console.log(await common.wowheadParseItem(23455, `Grand Marshals Demolisher`, masterSuffixes))
}

const testCreateItemDb = async () => {
  rimraf.sync(`dist/test`)
  mkdirp.sync(`dist/test`)
  await common.createDB(`dist/test`, `cache/masterList.json`)
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

const doIt = async () => {
  // testWowheadItemName()
  // testCreateItemDb()
  // testShowSuffixTypes()
  // testEluding()
  // testShowSuffixTypes()
  testParse()
}

doIt()
