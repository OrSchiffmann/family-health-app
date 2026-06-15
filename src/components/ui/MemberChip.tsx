import type { Member } from '@/types'

interface Props {
  member: Member | { id: string; name: string; avatarColor: string; avatarUrl?: string | null }
  selected?: boolean
  onClick?: () => void
  size?: 'sm' | 'md'
}

export default function MemberChip({ member, selected, onClick, size = 'md' }: Props) {
  const avatarUrl = 'avatarUrl' in member ? member.avatarUrl : null
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full font-medium transition-all shrink-0"
      style={{
        padding: size === 'md' ? '6px 14px 6px 8px' : '4px 10px 4px 6px',
        fontSize: size === 'md' ? 14 : 12,
        background: selected ? 'linear-gradient(135deg, #0AB5B5, #06B6D4)' : 'white',
        color: selected ? 'white' : '#374151',
        boxShadow: selected ? '0 2px 8px rgba(10,181,181,0.4)' : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <span
        className="rounded-full shrink-0 overflow-hidden flex items-center justify-center text-white font-bold"
        style={{
          width: size === 'md' ? 22 : 18,
          height: size === 'md' ? 22 : 18,
          fontSize: size === 'md' ? 11 : 9,
          ...(avatarUrl ? {} : { backgroundColor: member.avatarColor }),
        }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt={member.name} className="h-full w-full object-cover" />
          : member.name[0]}
      </span>
      {member.name}
    </button>
  )
}
