import { useCallback, useRef, useState } from 'react'

export type ToastType = 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  leaving: boolean
}

let _counter = 0

export function useToast(autoDismissMs = 6000) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    // Mark as leaving to trigger exit animation, then remove
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 320)
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'error') => {
    const id = `toast-${++_counter}`
    setToasts(prev => [...prev, { id, message, type, leaving: false }])
    const timer = setTimeout(() => dismiss(id), autoDismissMs)
    timers.current.set(id, timer)
    return id
  }, [dismiss, autoDismissMs])

  return { toasts, toast, dismiss }
}
