import type { Chart } from '../core/types'
import { wx } from './ChartView'

export default function DayunView({ chart }: { chart: Chart }) {
  const { yun } = chart
  const thisYear = new Date().getFullYear()
  return (
    <section className="card" aria-label="大运">
      <h2>大运 <small>{yun.forward ? '顺排' : '逆排'}</small></h2>
      <p className="hint">
        出生后 {yun.startYears} 年 {yun.startMonths} 个月 {yun.startDays} 天起运,{yun.startSolar} 交运
      </p>
      <div className="dayun" tabIndex={0}>
        {yun.list.map((d) => {
          const current = thisYear >= d.startYear && thisYear <= d.endYear
          return (
            <div key={d.startYear} className={current ? 'yun current' : 'yun'}>
              <div className="age">{d.startAge} 岁</div>
              <div className="year">{d.startYear}</div>
              <div className="ss">{d.ganShiShen}</div>
              <div className={`gz ${wx(d.ganWuXing)}`}>{d.gan}</div>
              <div className={`gz ${wx(d.zhiWuXing)}`}>{d.zhi}</div>
              <div className="ss">{d.zhiShiShen}</div>
            </div>
          )
        })}
      </div>
      <p className="hint">岁数为虚岁;左右滑动查看全部。</p>
    </section>
  )
}
