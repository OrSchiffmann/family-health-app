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

  const fill =
    state === 'done'
      ? 'linear-gradient(90deg, #0AB5B5, #06B6D4)'
      : state === 'partial'
      ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
      : 'transparent'

  const textColor =
    state === 'done' ? '#0D9488' : state === 'partial' ? '#D97706' : '#9CA3AF'

  const label =
    taskType === 'duration'
      ? `${achieved}/${target} דק׳ ${perLabel[per]}`
      : `${achieved}/${target} ${perLabel[per]}`

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct * 100}%`, background: fill }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: textColor }}>
        {label}
      </span>
    </div>
  )
}
