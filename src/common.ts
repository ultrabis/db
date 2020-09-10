import ItemSuffixType from './enum/ItemSuffixType'
import { fuzzyIncludes, enumValueFromKey } from './utils'

/**
 * class for handling our enums - converts between numierc values, keys and bitmask.
 */
export class UltraEnum {
  enumType: any
  enumValues: Set<number>
  initialMask: bigint

  constructor(enumType: any, initialMask?: bigint) {
    this.enumType = enumType
    this.enumValues = new Set()
    this.initialMask = initialMask ? initialMask : BigInt(0)

    // convert mask to to enumValues array
    if (this.initialMask) {
      const enumKeys = Object.keys(this.enumType)
      for (let i = 0; i < enumKeys.length; i++) {
        const enumValue = Number(this.enumType[enumKeys[i]])
        if (!isNaN(enumValue) && UltraEnum.bitMaskIncludes(this.initialMask, this.enumType[enumKeys[i]])) {
          this.append(enumValue)
        }
      }
    }
  }

  /**
   * 
   * Check if `bitMask` contains `value`
   * 
   * @param bitMask bigint bitmask
   * @param value numeric enum value
   */
  static bitMaskIncludes(bitMask: bigint, value: number): boolean {
    const val: bigint = BigInt(1) << BigInt(value)
    return (BigInt(bitMask) & BigInt(val)) === BigInt(val) ? true : false
  }

  
  /**
   * Add `input` to `enumValues` 
   * 
   * @param input Numeric value or fuzzy key string
   */
  append(input: number | string) {
    switch(typeof input) {
      case 'string':
        const valueFromString = enumValueFromKey(this.enumType, input.toString())
        if (valueFromString !== undefined) {
          this.enumValues.add(valueFromString)
        }
        break
      case 'number':
        const valueFromNumber = Number(input)
        if (valueFromNumber !== NaN) {
          this.enumValues.add(valueFromNumber)
        }
        break
      default:
        console.error('bad input')
        break
    }
  }

  /**
   * 
   * Add `input` to `enumValues`
   * 
   * @param input Array of numeric values or fuzzy key strings
   */
  extend(input: number[] | string[]) {
    for (let i = 0; i < input.length; i++) {
      this.append(input[i])
    }
  }

  /**
   * Get array of keys cooresponding with `enumValues`
   */
  get keys(): string[] {
    const keys = [] as string[]
    const values = this.values
    for (let i = 0; i < values.length; i++) {
      keys.push(this.enumType[values[i]])
    }
    return keys
  }

  /**
   * Get array of values from `enumValues`
   */
  get values(): number[] {
    return Array.from(this.enumValues)
  }

  /**
   * Get bigint bitMask of all values in `enumValues`
   */
  get bitMask(): bigint {
    let bitMask = BigInt(0)

    const values = this.values
    for (let i = 0; i < values.length; i++) {
      bitMask |= (BigInt(1) << BigInt(values[i]))
    }
    return bitMask
  }
}


// console.log(libclassic.common.itemSuffixTypeFromText('cape of arcane wrath'))
// console.log(libclassic.common.itemSuffixTypeFromText('Talisman of Ephemeral Power'))
export const itemSuffixTypeFromText = (itemName: string): ItemSuffixType | undefined => {
  const of = itemName.toUpperCase().indexOf(' OF ')
  if (of === -1) {
    return undefined
  }

  if (fuzzyIncludes(itemName, 'hands of power')) {
    return undefined
  }

  if (fuzzyIncludes(itemName, 'tome of power')) {
    return undefined
  }

  if (fuzzyIncludes(itemName, 'tome of restoration')) {
    return undefined
  }

  return enumValueFromKey(ItemSuffixType, itemName.slice(of + 4))
}

/**
 *
 * Convert names like "Master's Hat of Arcane Wrath" to "Master's Hat"
 * Names without a real suffix will keep their original
 *
 * @param itemName
 */
export const itemBaseName = (itemName: string): string => {
  const itemSuffixType = itemSuffixTypeFromText(itemName)
  if (itemSuffixType === undefined) {
    return itemName
  }

  const of = itemName.toUpperCase().indexOf(' OF ')
  return itemName.slice(0, of)
}