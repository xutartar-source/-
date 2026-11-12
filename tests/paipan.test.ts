import { describe, expect, it } from 'vitest'
import { paipan, pillarsText } from '../src/core/paipan'
import type { BirthInput } from '../src/core/types'

const base: BirthInput = {
  name: '', gender: 'male', calendar: 'solar',
  year: 2000, month: 1, day: 1, hour: 12, minute: 0,
  place: '东经120°', longitude: 120,
  useTrueSolar: false, lateZiNextDay: true,
}
const make = (patch: Partial<BirthInput>) => paipan({ ...base, ...patch })
const at = (year: number, month: number, day: number, hour: number, minute = 0, patch: Partial<BirthInput> = {}) =>
  make({ year, month, day, hour, minute, ...patch })

/** 独立校验:用儒略日数直接推日柱,不经过历法库 */
const GAN = '甲乙丙丁戊己庚辛壬癸'
const ZHI = '子丑寅卯辰巳午未申酉戌亥'
function dayPillarByJdn(y: number, m: number, d: number): string {
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  const jdn =
    d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045
  const i = (((jdn + 49) % 60) + 60) % 60
  return GAN[i % 10] + ZHI[i % 12]
}

describe('已知生日对照(不用真太阳时,与通行万年历和公开命例一致)', () => {
  // [说明, 年, 月, 日, 时, 四柱]
  const known: Array<[string, number, number, number, number, string]> = [
    ['毛泽东 1893-12-26 辰时', 1893, 12, 26, 8, '癸巳 甲子 丁酉 甲辰'],
    ['蒋介石 1887-10-31 午时', 1887, 10, 31, 12, '丁亥 庚戌 己巳 庚午'],
    ['邓小平 1904-08-22 子时', 1904, 8, 22, 0, '甲辰 壬申 戊子 壬子'],
    ['孙中山 1866-11-12 寅时', 1866, 11, 12, 4, '丙寅 己亥 辛卯 庚寅'],
    ['李小龙 1940-11-27 辰时', 1940, 11, 27, 8, '庚辰 丁亥 甲戌 戊辰'],
    ['1949-10-01 申时(甲子日)', 1949, 10, 1, 15, '己丑 癸酉 甲子 壬申'],
    ['2000-01-01 午时(戊午日)', 2000, 1, 1, 12, '己卯 丙子 戊午 戊午'],
    ['2024-02-10 午时(甲辰年春节)', 2024, 2, 10, 12, '甲辰 丙寅 甲辰 庚午'],
  ]
  for (const [label, y, m, d, h, expected] of known) {
    it(label, () => {
      const chart = at(y, m, d, h)
      expect(pillarsText(chart)).toBe(expected)
      expect(chart.pillars.day.gan + chart.pillars.day.zhi).toBe(dayPillarByJdn(y, m, d))
    })
  }

  it('日柱与儒略日推算在 1900–2100 年间逐月抽查一致', () => {
    for (let y = 1900; y <= 2100; y += 7) {
      for (let m = 1; m <= 12; m++) {
        const c = at(y, m, 15, 12)
        expect(c.pillars.day.gan + c.pillars.day.zhi, `${y}-${m}-15`).toBe(dayPillarByJdn(y, m, 15))
      }
    }
  })
})

describe('节气交接', () => {
  // 2024 年立春:2 月 4 日 16:27 前后(北京时间)
  it('立春前属上一年', () => {
    expect(pillarsText(at(2024, 2, 4, 16, 20))).toBe('癸卯 乙丑 戊戌 庚申')
  })
  it('立春后换年柱和月柱', () => {
    expect(pillarsText(at(2024, 2, 4, 16, 35))).toBe('甲辰 丙寅 戊戌 庚申')
  })
  it('临近交节时给出提示', () => {
    const c = at(2024, 2, 4, 16, 20)
    expect(c.nextJie.name).toBe('立春')
    expect(c.nextJie.time.startsWith('2024-02-04 16:2')).toBe(true)
    expect(c.warnings.some((w) => w.includes('立春'))).toBe(true)
  })
  // 2024 年惊蛰:3 月 5 日 10:23 前后
  it('惊蛰前后月柱不同', () => {
    expect(at(2024, 3, 5, 10, 10).pillars.month.gan + at(2024, 3, 5, 10, 10).pillars.month.zhi).toBe('丙寅')
    expect(at(2024, 3, 5, 10, 35).pillars.month.gan + at(2024, 3, 5, 10, 35).pillars.month.zhi).toBe('丁卯')
  })
  it('交节当天、交节时刻之前仍属上月(1898-03-05,惊蛰在当晚 20:49)', () => {
    // 流传的周恩来命盘常写作乙卯月,那是按"惊蛰当天整天算卯月"的粗略排法;
    // 按交节时刻精确计算,卯时出生仍在寅月。
    expect(pillarsText(at(1898, 3, 5, 6))).toBe('戊戌 甲寅 丁卯 癸卯')
    expect(pillarsText(at(1898, 3, 5, 21))).toBe('戊戌 乙卯 丁卯 辛亥')
  })
  it('年柱、月柱按北京时间判交节,不受真太阳时影响', () => {
    // 乌鲁木齐真太阳时比北京时间晚两小时多,但立春后出生仍属甲辰年
    const c = at(2024, 2, 4, 16, 35, { useTrueSolar: true, longitude: 87.6 })
    expect(c.pillars.year.gan + c.pillars.year.zhi).toBe('甲辰')
    expect(c.pillars.month.gan + c.pillars.month.zhi).toBe('丙寅')
    expect(c.pillars.hour.zhi).toBe('未')
  })
})

