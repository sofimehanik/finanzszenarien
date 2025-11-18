"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { getAnalysisHistory, getAnalysisById, deleteAnalysis, AnalysisResponse } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { X, Trash2, FileText, Calendar } from "lucide-react"
// Date formatting helper

interface AnalysisHistoryItem {
  id: number
  title: string
  user_goal?: string
  created_at: string
  updated_at?: string
}

interface AnalysisHistorySidebarProps {
  open: boolean
  onClose: () => void
  onSelectAnalysis: (analysis: AnalysisResponse) => void
}

export function AnalysisHistorySidebar({ open, onClose, onSelectAnalysis }: AnalysisHistorySidebarProps) {
  const { isAuthenticated } = useAuth()
  const [histories, setHistories] = useState<AnalysisHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open && isAuthenticated) {
      loadHistory()
    }
  }, [open, isAuthenticated])

  const loadHistory = async () => {
    setIsLoading(true)
    setError("")
    try {
      const data = await getAnalysisHistory()
      setHistories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Geschichte")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = async (id: number) => {
    try {
      const analysis = await getAnalysisById(id)
      onSelectAnalysis(analysis)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Analyse")
    }
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Möchtest du diese Analyse wirklich löschen?")) {
      return
    }
    try {
      await deleteAnalysis(id)
      setHistories(histories.filter(h => h.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Löschen")
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      
      if (diffMins < 1) return "gerade eben"
      if (diffMins < 60) return `vor ${diffMins} Min.`
      if (diffHours < 24) return `vor ${diffHours} Std.`
      if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`
      
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return dateString
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-finsim-surface dark:bg-finsim-dark-surface border-r border-finsim-border dark:border-finsim-dark-border z-50
        transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col shadow-xl
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight">
          <h2 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">Analyse-Verlauf</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors"
          >
            <X className="h-5 w-5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
              Lädt...
            </div>
          ) : error ? (
            <div className="p-4 text-red-600 dark:text-red-400 text-sm">{error}</div>
          ) : histories.length === 0 ? (
            <div className="p-4 text-center text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Noch keine Analysen gespeichert</p>
            </div>
          ) : (
            <div className="p-2">
              {histories.map((history) => (
                <div
                  key={history.id}
                  onClick={() => handleSelect(history.id)}
                  className="group p-3 rounded-lg hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated cursor-pointer transition-colors mb-2 border border-finsim-borderLight dark:border-finsim-dark-borderLight hover:border-finsim-border dark:hover:border-finsim-dark-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-finsim-textMain dark:text-finsim-dark-textMain truncate mb-1">
                        {history.title}
                      </h3>
                      {history.user_goal && (
                        <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary line-clamp-2 mb-2">
                          {history.user_goal}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(history.created_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(history.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-opacity"
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

