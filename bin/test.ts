import common from '../src/common'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'

const testItems = [
  `Monster - Spear, Broad Notched`,
  `Atiesh, Greatstaff of the Guardian`,
  `Monster - Throwing Axe`,
  `Well-stitched Robe`
]

const testWowheadItemName = () => {
  console.log(`test wowheadItemName()`)
  console.log(`======================`)
  for (let i = 0; i < testItems.length; i++) {
    console.log(`${testItems[i]} = ${common.wowheadItemName(testItems[i])}`)
  }
  console.log(``)
}

const testItemIdsFromName = () => {
  console.log(`test itemIdsFromName()`)
  console.log(`======================`)
  for (let i = 0; i < testItems.length; i++) {
    console.log(`${testItems[i]} = ${common.itemIdsFromName(testItems[i])}`)
  }
  console.log(``)
}

/*
const testItemJSONFromId = () => {
  console.log(`test itemJSONFromId()`)
  console.log(`======================`)

  console.log(`-- masters hat`)
  console.log(common.itemJSONFromIdAsync(10250))

  console.log(`-- masters hat of arcane wrath (+40)`)
  console.log(common.itemJSONFromId(10250, 1826))

  console.log(`-- mark of the champion`)
  console.log(common.itemJSONFromId(23207))

  console.log(`-- lifestone`)
  console.log(common.itemJSONFromId(833))

  console.log(`-- blessed qiraji bulwark`)
  console.log(common.itemJSONFromId(21269))

  console.log(`-- royal qiraji belt`)
  console.log(common.itemJSONFromId(21598))

  console.log(`-- rhokdelar longbow of the ancient keepers`)
  console.log(common.itemJSONFromId(18713))

  console.log(`-- mark of cthun`)
  console.log(common.itemJSONFromId(22732))

  console.log(`-- storm gauntlets`)
  console.log(common.itemJSONFromId(12632))

  console.log(`-- ritssyns ring of chaos`)
  console.log(common.itemJSONFromId(21836))

  console.log(`-- freezing band`)
  console.log(common.itemJSONFromId(942))

  console.log(`-- natures embrace`)
  console.log(common.itemJSONFromId(17741))

  console.log(`-- orb of soranruk`)
  console.log(common.itemJSONFromId(6898))

  console.log(`-- atiesh greatstaff of the guardian`)
  console.log(common.itemJSONFromId(22632))

  console.log(`-- staff of the qiraji prophets`)
  console.log(common.itemJSONFromId(21128))

  console.log(`-- leggings of arcane supremacy`)
  console.log(common.itemJSONFromId(18545))

  console.log(`-- rune of perfection`)
  console.log(common.itemJSONFromId(21565))

  console.log(`-- neltharions tear`)
  console.log(common.itemJSONFromId(19379))

  console.log(`-- grand marshals demolisher`)
  console.log(common.itemJSONFromId(23455))
}
*/

// now need to parse keftenk CSV to an itemList file
const testCreateItemDb = async () => {
  //const itemJSONArray = await common.itemJSONArrayFromMasterListAsync()

  console.log(`rm -rf dist/test && mkdir -p dist/test`)
  rimraf.sync(`dist/test`)
  mkdirp.sync(`dist/test`)

  console.log(`running createItemDb()`)
  await common.createItemDbAsync(
    `cache/masterList.json`,
    `dist/test/item.json`,
    `dist/test/item-modular.json`,
    `dist/test/item-randoms.json`,
    `dist/test/itemSuffix.json`
  )

  //console.log(`hello itemJSONArray`)
  //console.log(itemJSONArray)

  //return fsPromises.readFile(filePath).then((buffer) => {
}

const doIt = async () => {
  // testWowheadItemName()
  // testItemIdsFromName()
  // testItemJSONFromIdAsync()
  // testItemJSONArrayFromItemListFile()
  // testItemJSONArrayFromMasterListAsync()
  testCreateItemDb()
}

doIt()
