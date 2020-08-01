const fs = require('fs')

import cli from './cli'
import ItemJSONNew from '../interface/ItemJSONNew'

const csvFile = 'contrib/moonkin/item.csv'

const start = async () => {
  const itemJSONNew: ItemJSONNew[] = await cli.itemJSONArrayFromKeftenk(csvFile)
  console.log(JSON.stringify(itemJSONNew, null, 1))
}

void start()
