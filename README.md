# @ultrabis/db

JSON item database for World of Warcraft Classic.

The purpose is to provide a database for simulators and/or other tools without requiring a back-end database server. 

## download

| full       | moonkin             | firemage              |
|------------|---------------------| ----------------------|
| [main (8.8MB)](https://ultrabis.github.io/db/full/item.json)       | TODO                | TODO                  | 
| [random (7.3MB)](https://ultrabis.github.io/db/full/item-random.json)     | TODO              | TODO                |
| [modular (2MB)](https://ultrabis.github.io/db/full/item-modular.json)    | TODO             | TODO               |
| [itemSuffix (43k)](https://ultrabis.github.io/db/full/itemSuffix.json) | TODO          | TODO            |

#### 

`main` = includes all valid random enchants e.g. `Master's Hat of Arcane Wrath`

`random` = only random enchants (educational purposes)

`modular` = random enchants only include the base item e.g. `Master's Hat`

`itemSuffix` = can be used in conjunction with `modular` to generate the random enchants at run-time (using roughly 4 times less space) 


## typescript interfaces

- [ItemJSON.ts](https://ultrabis.github.io/db/ItemJSON.ts)
- [ItemSuffixJSON.ts](https://ultrabis.github.io/db/ItemSuffixJSON.ts)

## icons

The icons for all items are included in `cache/icons`

## explanation of files



## known issues

- faction property not yet supported
- wowhead doesn't have 'phase' for every item. how to handle those is up to the user right now 

### TODO

- create databases tailored for specific classes/specs based on their spreadsheets
- add client side functions for working with databases
  - publish to NPM
  - allow importing / including by database type 
