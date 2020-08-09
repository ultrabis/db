# @ultrabis/db

JSON item database for World of Warcraft Classic.

The purpose is to provide a database for simulators and/or other tools without requiring a back-end database server. 

![build](https://github.com/ultrabis/db/workflows/gh/badge.svg)

## download

| full                                                                   | moonkin             | firemage              | description |
|------------------------------------------------------------------------|---------------------| ----------------------|-------------|
| [main (8.8MB)](https://ultrabis.github.io/db/full/item.json)           | [main (178k)](https://ultrabis.github.io/db/moonkin/item.json) | TODO | all items including random enchants  |
| [modular (2MB)](https://ultrabis.github.io/db/full/item-modular.json)  | [modular (125k)](https://ultrabis.github.io/db/moonkin/item-modular.json) | TODO | all items excluding random enchants |
| [random (7.3MB)](https://ultrabis.github.io/db/full/item-random.json)  | [random (91k)](https://ultrabis.github.io/db/moonkin/item-random.json) | TODO | only random enchants |
| [itemSuffix (43k)](https://ultrabis.github.io/db/full/itemSuffix.json) | [itemSuffix (3k)](https://ultrabis.github.io/db/moonkin/itemSuffix.json) | TODO | can be used in conjunction with `modular` to generate random enchants at run-time |

### typescript interfaces

- [ItemJSON.ts](https://ultrabis.github.io/db/ItemJSON.ts)
- [ItemSuffixJSON.ts](https://ultrabis.github.io/db/ItemSuffixJSON.ts)

### icons

The icons for all items are included in `cache/icons`

## known issues

- faction property not yet supported
- wowhead doesn't have 'phase' for every item. how to handle those is up to the user right now 

### TODO

- create databases tailored for specific classes/specs based on their spreadsheets
- add client side functions for working with databases
  - publish to NPM
  - allow importing / including by database type 
