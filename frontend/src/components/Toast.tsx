import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { ToastItem, ToastType } from '../hooks/useToast'

const STYLES: Record<ToastType, { wrapper: string; icon: string }> = {
  error:   { wrapper: 'bg-red-950/95 border-red-700 text-red-200',   icon: 'text-red-400' },
  warning: { wrapper: 'bg-yellow-950/95 border-yellow-700 text-yellow-200', icon: 'text-yellow-400' },
  info:    { wrapper: 'bg-blue-950/95 border-blue-700 text-blue-200', icon: 'text-blue-400' },
}

const ICONS: Record<ToastType, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

interface ToastProps {
  toast: ToastItem
  onDismiss: (id: string) => void
}

function Toast({ toast, onDismiss }: ToastProps) {
  const { wrapper, icon } = STYLES[toast.type]
  const Icon = ICONS[toast.type]
  return (
    <div
      className={`flex items-start gap-3 border rounded-xl px-4 py-3 shadow-xl w-80 ${wrapper} ${toast.leaving ? 'toast-leave' : 'toast-enter'}`}
    >
      <Icon size={16} className={`mt-0.5 shrink-0 ${icon}`} />
      <p className="text-sm flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
