import { clsx } from 'clsx'

interface Props {
  achieved: number
  target: number
  taskType: 'done_not_done' | 'duration'
  per: 'day' | 'week' | 'month'
}

const perLabel = { day: 'היום', week: 'השבוע', month: 'החודש' }

export default function ProgressBar({ achieved, target, taskType, per }: Props) {
  const pct = target > 0 ? Math.min(achieved / target, 1) : 0
  const state: 'none' | 'partial' | 'done' =
    pct === 0 ? 'none' : pct >= 1 ? 'done' : 'partial'

  const barColor = state === 'done' ? 'bg-green-500' : state === 'partial' ? 'bg-amber-400' : 'bg-gray-200'
  const textColor = state === 'done' ? 'text-green-600' : state === 'partial' ? 'text-amber-600' : 'text-gray-400'

  const label =
    taskType === 'duration'
      ? `${achieved}/${target} דק׳ ${perLabel[per]}`
      : `${achieved}/${target} ${perLabel[per]}`

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', barColor)}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className={clsx('text-xs font-medium tabular-nums shrink-0', textColor)}>
        {label}
      </span>
    </div>
  )
}
