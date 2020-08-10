/**
 * common stuff for database creation
 */

import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import zlib from 'zlib'
import cheerio from 'cheerio'
import request from 'requestretry'
import plimit from 'p-limit'
import csv from 'csvtojson'
import mkdirp from 'mkdirp'
import lc from 'libclassic'

import ItemJSON from './interface/ItemJSON'
import ItemSuffixJSON from './interface/ItemSuffixJSON'

interface WowheadItemParserResult {
  item: ItemJSON
  randomEnchants: ItemJSON[]
  suffixes: ItemSuffixJSON[]
}

interface ItemListJSON {
  id: number
  name: string
}

const xmlOutputDir = 'cache/items'
const iconOutputDir = 'cache/icons'
const masterListFile = `cache/itemList-master.json`
const masterItemSuffixFile = `src/masterItemSuffix.json`
const cacheItemSuffixFile = `cache/itemSuffix.json`

const hrTimeToSeconds = (hrtime: any) => {
  return (hrtime[0] + hrtime[1] / 1e9).toFixed(3)
}

const secondsToPretty = (seconds: number): string => {
  seconds = Number(seconds)
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
  const hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
  const mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
  const sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
  return dDisplay + hDisplay + mDisplay + sDisplay
}

const zsum = (one: number | undefined, two: number | undefined) => {
  const val = (one ? one : 0) + (two ? two : 0)
  return val ? val : undefined
}

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
    .replace(/:/g, '')
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
 * read gzip file as plain text string
 *
 * @param filePath
 */
