# @ultrabis/db

JSON item database for World of Warcraft Classic.

The purpose is to provide a database for simulators and/or other tools without requiring a back-end database server. 

![build](https://github.com/ultrabis/db/workflows/gh/badge.svg)

## download

Full contains every item. The others are tailored for a specific class/spec and were derived from various spreadsheets and BiS lists.

Modular and suffix can be combined to generate random enchant items at runtime, requiring less space.

| main | modular | suffix |
| ---- | ------- | ------ |
| [full (9M)][full-main] | [full (2M)][full-modular] | [full (45K)][full-suffix] |
| [moonkin (186K)][moonkin-main] | [moonkin (133K)][moonkin-modular] | [moonkin (3K)][moonkin-suffix] |
| [feral (223K)][feral-main] | [feral (130K)][feral-modular] | [feral (7K)][feral-suffix] |
| [warlock (172K)][warlock-main] | [warlock (145K)][warlock-modular] | [warlock (2K)][warlock-suffix] |
| [mage (99K)][mage-main] | [mage (73K)][mage-modular] | [mage (2K)][mage-suffix] |

### typescript interfaces

- [ItemJSON.ts](https://ultrabis.github.io/db/ItemJSON.ts)
- [ItemSuffixJSON.ts](https://ultrabis.github.io/db/ItemSuffixJSON.ts)

### icons

The icons for all items are included in `cache/icons`

#### Credits and thanks

wowhead, classicwow.live, wowwiki.fandom.com, keftenks balance druid spreadsheet, shedo's cat spreadsheet, zephans warlock simulator, ginners mage spreadsheet

[full-main]: https://ultrabis.github.io/db/full/item.json
[full-modular]: https://ultrabis.github.io/db/full/item-modular.json
[full-random]: https://ultrabis.github.io/db/full/item-random.json
[full-suffix]: https://ultrabis.github.io/db/full/itemSuffix.json
[moonkin-main]: https://ultrabis.github.io/db/moonkin/item.json
[moonkin-modular]: https://ultrabis.github.io/db/moonkin/item-modular.json
[moonkin-random]: https://ultrabis.github.io/db/moonkin/item-random.json
[moonkin-suffix]: https://ultrabis.github.io/db/moonkin/itemSuffix.json
[feral-main]: https://ultrabis.github.io/db/feral/item.json
[feral-modular]: https://ultrabis.github.io/db/feral/item-modular.json
[feral-random]: https://ultrabis.github.io/db/feral/item-random.json
[feral-suffix]: https://ultrabis.github.io/db/feral/itemSuffix.json
[mage-main]: https://ultrabis.github.io/db/mage/item.json
[mage-modular]: https://ultrabis.github.io/db/mage/item-modular.json
[mage-random]: https://ultrabis.github.io/db/mage/item-random.json
[mage-suffix]: https://ultrabis.github.io/db/mage/itemSuffix.json
[warlock-main]: https://ultrabis.github.io/db/warlock/item.json
[warlock-modular]: https://ultrabis.github.io/db/warlock/item-modular.json
[warlock-random]: https://ultrabis.github.io/db/warlock/item-random.json
[warlock-suffix]: https://ultrabis.github.io/db/warlock/itemSuffix.json
