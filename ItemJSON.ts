export default interface ItemJSON {
  // identification
  id: number
  name: string
  slot: number
  suffixId?: number
  validSuffixIds?: number[]

  // classification
  class?: number
  subclass?: number
  level?: number
  bop?: boolean
  unique?: boolean
  quality?: number
  durability?: number
  icon?: string
  flavor?: string
  dropChance?: number

  // requirements
  reqLevel?: number
  phase?: number
  faction?: number
  allowableClasses?: number[]
  pvpRank?: number
  targetMask?: number
  boss?: string

  // base stats
  strength?: number
  agility?: number
  stamina?: number
  intellect?: number
  spirit?: number
  health?: number
  hp5?: number
  mana?: number
  mp5?: number

  // defensive stats
  armor?: number
  defense?: number
  dodge?: number
  parry?: number
  blockChance?: number
  blockValue?: number

  // offensive stats
  hit?: number
  crit?: number
  spellHit?: number
  spellCrit?: number
  spellPenetration?: number
  attackPower?: number
  feralAttackPower?: number
  meleeAttackPower?: number
  rangedAttackPower?: number
  spellHealing?: number
  spellDamage?: number
  arcaneDamage?: number
  fireDamage?: number
  frostDamage?: number
  natureDamage?: number
  shadowDamage?: number
  holyDamage?: number

  // weapon statistics
  dps?: number
  speed?: number
  minDmg?: number
  maxDmg?: number

  // resistances
  spellResistance?: number
  arcaneResistance?: number
  fireResistance?: number
  frostResistance?: number
  natureResistance?: number
  shadowResistance?: number
}