describe('子时', () => {
  it('晚子时日柱算次日', () => {
    expect(pillarsText(at(2000, 1, 1, 23, 30))).toBe('己卯 丙子 己未 甲子')
  })
  it('晚子时日柱算当天,时柱不变', () => {
    expect(pillarsText(at(2000, 1, 1, 23, 30, { lateZiNextDay: false }))).toBe('己卯 丙子 戊午 甲子')
  })
  it('早子时属当天', () => {
    expect(pillarsText(at(2000, 1, 1, 0, 30))).toBe('己卯 丙子 戊午 壬子')
  })
})

describe('夏令时', () => {
  it('1988 年 7 月 13:30 实为 12:30,午时而非未时', () => {
    const c = at(1988, 7, 1, 13, 30)
    expect(c.dst).toBe(true)
    expect(c.standardTime).toBe('1988-07-01 12:30')
    expect(c.pillars.hour.zhi).toBe('午')
  })
  it('1988 年冬天不修正', () => {
    const c = at(1988, 12, 1, 13, 30)
    expect(c.dst).toBe(false)
    expect(c.pillars.hour.zhi).toBe('未')
  })
})

describe('真太阳时', () => {
  it('乌鲁木齐正午实为巳时', () => {
    const c = at(2000, 1, 1, 12, 0, { useTrueSolar: true, longitude: 87.6 })
    expect(c.trueSolarTime.startsWith('2000-01-01 09:4')).toBe(true)
    expect(pillarsText(c)).toBe('己卯 丙子 戊午 丁巳')
  })
  it('换算后跨日,日柱按真太阳时日期', () => {
    const c = at(2000, 1, 2, 1, 0, { useTrueSolar: true, longitude: 87.6 })
    expect(c.trueSolarTime.startsWith('2000-01-01 22:4')).toBe(true)
    expect(c.pillars.day.gan + c.pillars.day.zhi).toBe('戊午')
    expect(c.pillars.hour.gan + c.pillars.hour.zhi).toBe('癸亥')
  })
})

describe('农历输入', () => {
  it('农历一八九三年冬月十九即公历 1893-12-26', () => {
    const c = make({ calendar: 'lunar', year: 1893, month: 11, day: 19, hour: 8 })
    expect(c.civilTime).toBe('1893-12-26 08:00')
    expect(pillarsText(c)).toBe('癸巳 甲子 丁酉 甲辰')
  })
  it('闰月:2023 年闰二月初一即公历 2023-03-22', () => {
    const c = make({ calendar: 'lunar', year: 2023, month: -2, day: 1, hour: 12 })
    expect(c.civilTime).toBe('2023-03-22 12:00')
  })
  it('不存在的日期报错', () => {
    expect(() => make({ year: 2023, month: 2, day: 30 })).toThrow()
  })
})

describe('十神与藏干', () => {
  it('毛泽东命盘:丁火日主', () => {
    const c = at(1893, 12, 26, 8)
    expect(c.dayMaster).toBe('丁')
    expect(c.pillars.year.ganShiShen).toBe('七杀') // 癸
    expect(c.pillars.month.ganShiShen).toBe('正印') // 甲
    expect(c.pillars.day.ganShiShen).toBe('日主')
    expect(c.pillars.hour.ganShiShen).toBe('正印')
    expect(c.pillars.year.hidden.map((h) => h.gan + h.shiShen)).toEqual(['丙劫财', '庚正财', '戊伤官'])
    expect(c.pillars.month.hidden.map((h) => h.gan + h.shiShen)).toEqual(['癸七杀'])
    expect(c.pillars.day.hidden.map((h) => h.gan + h.shiShen)).toEqual(['辛偏财'])
    expect(c.pillars.hour.hidden.map((h) => h.gan + h.shiShen)).toEqual(['戊伤官', '乙偏印', '癸七杀'])
  })
})

describe('大运', () => {
  it('阴年男命逆排(毛泽东)', () => {
    const c = at(1893, 12, 26, 8)
    expect(c.yun.forward).toBe(false)
    expect(c.yun.list.slice(0, 8).map((d) => d.ganZhi)).toEqual(
      ['癸亥', '壬戌', '辛酉', '庚申', '己未', '戊午', '丁巳', '丙辰'])
    // 逆排数到上一个节(大雪 12 月 7 日),约 19 天,折合 6 年多起运
    expect(c.prevJie.name).toBe('大雪')
    expect(c.yun.startYears).toBe(6)
    expect(c.yun.list[0].startYear).toBe(1900)
    expect(c.yun.list[1].startYear - c.yun.list[0].startYear).toBe(10)
  })
  it('阳年男命顺排(邓小平)', () => {
    const c = at(1904, 8, 22, 0)
    expect(c.yun.forward).toBe(true)
    expect(c.yun.list.slice(0, 4).map((d) => d.ganZhi)).toEqual(['癸酉', '甲戌', '乙亥', '丙子'])
  })
  it('同一生日女命顺逆相反', () => {
    expect(at(1893, 12, 26, 8, 0, { gender: 'female' }).yun.forward).toBe(true)
    expect(at(1904, 8, 22, 0, 0, { gender: 'female' }).yun.forward).toBe(false)
    expect(at(1904, 8, 22, 0, 0, { gender: 'female' }).yun.list[0].ganZhi).toBe('辛未')
  })
})
