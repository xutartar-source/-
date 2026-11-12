import type { BirthInput } from '../core/types'

/** 只保存输入,命盘打开时重新计算 */
export interface SavedChart {
  id: string
  createdAt: number
  input: BirthInput
}

const KEY = 'bazi.charts.v1'
const DEFAULTS_KEY = 'bazi.formDefaults.v1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 无痕模式或存储已满时静默失败,不影响排盘
  }
}

export function loadCharts(): SavedChart[] {
  const list = read<SavedChart[]>(KEY, [])
  return Array.isArray(list) ? list : []
}

export function saveChart(input: BirthInput): SavedChart[] {
  const item: SavedChart = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    input,
  }
  const list = [item, ...loadCharts()]
  write(KEY, list)
  return list
}

export function deleteChart(id: string): SavedChart[] {
  const list = loadCharts().filter((c) => c.id !== id)
  write(KEY, list)
  return list
}

/** 导入备份:按 id 去重后合并 */
export function importCharts(json: string): SavedChart[] {
  const incoming = JSON.parse(json)
  if (!Array.isArray(incoming)) throw new Error('文件格式不对')
  const valid = incoming.filter(
    (c): c is SavedChart => c && typeof c.id === 'string' && c.input && typeof c.input.year === 'number',
  )
  const existing = loadCharts()
  const ids = new Set(existing.map((c) => c.id))
  const list = [...existing, ...valid.filter((c) => !ids.has(c.id))].sort((a, b) => b.createdAt - a.createdAt)
  write(KEY, list)
  return list
}

export function exportCharts(): string {
  return JSON.stringify(loadCharts(), null, 2)
}

/** 记住上次用的出生地和开关 */
export interface FormDefaults {
  province: string
  city: string
  longitude: number
  useTrueSolar: boolean
  lateZiNextDay: boolean
}

export function loadFormDefaults(): FormDefaults {
  return {
    province: '北京',
    city: '北京',
    longitude: 116.4,
    useTrueSolar: true,
    lateZiNextDay: true,
    ...read<Partial<FormDefaults>>(DEFAULTS_KEY, {}),
  }
}

export function saveFormDefaults(d: FormDefaults): void {
  write(DEFAULTS_KEY, d)
}
