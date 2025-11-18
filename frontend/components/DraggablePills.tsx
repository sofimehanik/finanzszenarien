"use client"

import { useState, useEffect, useRef } from "react"
import { motion, PanInfo, useAnimation } from "framer-motion"
import { Label } from "@/components/ui/label"
import { Sparkles } from "lucide-react"

interface QuestionPill {
  id: string
  text: string
  isAI?: boolean
}

interface DraggablePillsProps {
  questions: string[]
  suggestedQuestions?: string[]
  onQuestionSelect: (question: string) => void
  onQuestionReorder?: (questions: string[]) => void
  isLoading?: boolean
}

export function DraggablePills({ 
  questions, 
  suggestedQuestions = [], 
  onQuestionSelect, 
  onQuestionReorder,
  isLoading = false 
}: DraggablePillsProps) {
  const [pillQuestions, setPillQuestions] = useState<QuestionPill[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isDragOverInput, setIsDragOverInput] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [longPressedId, setLongPressedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize questions with IDs - limit to 8 total (4 classic + 4 AI)
  useEffect(() => {
    const classicQuestions = questions.slice(0, 4).map((q, idx) => ({ 
      id: `example-${idx}`, 
      text: q,
      isAI: false 
    }))
    const aiQuestions = suggestedQuestions.slice(0, 4).map((q, idx) => ({ 
      id: `suggested-${idx}`, 
      text: q,
      isAI: true 
    }))
    // Mix questions for better visual distribution: Classic, AI, Classic, AI...
    const allQuestions: QuestionPill[] = []
    const maxLength = Math.max(classicQuestions.length, aiQuestions.length)
    for (let i = 0; i < maxLength; i++) {
      if (classicQuestions[i]) allQuestions.push(classicQuestions[i])
      if (aiQuestions[i]) allQuestions.push(aiQuestions[i])
    }
    setPillQuestions(allQuestions.slice(0, 8))
  }, [questions, suggestedQuestions])

  // Update input field visual state when dragging over it
  useEffect(() => {
    const inputElement = document.getElementById("goal")
    if (inputElement) {
      if (isDragOverInput) {
        inputElement.classList.add("drag-over-input")
      } else {
        inputElement.classList.remove("drag-over-input")
      }
    }
    return () => {
      if (inputElement) {
        inputElement.classList.remove("drag-over-input")
      }
    }
  }, [isDragOverInput])

  const handleLongPress = (id: string) => {
    const timer = setTimeout(() => {
      setLongPressedId(id)
      // Vibration API (if supported)
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      setTimeout(() => setLongPressedId(null), 200)
    }, 500) // 500ms long press
    setLongPressTimer(timer)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, index: number) => {
    const draggedId = draggedIndex
    setDraggedIndex(null)
    setDragOverIndex(null)
    setIsDragOverInput(false)

    // Check if dropped on input field
    const inputElement = document.getElementById("goal")
    if (inputElement) {
      const rect = inputElement.getBoundingClientRect()
      const x = (event as MouseEvent).clientX || ((event as TouchEvent).changedTouches?.[0]?.clientX ?? 0)
      const y = (event as MouseEvent).clientY || ((event as TouchEvent).changedTouches?.[0]?.clientY ?? 0)

      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        onQuestionSelect(pillQuestions[index].text)
        return
      }
    }

    // Swap logic - if dropped over another pill, swap positions (gamification)
    if (dragOverIndex !== null && dragOverIndex !== index && draggedId === index) {
      const newQuestions = [...pillQuestions]
      // Swap positions for gamification effect
      const temp = newQuestions[index]
      newQuestions[index] = newQuestions[dragOverIndex]
      newQuestions[dragOverIndex] = temp
      setPillQuestions(newQuestions)
      if (onQuestionReorder) {
        onQuestionReorder(newQuestions.map(q => q.text))
      }
      // Haptic feedback on successful swap
      if (navigator.vibrate) {
        navigator.vibrate([10, 20, 10])
      }
    }
  }

  const handleDragOver = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  return (
    <div className="space-y-3 animate-fade-in-up-delay">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
        <Label className="text-sm font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary tracking-wide">
          Beispiel-Fragen
        </Label>
      </div>

      {/* Pills Container - Full Display Layout */}
      <div 
        ref={containerRef}
        className="relative flex flex-wrap gap-3 p-2 min-h-[60px] rounded-lg border border-transparent"
        style={{
          width: '100%',
          justifyContent: 'flex-start',
          alignContent: 'flex-start',
        }}
      >
        {pillQuestions.map((pill, index) => (
          <DraggablePill
            key={pill.id}
            pill={pill}
            index={index}
            isDragging={draggedIndex === index}
            isDragOver={dragOverIndex === index}
            isLongPressed={longPressedId === pill.id}
            containerRef={containerRef}
            onDragStart={() => handleDragStart(index)}
            onDragEnd={handleDragEnd}
            onDragOver={() => handleDragOver(index)}
            onDragLeave={handleDragLeave}
            onDragOverInput={setIsDragOverInput}
            onClick={() => onQuestionSelect(pill.text)}
            onLongPressStart={() => handleLongPress(pill.id)}
            onLongPressEnd={handleLongPressEnd}
            disabled={isLoading}
          />
        ))}
      </div>
    </div>
  )
}

