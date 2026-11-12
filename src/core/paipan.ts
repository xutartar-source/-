import { Solar, Lunar, LunarUtil, SolarUtil } from 'lunar-javascript'
import type { BirthInput, Chart, DaYunItem, Pillar, WallTime } from './types'
import { addSeconds, formatWall, isChinaDst, toMs, toTrueSolarTime } from './solarTime'

const toSolar = (w: WallTime) =>
  Solar.fromYmdHms(w.year, w.month, w.day, w.hour, w.minute, w.second)

const solarToWall = (s: any): WallTime => ({
  year: s.getYear(),
  month: s.getMonth(),
  day: s.getDay(),
  hour: s.getHour(),
  minute: s.getMinute(),
  second: s.getSecond(),
})

/** 十神:以日干为主,查库内置的十神表 */
const shiShen = (dayGan: string, gan: string): string => LunarUtil.SHI_SHEN[dayGan + gan]

function makePillar(ganZhi: string, dayGan: string, isDay: boolean): Pillar {
  const gan = ganZhi[0]
  const zhi = ganZhi[1]
  const hidden: string[] = LunarUtil.ZHI_HIDE_GAN[zhi]
  return {
    gan,
    zhi,
    ganWuXing: LunarUtil.WU_XING_GAN[gan],
    zhiWuXing: LunarUtil.WU_XING_ZHI[zhi],
    ganShiShen: isDay ? '日主' : shiShen(dayGan, gan),
    hidden: hidden.map((g) => ({
      gan: g,
      wuXing: LunarUtil.WU_XING_GAN[g],
      shiShen: shiShen(dayGan, g),
    })),
    naYin: LunarUtil.NAYIN[ganZhi],
  }
}

/** 把输入(公历或农历)转成公历钟面时间;日期不存在时抛错 */
export function inputToCivil(input: BirthInput): WallTime {
  const { year, month, day, hour, minute } = input
  if (input.calendar === 'lunar') {
    const lunar = Lunar.fromYmdHms(year, month, day, hour, minute, 0)
    return solarToWall(lunar.getSolar())
  }
  if (month < 1 || month > 12 || day < 1 || day > SolarUtil.getDaysOfMonth(year, month)) {
    throw new Error('日期不存在')
  }
  return solarToWall(Solar.fromYmdHms(year, month, day, hour, minute, 0))
}

/**
 * 排盘。
 * - 年柱、月柱、大运:按北京时间(扣除夏令时)与节气时刻比较,由 lunar-javascript 计算。
 * - 日柱、时柱:按真太阳时(未开启时与北京时间相同),由 lunar-javascript 计算。
 */
