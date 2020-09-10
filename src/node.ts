/**
 * common db creation stuff on the node side
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

import { cloneObject } from './utils'

import ItemJSON from './interface/ItemJSON'
import ItemSuffixJSON from './interface/ItemSuffixJSON'

import ItemBonusType from './enum/ItemBonusType'
import ItemSuffixType from './enum/ItemSuffixType'

/* FIXME: DELETE THIS */
import lc from 'libclassic'
import { exit } from 'process'

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
const masterItemListFile = `cache/itemList-master.json`
const masterAbilityListFile = `cache/abilityList-master.json`
const masterItemSuffixFile = `cache/itemSuffix-master.json`
const cacheItemSuffixFile = `cache/itemSuffix.json`

export const hrTimeToSeconds = (hrtime: any) => {
  return (hrtime[0] + hrtime[1] / 1e9).toFixed(3)
}

export const secondsToPretty = (seconds: number): string => {
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

export const zsum = (one: number | undefined, two: number | undefined) => {
  const val = (one ? one : 0) + (two ? two : 0)
  return val ? val : undefined
}

// number to number. if value is undefined, null, or NaN return undefined
// optionally return undefined for 0 value
export const itoi = (value: number | null | undefined, noZeros?: boolean): number | undefined => {
  if (value === undefined || value === null || value === NaN || (noZeros && value === 0)) {
    return undefined
  }

  return value
}

// string to number. if value is undefined, null, or NaN return undefined
// optionally return undefined for 0 value
export const atoi = (value: string | undefined, noZeros?: boolean): number | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }

  return itoi(Number(value), noZeros)
}

// string to string. if value is undefined, null, or empty return undefined
export const atoa = (value: string | undefined): string | undefined => {
  if (value === undefined || value === null || value.length === 0) {
    return undefined
  }
  return value
}

// bool to bool. false is undefined
export const btob = (value: boolean): boolean | undefined => {
  return value ? value : undefined
}

