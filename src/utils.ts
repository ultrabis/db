
export const cloneObject = (o: any): any => {
  return JSON.parse(JSON.stringify(o, null, 1))
}

/**
 * Strips chars and lowercase `s` to facilitate fuzzy string compares
 * 
 * @param s string to fuzzify
 */
export const fuzzifyString = (s: string): string => {
  return s
    .replace(/ /g, '')
    .replace(/-/g, '')
    .replace(/!/g, '')
    .replace(/'/g, '')
    .replace(/:/g, '')
    .replace(/\./g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/%/g, '')
    .toLowerCase()
}

/**
 * 
 * Strip chars, replace spaces with dashes and lowercase `s`.
 * This is the format wowhead uses for item names on their URL's.
 * 
 * @param s 
 */
export const dashifyString = (s: string): string => {
  return s
    .replace(/\'/g, '')
    .replace(/\"/g, '')
    .replace(/,/g, '')
    .replace(/:/g, '')
    .replace(/ - /g, '-')
    .replace(/ /g, '-')
    .toLowerCase()
}

/**
 * 
 * Return `true` if `needle` is found in `haystack`, using fuzzy string matching
 * 
 * @param haystack 
 * @param needle 
 */
export const fuzzyIncludes = (haystack: string, needle: string): boolean => {
  return fuzzifyString(haystack).includes(fuzzifyString(needle))
}

/**
 * get enum value from `inputKey`
 * 
 * @param inputKey Fuzzy enum key
 */
export const enumValueFromKey = (enumType: any, inputKey: string): number | undefined => {
  const enumKeys = Object.keys(enumType)
  for (let i = 0; i < enumKeys.length; i++) {
    const fuzzyEnumKey = fuzzifyString(enumKeys[i])
    const fuzzyInputKey = fuzzifyString(inputKey)
    if (fuzzyEnumKey === fuzzyInputKey) {
      if (enumType[enumKeys[i]] !== NaN) {
        return enumType[enumKeys[i]]
      }
    }
  }
  return undefined
}
