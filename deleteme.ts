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
