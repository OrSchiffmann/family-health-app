'use client'

import { useEffect, useState } from 'react'

const EMOJIS = ['🎉', '⭐', '🌟', '✨', '🎊', '💫', '🏆', '❤️']
const COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF922B', '#CC5DE8', '#20C997', '#F06595']

interface Piece {
  id: number
  x: number
  delay: number
  duration: number
  size: number
  color: string
  emoji: string | null
  rotation: number
  drift: number
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function generatePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: randomBetween(0, 100),
    delay: randomBetween(0, 1.2),
    duration: randomBetween(2.2, 3.8),
    size: randomBetween(10, 22),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    emoji: Math.random() < 0.25 ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : null,
    rotation: randomBetween(-360, 360),
    drift: randomBetween(-60, 60),
  }))
}

interface Props {
  memberName: string
  onDone: () => void
}

export default function CelebrationOverlay({ memberName, onDone }: Props) {
  const [pieces] = useState(() => generatePieces(90))
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 400)
    }, 3000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 100%)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        cursor: 'pointer',
      }}
      onClick={() => { setVisible(false); setTimeout(onDone, 400) }}
    >
      {/* Confetti pieces */}
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 pointer-events-none"
          style={{
            left: `${p.x}%`,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
            fontSize: p.emoji ? p.size + 4 : undefined,
          }}
        >
          {p.emoji ? (
            <span style={{ fontSize: p.size + 4 }}>{p.emoji}</span>
          ) : (
            <div style={{
              width: p.size,
              height: p.size * 0.5,
              backgroundColor: p.color,
              borderRadius: 2,
              transform: `rotate(${p.rotation}deg)`,
            }} />
          )}
        </div>
      ))}

      {/* Center message */}
      <div className="relative z-10 text-center px-8 select-none"
        style={{ animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <div style={{ fontSize: 72, lineHeight: 1, animation: 'bounce 0.6s 0.3s ease infinite alternate' }}>🏆</div>
        <h1 className="text-white font-black mt-4" style={{ fontSize: 36, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
          כל הכבוד {memberName}!
        </h1>
        <p className="text-white/80 mt-2 text-lg font-semibold">ביצוע מעולה!</p>
        <p className="text-white/50 mt-6 text-sm">לחצי להמשיך</p>
      </div>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) translateX(var(--drift, 40px)) rotate(720deg); opacity: 0.3; }
        }
        @keyframes popIn {
          from { transform: scale(0.3); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes bounce {
          from { transform: translateY(0) scale(1); }
          to   { transform: translateY(-12px) scale(1.1); }
        }
      `}</style>
    </div>
  )
}
