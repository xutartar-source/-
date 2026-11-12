import { useState } from 'react'
import type { Chart, Pillar } from '../core/types'
import { chartToText } from '../core/paipan'
import DayunView from './DayunView'

const WX_CLASS: Record<string, string> = { 木: 'wx-mu', 火: 'wx-huo', 土: 'wx-tu', 金: 'wx-jin', 水: 'wx-shui' }
export const wx = (w: string) => WX_CLASS[w] ?? ''

const signed = (minutes: number) => {
  const sign = minutes < 0 ? '−' : '+'
  const abs = Math.abs(minutes)
  const m = Math.floor(abs)
  const s = Math.round((abs - m) * 60)
  return `${sign}${m} 分 ${s} 秒`
}

interface Props {
  chart: Chart
  saved: boolean
  onBack: () => void
  onSave: () => void
}

export default function ChartView({ chart, saved, onBack, onSave }: Props) {
  const [copied, setCopied] = useState(false)
  const { input, pillars } = chart
  const cols: Array<[string, Pillar]> = [
    ['年柱', pillars.year],
    ['月柱', pillars.month],
    ['日柱', pillars.day],
    ['时柱', pillars.hour],
  ]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(chartToText(chart))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="page">
      <header className="top">
        <button className="back" onClick={onBack} aria-label="返回">‹ 返回</button>
        <h1>{input.name || '命盘'} · {input.gender === 'male' ? '男' : '女'}</h1>
      </header>

      <section className="card" aria-label="四柱">
        <table className="pillars">
          <thead>
            <tr>{cols.map(([label]) => <th key={label}>{label}</th>)}</tr>
          </thead>
          <tbody>
            <tr className="ss">{cols.map(([l, p]) => <td key={l}>{p.ganShiShen}</td>)}</tr>
            <tr className="gz">{cols.map(([l, p]) => <td key={l} className={wx(p.ganWuXing)} data-pillar={l}>{p.gan}</td>)}</tr>
            <tr className="gz">{cols.map(([l, p]) => <td key={l} className={wx(p.zhiWuXing)} data-pillar={l}>{p.zhi}</td>)}</tr>
            <tr className="hidden">
              {cols.map(([l, p]) => (
                <td key={l}>
                  {p.hidden.map((h) => (
                    <div key={h.gan}><b className={wx(h.wuXing)}>{h.gan}</b> {h.shiShen}</div>
                  ))}
                </td>
              ))}
            </tr>
            <tr className="nayin">{cols.map(([l, p]) => <td key={l}>{p.naYin}</td>)}</tr>
          </tbody>
        </table>
      </section>

      {chart.warnings.length > 0 && (
        <section className="card warn" aria-label="提示">
          {chart.warnings.map((w) => <p key={w}>{w}</p>)}
        </section>
      )}

      <DayunView chart={chart} />

      <section className="card" aria-label="出生信息">
        <h2>出生信息</h2>
        <dl className="info">
          <dt>公历</dt><dd>{chart.civilTime}{chart.dst && '(夏令时)'}</dd>
          <dt>农历</dt><dd>{chart.lunarText}</dd>
          {chart.dst && (<><dt>北京时间</dt><dd>{chart.standardTime}</dd></>)}
          <dt>出生地</dt><dd>{input.place} · 东经 {input.longitude}°</dd>
          {input.useTrueSolar ? (
            <>
              <dt>真太阳时</dt><dd>{chart.trueSolarTime}</dd>
              <dt>修正</dt><dd>经度 {signed(chart.lonMinutes)},均时差 {signed(chart.eotMinutes)}</dd>
            </>
          ) : (
            <><dt>真太阳时</dt><dd>未使用</dd></>
          )}
          <dt>上一个节</dt><dd>{chart.prevJie.name} {chart.prevJie.time}</dd>
          <dt>下一个节</dt><dd>{chart.nextJie.name} {chart.nextJie.time}</dd>
          <dt>晚子时</dt><dd>{input.lateZiNextDay ? '日柱算次日' : '日柱算当天'}</dd>
        </dl>
      </section>

      <div className="actions">
        <button className="secondary" onClick={copy}>{copied ? '已复制' : '复制命盘文本'}</button>
        <button className="primary" onClick={onSave} disabled={saved}>{saved ? '已保存' : '保存'}</button>
      </div>
    </main>
  )
}
