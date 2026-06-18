import { useEffect, useRef } from 'react'
import { Bot, User } from 'lucide-react'
import clsx from 'clsx'
import { TranscriptEntry } from '../types'

interface Props {
  entries: TranscriptEntry[]
}

export default function TranscriptView({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center h-48 text-gray-600 gap-2">
        <Bot size={28} className="opacity-40" />
        <p className="text-sm">Transcript will appear here once the agent is live.</p>
      </div>
    )
  }

  return (
    <div className="card space-y-3 max-h-96 overflow-y-auto">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide sticky top-0 bg-gray-900 pb-1">
        Transcript
      </h2>

      {entries.map(entry => (
        <div
          key={entry.id}
          className={clsx(
            'flex gap-3 animate-fade-in',
            entry.speaker === 'agent' ? 'flex-row-reverse' : ''
          )}
        >
          {/* Avatar */}
          <div
            className={clsx(
              'flex-none w-7 h-7 rounded-full flex items-center justify-center mt-0.5',
              entry.speaker === 'agent' ? 'bg-blue-600' : 'bg-gray-700'
            )}
          >
            {entry.speaker === 'agent' ? <Bot size={14} /> : <User size={14} />}
          </div>

          {/* Bubble */}
          <div
            className={clsx(
              'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
              entry.speaker === 'agent'
                ? 'bg-blue-900/50 text-blue-100 rounded-tr-sm'
                : 'bg-gray-800 text-gray-200 rounded-tl-sm'
            )}
          >
            <p className="text-[10px] font-medium opacity-60 mb-1 uppercase tracking-wide">
              {entry.speaker === 'agent' ? 'Agent' : 'You'}
              {' · '}
              {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            {entry.text}
          </div>
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  )
}
