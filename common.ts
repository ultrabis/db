/**
 * common stuff for database creation
 */

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import cheerio from 'cheerio'
import request from 'requestretry'
import lc from 'libclassic'
import ItemJSON from './ItemJSON'
import TargetType from 'libclassic/dist/enum/TargetType'

const xmlOutputDir = 'wowhead/items'
const iconOutputDir = 'wowhead/icons'
const itemListFilePath = `wowhead/itemList.json`

// number to number. if value is undefined, null, or NaN return undefined
// optionally return undefined for 0 value
const itoi = (value: number | null | undefined, noZeros?: boolean): number | undefined => {
  if (value === undefined || value === null || value === NaN || (noZeros && value === 0)) {
    return undefined
  }

  return value
}

// string to number. if value is undefined, null, or NaN return undefined
// optionally return undefined for 0 value
const atoi = (value: string | undefined, noZeros?: boolean): number | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }

  return itoi(Number(value), noZeros)
}

// string to string. if value is undefined, null, or empty return undefined
const atoa = (value: string | undefined): string | undefined => {
  if (value === undefined || value === null || value.length === 0) {
    return undefined
  }
  return value
}

// bool to bool. false is undefined
const btob = (value: boolean): boolean | undefined => {
  return value ? value : undefined
}

const stringFromComment = (haystack: string, commentName: string): string => {
  const comment = `<!--${commentName}-->`
  const n = haystack.search(comment) + comment.length
  const x = haystack.substr(n)
  const n2 = x.search('<')
  return x.substr(0, n2)
}

/**
 *
 * convert itemName to the format wowhead uses on url
 *
 * @param itemName
 */
