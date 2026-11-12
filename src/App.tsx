import { useState } from 'react'
import type { BirthInput, Chart } from './core/types'
import { paipan } from './core/paipan'
import { deleteChart, loadCharts, saveChart, type SavedChart } from './store/charts'
import BirthForm from './components/BirthForm'
import ChartView from './components/ChartView'
import History from './components/History'

interface Opened {
  chart: Chart
  /** 已保存的命盘才有 id */
  savedId?: string
}

export default function App() {
  const [charts, setCharts] = useState<SavedChart[]>(loadCharts)
  const [opened, setOpened] = useState<Opened | null>(null)

  const open = (input: BirthInput, savedId?: string) => {
    setOpened({ chart: paipan(input), savedId })
    window.scrollTo(0, 0)
  }

  if (opened) {
    return (
      <ChartView
        chart={opened.chart}
        saved={Boolean(opened.savedId)}
        onBack={() => setOpened(null)}
        onSave={() => {
          const list = saveChart(opened.chart.input)
          setCharts(list)
          setOpened({ ...opened, savedId: list[0].id })
        }}
      />
    )
  }

  return (
    <main className="page">
      <header className="top">
        <h1>八字排盘</h1>
      </header>
      <BirthForm onSubmit={(input) => open(input)} />
      <History
        charts={charts}
        onOpen={(c) => open(c.input, c.id)}
        onDelete={(id) => setCharts(deleteChart(id))}
        onImported={setCharts}
      />
    </main>
  )
}