interface DraggablePillProps {
  pill: QuestionPill
  index: number
  isDragging: boolean
  isDragOver: boolean
  isLongPressed: boolean
  containerRef: React.RefObject<HTMLDivElement>
  onDragStart: () => void
  onDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, index: number) => void
  onDragOver: () => void
  onDragLeave: () => void
  onDragOverInput: (isOver: boolean) => void
  onClick: () => void
  onLongPressStart: () => void
  onLongPressEnd: () => void
  disabled?: boolean
}

function DraggablePill({
  pill,
  index,
  isDragging,
  isDragOver,
  isLongPressed,
  containerRef,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDragOverInput,
  onClick,
  onLongPressStart,
  onLongPressEnd,
  disabled = false,
}: DraggablePillProps) {
  const controls = useAnimation()
  const pillRef = useRef<HTMLDivElement>(null)

  // Long press vibration effect
  useEffect(() => {
    if (isLongPressed) {
      controls.start({
        scale: [1.02, 1.05, 1.02],
        transition: { duration: 0.15, times: [0, 0.5, 1] },
      })
    }
  }, [isLongPressed, controls])

  // Reset animations when dragging ends
  useEffect(() => {
    if (!isDragging) {
      controls.start({
        scale: 1,
        y: 0,
        rotateZ: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 300, damping: 25 },
      })
    }
  }, [isDragging, controls])

  // Add bounce animation when swapped
  useEffect(() => {
    if (isDragOver && !isDragging) {
      controls.start({
        scale: [1, 1.1, 1.05],
        transition: { duration: 0.3, times: [0, 0.5, 1] },
      })
    }
  }, [isDragOver, isDragging, controls])


  return (
    <motion.div
      ref={pillRef}
      drag
      dragMomentum={false}
      dragElastic={0.3}
      dragConstraints={containerRef}
      onDragStart={() => {
        onDragStart()
        controls.start({ 
          scale: 1.08, 
          zIndex: 50,
          opacity: 0.9,
          rotateZ: 2,
          transition: { type: "spring", stiffness: 400, damping: 20 }
        })
        // Add haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(10)
        }
      }}
      onDrag={(event, info) => {
        const clientX = (event as MouseEvent).clientX || ((event as TouchEvent).touches?.[0]?.clientX ?? 0)
        const clientY = (event as MouseEvent).clientY || ((event as TouchEvent).touches?.[0]?.clientY ?? 0)
        
        // Check if over other pills
        if (containerRef.current) {
          const pills = containerRef.current.querySelectorAll('[data-pill-index]')
          let foundOver = false
          
          pills.forEach((otherPill) => {
            const otherIndex = parseInt(otherPill.getAttribute('data-pill-index') || '-1')
            if (otherIndex !== index && otherIndex !== -1) {
              const rect = otherPill.getBoundingClientRect()
              
              // Check if cursor is over this pill
              if (clientX >= rect.left && clientX <= rect.right && 
                  clientY >= rect.top && clientY <= rect.bottom) {
                onDragOver()
                foundOver = true
              }
            }
          })
          
          if (!foundOver) {
            onDragLeave()
          }
        }
        
        // Check if over input field
        const inputElement = document.getElementById("goal")
        if (inputElement) {
          const rect = inputElement.getBoundingClientRect()
          if (clientX >= rect.left - 50 && clientX <= rect.right + 50 && 
              clientY >= rect.top - 50 && clientY <= rect.bottom + 50) {
            onDragOverInput(true)
          } else {
            onDragOverInput(false)
          }
        }
      }}
        onDragEnd={(event, info) => {
        // Check if dropped on input
        const inputElement = document.getElementById("goal")
        if (inputElement) {
          const rect = inputElement.getBoundingClientRect()
          const clientX = (event as MouseEvent).clientX || ((event as TouchEvent).changedTouches?.[0]?.clientX ?? 0)
          const clientY = (event as MouseEvent).clientY || ((event as TouchEvent).changedTouches?.[0]?.clientY ?? 0)
          
          if (clientX >= rect.left && clientX <= rect.right && 
              clientY >= rect.top && clientY <= rect.bottom) {
            onClick()
            onDragEnd(event, info, index)
            return
          }
        }
        
        onDragEnd(event, info, index)
      }}
      animate={controls}
      whileHover={!isDragging ? {
        scale: 1.03,
        y: -2,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      } : {}}
      whileTap={!disabled && !isDragging ? { scale: 0.98 } : {}}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      data-pill-index={index}
      style={{
        zIndex: isDragging ? 50 : isDragOver ? 10 : 1,
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (!isDragging) {
            onClick()
          }
        }}
        disabled={disabled}
        className={`
          relative px-4 py-2.5 rounded-full text-sm font-medium
          text-finsim-textMain dark:text-finsim-dark-textMain
          bg-white/70 dark:bg-finsim-dark-surfaceElevated/70
          backdrop-blur-md
          border border-white/40 dark:border-white/10
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isDragging ? 'ring-2 ring-finsim-primary/50 dark:ring-finsim-dark-primary/50 shadow-xl' : 'shadow-sm'}
          ${isDragOver && !isDragging ? 'ring-2 ring-emerald-400/50 dark:ring-emerald-500/50 border-emerald-400/70 dark:border-emerald-500/70 bg-emerald-50/50 dark:bg-emerald-900/20' : ''}
          ${isLongPressed ? 'ring-2 ring-finsim-primary/60 dark:ring-finsim-dark-primary/60' : ''}
        `}
        style={{
          boxShadow: isDragging 
            ? "0 12px 24px rgba(59, 130, 246, 0.4), 0 6px 16px rgba(0, 0, 0, 0.15)"
            : isDragOver
            ? "0 6px 16px rgba(16, 185, 129, 0.3), 0 3px 8px rgba(0, 0, 0, 0.1)"
            : "0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)",
        }}
        animate={isDragOver && !isDragging ? {
          scale: [1, 1.08, 1.05],
          transition: { duration: 0.4, times: [0, 0.5, 1], ease: "easeOut" }
        } : {}}
      >
        <span className="relative z-10 whitespace-normal break-words inline-block text-left">
          {pill.text}
        </span>
        {isDragOver && !isDragging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center"
          >
            <motion.svg
              className="w-2 h-2 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              initial={{ rotate: -90 }}
              animate={{ rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </motion.svg>
          </motion.div>
        )}
      </motion.button>
    </motion.div>
  )
}

