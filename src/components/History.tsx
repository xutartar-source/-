import { useMemo, useRef, useState } from 'react'
import { LunarUtil } from 'lunar-javascript'
import { paipan, pillarsText } from '../core/paipan'
import { exportCharts, importCharts, type SavedChart } from '../store/charts'

interface Props {
  charts: SavedChart[]
  onOpen: (c: SavedChart) => void
  onDelete: (id: string) => void
  onImported: (list: SavedChart[]) => void
}

function dateText(c: SavedChart): string {
  const i = c.input
  const time = `${String(i.hour).padStart(2, '0')}:${String(i.minute).padStart(2, '0')}`
  if (i.calendar === 'solar') return `公历 ${i.year}-${i.month}-${i.day} ${time}`
  return `农历 ${i.year}年${i.month < 0 ? '闰' : ''}${LunarUtil.MONTH[Math.abs(i.month)]}月${LunarUtil.DAY[i.day]} ${time}`
}

export default function History({ charts, onOpen, onDelete, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const rows = useMemo(
    () =>
      charts.map((c) => {
        let pillars = ''
        try {
          pillars = pillarsText(paipan(c.input))
        } catch {
          pillars = '数据有误'
        }
        return { c, pillars }
      }),
    [charts],
  )

  const doExport = () => {
    const blob = new Blob([exportCharts()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `八字命盘备份-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const doImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const list = importCharts(await file.text())
      onImported(list)
      setMessage(`导入完成,现有 ${list.length} 个命盘`)
    } catch {
      setMessage('导入失败:文件不是本应用导出的备份')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <section className="card" aria-label="已保存的命盘">
      <h2>已保存的命盘</h2>
      {rows.length === 0 ? (
        <p className="hint">还没有保存的命盘。排盘后点"保存"会出现在这里,数据只存在本机。</p>
      ) : (
        <ul className="history">
          {rows.map(({ c, pillars }) => (
            <li key={c.id}>
              <button className="item" onClick={() => onOpen(c)}>
                <strong>{c.input.name || '未命名'} · {c.input.gender === 'male' ? '男' : '女'}</strong>
                <span className="gzline">{pillars}</span>
                <small>{dateText(c)} · {c.input.place}</small>
              </button>
              <button className="del" aria-label={`删除 ${c.input.name || '未命名'}`}
                onClick={() => { if (confirm('删除这个命盘?')) onDelete(c.id) }}>
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="backup">
        <button className="secondary" onClick={doExport} disabled={charts.length === 0}>导出备份</button>
        <button className="secondary" onClick={() => fileRef.current?.click()}>导入备份</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden
          onChange={(e) => doImport(e.target.files?.[0])} />
      </div>
      {message && <p className="hint" role="status">{message}</p>}
    </section>
  )
}
