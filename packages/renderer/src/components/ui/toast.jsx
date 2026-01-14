import React, { useState, useEffect, createContext, useContext } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = (toast) => {
    const id = Date.now()
    setToasts(prev => [...prev, { ...toast, id }])
    
    // 自動移除
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, toast.duration || 4000)
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const toast = {
    success: (title, description) => addToast({ type: 'success', title, description }),
    error: (title, description) => addToast({ type: 'error', title, description }),
    warning: (title, description) => addToast({ type: 'warning', title, description }),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // 進入動畫
    requestAnimationFrame(() => setIsVisible(true))
    
    // 離開動畫
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(onRemove, 300)
    }, (toast.duration || 4000) - 300)
    
    return () => clearTimeout(timer)
  }, [])

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-500" />,
  }

  const bgColors = {
    success: 'bg-green-500/10 border-green-500/20',
    error: 'bg-red-500/10 border-red-500/20',
    warning: 'bg-yellow-500/10 border-yellow-500/20',
  }

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm
        bg-background/95 ${bgColors[toast.type]}
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-muted-foreground mt-1 break-words">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => {
          setIsLeaving(true)
          setTimeout(onRemove, 300)
        }}
        className="shrink-0 p-1 rounded hover:bg-muted/50 transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}
