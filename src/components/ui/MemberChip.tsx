import { clsx } from 'clsx'
import type { Member } from '@/types'

interface Props {
  member: Member | { id: string; name: string; avatarColor: string }
  selected?: boolean
  onClick?: () => void
  size?: 'sm' | 'md'
}

export default function MemberChip({ member, selected, onClick, size = 'md' }: Props) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-1.5 rounded-full border font-medium transition-all shrink-0',
        size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs',
        selected
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-gray-200 bg-white text-gray-700'
      )}
    >
      <span
        className={clsx('rounded-full shrink-0', size === 'md' ? 'h-5 w-5' : 'h-4 w-4')}
        style={{ backgroundColor: member.avatarColor }}
      />
      {member.name}
    </button>
  )
}