const stringFromGzipFileAsync = async (filePath: string): Promise<string> => {
  const buffer = await fsPromises.readFile(filePath)
  return zlib.gunzipSync(buffer).toString()
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
 * read file as plain text string asynchronously
 *
 * @param filePath
 */
const stringFromFileAsync = async (filePath: string): Promise<string> => {
  const buffer = await fsPromises.readFile(filePath)
  return buffer.toString()
}

/**
 *
 * read JSON from a plaintext file
 *
 * @param filePath
 */
const jsonFromFile = (filePath: string): any => {
  return JSON.parse(stringFromFile(filePath))
}

/**
 *
 * read JSON from a plaintext file asynchronously
 *
 * @param filePath
 */
const jsonFromFileAsync = async (filePath: string): Promise<any> => {
  const buffer = await fsPromises.readFile(filePath)
  return JSON.parse(buffer.toString())
}

/**
 *
 * read itemList file and return the itemName based on itemId
 *
 * @param itemId
 */
const itemNameFromId = (itemId: number): string => {
  const masterList = jsonFromFile(masterListFile)
  const itemCount = masterList.length
  for (let i = 0; i < itemCount; i++) {
    const item = masterList[i]
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
 * download all item id's / names from wowhead
 *
 * @param outputPath write to file
 */
const wowheadDownloadMasterList = async (outputPath: string) => {
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
  await wowheadDownloadMasterList(masterListFile)

  // read in itemList
  const masterList = jsonFromFile(masterListFile)
  const itemCount = masterList.length

  // iterate itemList and download XML, HTML, and icon for each item
  console.log(`Processing ${itemCount} item(s)`)
  for (let i = 0; i < itemCount; i++) {
    const item = masterList[i]
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

const getItemSuffixesFromItemName = (itemSuffixJSONArray: ItemSuffixJSON[], itemName: string): ItemSuffixJSON[] => {
  const suffixType = lc.common.itemSuffixTypeFromText(itemName)
  const itemSuffixes: ItemSuffixJSON[] = []

  for (let i = 0; i < itemSuffixJSONArray.length; i++) {
    if (itemSuffixJSONArray[i].type === suffixType) {
      itemSuffixes.push(itemSuffixJSONArray[i])
    }
  }

  /*
  console.log(`${lc.utils.getEnumKeyByEnumValue(lc.common.ItemSuffixType, suffixType)}`)
  for (let i = 0; i < itemSuffixes.length; i++) {
    console.log(itemSuffixes[i].bonus)
  }
  */

  return itemSuffixes
}

const getItemSuffixFromItemNameAndValues = (
  itemSuffixJSONArray: ItemSuffixJSON[],
  itemName: string,
  values: [number, number]
): ItemSuffixJSON | undefined => {
  const itemSuffixes = getItemSuffixesFromItemName(itemSuffixJSONArray, itemName)

  for (let i = 0; i < itemSuffixes.length; i++) {
    const itemSuffix = itemSuffixes[i]
    const suffixValues = [
      itemSuffix.bonus[0] ? itemSuffix.bonus[0].value : 0,
      itemSuffix.bonus[1] ? itemSuffix.bonus[1].value : 0
    ]

    // special handle for looking up suffix with only one value
    // we might need this on spreadsheets
    if (values[1] == -1) {
      // console.log(`hello ${values[0]} vs ${suffixValues[0]}`)
      if (values[0] === suffixValues[0]) {
        return itemSuffix
      }
    }

    //console.log(`values: ${values}`)
    //console.log(`suffixValues: ${suffixValues}`)
    if (values[0] === suffixValues[0] && values[1] === suffixValues[1]) {
      return itemSuffix
    }
  }

  return undefined
}

const getItemSuffix = (itemSuffixJSONArray: ItemSuffixJSON[], suffixId: number): ItemSuffixJSON | undefined => {
  const suffixCount = itemSuffixJSONArray.length

  for (let i = 0; i < suffixCount; i++) {
    if (itemSuffixJSONArray[i].id === suffixId) {
      return itemSuffixJSONArray[i]
    }
  }

  return undefined
}

const getRandomEnchantJSON = (baseItemJSON: ItemJSON, itemSuffixJSON: ItemSuffixJSON): ItemJSON => {
  const itemJSON = lc.utils.cloneObject(baseItemJSON)

  // add suffixId and remove validSuffixIds
  itemJSON.validSuffixIds = undefined
  itemJSON.suffixId = itemSuffixJSON.id

  // apply the bonuses
  for (let i = 0; i < itemSuffixJSON.bonus.length; i++) {
    const value = itemSuffixJSON.bonus[i].value
    switch (itemSuffixJSON.bonus[i].type) {
      case lc.common.ItemBonusType.Agility:
        itemJSON.agility = zsum(itemJSON.agility, value)
        break
      case lc.common.ItemBonusType.ArcaneResistence:
        itemJSON.arcaneResistance = zsum(itemJSON.arcaneResistance, value)
        break
      case lc.common.ItemBonusType.ArcaneSpellDamage:
        itemJSON.arcaneDamage = zsum(itemJSON.arcaneDamage, value)
        break
      case lc.common.ItemBonusType.Armor:
        itemJSON.armor = zsum(itemJSON.armor, value)
        break
      case lc.common.ItemBonusType.AttackPower:
        itemJSON.attackPower = zsum(itemJSON.attackPower, value)
        break
      case lc.common.ItemBonusType.BeastSlaying:
        itemJSON.beastSlaying = zsum(itemJSON.beastSlaying, value)
        break
      case lc.common.ItemBonusType.Block:
        itemJSON.blockChance = zsum(itemJSON.blockChance, value)
        break
      case lc.common.ItemBonusType.CriticalHit:
        itemJSON.meleeCrit = zsum(itemJSON.meleeCrit, value)
        itemJSON.rangedCrit = zsum(itemJSON.rangedCrit, value)
        break
      case lc.common.ItemBonusType.Damage:
        // NOT IN GAME
        break
      case lc.common.ItemBonusType.DamageAndHealingSpells:
        itemJSON.spellDamage = zsum(itemJSON.spellDamage, value)
        itemJSON.spellHealing = zsum(itemJSON.spellHealing, value)
        break
      case lc.common.ItemBonusType.Defense:
        itemJSON.defense = zsum(itemJSON.defense, value)
        break
      case lc.common.ItemBonusType.Dodge:
        itemJSON.dodge = zsum(itemJSON.dodge, value)
        break
      case lc.common.ItemBonusType.FireResistance:
        itemJSON.fireResistance = zsum(itemJSON.fireResistance, value)
        break
      case lc.common.ItemBonusType.FireSpellDamage:
        itemJSON.fireDamage = zsum(itemJSON.fireDamage, value)
        break
      case lc.common.ItemBonusType.FrostResistance:
        itemJSON.frostResistance = zsum(itemJSON.frostResistance, value)
        break
      case lc.common.ItemBonusType.FrostSpellDamage:
        itemJSON.frostDamage = zsum(itemJSON.frostDamage, value)
        break
      case lc.common.ItemBonusType.HealingSpells:
        itemJSON.spellHealing = zsum(itemJSON.spellHealing, value)
        break
      case lc.common.ItemBonusType.HealthEvery5:
        itemJSON.hp5 = zsum(itemJSON.hp5, value)
        break
      case lc.common.ItemBonusType.HolySpellDamage:
        itemJSON.holyDamage = zsum(itemJSON.holyDamage, value)
        break
      case lc.common.ItemBonusType.Intellect:
        itemJSON.intellect = zsum(itemJSON.intellect, value)
        break
      case lc.common.ItemBonusType.ManaEvery5:
        itemJSON.mp5 = zsum(itemJSON.mp5, value)
        break
      case lc.common.ItemBonusType.NatureResistance:
        itemJSON.natureResistance = zsum(itemJSON.natureResistance, value)
        break
      case lc.common.ItemBonusType.NatureSpellDamage:
        itemJSON.natureDamage = zsum(itemJSON.natureDamage, value)
        break
      case lc.common.ItemBonusType.RangedAttackPower:
        itemJSON.rangedAttackPower = zsum(itemJSON.rangedAttackPower, value)
        break
      case lc.common.ItemBonusType.ShadowResistance:
        itemJSON.shadowResistance = zsum(itemJSON.shadowResistance, value)
        break
      case lc.common.ItemBonusType.ShadowSpellDamage:
        itemJSON.shadowDamage = zsum(itemJSON.shadowDamage, value)
        break
      case lc.common.ItemBonusType.Spirit:
        itemJSON.spirit = zsum(itemJSON.spirit, value)
        break
      case lc.common.ItemBonusType.Stamina:
        itemJSON.stamina = zsum(itemJSON.stamina, value)
        break
      case lc.common.ItemBonusType.Strength:
        itemJSON.strength = zsum(itemJSON.strength, value)
        break
      case lc.common.ItemBonusType.AxeSkill:
        itemJSON.axeSkill = zsum(itemJSON.axeSkill, value)
        break
      case lc.common.ItemBonusType.BowSkill:
        itemJSON.bowSkill = zsum(itemJSON.bowSkill, value)
        break
      case lc.common.ItemBonusType.DaggerSkill:
        itemJSON.daggerSkill = zsum(itemJSON.daggerSkill, value)
        break
      case lc.common.ItemBonusType.GunSkill:
        itemJSON.gunSkill = zsum(itemJSON.gunSkill, value)
        break
      case lc.common.ItemBonusType.MaceSkill:
        itemJSON.maceSkill = zsum(itemJSON.maceSkill, value)
        break
      case lc.common.ItemBonusType.SwordSkill:
        itemJSON.swordSkill = zsum(itemJSON.swordSkill, value)
        break
      case lc.common.ItemBonusType.TwoHandedAxeSkill:
        itemJSON.twoHandedAxeSkill = zsum(itemJSON.twoHandedAxeSkill, value)
        break
      case lc.common.ItemBonusType.TwoHandedMaceSkill:
        itemJSON.twoHandedMaceSkill = zsum(itemJSON.twoHandedMaceSkill, value)
        break
      case lc.common.ItemBonusType.TwoHandedSwordSkill:
        itemJSON.twoHandedSwordSkill = zsum(itemJSON.twoHandedSwordSkill, value)
        break
      case lc.common.ItemBonusType.OnGetHitShadowBolt:
        // FIXME: dunno
        break
    }
    // console.log(`hello bonus: ${JSON.stringify(itemSuffixJSON.bonus[i])}`)
  }

  // apply the item name
  switch (itemSuffixJSON.type) {
    case lc.common.ItemSuffixType.Agility:
      itemJSON.name = `${itemJSON.name} of Agility`
      break
    case lc.common.ItemSuffixType.ArcaneResistance:
      itemJSON.name = `${itemJSON.name} of Arcane Resistance`
      break
    case lc.common.ItemSuffixType.ArcaneWrath:
      itemJSON.name = `${itemJSON.name} of Arcane Wrath`
      break
    case lc.common.ItemSuffixType.BeastSlaying:
      itemJSON.name = `${itemJSON.name} of Beast Slaying`
      break
    case lc.common.ItemSuffixType.Blocking:
      itemJSON.name = `${itemJSON.name} of Blocking`
      break
    case lc.common.ItemSuffixType.Concentration:
      itemJSON.name = `${itemJSON.name} of Concentration`
      break
    case lc.common.ItemSuffixType.CriticalStrike:
      itemJSON.name = `${itemJSON.name} of Critical Strike`
      break
    case lc.common.ItemSuffixType.Defense:
      itemJSON.name = `${itemJSON.name} of Defense`
      break
    case lc.common.ItemSuffixType.Eluding:
      itemJSON.name = `${itemJSON.name} of Eluding`
      break
    case lc.common.ItemSuffixType.FieryWrath:
      itemJSON.name = `${itemJSON.name} of Fiery Wrath`
      break
    case lc.common.ItemSuffixType.FireResistance:
      itemJSON.name = `${itemJSON.name} of Fire Resistance`
      break
    case lc.common.ItemSuffixType.FrostResistance:
      itemJSON.name = `${itemJSON.name} of Frost Resistance`
      break
    case lc.common.ItemSuffixType.FrozenWrath:
      itemJSON.name = `${itemJSON.name} of Frozen Wrath`
      break
    case lc.common.ItemSuffixType.Healing:
      itemJSON.name = `${itemJSON.name} of Healing`
      break
    case lc.common.ItemSuffixType.HolyWrath:
      itemJSON.name = `${itemJSON.name} of Holy Wrath`
      break
    case lc.common.ItemSuffixType.Intellect:
      itemJSON.name = `${itemJSON.name} of Intellect`
      break
    case lc.common.ItemSuffixType.Marksmanship:
      itemJSON.name = `${itemJSON.name} of Marksmanship`
      break
    case lc.common.ItemSuffixType.NatureResistance:
      itemJSON.name = `${itemJSON.name} of Nature Resistance`
      break
    case lc.common.ItemSuffixType.NaturesWrath:
      itemJSON.name = `${itemJSON.name} of Nature's Wrath`
      break
    case lc.common.ItemSuffixType.Power:
      itemJSON.name = `${itemJSON.name} of Power`
      break
    case lc.common.ItemSuffixType.Proficiency:
      itemJSON.name = `${itemJSON.name} of Proficiency`
      break
    case lc.common.ItemSuffixType.Quality:
      itemJSON.name = `${itemJSON.name} of Quality`
      break
    case lc.common.ItemSuffixType.Regeneration:
      itemJSON.name = `${itemJSON.name} of Regeneration`
      break
    case lc.common.ItemSuffixType.Restoration:
      itemJSON.name = `${itemJSON.name} of Restoration`
      break
    case lc.common.ItemSuffixType.Retaliation:
      itemJSON.name = `${itemJSON.name} of Retaliation`
      break
    case lc.common.ItemSuffixType.ShadowResistance:
      itemJSON.name = `${itemJSON.name} of Shadow Resistance`
      break
    case lc.common.ItemSuffixType.ShadowWrath:
      itemJSON.name = `${itemJSON.name} of Shadow Wrath`
      break
    case lc.common.ItemSuffixType.Sorcery:
      itemJSON.name = `${itemJSON.name} of Sorcery`
      break
    case lc.common.ItemSuffixType.Spirit:
      itemJSON.name = `${itemJSON.name} of Spirit`
      break
    case lc.common.ItemSuffixType.Stamina:
      itemJSON.name = `${itemJSON.name} of Stamina`
      break
    case lc.common.ItemSuffixType.Strength:
      itemJSON.name = `${itemJSON.name} of Strength`
      break
    case lc.common.ItemSuffixType.Striking:
      itemJSON.name = `${itemJSON.name} of Striking`
      break
    case lc.common.ItemSuffixType.TheBear:
      itemJSON.name = `${itemJSON.name} of the Bear`
      break
    case lc.common.ItemSuffixType.TheBoar:
      itemJSON.name = `${itemJSON.name} of the Boar`
      break
    case lc.common.ItemSuffixType.TheEagle:
      itemJSON.name = `${itemJSON.name} of the Eagle`
      break
    case lc.common.ItemSuffixType.TheFalcon:
      itemJSON.name = `${itemJSON.name} of the Falcon`
      break
    case lc.common.ItemSuffixType.TheGorilla:
      itemJSON.name = `${itemJSON.name} of the Gorilla`
      break
    case lc.common.ItemSuffixType.TheMonkey:
      itemJSON.name = `${itemJSON.name} of the Monkey`
      break
    case lc.common.ItemSuffixType.TheOwl:
      itemJSON.name = `${itemJSON.name} of the Owl`
      break
    case lc.common.ItemSuffixType.TheTiger:
      itemJSON.name = `${itemJSON.name} of the Tiger`
      break
    case lc.common.ItemSuffixType.TheWhale:
      itemJSON.name = `${itemJSON.name} of the Whale`
      break
    case lc.common.ItemSuffixType.TheWolf:
      itemJSON.name = `${itemJSON.name} of the Wolf`
      break
    case lc.common.ItemSuffixType.Toughness:
      itemJSON.name = `${itemJSON.name} of Toughness`
      break
    case lc.common.ItemSuffixType.Twain:
      itemJSON.name = `${itemJSON.name} of Twain`
      break
  }
  return itemJSON
}

const wowheadParseBonusValues = (bonusText: string): [number, number] => {
  let bonusValue1 = 0
  let bonusValue2 = 0

  if (bonusText.includes('(')) {
    const bonuses = bonusText
      .replace(/.*\(|\).*/g, '')
      .replace(/ /g, '')
      .replace(/%/g, '')
      .split('-')
    bonusValue1 = Number(bonuses[0])
    bonusValue2 = Number(bonuses[1])
  } else {
    bonusValue1 = Number(bonusText.split(' ')[0].replace(/\+/g, '').replace(/%/g, ''))
  }

  return [bonusValue1, bonusValue2]
}

const wowheadParseItem = async (
  itemId: number,
  itemName: string,
  suffixes: ItemSuffixJSON[],
  opts?: { validSuffixTypes?: number[] }
): Promise<WowheadItemParserResult> => {
  const output: WowheadItemParserResult = {} as WowheadItemParserResult

  const baseFilePath = `${xmlOutputDir}/${itemId}-${wowheadItemName(itemName)}`
  const dataStrings = await Promise.all([
    stringFromGzipFileAsync(`${baseFilePath}.xml.gz`),
    stringFromGzipFileAsync(`${baseFilePath}.html.gz`)
  ])

  const xml = dataStrings[0]
  const html = dataStrings[1]

  const itemJSON = {} as ItemJSON
  itemJSON.id = itemId

  // parse xml
  const xml$ = cheerio.load(xml, { xmlMode: true })
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
  itemJSON.attackPower = itoi(jsonEquip.atkpwr, true)
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
  //const jsonText = xml$('json').text()
  //const json = JSON.parse(`{ ${jsonText} }`)

  // parse html
  const html$ = cheerio.load(html)
  const n = html.search('WH.markup.printHtml')
  const x = html.substr(n)
  const n2 = x.search('Added in content phase')
  itemJSON.phase = Number(x.substr(n2 + 23, 1))
  if (!itemJSON.phase || itemJSON.phase === null || itemJSON.phase === NaN) {
    itemJSON.phase = 1
  }

  // faction requirement...grr
  //const listView = $('script[type="text/javascript"]').get()[0].children[0].data.split('\n')[1].slice(26, -2)
  //const listView = html$('script[type="text/javascript"]').get()[5].children[0].data
  // console.log(listView)
  //const react = listView.substr(listView.search(`"react":`))
  //const reactArray = JSON.parse(react.substr(0, react.search(`,"`)).split(`:`)[1])
  // console.log(reactArray)
  //.children[0].data.split('\n')[1].slice(26, -2)

  // for random enchants we need to generate a 'validSuffixIds' array
  if (isRandomEnchant) {
    const div = html$('div[class=random-enchantments]')
    const ul = html$('ul')
    const root = html$(div).text() !== `` ? div : ul
    const validSuffixIds: number[] = []

    html$(root)
      .find('li')
      .find('div')
      .each(function (i: number, elem: any) {
        let bonusText
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

        // e.g. +1% Dodge , +(5 - 7) Agility
        //
        // - some enchants have up to two bonuses (seperated by ,)
        // - some enchants have multiple suffixId's (denoted in parens)
        //
        // we want to get the text with parens, if it exists
        const bonusTextBase = html$(elem).text().trim().split(',')
        const bonusTextOne = bonusTextBase[0].trim()
        const bonusTextTwo = bonusTextBase[1] ? bonusTextBase[1].trim() : ''
        const bonusValuesOne = wowheadParseBonusValues(bonusTextOne)
        const bonusValuesTwo = wowheadParseBonusValues(bonusTextTwo)
        const bonusValuesX: [number, number] = [bonusValuesOne[0], bonusValuesTwo[0]]
        const bonusValuesY: [number, number] = [
          !bonusValuesOne[1] && bonusValuesTwo[1] ? bonusValuesOne[0] : bonusValuesOne[1],
          bonusValuesTwo[1]
        ]

        /*
        console.log(`bonusTextBase: ${bonusTextBase}`)
        console.log(`bonusValuesOne: ${bonusValuesOne}`)
        console.log(`bonusValuesTwo: ${bonusValuesTwo}`)
        console.log(`bonusValuesX: ${bonusValuesX}`)
        console.log(`bonusValuesY: ${bonusValuesY}`)
        */

        let itemSuffix

        itemSuffix = getItemSuffixFromItemNameAndValues(suffixes, `x ${suffixTypeText}`, bonusValuesX)
        if (itemSuffix) {
          if (!opts || !opts.validSuffixTypes || opts.validSuffixTypes.includes(itemSuffix.type)) {
            validSuffixIds.push(itemSuffix.id)
          }
        }

        itemSuffix = getItemSuffixFromItemNameAndValues(suffixes, `x ${suffixTypeText}`, bonusValuesY)
        if (itemSuffix) {
          if (!opts || !opts.validSuffixTypes || opts.validSuffixTypes.includes(itemSuffix.type)) {
            validSuffixIds.push(itemSuffix.id)
          }
        }
      })
    if (validSuffixIds.length > 0) {
      itemJSON.validSuffixIds = validSuffixIds
    }
  }

  // copy item as is to output
  output.item = itemJSON

  // now generate each random enchant
  if (itemJSON.validSuffixIds && itemJSON.validSuffixIds.length > 0) {
    output.randomEnchants = []
    output.suffixes = []
    for (let i = 0; i < itemJSON.validSuffixIds.length; i++) {
      const suffixId = itemJSON.validSuffixIds[i]
      const itemSuffixJSON = getItemSuffix(suffixes, suffixId)
      if (itemSuffixJSON) {
        output.randomEnchants.push(getRandomEnchantJSON(itemJSON, itemSuffixJSON))
        output.suffixes.push(itemSuffixJSON)
      }
    }
  }

  return output
}

const wowheadParseItems = async (itemListFile: string, opts?: { validSuffixTypes?: number[] }) => {
  const limit = plimit(10)
  const itemSuffixFile = fs.existsSync(cacheItemSuffixFile) ? cacheItemSuffixFile : masterItemSuffixFile
  const itemSuffixes: ItemSuffixJSON[] = await jsonFromFileAsync(itemSuffixFile)
  const parsePromises: Promise<WowheadItemParserResult>[] = []

  const itemList = await jsonFromFileAsync(itemListFile)
  for (let i = 0; i < itemList.length; i++) {
    parsePromises.push(limit(() => wowheadParseItem(itemList[i].id, itemList[i].name, itemSuffixes, opts)))
  }

  return Promise.all(parsePromises)
}

const wowheadWriteItems = async (
  parseResults: WowheadItemParserResult[],
  itemFile: string,
  itemModularFile: string,
  itemRandomFile: string,
  itemSuffixFile: string
) => {
  const items: ItemJSON[] = []
  const itemsModular: ItemJSON[] = []
  const itemsRandom: ItemJSON[] = []
  const itemSuffixSet: Set<ItemSuffixJSON> = new Set()

  for (let i = 0; i < parseResults.length; i++) {
    const parsedItem = parseResults[i]

    // add suffixes to set to remove duplicates
    if (parsedItem.suffixes && parsedItem.suffixes.length > 0) {
      for (let x = 0; x < parsedItem.suffixes.length; x++) {
        itemSuffixSet.add(parsedItem.suffixes[x])
      }
    }

    // the modular item db only stores the 'base item' for random enchants
    // that way we can save space and generate them at run time
    itemsModular.push(parsedItem.item)

    // the random item db just stores random enchants. it's mostly
    // for educational purposes
    itemsRandom.push(...parsedItem.randomEnchants)

    // the main item db stores everything except the 'base item' for the random enchants
    if (!parsedItem.item.validSuffixIds) {
      items.push(parsedItem.item)
    }
    items.push(...parsedItem.randomEnchants)
  }

  console.log(`writing item db: ${items.length}`)
  await fsPromises.writeFile(itemFile, JSON.stringify(items))

  console.log(`writing modular item db: ${itemsModular.length}`)
  await fsPromises.writeFile(itemModularFile, JSON.stringify(itemsModular))

  console.log(`writing random enchant item db: ${itemsRandom.length}`)
  await fsPromises.writeFile(itemRandomFile, JSON.stringify(itemsRandom))

  console.log(`writing itemSuffix db: ${itemSuffixSet.size}`)
  await fsPromises.writeFile(itemSuffixFile, JSON.stringify(Array.from(itemSuffixSet)))
}

const createDBMoonkin = async () => {
  return createDBCustom('moonkin', [
    lc.common.ItemSuffixType.ArcaneWrath,
    lc.common.ItemSuffixType.NaturesWrath,
    lc.common.ItemSuffixType.Sorcery,
    lc.common.ItemSuffixType.Restoration
  ])
}

const createDBWarlock = async () => {
  return createDBCustom('warlock', [
    lc.common.ItemSuffixType.ShadowWrath,
    lc.common.ItemSuffixType.FieryWrath,
    lc.common.ItemSuffixType.Sorcery
  ])
}

const createDBMage = async () => {
  return createDBCustom('mage', [
    lc.common.ItemSuffixType.FieryWrath,
    lc.common.ItemSuffixType.FrozenWrath,
    lc.common.ItemSuffixType.Sorcery
  ])
}

const createDBFeral = async () => {
  return createDBCustom('feral', [
    lc.common.ItemSuffixType.Agility,
    lc.common.ItemSuffixType.Striking,
    lc.common.ItemSuffixType.TheTiger,
    lc.common.ItemSuffixType.TheBear,
    lc.common.ItemSuffixType.TheMonkey,
    lc.common.ItemSuffixType.TheWolf,
    lc.common.ItemSuffixType.TheFalcon,
    lc.common.ItemSuffixType.Stamina,
    lc.common.ItemSuffixType.Eluding,
    lc.common.ItemSuffixType.Power
  ])
}

const createDBCustom = async (dbName: string, validSuffixTypes: number[]): Promise<void> => {
  const itemListFile = `cache/itemList-${dbName}.json`

  // so we ultimately need `itemListFile` to exist. if it doesn't exist we'll create it based
  // on a file in 'custom/'. in order:
  //  - .json: json file in itemList format
  //  - .txt: text file of item names, one per line
  //  - .csv: a CSV with an 'Name' column
  if (!fs.existsSync(itemListFile)) {
    const customItemListFile = `custom/${dbName}.json`
    const customTXTFile = `custom/${dbName}.txt`
    const customCSVFile = `custom/${dbName}.csv`
    if (fs.existsSync(customItemListFile)) {
      await fsPromises.writeFile(itemListFile, stringFromFile(customItemListFile))
    } else if (fs.existsSync(customTXTFile)) {
      await fsPromises.writeFile(itemListFile, JSON.stringify(await parseTXT(customTXTFile)))
    } else {
      await fsPromises.writeFile(itemListFile, JSON.stringify(await parseCSV(customCSVFile, 'Name')))
    }
  }

  return await createDB(dbName, itemListFile, { validSuffixTypes: validSuffixTypes })
}

const createDBFull = async (): Promise<void> => {
  return await createDB(`full`, `cache/itemList-master.json`)
}

const createDB = async (
  dbName: string,
  itemListFile: string,
  opts?: { validSuffixTypes?: number[] }
): Promise<void> => {
  mkdirp.sync(`dist/${dbName}`)

  // parse items
  console.log(`parsing items from ${itemListFile}`)
  const startTime = process.hrtime()
  const items = await wowheadParseItems(itemListFile, opts)

  // write db
  console.log(`writing files to dist/${dbName}`)
  await wowheadWriteItems(
    items,
    `dist/${dbName}/item.json`,
    `dist/${dbName}/item-modular.json`,
    `dist/${dbName}/item-random.json`,
    `dist/${dbName}/itemSuffix.json`
  )

  const elapsedTime = hrTimeToSeconds(process.hrtime(startTime))
  console.log(`spent ${secondsToPretty(elapsedTime)} creating databases`)
}

const parseTXT = async (txtFilePath: string): Promise<ItemListJSON[]> => {
  const results: ItemListJSON[] = []
  const itemNameSet: Set<string> = new Set()

  const txtArray = fs.readFileSync(txtFilePath).toString().split('\n')
  for (let i = 0; i < txtArray.length; i++) {
    const itemName = lc.common.itemBaseName(txtArray[i])
    if (itemName !== '') {
      itemNameSet.add(itemName)
    }
  }

  // loop the unique set of item names, grab id and stuff in result array
  // there are duplicate items...this will include ALL that match
  const itemList = jsonFromFile(masterListFile)
  const itemNameArray = Array.from(itemNameSet)
  for (let i = 0; i < itemNameArray.length; i++) {
    const itemName = itemNameArray[i]
    let itemFound = false
    for (let i = 0; i < itemList.length; i++) {
      const item = itemList[i]
      if (item.name.toLowerCase() === itemName.toLowerCase()) {
        results.push({ id: item.id, name: itemName })
        itemFound = true
      }
    }
    if (!itemFound) {
      console.log(`WARNING: Couldn't find item name "${itemName}"`)
    }
  }

  return results
}

const parseCSV = async (csvFilePath: string, itemNameKey: string): Promise<ItemListJSON[]> => {
  const results: ItemListJSON[] = []
  const itemNameSet: Set<string> = new Set()

  const itemList = jsonFromFile(masterListFile)
  const csvArray = await csv().fromFile(csvFilePath)

  for (const csvRecord of csvArray) {
    const itemName = lc.common.itemBaseName(csvRecord[itemNameKey])
    if (itemName !== '') {
      itemNameSet.add(itemName)
    }
  }

  // loop the unique set of item names, grab id and stuff in result array
  // there are duplicate items...this will include ALL that match
  const itemNameArray = Array.from(itemNameSet)
  for (let i = 0; i < itemNameArray.length; i++) {
    const itemName = itemNameArray[i]
    for (let i = 0; i < itemList.length; i++) {
      const item = itemList[i]
      if (item.name === itemName) {
        results.push({ id: item.id, name: itemName })
      }
    }
  }

  return results
}

export default {
  stringFromFile,
  stringFromFileAsync,
  stringFromGzipFile,
  jsonFromFile,
  stringFromComment,
  atoi,
  atoa,
  download,
  itemIconFromXML,
  itemNameFromId,
  getItemSuffix,
  getItemSuffixesFromItemName,
  getItemSuffixFromItemNameAndValues,
  wowheadItemName,
  wowheadDownloadItems,
  wowheadDownloadMasterList,
  wowheadDownloadHTML,
  wowheadDownloadXML,
  wowheadDownloadIcon,
  wowheadParseItem,
  parseTXT,
  parseCSV,
  createDB,
  createDBFull,
  createDBCustom,
  createDBMoonkin,
  createDBWarlock,
  createDBFeral,
  createDBMage
}
