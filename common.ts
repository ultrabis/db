/**
 * common stuff for database creation
 */

import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import zlib from 'zlib'
import cheerio from 'cheerio'
import request from 'requestretry'
import xml2js from 'xml2js'
import lc from 'libclassic'
import ItemJSON from 'libclassic/src/interface/ItemJSONNew'

const csvToJSON = require('csvtojson')
const axios = require('axios').default

const xmlOutputDir = 'wowhead/items'
const iconOutputDir = 'wowhead/icons'
const itemListFilePath = `wowhead/itemList.json`

/* parsed item object from keftenk balance druid spreadsheet */
interface ItemKeftenk {
  'Equipment Type': string
  Slot: string
  Name: string
  Phase: string
  Location: string
  Boss: string
  Stamina: string
  Intellect: string
  Spirit: string
  'Spell Damage': string
  'Spell Critical %': string
  'Spell Hit %': string
  MP5: string
  'Spell Penetration': string
  Score: string
  field16: string
  Alliance: string
  Horde: string
  Starfire: string
  Wrath: string
}

/**
 * 
 * download `url` to `dest`. by default we request and write as gzip. if opts.unzip
 * is true and it's indeed gzipped, we'll unzip it first.
 * 
 * @param url 
 * @param dest 
 * @param opts 
 */
