import { wowheadDownloadItems, wowheadDownloadAbilities } from '../src/node'
import { exit } from 'process'

const main = async () => {
  await wowheadDownloadItems()
  await wowheadDownloadAbilities()
}

main()
