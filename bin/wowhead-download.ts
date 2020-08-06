import common from '../src/common'
import { exit } from 'process'

const main = async () => {
  await common.wowheadDownloadItems()
}

main()
