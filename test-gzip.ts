import common from './common'

const doIt = async () => {
  // const filePath = `wowhead/items/masters-hat.xml.gz`
  // console.log(common.stringFromGzipFile(filePath))
  const x = await common.wowheadReadXML(`Master's Hat`)

  console.log(x)
}

doIt()