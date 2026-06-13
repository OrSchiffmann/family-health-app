import type { Category } from '@/types'

interface Props {
  category: Pick<Category, 'name' | 'color'>
  size?: 'sm' | 'md'
}

export default function CategoryBadge({ category, size = 'md' }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === 'md' ? 'px-2.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'
      }`}
      style={{
        backgroundColor: `${category.color}20`,
        color: category.color,
      }}
    >
      {category.name}
    </span>
  )
}
