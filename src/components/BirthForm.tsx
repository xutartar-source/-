import { useMemo, useState } from 'react'
import { LunarUtil, LunarYear, SolarUtil } from 'lunar-javascript'
import type { BirthInput, CalendarKind, Gender } from '../core/types'
import { inputToCivil } from '../core/paipan'
import { PROVINCES } from '../core/cities'
import { loadFormDefaults, saveFormDefaults } from '../store/charts'

const YEARS = Array.from({ length: 2100 - 1900 + 1 }, (_, i) => 1900 + i)
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const ZHI = '子丑寅卯辰巳午未申酉戌亥'
const hourLabel = (h: number) => `${String(h).padStart(2, '0')} 时(${ZHI[Math.floor(((h + 1) % 24) / 2)]})`
const CUSTOM = '自定义'

interface MonthOption {
  value: number
  label: string
  days: number
}

function monthOptions(calendar: CalendarKind, year: number): MonthOption[] {
  if (calendar === 'solar') {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: `${i + 1} 月`,
      days: SolarUtil.getDaysOfMonth(year, i + 1),
    }))
  }
  return LunarYear.fromYear(year)
    .getMonths()
    .filter((m: any) => m.getYear() === year)
    .map((m: any) => ({
      value: m.getMonth(), // 闰月为负数
      label: `${m.isLeap() ? '闰' : ''}${LunarUtil.MONTH[Math.abs(m.getMonth())]}月`,
      days: m.getDayCount(),
    }))
}

export default function BirthForm({ onSubmit }: { onSubmit: (input: BirthInput) => void }) {
  const defaults = useMemo(loadFormDefaults, [])
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [calendar, setCalendar] = useState<CalendarKind>('solar')
  const [year, setYear] = useState(1990)
  const [month, setMonth] = useState(1)
  const [day, setDay] = useState(1)
  const [hour, setHour] = useState(12)
  const [minute, setMinute] = useState(0)
  const [province, setProvince] = useState(defaults.province)
  const [city, setCity] = useState(defaults.city)
  const [longitude, setLongitude] = useState(String(defaults.longitude))
  const [useTrueSolar, setUseTrueSolar] = useState(defaults.useTrueSolar)
  const [lateZiNextDay, setLateZiNextDay] = useState(defaults.lateZiNextDay)
  const [error, setError] = useState('')

  const months = useMemo(() => monthOptions(calendar, year), [calendar, year])
  // 切换年份或历法后,原来选的月、日可能不存在,取最接近的
  const monthOpt = months.find((m) => m.value === month) ?? months.find((m) => m.value === Math.abs(month)) ?? months[0]
  const safeDay = Math.min(day, monthOpt.days)
  const cities = PROVINCES.find((p) => p.name === province)?.cities ?? []

  const pickProvince = (p: string) => {
    setProvince(p)
    const first = PROVINCES.find((x) => x.name === p)?.cities[0]
    if (first) {
      setCity(first.name)
      setLongitude(String(first.longitude))
    }
  }

  const pickCity = (c: string) => {
    setCity(c)
    const found = cities.find((x) => x.name === c)
    if (found) setLongitude(String(found.longitude))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const lon = Number(longitude)
    if (useTrueSolar && !(longitude.trim() !== '' && lon >= -180 && lon <= 180)) {
      setError('请填写出生地经度(东经为正,如 116.4)')
      return
    }
    const input: BirthInput = {
      name: name.trim(),
      gender,
      calendar,
      year,
      month: monthOpt.value,
      day: safeDay,
      hour,
      minute,
      place: province === CUSTOM ? '自定义经度' : province === city ? city : `${province}${city}`,
      longitude: Number.isFinite(lon) ? lon : 120,
      useTrueSolar,
      lateZiNextDay,
    }
    try {
      inputToCivil(input)
    } catch {
      setError('这个日期不存在,请检查年月日')
      return
    }
    setError('')
    saveFormDefaults({ province, city, longitude: input.longitude, useTrueSolar, lateZiNextDay })
    onSubmit(input)
  }

  return (
    <form className="card form" onSubmit={submit}>
      <label className="field">
        <span>姓名或备注</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="可不填" maxLength={20} />
      </label>

      <div className="field">
        <span>性别</span>
        <div className="seg" role="radiogroup" aria-label="性别">
          {(['male', 'female'] as const).map((g) => (
            <button key={g} type="button" role="radio" aria-checked={gender === g}
              className={gender === g ? 'on' : ''} onClick={() => setGender(g)}>
              {g === 'male' ? '男' : '女'}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>历法</span>
        <div className="seg" role="radiogroup" aria-label="历法">
          {(['solar', 'lunar'] as const).map((c) => (
            <button key={c} type="button" role="radio" aria-checked={calendar === c}
              className={calendar === c ? 'on' : ''} onClick={() => setCalendar(c)}>
              {c === 'solar' ? '公历' : '农历'}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>出生日期</span>
        <div className="row3">
          <select aria-label="年" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEARS.map((y) => <option key={y} value={y}>{y} 年</option>)}
          </select>
          <select aria-label="月" value={monthOpt.value} onChange={(e) => setMonth(Number(e.target.value))}>
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select aria-label="日" value={safeDay} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: monthOpt.days }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{calendar === 'solar' ? `${d} 日` : LunarUtil.DAY[d]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <span>出生时间(当时的钟表时间)</span>
        <div className="row2">
          <select aria-label="时" value={hour} onChange={(e) => setHour(Number(e.target.value))}>
            {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
          </select>
          <select aria-label="分" value={minute} onChange={(e) => setMinute(Number(e.target.value))}>
            {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')} 分</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <span>出生地</span>
        <div className="row2">
          <select aria-label="省份" value={province} onChange={(e) => pickProvince(e.target.value)}>
            {PROVINCES.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            <option value={CUSTOM}>{CUSTOM}</option>
          </select>
          {province === CUSTOM ? (
            <span className="hint inline">在下方填经度</span>
          ) : (
            <select aria-label="城市" value={city} onChange={(e) => pickCity(e.target.value)}>
              {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          )}
        </div>
        <label className="lon">
          <span>东经</span>
          <input aria-label="经度" type="number" inputMode="decimal" step="0.01" value={longitude}
            onChange={(e) => setLongitude(e.target.value)} />
          <span>度</span>
        </label>
      </div>

      <label className="switch">
        <input type="checkbox" checked={useTrueSolar} onChange={(e) => setUseTrueSolar(e.target.checked)} />
        <span>
          按真太阳时排日柱、时柱
          <small>年柱、月柱始终按北京时间判断交节</small>
        </span>
      </label>
      <label className="switch">
        <input type="checkbox" checked={lateZiNextDay} onChange={(e) => setLateZiNextDay(e.target.checked)} />
        <span>
          23 点后日柱算次日
          <small>关闭则晚子时日柱仍算当天</small>
        </span>
      </label>

      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" type="submit">排盘</button>
    </form>
  )
}
