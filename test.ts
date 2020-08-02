import common from './common'

const doIt = async () => {
  // const filePath = `wowhead/items/masters-hat.xml.gz`
  // console.log(common.stringFromGzipFile(filePath))
  //const x = await common.wowheadReadXML(`Master's Hat`)

  //console.log(x)
  console.log(common.wowheadItemName(`Monster - Spear, Broad Notched`))
  console.log(common.wowheadItemName(`Atiesh, Greatstaff of the Guardian`))
  console.log(common.wowheadItemName(`Monster - Throwing Axe`))
  console.log(common.wowheadItemName(`Well-stitched Robe`))
}

doIt()