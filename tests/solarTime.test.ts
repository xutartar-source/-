import { describe, expect, it } from 'vitest'
import { equationOfTime, fromMs, isChinaDst, toTrueSolarTime } from '../src/core/solarTime'
import { PROVINCES } from '../src/core/cities'

const wall = (year: number, month: number, day: number, hour = 12, minute = 0) => ({
  year, month, day, hour, minute, second: 0,
})

describe('夏令时', () => {
  it('1986–1991 年每小时与 IANA 时区库(Asia/Shanghai)一致', () => {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
    let dstHours = 0
    for (let t = Date.UTC(1985, 0, 1); t < Date.UTC(1993, 0, 1); t += 3600000) {
      const parts = Object.fromEntries(fmt.formatToParts(t).map((p) => [p.type, Number(p.value)]))
      const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
      const expected = (asUtc - t) / 3600000 === 9
      const w = fromMs(asUtc)
      // 结束日拨回后重复的那一小时(标准时 01:00–02:00)有歧义,跳过
      if (!expected && w.hour === 1 && isChinaDst(w)) continue
      if (expected) dstHours++
      expect(isChinaDst(w), JSON.stringify(w)).toBe(expected)
    }
    expect(dstHours).toBeGreaterThan(6 * 140 * 24)
  })

  it('其他年份没有夏令时', () => {
    expect(isChinaDst(wall(1985, 7, 1))).toBe(false)
    expect(isChinaDst(wall(1992, 7, 1))).toBe(false)
    expect(isChinaDst(wall(2024, 7, 1))).toBe(false)
  })
})

describe('均时差', () => {
  // 天文年历上的典型值(分钟),允许 ±0.7 分钟
  const cases: Array<[number, number, number]> = [
    [2, 11, -14.2],
    [4, 15, 0],
    [5, 14, 3.7],
    [6, 13, 0],
    [7, 26, -6.5],
    [9, 1, 0],
    [11, 3, 16.4],
    [12, 25, 0],
  ]
  for (const [m, d, expected] of cases) {
    it(`${m} 月 ${d} 日约 ${expected} 分钟`, () => {
      expect(Math.abs(equationOfTime(wall(2000, m, d)) - expected)).toBeLessThan(0.7)
    })
  }
})

describe('真太阳时', () => {
  it('东经 120° 只有均时差', () => {
    const r = toTrueSolarTime(wall(2000, 4, 15), 120)
    expect(r.lonMinutes).toBe(0)
    expect(r.time.hour * 60 + r.time.minute).toBeGreaterThanOrEqual(11 * 60 + 59)
  })

  it('乌鲁木齐比北京时间晚约 2 小时 10 分', () => {
    const r = toTrueSolarTime(wall(2000, 4, 15), 87.6)
    expect(r.lonMinutes).toBeCloseTo(-129.6, 5)
    expect(r.time.hour).toBe(9)
    expect(r.time.minute).toBeGreaterThanOrEqual(49)
    expect(r.time.minute).toBeLessThanOrEqual(51)
  })
})

describe('城市经度表', () => {
  it('能解析且经度在中国范围内', () => {
    const cities = PROVINCES.flatMap((p) => p.cities)
    expect(cities.length).toBeGreaterThan(330)
    for (const c of cities) {
      expect(c.longitude, c.name).toBeGreaterThan(73)
      expect(c.longitude, c.name).toBeLessThan(135)
    }
  })

  it('几个锚点城市', () => {
    const lon = (n: string) => PROVINCES.flatMap((p) => p.cities).find((c) => c.name === n)!.longitude
    expect(lon('北京')).toBeCloseTo(116.4, 1)
    expect(lon('上海')).toBeCloseTo(121.5, 1)
    expect(lon('成都')).toBeCloseTo(104.1, 1)
    expect(lon('乌鲁木齐')).toBeCloseTo(87.6, 1)
  })
})