export const stringFromComment = (haystack: string, commentName: string): string => {
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
export const wowheadItemName = (itemName: string): string => {
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
export const stringFromGzipFile = (filePath: string): string => {
  return zlib.gunzipSync(fs.readFileSync(filePath)).toString()
}

/**
 *
 * read gzip file as plain text string
 *
 * @param filePath
 */
export const stringFromGzipFileAsync = async (filePath: string): Promise<string> => {
  const buffer = await fsPromises.readFile(filePath)
  return zlib.gunzipSync(buffer).toString()
}

/**
 *
 * read file as plain text string
 *
 * @param filePath
 */
export const stringFromFile = (filePath: string): string => {
  try {
    return fs.readFileSync(filePath).toString()
  } catch (err) {
    return ``
  }
}

/**
 *
 * read file as plain text string asynchronously
 *
 * @param filePath
 */
export const stringFromFileAsync = async (filePath: string): Promise<string> => {
  const buffer = await fsPromises.readFile(filePath)
  return buffer.toString()
}

/**
 *
 * read JSON from a plaintext file
 *
 * @param filePath
 */
export const jsonFromFile = (filePath: string): any => {
  return JSON.parse(stringFromFile(filePath))
}

/**
 *
 * read JSON from a plaintext file asynchronously
 *
 * @param filePath
 */
export const jsonFromFileAsync = async (filePath: string): Promise<any> => {
  const buffer = await fsPromises.readFile(filePath)
  return JSON.parse(buffer.toString())
}

/**
 *
 * read itemList file and return the itemName based on itemId
 *
 * @param itemId
 */
export const itemNameFromId = (itemId: number): string => {
  const masterList = jsonFromFile(masterItemListFile)
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
export const itemIconFromXML = (itemId: number, _itemName?: string): string => {
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
export const download = async (url: string, dest: string, opts?: { unzip?: boolean }) => {
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
export const wowheadDownloadIcon = async (itemId: number, _itemName?: string) => {
  const iconName = itemIconFromXML(itemId, _itemName)
  const filePath = `${iconOutputDir}/${iconName.toLowerCase()}.jpg`
  const url = `https://wow.zamimg.com/images/wow/icons/large/${iconName.toLowerCase()}.jpg`
  return download(url, filePath, { unzip: true })
}

export const wowheadDownloadHTML = async (itemId: number, _itemName?: string) => {
  const itemName = _itemName ? _itemName : itemNameFromId(itemId)
  const filePath = `${xmlOutputDir}/${itemId}-${wowheadItemName(itemName)}.html.gz`
  const url = `https://classic.wowhead.com/item=${itemId}`
  return download(url, filePath, { unzip: false })
}

export const wowheadDownloadXML = async (itemId: number, _itemName?: string) => {
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
export const wowheadDownloadMasterItemList = async (outputPath: string) => {
  if (!fs.existsSync(outputPath)) {
    const data = await wowheadScrapeItemList()
    fs.writeFileSync(outputPath, JSON.stringify(data))
  }
}

/**
 * download all ability names/ids from wowhead
 *
 * @param outputPath write to file
 */
export const wowheadDownloadMasterAbilityList = async (outputPath: string) => {
  /* if file already exists, no work to do */
  if (fs.existsSync(outputPath)) {
    return
  }

  const abilities = []
  const stepSize = 1000
  const maxSize = 31100

  for (let i = 0; i < maxSize; i += stepSize) {
    const url = `https://classic.wowhead.com/abilities?filter=14:14;2:5;${i}:${i + stepSize}`
    console.log(`doing ${i} of ${maxSize}: ${url}`)
    const req = await request({
      url: url,
      json: true
    })

    const $ = cheerio.load(req.body)
    const scriptDatas = $('script[type="text/javascript"]')[1]?.children[0].data?.split('\n')
    if (scriptDatas === undefined) {
      continue
    }
    
    const scriptData = scriptDatas.filter(text => text.includes('listviewspells'))[0]
    const rawListData = scriptData.substring(
        scriptData.indexOf('['),
        scriptData.indexOf(';')
      ).replace(/popularity/g, '"popularity"')
    const listData = JSON.parse(rawListData)

    for (let x = 0; x < listData.length; x++) {
      abilities.push({
        id: listData[x].id,
        name: listData[x].name,
        rank: listData[x].rank ? Number(listData[x].rank.replace('Rank ', '')) : 0,
        level: listData[x].level,
        class: listData[x].chrclass,
        school: listData[x].schools
      })
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(abilities))
}

/**
 * returns object of all wowhead item id's.
 *
 * borrowed from: https://github.com/nexus-devs/wow-classic-items
 */
export const wowheadScrapeItemList = async () => {
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
 * Downloads / caches everything we need from wowhead for `abilities`
 *
 */
export const wowheadDownloadAbilities = async(): Promise<void> => {
  await wowheadDownloadMasterAbilityList(masterAbilityListFile)

  // read in abilityList
  const masterAbilityList = jsonFromFile(masterAbilityListFile)
  const abilityCount = masterAbilityList.length

  // iterate itemList and download XML, HTML, and icon for each item
  console.log(`Processing ${abilityCount} abilities...`)
}

/**
 *
 * Downloads / caches everything we need from wowhead for `items`
 *
 */
export const wowheadDownloadItems = async (): Promise<void> => {
  // download list of items if necessary
  await wowheadDownloadMasterItemList(masterItemListFile)

  // read in itemList
  const masterList = jsonFromFile(masterItemListFile)
  const itemCount = masterList.length

  // iterate itemList and download XML, HTML, and icon for each item
  console.log(`Processing ${itemCount} items...`)
  for (let i = 0; i < itemCount; i++) {
    const item = masterList[i]
    //console.log(`- ${item.name} (${item.id})`)
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

export const getItemSuffixesFromItemName = (itemSuffixJSONArray: ItemSuffixJSON[], itemName: string): ItemSuffixJSON[] => {
  const suffixType = lc.common.itemSuffixTypeFromText(itemName)
  const itemSuffixes: ItemSuffixJSON[] = []

  for (let i = 0; i < itemSuffixJSONArray.length; i++) {
    if (itemSuffixJSONArray[i].type === suffixType) {
      itemSuffixes.push(itemSuffixJSONArray[i])
    }
  }

  /*
  console.log(`${lc.utils.getEnumKeyByEnumValue(ItemSuffixType, suffixType)}`)
  for (let i = 0; i < itemSuffixes.length; i++) {
    console.log(itemSuffixes[i].bonus)
  }
  */

  return itemSuffixes
}

export const getItemSuffixFromItemNameAndValues = (
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

export const getItemSuffix = (itemSuffixJSONArray: ItemSuffixJSON[], suffixId: number): ItemSuffixJSON | undefined => {
  const suffixCount = itemSuffixJSONArray.length

  for (let i = 0; i < suffixCount; i++) {
    if (itemSuffixJSONArray[i].id === suffixId) {
      return itemSuffixJSONArray[i]
    }
  }

  return undefined
}

export const getRandomEnchantJSON = (baseItemJSON: ItemJSON, itemSuffixJSON: ItemSuffixJSON): ItemJSON => {
  const itemJSON = cloneObject(baseItemJSON)

  // add suffixId and remove validSuffixIds
  itemJSON.validSuffixIds = undefined
  itemJSON.suffixId = itemSuffixJSON.id

  // apply the bonuses
  for (let i = 0; i < itemSuffixJSON.bonus.length; i++) {
    const value = itemSuffixJSON.bonus[i].value
    switch (itemSuffixJSON.bonus[i].type) {
      case ItemBonusType.Agility:
        itemJSON.agility = zsum(itemJSON.agility, value)
        break
      case ItemBonusType.ArcaneResistence:
        itemJSON.arcaneResistance = zsum(itemJSON.arcaneResistance, value)
        break
      case ItemBonusType.ArcaneSpellDamage:
        itemJSON.arcaneDamage = zsum(itemJSON.arcaneDamage, value)
        break
      case ItemBonusType.Armor:
        itemJSON.armor = zsum(itemJSON.armor, value)
        break
      case ItemBonusType.AttackPower:
        itemJSON.attackPower = zsum(itemJSON.attackPower, value)
        break
      case ItemBonusType.BeastSlaying:
        itemJSON.beastSlaying = zsum(itemJSON.beastSlaying, value)
        break
      case ItemBonusType.Block:
        itemJSON.blockChance = zsum(itemJSON.blockChance, value)
        break
      case ItemBonusType.CriticalHit:
        itemJSON.meleeCrit = zsum(itemJSON.meleeCrit, value)
        itemJSON.rangedCrit = zsum(itemJSON.rangedCrit, value)
        break
      case ItemBonusType.Damage:
        // NOT IN GAME
        break
      case ItemBonusType.DamageAndHealingSpells:
        itemJSON.spellDamage = zsum(itemJSON.spellDamage, value)
        itemJSON.spellHealing = zsum(itemJSON.spellHealing, value)
        break
      case ItemBonusType.Defense:
        itemJSON.defense = zsum(itemJSON.defense, value)
        break
      case ItemBonusType.Dodge:
        itemJSON.dodge = zsum(itemJSON.dodge, value)
        break
      case ItemBonusType.FireResistance:
        itemJSON.fireResistance = zsum(itemJSON.fireResistance, value)
        break
      case ItemBonusType.FireSpellDamage:
        itemJSON.fireDamage = zsum(itemJSON.fireDamage, value)
        break
      case ItemBonusType.FrostResistance:
        itemJSON.frostResistance = zsum(itemJSON.frostResistance, value)
        break
      case ItemBonusType.FrostSpellDamage:
        itemJSON.frostDamage = zsum(itemJSON.frostDamage, value)
        break
      case ItemBonusType.HealingSpells:
        itemJSON.spellHealing = zsum(itemJSON.spellHealing, value)
        break
      case ItemBonusType.HealthEvery5:
        itemJSON.hp5 = zsum(itemJSON.hp5, value)
        break
      case ItemBonusType.HolySpellDamage:
        itemJSON.holyDamage = zsum(itemJSON.holyDamage, value)
        break
      case ItemBonusType.Intellect:
        itemJSON.intellect = zsum(itemJSON.intellect, value)
        break
      case ItemBonusType.ManaEvery5:
        itemJSON.mp5 = zsum(itemJSON.mp5, value)
        break
      case ItemBonusType.NatureResistance:
        itemJSON.natureResistance = zsum(itemJSON.natureResistance, value)
        break
      case ItemBonusType.NatureSpellDamage:
        itemJSON.natureDamage = zsum(itemJSON.natureDamage, value)
        break
      case ItemBonusType.RangedAttackPower:
        itemJSON.rangedAttackPower = zsum(itemJSON.rangedAttackPower, value)
        break
      case ItemBonusType.ShadowResistance:
        itemJSON.shadowResistance = zsum(itemJSON.shadowResistance, value)
        break
      case ItemBonusType.ShadowSpellDamage:
        itemJSON.shadowDamage = zsum(itemJSON.shadowDamage, value)
        break
      case ItemBonusType.Spirit:
        itemJSON.spirit = zsum(itemJSON.spirit, value)
        break
      case ItemBonusType.Stamina:
        itemJSON.stamina = zsum(itemJSON.stamina, value)
        break
      case ItemBonusType.Strength:
        itemJSON.strength = zsum(itemJSON.strength, value)
        break
      case ItemBonusType.AxeSkill:
        itemJSON.axeSkill = zsum(itemJSON.axeSkill, value)
        break
      case ItemBonusType.BowSkill:
        itemJSON.bowSkill = zsum(itemJSON.bowSkill, value)
        break
      case ItemBonusType.DaggerSkill:
        itemJSON.daggerSkill = zsum(itemJSON.daggerSkill, value)
        break
      case ItemBonusType.GunSkill:
        itemJSON.gunSkill = zsum(itemJSON.gunSkill, value)
        break
      case ItemBonusType.MaceSkill:
        itemJSON.maceSkill = zsum(itemJSON.maceSkill, value)
        break
      case ItemBonusType.SwordSkill:
        itemJSON.swordSkill = zsum(itemJSON.swordSkill, value)
        break
      case ItemBonusType.TwoHandedAxeSkill:
        itemJSON.twoHandedAxeSkill = zsum(itemJSON.twoHandedAxeSkill, value)
        break
      case ItemBonusType.TwoHandedMaceSkill:
        itemJSON.twoHandedMaceSkill = zsum(itemJSON.twoHandedMaceSkill, value)
        break
      case ItemBonusType.TwoHandedSwordSkill:
        itemJSON.twoHandedSwordSkill = zsum(itemJSON.twoHandedSwordSkill, value)
        break
      case ItemBonusType.OnGetHitShadowBolt:
        // FIXME: dunno
        break
    }
    // console.log(`hello bonus: ${JSON.stringify(itemSuffixJSON.bonus[i])}`)
  }

  // apply the item name
  switch (itemSuffixJSON.type) {
    case ItemSuffixType.Agility:
      itemJSON.name = `${itemJSON.name} of Agility`
      break
    case ItemSuffixType.ArcaneResistance:
      itemJSON.name = `${itemJSON.name} of Arcane Resistance`
      break
    case ItemSuffixType.ArcaneWrath:
      itemJSON.name = `${itemJSON.name} of Arcane Wrath`
      break
    case ItemSuffixType.BeastSlaying:
      itemJSON.name = `${itemJSON.name} of Beast Slaying`
      break
    case ItemSuffixType.Blocking:
      itemJSON.name = `${itemJSON.name} of Blocking`
      break
    case ItemSuffixType.Concentration:
      itemJSON.name = `${itemJSON.name} of Concentration`
      break
    case ItemSuffixType.CriticalStrike:
      itemJSON.name = `${itemJSON.name} of Critical Strike`
      break
    case ItemSuffixType.Defense:
      itemJSON.name = `${itemJSON.name} of Defense`
      break
    case ItemSuffixType.Eluding:
      itemJSON.name = `${itemJSON.name} of Eluding`
      break
    case ItemSuffixType.FieryWrath:
      itemJSON.name = `${itemJSON.name} of Fiery Wrath`
      break
    case ItemSuffixType.FireResistance:
      itemJSON.name = `${itemJSON.name} of Fire Resistance`
      break
    case ItemSuffixType.FrostResistance:
      itemJSON.name = `${itemJSON.name} of Frost Resistance`
      break
    case ItemSuffixType.FrozenWrath:
      itemJSON.name = `${itemJSON.name} of Frozen Wrath`
      break
    case ItemSuffixType.Healing:
      itemJSON.name = `${itemJSON.name} of Healing`
      break
    case ItemSuffixType.HolyWrath:
      itemJSON.name = `${itemJSON.name} of Holy Wrath`
      break
    case ItemSuffixType.Intellect:
      itemJSON.name = `${itemJSON.name} of Intellect`
      break
    case ItemSuffixType.Marksmanship:
      itemJSON.name = `${itemJSON.name} of Marksmanship`
      break
    case ItemSuffixType.NatureResistance:
      itemJSON.name = `${itemJSON.name} of Nature Resistance`
      break
    case ItemSuffixType.NaturesWrath:
      itemJSON.name = `${itemJSON.name} of Nature's Wrath`
      break
    case ItemSuffixType.Power:
      itemJSON.name = `${itemJSON.name} of Power`
      break
    case ItemSuffixType.Proficiency:
      itemJSON.name = `${itemJSON.name} of Proficiency`
      break
    case ItemSuffixType.Quality:
      itemJSON.name = `${itemJSON.name} of Quality`
      break
    case ItemSuffixType.Regeneration:
      itemJSON.name = `${itemJSON.name} of Regeneration`
      break
    case ItemSuffixType.Restoration:
      itemJSON.name = `${itemJSON.name} of Restoration`
      break
    case ItemSuffixType.Retaliation:
      itemJSON.name = `${itemJSON.name} of Retaliation`
      break
    case ItemSuffixType.ShadowResistance:
      itemJSON.name = `${itemJSON.name} of Shadow Resistance`
      break
    case ItemSuffixType.ShadowWrath:
      itemJSON.name = `${itemJSON.name} of Shadow Wrath`
      break
    case ItemSuffixType.Sorcery:
      itemJSON.name = `${itemJSON.name} of Sorcery`
      break
    case ItemSuffixType.Spirit:
      itemJSON.name = `${itemJSON.name} of Spirit`
      break
    case ItemSuffixType.Stamina:
      itemJSON.name = `${itemJSON.name} of Stamina`
      break
    case ItemSuffixType.Strength:
      itemJSON.name = `${itemJSON.name} of Strength`
      break
    case ItemSuffixType.Striking:
      itemJSON.name = `${itemJSON.name} of Striking`
      break
    case ItemSuffixType.TheBear:
      itemJSON.name = `${itemJSON.name} of the Bear`
      break
    case ItemSuffixType.TheBoar:
      itemJSON.name = `${itemJSON.name} of the Boar`
      break
    case ItemSuffixType.TheEagle:
      itemJSON.name = `${itemJSON.name} of the Eagle`
      break
    case ItemSuffixType.TheFalcon:
      itemJSON.name = `${itemJSON.name} of the Falcon`
      break
    case ItemSuffixType.TheGorilla:
      itemJSON.name = `${itemJSON.name} of the Gorilla`
      break
    case ItemSuffixType.TheMonkey:
      itemJSON.name = `${itemJSON.name} of the Monkey`
      break
    case ItemSuffixType.TheOwl:
      itemJSON.name = `${itemJSON.name} of the Owl`
      break
    case ItemSuffixType.TheTiger:
      itemJSON.name = `${itemJSON.name} of the Tiger`
      break
    case ItemSuffixType.TheWhale:
      itemJSON.name = `${itemJSON.name} of the Whale`
      break
    case ItemSuffixType.TheWolf:
      itemJSON.name = `${itemJSON.name} of the Wolf`
      break
    case ItemSuffixType.Toughness:
      itemJSON.name = `${itemJSON.name} of Toughness`
      break
    case ItemSuffixType.Twain:
      itemJSON.name = `${itemJSON.name} of Twain`
      break
  }
  return itemJSON
}

export const wowheadParseBonusValues = (bonusText: string): [number, number] => {
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

export const wowheadParseItem = async (
  itemId: number,
  itemName: string,
  suffixes: ItemSuffixJSON[],
  opts?: { validSuffixTypes?: number[] }
): Promise<WowheadItemParserResult> => {
  const output: WowheadItemParserResult = {} as WowheadItemParserResult

  const baseFilePath = `${xmlOutputDir}/${itemId}-${wowheadItemName(itemName)}`
  const dataStrings = await Promise.all([
    stringFromGzipFileAsync(`${baseFilePath}.xml.gz`),
    stringFromGzipFileAsync(`${baseFilePath}.html.gz`),
    stringFromFile(`custom/overrides/${itemId}.json`)
  ])

  const xml = dataStrings[0]
  const html = dataStrings[1]
  const override: ItemJSON | undefined = dataStrings[2] !== `` ? JSON.parse(dataStrings[2]) : undefined

  const itemJSON = {} as ItemJSON
  itemJSON.id = itemId

  // parse xml
  const xml$ = cheerio.load(xml, { xmlMode: true })
  const jsonEquipText = xml$('jsonEquip').text()
  const jsonEquip = JSON.parse(`{ ${jsonEquipText} }`)
  itemJSON.name = xml$('name').text()
  itemJSON.slot = Number(xml$('inventorySlot').attr('id'))
  if (itemJSON.slot === NaN) {
    console.warn('WARNING: Invalid slot')
  }
  itemJSON.icon = xml$('icon').text()
  itemJSON.class = atoi(xml$('class').attr('id'))
  itemJSON.subclass = atoi(xml$('subclass').attr('id'))
  itemJSON.level = atoi(xml$('level').attr('id'))
  itemJSON.quality = atoi(xml$('quality').attr('id'))
  //const droppedBy = tt('.whtt-droppedby').text()

  // parse xml jsonEquip object
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

  if (override) {
    Object.assign(itemJSON, override)
  }

  return output
}

export const wowheadParseItems = async (itemListFile: string, opts?: { validSuffixTypes?: number[] }) => {
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

export const wowheadWriteItems = async (
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

export const createDBMoonkin = async () => {
  return createDBCustom('moonkin', [
    ItemSuffixType.ArcaneWrath,
    ItemSuffixType.NaturesWrath,
    ItemSuffixType.Sorcery,
    ItemSuffixType.Restoration
  ])
}

export const createDBWarlock = async () => {
  return createDBCustom('warlock', [
    ItemSuffixType.ShadowWrath,
    ItemSuffixType.FieryWrath,
    ItemSuffixType.Sorcery
  ])
}

export const createDBMage = async () => {
  return createDBCustom('mage', [
    ItemSuffixType.FieryWrath,
    ItemSuffixType.FrozenWrath,
    ItemSuffixType.Sorcery
  ])
}

export const createDBFeral = async () => {
  return createDBCustom('feral', [
    ItemSuffixType.Agility,
    ItemSuffixType.Striking,
    ItemSuffixType.TheTiger,
    ItemSuffixType.TheBear,
    ItemSuffixType.TheMonkey,
    ItemSuffixType.TheWolf,
    ItemSuffixType.TheFalcon,
    ItemSuffixType.Stamina,
    ItemSuffixType.Eluding,
    ItemSuffixType.Power
  ])
}

export const createDBCustom = async (dbName: string, validSuffixTypes: number[]): Promise<void> => {
  const itemListFile = `cache/itemList-${dbName}.json`

  // FIXME: this is dumb I know
  fs.unlinkSync(itemListFile)

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

export const createDBFull = async (): Promise<void> => {
  return await createDB(`full`, `cache/itemList-master.json`)
}

export const createDB = async (
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

export const parseTXT = async (txtFilePath: string): Promise<ItemListJSON[]> => {
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
  const itemList = jsonFromFile(masterItemListFile)
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

export const parseCSV = async (csvFilePath: string, itemNameKey: string): Promise<ItemListJSON[]> => {
  const results: ItemListJSON[] = []
  const itemNameSet: Set<string> = new Set()

  const itemList = jsonFromFile(masterItemListFile)
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