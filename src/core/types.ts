export type Gender = 'male' | 'female'
export type CalendarKind = 'solar' | 'lunar'

/** 用户输入。保存到本机的就是这份数据,命盘每次打开时重新计算。 */
export interface BirthInput {
  name: string
  gender: Gender
  calendar: CalendarKind
  year: number
  /** 农历模式下,负数表示闰月(如 -2 为闰二月) */
  month: number
  day: number
  hour: number
  minute: number
  /** 出生地名称,仅用于显示 */
  place: string
  /** 出生地东经度数 */
  longitude: number
  /** 是否按真太阳时排日柱、时柱 */
  useTrueSolar: boolean
  /** 晚子时(23 点后)日柱是否算次日 */
  lateZiNextDay: boolean
}

/** 不带时区的"钟面时间" */
export interface WallTime {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export interface HiddenStem {
  gan: string
  wuXing: string
  shiShen: string
}

export interface Pillar {
  gan: string
  zhi: string
  ganWuXing: string
  zhiWuXing: string
  /** 天干十神;日柱为"日主" */
  ganShiShen: string
  hidden: HiddenStem[]
  naYin: string
}

export interface DaYunItem {
  ganZhi: string
  gan: string
  zhi: string
  ganWuXing: string
  zhiWuXing: string
  ganShiShen: string
  /** 地支本气十神 */
  zhiShiShen: string
  startYear: number
  endYear: number
  /** 虚岁 */
  startAge: number
  endAge: number
}

export interface JieInfo {
  name: string
  time: string
}

export interface Chart {
  input: BirthInput
  /** 用户输入对应的公历钟面时间 */
  civilTime: string
  lunarText: string
  /** 是否处于 1986–1991 年夏令时 */
  dst: boolean
  /** 扣除夏令时后的北京时间,年柱、月柱、大运以此为准 */
  standardTime: string
  /** 日柱、时柱所用时间 */
  trueSolarTime: string
  lonMinutes: number
  eotMinutes: number
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar }
  dayMaster: string
  yun: {
    forward: boolean
    startYears: number
    startMonths: number
    startDays: number
    startSolar: string
    list: DaYunItem[]
  }
  prevJie: JieInfo
  nextJie: JieInfo
  warnings: string[]
}
