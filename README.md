# @ultrabis/db

JSON item database for World of Warcraft Classic.

The purpose is to provide a database for simulators and/or other tools without requiring a back-end database server. 

![build](https://github.com/ultrabis/db/workflows/gh/badge.svg)

## download

Full contains every item. The others are tailored for a specific class/spec and were derived from various spreadsheets and BiS lists.

| full | moonkin | feral | warlock | mage | description |
|------|---------| ------|---------|------|-------------|
| [main (8.8MB)][full-main] | [main (178k)][moonkin-main] | [main (220k)][feral-main] | [main (121k)][warlock-main] | [main (63k)][mage-main] | all items including random enchants |
| [modular (2MB)][full-modular] | [modular (125k)][moonkin-modular] | [modular (130k)][feral-modular] | [modular (119k)][warlock-modular] | [modular (60k][mage-modular] | all items excluding random enchants |
| [random (7.3MB)][full-random] | [random (91k)][moonkin-random] | [random (110k)][feral-random] | [random (5k)][warlock-random] | [random (6K)][mage-random] | only random enchants |
| [itemSuffix (43k)][full-suffix] | [itemSuffix (3k)][moonkin-suffix] | [itemSuffix (7k)][feral-suffix] | [itemSuffix (1k)][warlock-suffix] | [itemSuffix (2K)][mage-suffix] | can be used in conjunction with `modular` to generate random enchants at run-time |

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
