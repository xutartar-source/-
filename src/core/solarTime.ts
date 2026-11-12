import type { WallTime } from './types'

/** 钟面时间 → 毫秒数(把钟面时间当作 UTC,只用于加减运算) */
export function toMs(w: WallTime): number {
  const d = new Date(Date.UTC(2000, w.month - 1, w.day, w.hour, w.minute, w.second))
  d.setUTCFullYear(w.year)
  return d.getTime()
}

export function fromMs(ms: number): WallTime {
  const d = new Date(ms)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  }
}

export function addSeconds(w: WallTime, seconds: number): WallTime {
  return fromMs(toMs(w) + Math.round(seconds) * 1000)
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatWall(w: WallTime, withSeconds = false): string {
  const base = `${w.year}-${pad(w.month)}-${pad(w.day)} ${pad(w.hour)}:${pad(w.minute)}`
  return withSeconds ? `${base}:${pad(w.second)}` : base
}

/**
 * 中国大陆 1986–1991 年夏令时起止日期 [年, 起月, 起日, 止月, 止日]。
 * 起始日 02:00 拨快到 03:00,结束日 02:00(夏令时)拨回 01:00。
 */
const CHINA_DST: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [1986, 5, 4, 9, 14],
  [1987, 4, 12, 9, 13],
  [1988, 4, 17, 9, 11],
  [1989, 4, 16, 9, 17],
  [1990, 4, 15, 9, 16],
  [1991, 4, 14, 9, 15],
]

/** 给定的钟面时间是否处于中国夏令时。结束日 01:00–02:00 有歧义,按夏令时处理。 */
export function isChinaDst(w: WallTime): boolean {
  const row = CHINA_DST.find((r) => r[0] === w.year)
  if (!row) return false
  const t = toMs(w)
  const start = toMs({ year: w.year, month: row[1], day: row[2], hour: 2, minute: 0, second: 0 })
  const end = toMs({ year: w.year, month: row[3], day: row[4], hour: 2, minute: 0, second: 0 })
  return t >= start && t < end
}

/**
 * 均时差(真太阳时 − 平太阳时),单位分钟。Spencer (1971) 公式,误差约半分钟。
 */
export function equationOfTime(w: WallTime): number {
  const startOfYear = toMs({ year: w.year, month: 1, day: 1, hour: 0, minute: 0, second: 0 })
  const dayOfYear = (toMs(w) - startOfYear) / 86400000
  const g = (2 * Math.PI * dayOfYear) / 365
  return (
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g))
  )
}

export interface TrueSolarResult {
  time: WallTime
  /** 经度修正(分钟):每偏离东经 120° 一度为 4 分钟 */
  lonMinutes: number
  /** 均时差(分钟) */
  eotMinutes: number
}

/** 北京时间(已扣除夏令时)→ 当地真太阳时 */
export function toTrueSolarTime(standard: WallTime, longitude: number): TrueSolarResult {
  const lonMinutes = (longitude - 120) * 4
  const eotMinutes = equationOfTime(standard)
  return {
    time: addSeconds(standard, (lonMinutes + eotMinutes) * 60),
    lonMinutes,
    eotMinutes,
  }
}
