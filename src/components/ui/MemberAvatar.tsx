interface Props {
  name: string
  avatarColor: string
  avatarUrl?: string | null
  size?: number
  className?: string
}

export default function MemberAvatar({ name, avatarColor, avatarUrl, size = 8, className = '' }: Props) {
  const sizeClass = `h-${size} w-${size}`
  return (
    <span
      className={`${sizeClass} rounded-full shrink-0 flex items-center justify-center overflow-hidden font-bold text-white ${className}`}
      style={avatarUrl ? undefined : { backgroundColor: avatarColor }}
    >
      {avatarUrl
        ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        : name[0]}
    </span>
  )
}