const download = async (url: string, dest: string, opts?: { unzip?: boolean }) => {
  if (fs.existsSync(dest)) {
    return
  }

  console.log(`-- downloading ${url} -> ${dest}`)

  const headers = { 'Accept-Encoding': 'gzip' }
  const outputPathResolved = path.resolve(dest)
  const writer = fs.createWriteStream(outputPathResolved)
  
  request({url:url, 'headers': headers}).on('response', function (response) {
    if (opts && opts.unzip && response.headers['content-encoding'] === 'gzip') {
      response.pipe(zlib.createGunzip()).pipe(writer)
    } else {
      response.pipe(writer)
    }
  })
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

const wowheadDownloadIcon = async (iconName: string) => {
  const filePath = `${iconOutputDir}/${iconName.toLowerCase()}.jpg`
  const url = `https://wow.zamimg.com/images/wow/icons/large/${iconName.toLowerCase()}.jpg`
  return download(url, filePath, { unzip: true})
}

const wowheadDownloadHTML = async (itemId: number, itemName: string) => {
  const filePath = `${xmlOutputDir}/${itemId}-${lc.common.itemNameWowhead(itemName)}.html.gz`
  const url = `https://classic.wowhead.com/item=${itemId}`
  return download(url, filePath, { unzip: false })
}

const wowheadDownloadXML = async (itemId: number, itemName: string) => {
  const filePath = `${xmlOutputDir}/${itemId}-${lc.common.itemNameWowhead(itemName)}.xml.gz`
  const url = `https://classic.wowhead.com/item=${itemId}&xml`
  return download(url, filePath, { unzip: false })
}

/**
 * scrapes all item id's / names from wowhead and writes them as JSON to `outputPath`
 *
 * @param outputPath write to file
 */
const wowheadDownloadItemList = async (outputPath: string) => {
  if (!fs.existsSync(outputPath)) {
    const data = await wowheadScrapeList()
    fs.writeFileSync(outputPath, JSON.stringify(data))
  }
}

/**
 *
 * Downloads / caches everything we need from wowhead for `items`
 *
 * @param items Comma seperated listed of item id's or names. If undefined all items.
 */
const wowheadDownloadItems = async () => {
  await wowheadDownloadItemList(itemListFilePath)
  const itemList = JSON.parse(stringFromFile(itemListFilePath))
  const itemCount = itemList.length

  console.log(`Processing ${itemCount} item(s)`)

  for (let i = 0; i < itemCount; i++) {
    const item = itemList[i]

    console.log(`- ${item.name} (${item.id})`)
    await wowheadDownloadXML(item.id, item.name)
    const itemWowhead = await wowheadReadXML(item.id, item.name)
    if (itemWowhead === null) {
      console.error(`-- error parsing wowhead xml`)
      continue
    }

    // download the html page
    await wowheadDownloadHTML(item.id, item.name)

    // download icon
    await wowheadDownloadIcon(itemWowhead.icon[0]._)
    
    /* FIXME: move this stuff to 'scraping' section
    const itemJSONFilePath = `${outputDir}/${x}.json`
    if (!fs.existsSync(itemJSONFilePath)) {
      console.log(`-- scraping html`)
      const isRandomEnchant = itemWowhead['htmlTooltip'][0].includes('Random enchantment')
      const obj = await common.wowheadScrapeHTML(itemId, isRandomEnchant)
      fs.writeFileSync(itemJSONFilePath, JSON.stringify(obj))
    }
    */

  }
}

/**
 * returns object of all wowhead item id's.
 *
 * borrowed from: https://github.com/nexus-devs/wow-classic-items
 */
const wowheadScrapeList = async () => {
  const items = []

  // Filter the items by ID (total ID range about 24000).
  const stepSize = 500 // Wowhead can only show about 500 items per page.
  const maxSize = 24500
  for (let i = 0; i < maxSize; i += stepSize) {
    // const url = `https://classic.wowhead.com/items?filter=162:151:151:195;2:2:5:1;0:${i}:${i + stepSize}`
    const url = `https://classic.wowhead.com/items?filter=162:151:151;2:2:5;0:${i}:${i + stepSize}`
    console.log(`doing ${i} of ${maxSize}: ${url}`)
    const req = await request({
      url: url,
      json: true
    })

    // Wowhead uses JavaScript to load in their table content, so we'd need something like Selenium to get the HTML.
    // However, that is really painful and slow. Fortunately, with some parsing the table content is available in the source code.
    const $ = cheerio.load(req.body)
    const tableContentRaw = $('script[type="text/javascript"]').get()[0].children[0].data.split('\n')[1].slice(26, -2)
    const tableContent = JSON.parse(tableContentRaw)

    for (const key of Object.keys(tableContent)) {
      const item = tableContent[key]
      if (!item.jsonequip.slotbak) {
        console.log(`skipping ${item.name_enus}...not equippable`)
        continue
      }
      items.push({
        id: parseInt(key),
        name: item.name_enus
      })
    }
  }

  return items
}

const wowheadReadXML = async (itemId: number, itemName: string) => {
  const filePath = `${xmlOutputDir}/${itemId}-${lc.common.itemNameWowhead(itemName)}.xml.gz`
  const xmlString = stringFromGzipFile(filePath)
  const result = await xml2js.parseStringPromise(xmlString)
  return result.wowhead.error ? null : result.wowhead.item[0]
}

/*
const wowheadParseXMLFile = async (filePath: string) => {
  const xmlString = await readFileAsString(filePath)
  const result = await xml2js.parseStringPromise(xmlString)
  return result.wowhead.error ? null : result.wowhead.item[0]
}

const wowheadParseXML = async (itemKey: string) => {
  const filePath =
    `${xmlOutputDir}/${lc.utils.isNum(itemKey) ? itemKey : lc.common.itemNameWowhead(itemKey)}.xml`
  return wowheadParseXMLFile(filePath)
}
*/

const wowheadScrapeHTML = async (itemId: number, isRandomEnchant: boolean) => {
  const req = await request({
    url: `https://classic.wowhead.com/item=${itemId}`,
    json: true
  })

  const validSuffixIds: number[] = []
  const $ = cheerio.load(req.body)

  // first we need 'phase available'. it's not in the XML.
  // the text is generated by javascript.
  // it's annoying, just do a stupid text search
  const n = req.body.search('WH.markup.printHtml')
  const x = req.body.substr(n)
  const n2 = x.search('Added in content phase')
  const phase = Number(x.substr(n2 + 23, 1))

  // if it's a random enchant, we need to scrape the the valid suffix id's
  if (isRandomEnchant) {
    const div = $('div[class=random-enchantments]')
    const ul = $('ul')
    const root = $(div).text() !== `` ? div : ul

    $(root)
      .find('li')
      .find('div')
      .each(function (i: number, elem: any) {
        const span = $(elem).find('span')
        const small = $(elem).find('small')

        // the suffix type e.g. "of the Bear"
        const suffixTypeText = $(span).text().replace(/\./g, '')

        // drop chance...not doing anything with it for now
        const dropChanceText = $(small).text()

        // rip out junk so we can grab bonus text
        $(span).remove()
        $(small).remove()
        $(elem).find('br').remove()

        // we only care about the first bonus type e.g. the stamina bonus of 'the bear'
        // this is enough to find the itemSuffix record, which has all the bonuses
        const bonusText = $(elem).text().trim().split(',')[0]

        // sometimes there are two versions of an item with different bonus values
        // e.g. "+(6 - 7) Stamina"
        // so we'll create an array of bonus values
        // note: for some enchantments e.g. of healing, wowhead lists as e.g. '59-62'
        // that means 59 AND 62, not 59 through 62
        const bonusValues: number[] = []
        if (bonusText.includes('(')) {
          const bonuses = bonusText
            .replace(/.*\(|\).*/g, '')
            .replace(/ /g, '')
            .split('-')
          bonusValues[0] = Number(bonuses[0])
          bonusValues[1] = Number(bonuses[1])
        } else {
          bonusValues[0] = Number(bonusText.split(' ')[0].replace(/\+/g, ''))
        }

        // lookup the itemSuffix(es). each represents a suffix id with associated bonuses
        // so at this point, we have an itemId and all valid suffixId's for that item.
        for (let i = 0; i < bonusValues.length; i++) {
          const itemSuffix = lc.itemSuffix.fromItemNameAndBonusValue(`x ${suffixTypeText}`, bonusValues[i])
          if (itemSuffix) {
            validSuffixIds.push(itemSuffix.id)
          }
        }
      })
  }

  return {
    phase: phase,
    validSuffixIds: validSuffixIds
  }
}

const stringFromGzipFile = (filePath: string): string => {
  return zlib.gunzipSync(fs.readFileSync(filePath)).toString()
}

const stringFromFile = (filePath: string): string => {
  return fs.readFileSync(filePath).toString()
}

/*
const readFileAsString = async (filePath: string) => {
  return await fsPromises.readFile(filePath, 'utf8')
}
*/


const isEnchant = (keftenkEquipmentType: string) => {
  switch (keftenkEquipmentType) {
    case 'Back Enchant':
    case 'Chest Enchant':
    case 'Feet Enchant':
    case 'Hands Enchant':
    case 'Head Enchant':
    case 'Legs Enchant':
    case 'Shoulder Enchant':
    case 'Weapon Enchant':
    case 'Wrist Enchant':
      return 1
    default:
      return 0
  }
}

/*
const itemJSONArrayFromKeftenk = async (csvFilePath: string) => {
  const itemJSONArray: ItemJSON[] = []

  // parse the csv
  console.warn('Parsing CSV: ' + csvFilePath)
  const csvJSON = await csvToJSON().fromFile(csvFilePath)

  // iterate all items in csv
  for (const csvItem of csvJSON) {
    const itemJSON = {} as ItemJSON

    // skip empty names
    if (csvItem.Name === '') {
      continue
    }

    console.warn(`- ${csvItem.Name}`)

    // skip enchants
    if (isEnchant(csvItem['Equipment Type'])) {
      console.warn(`-- skipping because enchant`)
      continue
    }

    // download and parse the wowhead xml (downloads are cached in contrib/)
    const itemBaseName = lc.common.itemBaseName(csvItem.Name)
    await wowheadDownloadXML(itemBaseName)
    const itemWowhead = await wowheadParseXML(itemBaseName)
    if (itemWowhead === null) {
      console.error(`-- error parsing wowhead xml`)
      continue
    }

    // set the item id
    itemJSON.id = parseInt(itemWowhead['$'].id, 10)
    if (!itemJSON.id) {
      console.error(`-- error item id can't be 0`)
      continue
    }

    const itemSuffixType = lc.common.itemSuffixTypeFromText(csvItem.Name)
    let bonusValue: number
    switch (itemSuffixType) {
      case lc.common.ItemSuffixType.ArcaneWrath:
      case lc.common.ItemSuffixType.NaturesWrath:
      case lc.common.ItemSuffixType.Sorcery:
        bonusValue = Number(csvItem['Spell Damage'])
        break
      default:
        bonusValue = 0
        break
    }

    if (bonusValue) {
      // this is a random enchant we will support
      const itemSuffix = lc.itemSuffix.fromItemNameAndBonusValue(csvItem.Name, bonusValue)
      itemJSON.suffixId = itemSuffix ? itemSuffix.id : undefined
    }

    // set the name
    itemJSON.name = csvItem.Name

    // set icon and download if necessary
    itemJSON.icon = itemWowhead.icon[0]._.toLowerCase()
    await wowheadDownloadIcon(itemJSON.icon ? itemJSON.icon : 'classic_temp')

    // fill in the static stuff
    itemJSON.class = parseInt(itemWowhead['class'][0].$.id, 10)
    itemJSON.subclass = parseInt(itemWowhead['subclass'][0].$.id, 10)
    itemJSON.phase = parseInt(csvItem.Phase, 10)
    itemJSON.location = csvItem.Location
    itemJSON.slot = parseInt(itemWowhead['inventorySlot'][0].$.id, 10)
    if (csvItem.Boss !== '') {
      itemJSON.boss = csvItem.Boss
    }

    // handle stats
    itemJSON.stats = {}
    const stamina = Number(csvItem.Stamina)
    const intellect = Number(csvItem.Intellect)
    const spirit = Number(csvItem.Spirit)
    const spellCrit = Number(csvItem['Spell Critical %'])
    const spellHit = Number(csvItem['Spell Hit %'])
    const spellPenetration = Number(csvItem['Spell Penetration'])
    const spellHealing = 0 // todo
    const spellDamage = Number(csvItem['Spell Damage'])

    itemJSON.stats.stamina = stamina > 0 ? stamina : undefined
    itemJSON.stats.intellect = intellect > 0 ? intellect : undefined
    itemJSON.stats.spirit = spirit > 0 ? spirit : undefined
    itemJSON.stats.spellHit = spellHit > 0 ? spellHit : undefined
    itemJSON.stats.spellCrit = spellCrit > 0 ? spellCrit : undefined
    itemJSON.stats.spellPenetration = spellPenetration > 0 ? spellPenetration : undefined
    itemJSON.stats.spellHealing = spellHealing > 0 ? spellHealing : undefined
    if (spellDamage > 0) {
      if (itemSuffixType === lc.common.ItemSuffixType.ArcaneWrath) {
        itemJSON.stats.spellDamage = {
          arcaneDamage: spellDamage
        }
      } else if (itemSuffixType === lc.common.ItemSuffixType.NaturesWrath) {
        itemJSON.stats.spellDamage = {
          natureDamage: spellDamage
        }
      } else {
        itemJSON.stats.spellDamage = {
          spellDamage: spellDamage
        }
      }
    }

    if (lc.utils.isEmpty(itemJSON.stats)) {
      itemJSON.stats = undefined
    }

    // we made it. add item to array
    itemJSONArray.push(itemJSON)
  }

  return itemJSONArray
}
*/

export default {
  download,
  stringFromFile,
  stringFromGzipFile,
  wowheadDownloadItems,
  wowheadDownloadItemList,
  wowheadDownloadHTML,
  wowheadDownloadXML,
  wowheadDownloadIcon,
  wowheadReadXML,
  wowheadScrapeHTML
}
