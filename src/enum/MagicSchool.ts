/*

WCL and Wowhead are consistant:

0 = invalid
1 = physical
2 = holy
4 = fire
8 = nature
16 = frost
32 = shadow
64 = arcane

We just do a bitshift on the values here

*/

enum MagicSchool {
  Physical,
  Holy,
  Fire,
  Nature,
  Frost,
  Shadow,
  Arcane
}

export default MagicSchool
