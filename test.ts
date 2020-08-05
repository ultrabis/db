import common from './common'
import lc from 'libclassic'
import cheerio from 'cheerio'

import ItemJSON from 'libclassic/src/interface/ItemJSONNew'

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

const testItemJSONFromId = () => {
  console.log(`-- rune of perfection`)
  console.log(common.itemJSONFromId(21565))
  console.log(`-- neltharions tear`)
  console.log(common.itemJSONFromId(19379))
  /*
  console.log(`-- masters hat`)
  console.log(common.itemJSONFromId(10250))
  console.log(`-- masters hat of arcane wrath (+40)`)
  console.log(common.itemJSONFromId(10250, 1826))
  console.log(`-- grand marshals demolisher`)
  console.log(common.itemJSONFromId(23455))
  */

  //const itemJSON = common.itemJSONFromId(10250) // masters hat (random enchant)
}

const doIt = async () => {
  // testWowheadItemName()
  // testItemIdsFromName()
  testItemJSONFromId()
}

doIt()
