import common from './common'
import { exit } from 'process'

// const cheerio = require('cheerio')
const argv = require('minimist')(process.argv.slice(2))

const main = async () => {
  const items = argv._[0]
  await common.wowheadDownloadItems(items)
}


main()
