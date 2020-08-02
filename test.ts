import common from './common'
import lc from 'libclassic'

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

const doIt = async () => {
  testWowheadItemName()
  testItemIdsFromName()
}

doIt()
