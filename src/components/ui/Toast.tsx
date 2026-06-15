'use client'

import { useEffect, useState } from 'react'

interface Props {
  message: string
  show: boolean
  onHide: () => void
  variant?: 'success' | 'celebrate'
}

export default function Toast({ message, show, onHide, variant = 'success' }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const t = setTimeout(() => { setVisible(false); setTimeout(onHide, 300) }, 2200)
      return () => clearTimeout(t)
    }
  }, [show])

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
      }`}
    >
      <div className={`flex items-center gap-2 rounded-2xl px-5 py-3 shadow-lg text-sm font-semibold text-white ${
        variant === 'celebrate' ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-900'
      }`}>
        <span>{message}</span>
      </div>
    </div>
  )
}