export function paipan(input: BirthInput): Chart {
  const civil = inputToCivil(input)
  const dst = isChinaDst(civil)
  const standard = dst ? addSeconds(civil, -3600) : civil

  const tst = input.useTrueSolar
    ? toTrueSolarTime(standard, input.longitude)
    : { time: standard, lonMinutes: 0, eotMinutes: 0 }

  const lunarStd = toSolar(standard).getLunar()
  const ecStd = lunarStd.getEightChar()
  const ecTst = toSolar(tst.time).getLunar().getEightChar()
  // 库的流派:1 = 晚子时日柱算次日,2 = 算当天
  ecTst.setSect(input.lateZiNextDay ? 1 : 2)

  const dayGanZhi: string = ecTst.getDay()
  const dayGan = dayGanZhi[0]

  const pillars = {
    year: makePillar(ecStd.getYear(), dayGan, false),
    month: makePillar(ecStd.getMonth(), dayGan, false),
    day: makePillar(dayGanZhi, dayGan, true),
    hour: makePillar(ecTst.getTime(), dayGan, false),
  }

  // 大运:起运按分钟精确折算(流派 2)
  const yun = ecStd.getYun(input.gender === 'male' ? 1 : 0, 2)
  const list: DaYunItem[] = yun
    .getDaYun(11)
    .slice(1) // 第 0 项是起运前的童限
    .map((d: any): DaYunItem => {
      const gz: string = d.getGanZhi()
      const benQi: string = LunarUtil.ZHI_HIDE_GAN[gz[1]][0]
      return {
        ganZhi: gz,
        gan: gz[0],
        zhi: gz[1],
        ganWuXing: LunarUtil.WU_XING_GAN[gz[0]],
        zhiWuXing: LunarUtil.WU_XING_ZHI[gz[1]],
        ganShiShen: shiShen(dayGan, gz[0]),
        zhiShiShen: shiShen(dayGan, benQi),
        startYear: d.getStartYear(),
        endYear: d.getEndYear(),
        startAge: d.getStartAge(),
        endAge: d.getEndAge(),
      }
    })

  const prev = lunarStd.getPrevJie()
  const next = lunarStd.getNextJie()
  const prevWall = solarToWall(prev.getSolar())
  const nextWall = solarToWall(next.getSolar())

  const warnings: string[] = []
  if (dst) warnings.push('出生时处于夏令时,已减去 1 小时。')
  const stdMs = toMs(standard)
  for (const [name, wall] of [
    [prev.getName(), prevWall],
    [next.getName(), nextWall],
  ] as const) {
    const diffMin = Math.abs(stdMs - toMs(wall)) / 60000
    if (diffMin < 120) {
      warnings.push(
        `出生时间距「${name}」交节(${formatWall(wall, true)})仅 ${Math.round(diffMin)} 分钟,出生时间若有误差,年柱或月柱可能不同。`,
      )
    }
  }
  const t = tst.time
  const minutesOfDay = t.hour * 60 + t.minute + t.second / 60
  // 时辰在奇数整点交界
  const toBoundary = Math.abs(((minutesOfDay + 60) % 120) - 60)
  const distance = Math.min(toBoundary, 120 - toBoundary)
  if (distance < 10) {
    warnings.push(`距时辰交界仅 ${Math.round(distance)} 分钟,出生时间若有误差,时柱可能不同。`)
  }
  if (t.day !== standard.day) {
    warnings.push('按真太阳时换算后跨了日,日柱以真太阳时的日期为准。')
  }

  return {
    input,
    civilTime: formatWall(civil),
    lunarText: `${lunarStd.getYearInChinese()}年${lunarStd.getMonthInChinese()}月${lunarStd.getDayInChinese()}`,
    dst,
    standardTime: formatWall(standard),
    trueSolarTime: formatWall(tst.time, true),
    lonMinutes: tst.lonMinutes,
    eotMinutes: tst.eotMinutes,
    pillars,
    dayMaster: dayGan,
    yun: {
      forward: yun.isForward(),
      startYears: yun.getStartYear(),
      startMonths: yun.getStartMonth(),
      startDays: yun.getStartDay(),
      startSolar: yun.getStartSolar().toYmd(),
      list,
    },
    prevJie: { name: prev.getName(), time: formatWall(prevWall, true) },
    nextJie: { name: next.getName(), time: formatWall(nextWall, true) },
    warnings,
  }
}

/** 四柱的简写,如 "癸巳 甲子 丁酉 甲辰" */
export function pillarsText(chart: Chart): string {
  const p = chart.pillars
  return [p.year, p.month, p.day, p.hour].map((x) => x.gan + x.zhi).join(' ')
}

/** 纯文本命盘,第二阶段发给大模型用 */
export function chartToText(c: Chart): string {
  const p = c.pillars
  const cols = [p.year, p.month, p.day, p.hour]
  const lines = [
    `性别:${c.input.gender === 'male' ? '男' : '女'}`,
    `公历:${c.civilTime}${c.dst ? '(夏令时)' : ''}  农历:${c.lunarText}`,
    `出生地:${c.input.place}(东经 ${c.input.longitude}°)`,
    c.input.useTrueSolar ? `真太阳时:${c.trueSolarTime}` : '未使用真太阳时',
    '',
    `      年柱  月柱  日柱  时柱`,
    `十神  ${cols.map((x) => x.ganShiShen).join('  ')}`,
    `天干  ${cols.map((x) => x.gan).join('    ')}`,
    `地支  ${cols.map((x) => x.zhi).join('    ')}`,
    `藏干  ${cols.map((x) => x.hidden.map((h) => `${h.gan}${h.shiShen}`).join('/')).join('  ')}`,
    `纳音  ${cols.map((x) => x.naYin).join('  ')}`,
    '',
    `大运(${c.yun.forward ? '顺' : '逆'}排,出生后 ${c.yun.startYears} 年 ${c.yun.startMonths} 个月 ${c.yun.startDays} 天起运,${c.yun.startSolar} 交运):`,
    ...c.yun.list.map(
      (d) => `${d.startYear}–${d.endYear}  ${d.startAge}–${d.endAge}岁  ${d.ganZhi}  ${d.ganShiShen}/${d.zhiShiShen}`,
    ),
  ]
  return lines.join('\n')
}