const wowheadItemName = (itemName: string): string => {
  return lc.common
    .itemBaseName(itemName)
    .toLowerCase()
    .replace(/\'/g, '')
    .replace(/\"/g, '')
    .replace(/,/g, '')
    .replace(/ - /g, '-')
    .replace(/ /g, '-')
}

/**
 *
 * read gzip file as plain text string
 *
 * @param filePath
 */
const stringFromGzipFile = (filePath: string): string => {
  return zlib.gunzipSync(fs.readFileSync(filePath)).toString()
}

/**
 *
 * read file as plain text string
 *
 * @param filePath
 */
const stringFromFile = (filePath: string): string => {
  return fs.readFileSync(filePath).toString()
}

/**
 *
 * get itemList from file as JSON object
 *
 * @param filePath
 */
const itemListFromFile = (filePath: string): any => {
  return JSON.parse(stringFromFile(filePath))
}

/**
 *
 * read itemList file and return array of matching items based on the name
 * we must return an array becaue itemName is not unique
 *
 * @param itemName
 */
const itemIdsFromName = (itemName: string): number[] => {
  const ids: number[] = []

  const itemList = itemListFromFile(itemListFilePath)
  const itemCount = itemList.length
  for (let i = 0; i < itemCount; i++) {
    const item = itemList[i]
    if (wowheadItemName(itemName) === wowheadItemName(item.name)) {
      ids.push(item.id)
    }
  }

  return ids
}

/**
 *
 * read itemList file and return the itemName based on itemId
 *
 * @param itemId
 */
const itemNameFromId = (itemId: number): string => {
  const itemList = itemListFromFile(itemListFilePath)
  const itemCount = itemList.length
  for (let i = 0; i < itemCount; i++) {
    const item = itemList[i]
    if (item.id === itemId) {
      return item.name
    }
  }

  return ``
}

/**
 *
 * read XML file and return the icon name.
 * we need the icon name during downloading and don't want to parse the entire thing
 *
 * @param itemId
 * @param _itemName
 */
const itemIconFromXML = (itemId: number, _itemName?: string): string => {
  const itemName = _itemName ? _itemName : itemNameFromId(itemId)
  const filePath = `${xmlOutputDir}/${itemId}-${wowheadItemName(itemName)}.xml.gz`
  const xmlString = stringFromGzipFile(filePath)

  const $ = cheerio.load(xmlString, { xmlMode: true })
  return $('icon').text()
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

  request({ url: url, headers: headers }).on('response', function (response) {
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

// download icon. must have xml downloaded.
const wowheadDownloadIcon = async (itemId: number, _itemName?: string) => {
  const iconName = itemIconFromXML(itemId, _itemName)
  const filePath = `${iconOutputDir}/${iconName.toLowerCase()}.jpg`
  const url = `https://wow.zamimg.com/images/wow/icons/large/${iconName.toLowerCase()}.jpg`
  return download(url, filePath, { unzip: true })
}

const wowheadDownloadHTML = async (itemId: number, _itemName?: string) => {
  const itemName = _itemName ? _itemName : itemNameFromId(itemId)
  const filePath = `${xmlOutputDir}/${itemId}-${wowheadItemName(itemName)}.html.gz`
  const url = `https://classic.wowhead.com/item=${itemId}`
  return download(url, filePath, { unzip: false })
}

const wowheadDownloadXML = async (itemId: number, _itemName?: string) => {
  const itemName = _itemName ? _itemName : itemNameFromId(itemId)
  const filePath = `${xmlOutputDir}/${itemId}-${wowheadItemName(itemName)}.xml.gz`
  const url = `https://classic.wowhead.com/item=${itemId}&xml`
  return download(url, filePath, { unzip: false })
}

/**
 * download all item id's / names from wowhead and write as JSON to `outputPath`
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

/**
 *
 * Downloads / caches everything we need from wowhead for `items`
 *
 */
const wowheadDownloadItems = async (): Promise<void> => {
  // download list of items if necessary
  await wowheadDownloadItemList(itemListFilePath)

  // read in itemList
  const itemList = itemListFromFile(itemListFilePath)
  const itemCount = itemList.length

  // iterate itemList and download XML, HTML, and icon for each item
  console.log(`Processing ${itemCount} item(s)`)
  for (let i = 0; i < itemCount; i++) {
    const item = itemList[i]
    console.log(`- ${item.name} (${item.id})`)
    await wowheadDownloadXML(item.id, item.name)
    await wowheadDownloadHTML(item.id, item.name)
    await wowheadDownloadIcon(item.id, item.name)
  }
}
/*
  dropChance?: number
  faction?: number
}
*/

/**
 *
 * Parse XML and HTML and return ItemJSON object
 *
 * @param itemId
 * @param suffixId
 */
const itemJSONFromId = (itemId: number, suffixId?: number): ItemJSON | undefined => {
  // get contents of xml and html files as strings
  const itemName = itemNameFromId(itemId)
  const baseFilePath = `${xmlOutputDir}/${itemId}-${wowheadItemName(itemName)}`
  const xmlString = stringFromGzipFile(`${baseFilePath}.xml.gz`)
  const htmlString = stringFromGzipFile(`${baseFilePath}.html.gz`)

  // init itemJSON object
  const itemJSON = {} as ItemJSON
  itemJSON.id = itemId
  if (suffixId) {
    itemJSON.suffixId = suffixId
  }

  // parse xml
  const xml$ = cheerio.load(xmlString, { xmlMode: true })
  const jsonEquipText = xml$('jsonEquip').text()
  const jsonEquip = JSON.parse(`{ ${jsonEquipText} }`)
  itemJSON.name = xml$('name').text()
  itemJSON.icon = xml$('icon').text()
  itemJSON.class = atoi(xml$('class').attr('id'))
  itemJSON.subclass = atoi(xml$('subclass').attr('id'))
  itemJSON.level = atoi(xml$('level').attr('id'))
  itemJSON.quality = atoi(xml$('quality').attr('id'))
  //const droppedBy = tt('.whtt-droppedby').text()

  // parse xml jsonEquip object
  itemJSON.slot = jsonEquip.slotbak
  itemJSON.reqLevel = itoi(jsonEquip.reqlevel, true)
  itemJSON.durability = itoi(jsonEquip.dura, true)

  itemJSON.strength = itoi(jsonEquip.str, true)
  itemJSON.agility = itoi(jsonEquip.agi, true)
  itemJSON.stamina = itoi(jsonEquip.sta, true)
  itemJSON.intellect = itoi(jsonEquip.int, true)
  itemJSON.spirit = itoi(jsonEquip.spi, true)
  itemJSON.hp5 = itoi(jsonEquip.healthrgn, true)
  itemJSON.mp5 = itoi(jsonEquip.manargn, true)

  itemJSON.armor = itoi(jsonEquip.armor, true)
  itemJSON.defense = itoi(jsonEquip.def, true)
  itemJSON.dodge = itoi(jsonEquip.dodgepct, true)
  itemJSON.parry = itoi(jsonEquip.parrypct, true)
  itemJSON.blockChance = itoi(jsonEquip.blockpct, true)
  itemJSON.blockValue = itoi(jsonEquip.blockamount, true)

  itemJSON.meleeHit = itoi(jsonEquip.mlehitpct, true)
  itemJSON.rangedHit = itoi(jsonEquip.rgdhitpct, true)
  itemJSON.spellHit = itoi(jsonEquip.splhitpct, true)
  itemJSON.meleeCrit = itoi(jsonEquip.mlecritstrkpct, true)
  itemJSON.rangedCrit = itoi(jsonEquip.rgdcritstrkpct, true)
  itemJSON.spellCrit = itoi(jsonEquip.splcritstrkpct, true)
  itemJSON.feralAttackPower = itoi(jsonEquip.feratkpwr, true)
  itemJSON.meleeAttackPower = itoi(jsonEquip.mleatkpwr, true)
  itemJSON.rangedAttackPower = itoi(jsonEquip.rgdatkpwr)
  itemJSON.spellPenetration = itoi(jsonEquip.splpen, true)
  itemJSON.spellHealing = itoi(jsonEquip.splheal, true)
  itemJSON.spellDamage = itoi(jsonEquip.splpwr, true)
  itemJSON.arcaneDamage = itoi(jsonEquip.arcsplpwr, true)
  itemJSON.fireDamage = itoi(jsonEquip.firsplpwr, true)
  itemJSON.frostDamage = itoi(jsonEquip.frosplpwr, true)
  itemJSON.natureDamage = itoi(jsonEquip.natsplpwr, true)
  itemJSON.shadowDamage = itoi(jsonEquip.shasplpwr, true)
  itemJSON.holyDamage = itoi(jsonEquip.holsplpwr, true)

  itemJSON.rangedDps = itoi(jsonEquip.rgddps, true)
  itemJSON.meleeDps = itoi(jsonEquip.mledps, true)
  itemJSON.rangedSpeed = itoi(jsonEquip.rgdspeed, true)
  itemJSON.meleeSpeed = itoi(jsonEquip.mlespeed, true)
  itemJSON.rangedMinDmg = itoi(jsonEquip.rgddmgmin, true)
  itemJSON.meleeMinDmg = itoi(jsonEquip.mledmgmin, true)
  itemJSON.rangedMaxDmg = itoi(jsonEquip.rgddmgmax, true)
  itemJSON.meleeMaxDmg = itoi(jsonEquip.mledmgmax, true)

  itemJSON.arcaneResistance = itoi(jsonEquip.arcres, true)
  itemJSON.fireResistance = itoi(jsonEquip.firres, true)
  itemJSON.frostResistance = itoi(jsonEquip.frores, true)
  itemJSON.natureResistance = itoi(jsonEquip.natres, true)
  itemJSON.shadowResistance = itoi(jsonEquip.shares, true)

  // parse xml tooltip
  const ttText = xml$('htmlTooltip').text()
  const isRandomEnchant = ttText.includes('Random enchant')
  itemJSON.unique = btob(ttText.includes(`>Unique<`))
  itemJSON.bop = btob(stringFromComment(ttText, 'bo') === `Binds when picked up`)
  if (ttText.includes('Undead and Demons')) {
    itemJSON.targetMask = lc.common.TargetType.Undead | lc.common.TargetType.Demon
  } else if (ttText.includes('Increases damage done to Undead')) {
    itemJSON.targetMask = lc.common.TargetType.Undead
  }
  const tt = cheerio.load(ttText, { xmlMode: true })
  const droppedBy = tt('.whtt-droppedby').text()
  if (droppedBy && droppedBy.length > 0) {
    const n = droppedBy.search(':')
    itemJSON.boss = droppedBy.substr(n + 2)
  }
  const classes = tt('.wowhead-tooltip-item-classes').text()
  if (classes && classes.length > 0) {
    itemJSON.allowableClasses = lc.common.playableClassesFromText(classes)
  }
  tt('span').each(function (i: number, elem: any) {
    const text = tt(elem).text()
    if (text[0] === `"` && text[text.length - 1] === `"`) {
      itemJSON.flavor = text
    }
  })
  const iconHorde = atoa(tt('.icon-horde').text())
  const iconAlliance = atoa(tt('.icon-alliance').text())
  if (iconHorde) {
    itemJSON.pvpRank = lc.common.pvpRankFromText(iconHorde)
  } else if (iconAlliance) {
    itemJSON.pvpRank = lc.common.pvpRankFromText(iconAlliance)
  }

  // parse xml json object
  const jsonText = xml$('json').text()
  const json = JSON.parse(`{ ${jsonText} }`)

  // parse html
  const html$ = cheerio.load(htmlString)
  const n = htmlString.search('WH.markup.printHtml')
  const x = htmlString.substr(n)
  const n2 = x.search('Added in content phase')
  itemJSON.phase = Number(x.substr(n2 + 23, 1))

  // faction requirement...grr
  //const listView = $('script[type="text/javascript"]').get()[0].children[0].data.split('\n')[1].slice(26, -2)
  //const listView = html$('script[type="text/javascript"]').get()[5].children[0].data
  // console.log(listView)
  //const react = listView.substr(listView.search(`"react":`))
  //const reactArray = JSON.parse(react.substr(0, react.search(`,"`)).split(`:`)[1])
  // console.log(reactArray)
  //.children[0].data.split('\n')[1].slice(26, -2)

  // parse html suffix id's
  // - if no suffixId passed in, this is a base item and we need the valid suffixId's
  // - if suffixId passed in, this is one individual item and we don't need the valid suffixId's
  if (isRandomEnchant && itemJSON.suffixId) {
    const div = html$('div[class=random-enchantments]')
    const ul = html$('ul')
    const root = html$(div).text() !== `` ? div : ul
    const validSuffixIds: number[] = []

    html$(root)
      .find('li')
      .find('div')
      .each(function (i: number, elem: any) {
        const span = html$(elem).find('span')
        const small = html$(elem).find('small')

        // the suffix type e.g. "of the Bear"
        const suffixTypeText = html$(span).text().replace(/\./g, '')

        // drop chance of each individual suffix. just ignore it.
        //const dropChance = html$(small).text()
        //console.log(`dropChance: ${dropChance}`)
        //itemJSON.dropChance = atoi(html$(small).text(), true)

        // rip out junk so we can grab bonus text
        html$(span).remove()
        html$(small).remove()
        html$(elem).find('br').remove()

        // we only care about the first bonus type e.g. the stamina bonus of 'the bear'
        // this is enough to find the itemSuffix record, which has all the bonuses
        const bonusText = html$(elem).text().trim().split(',')[0]

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
    if (validSuffixIds.length > 0) {
      itemJSON.validSuffixIds = validSuffixIds
    }
  }

  // finally return the object. we're stringify'ing and parsing to strip out any undefined's
  return JSON.parse(JSON.stringify(itemJSON))
}

export default {
  stringFromFile,
  stringFromGzipFile,
  stringFromComment,
  atoi,
  atoa,
  itemIdsFromName,
  itemIconFromXML,
  itemNameFromId,
  itemListFromFile,
  download,
  wowheadItemName,
  wowheadDownloadItems,
  wowheadDownloadItemList,
  wowheadDownloadHTML,
  wowheadDownloadXML,
  wowheadDownloadIcon,
  itemJSONFromId
}
