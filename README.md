# db

JSON item database for World of Warcraft Classic.

The purpose is to provide a database for simulators and/or other tools without requiring a back-end database server. 

## explanation of files

`main` = includes all valid random enchants e.g. `Master's Hat of Arcane Wrath`

`random` = only random enchants (educational purposes)

`modular` = random enchants only include the base item e.g. `Master's Hat`

`itemSuffix` = can be used in conjunction with `modular` to generate the random enchants at run-time (using roughly 4 times less space) 

## full database

- [main (8.8MB)](https://ultrabis.github.io/db/full/item.json)
- [random (7.3MB)](https://ultrabis.github.io/db/full/item-random.json)
- [modular (2MB)](https://ultrabis.github.io/db/full/item-modular.json)
- [itemSuffix (43k)](https://ultrabis.github.io/db/full/itemSuffix.json)

## moonkin / fire mage / other classes and specs

smaller db's tailored to specific classes/specs coming soon

## typescript interfaces

- [ItemJSON.ts](https://ultrabis.github.io/db/ItemJSON.ts)
- [ItemSuffixJSON.ts](https://ultrabis.github.io/db/ItemSuffixJSON.ts)

