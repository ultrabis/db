/**
 * common stuff for database creation
 */

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import cheerio from 'cheerio'
import request from 'requestretry'
import lc from 'libclassic'
import ItemJSON from './interface/ItemJSON'
import ItemSuffixJSON from './interface/ItemSuffixJSON'

const xmlOutputDir = 'cache/items'
const iconOutputDir = 'cache/icons'
const masterListFile = `cache/masterList.json`
const masterItemSuffixFile = `src/masterItemSuffix.json`

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
 * read JSON from a plaintext file
 *
 * @param filePath
 */
const jsonFromFile = (filePath: string): any => {
  return JSON.parse(stringFromFile(filePath))
}

/**
 *
 * read masterList and return array of matching items based on the name
 * we must return an array becaue itemName is not unique
 *
 * @param itemName
 */
const itemIdsFromName = (itemName: string): number[] => {
  const ids: number[] = []

  const masterList = jsonFromFile(masterListFile)
  const itemCount = masterList.length
  for (let i = 0; i < itemCount; i++) {
    const item = masterList[i]
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

const itemSuffixJSONFromId = (suffixId: number, suffixPath?: string): ItemSuffixJSON | undefined => {
  const itemSuffixJSONArray: ItemSuffixJSON[] = jsonFromFile(suffixPath ? suffixPath : masterItemSuffixFile)
  const suffixCount = itemSuffixJSONArray.length

  for (let i = 0; i < suffixCount; i++) {
    if (itemSuffixJSONArray[i].id === suffixId) {
      return itemSuffixJSONArray[i]
    }
  }

  return undefined
}

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

  if (isRandomEnchant && itemJSON.suffixId) {
    // apply the bonuses
    const itemSuffixJSON = itemSuffixJSONFromId(itemJSON.suffixId)
    if (itemSuffixJSON) {
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
    }
  }

  // - if no suffixId passed in, this is a base item and we need the valid suffixId's
  // - if suffixId passed in, this is one individual item and we don't need the valid suffixId's
  if (isRandomEnchant && !itemJSON.suffixId) {
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

const itemJSONArrayFromMasterList = (opts?: { outputFile?: string; modular?: boolean }): ItemJSON[] => {
  const itemJSONArray: ItemJSON[] = []

  const masterList = jsonFromFile(masterListFile)
  const itemCount = masterList.length
  for (let i = 0; i < itemCount; i++) {
    const item = masterList[i]

    console.log(`-- ${item.name} (${item.id})`)
    const itemJSON = itemJSONFromId(item.id)
    if (!itemJSON) {
      console.warn(`WARNING: couldn't find ${item.id}, skipping`)
      continue
    }

    if (opts && opts.modular) {
      // this is a modular db, meaning we'll just write the items as is
      // the random enchants can be generated at run-time
      itemJSONArray.push(itemJSON)
    } else if (itemJSON.validSuffixIds && itemJSON.validSuffixIds.length > 0) {
      // this is a complete db, meaning we'll generate the random enchant items now, at build time.
      for (let i = 0; i < itemJSON.validSuffixIds.length; i++) {
        const _itemJSON = itemJSONFromId(item.id, itemJSON.validSuffixIds[i])
        if (_itemJSON) {
          itemJSONArray.push(_itemJSON)
        }
      }
    }
  }

  if (opts && opts.outputFile) {
    fs.writeFileSync(opts.outputFile, JSON.stringify(itemJSONArray))
  }

  return itemJSONArray
}

/**
 *
 * Return array of suffixes that are used in item file
 * Optionally write it to a file
 *
 * @param inputFile
 * @param outputFile
 */
const itemSuffixJSONArrayFromItemFile = (myItemFile: string, newItemSuffixFile?: string): ItemSuffixJSON[] => {
  // find the itemSuffix and add it to the set
  const addToSet = (itemSuffixSet: Set<ItemSuffixJSON>, suffixId: number) => {
    for (let i = 0; i < itemSuffixJSONArray.length; i++) {
      const itemSuffix = itemSuffixJSONArray[i]
      if (itemSuffix.id === suffixId) {
        itemSuffixSet.add(itemSuffix)
      }
    }
  }

  const itemSuffixJSONArray: ItemSuffixJSON[] = jsonFromFile(masterItemSuffixFile)
  const itemJSONArray: ItemJSON[] = jsonFromFile(myItemFile)
  const mySet: Set<ItemSuffixJSON> = new Set()

  for (let i = 0; i < itemJSONArray.length; i++) {
    const itemJSON = itemJSONArray[i]
    if (itemJSON.validSuffixIds && itemJSON.validSuffixIds.length > 0) {
      // this is a random enchant base item
      for (let x = 0; x < itemJSON.validSuffixIds.length; x++) {
        addToSet(mySet, itemJSON.validSuffixIds[x])
      }
    } else if (itemJSON.suffixId) {
      // this is a standard random enchant
      addToSet(mySet, itemJSON.suffixId)
    }
  }

  const result = Array.from(mySet)
  if (newItemSuffixFile) {
    fs.writeFileSync(newItemSuffixFile, JSON.stringify(result))
  }
  return result
}

export default {
  stringFromFile,
  stringFromGzipFile,
  jsonFromFile,
  stringFromComment,
  atoi,
  atoa,
  download,
  wowheadItemName,
  wowheadDownloadItems,
  wowheadDownloadMasterList,
  wowheadDownloadHTML,
  wowheadDownloadXML,
  wowheadDownloadIcon,
  itemIdsFromName,
  itemIconFromXML,
  itemNameFromId,
  itemJSONFromId,
  itemJSONArrayFromMasterList,
  itemSuffixJSONArrayFromItemFile
}
