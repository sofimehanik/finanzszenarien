"use client"

import { useState, useEffect, useRef } from "react"
import { motion, PanInfo, useAnimation, AnimatePresence } from "framer-motion"
import { Label } from "@/components/ui/label"
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react"

interface QuestionPill {
  id: string
  text: string
  isAI?: boolean
}

interface Category {
  id: string
  name: string
  emoji: string
  color: string
  darkColor: string
  questions: string[]
}

interface DraggablePillsProps {
  questions: string[]
  suggestedQuestions?: string[]
  onQuestionSelect: (question: string) => void
  onQuestionReorder?: (questions: string[]) => void
  isLoading?: boolean
}

// Категории с примерами вопросов
const QUESTION_CATEGORIES: Category[] = [
  {
    id: "sparen",
    name: "Sparen & Ziele",
    emoji: "💰",
    color: "emerald",
    darkColor: "emerald",
    questions: [
      "Kann ich 500€ Autokredit monatlich zahlen?",
      "Schaffe ich 10.000€ in 12 Monaten?",
      "Erreiche ich 5.000€ Notgroschen in 6 Monaten?",
      "Wie viel pro Monat für 20.000€ in 2 Jahren?"
    ]
  },
  {
    id: "wohnen",
    name: "Wohnen & Miete",
    emoji: "🏠",
    color: "blue",
    darkColor: "blue",
    questions: [
      "Sind 800€ Miete für mich realistisch?",
      "Kann ich mir eine größere Wohnung leisten?",
      "Trage ich eine 1.200€ Hypothekenrate?",
      "Wie hoch darf meine Miete maximal sein?"
    ]
  },
  {
    id: "investieren",
    name: "Investieren",
    emoji: "📈",
    color: "purple",
    darkColor: "purple",
    questions: [
      "Wie viel kann ich monatlich in ETFs legen?",
      "Ist jetzt ein guter Zeitpunkt für Aktien?",
      "Kann ich mir eine Investment-Immobilie leisten?",
      "Wie viel für meine Altersvorsorge zurücklegen?"
    ]
  },
  {
    id: "schulden",
    name: "Schulden & Tilgung",
    emoji: "💳",
    color: "red",
    darkColor: "red",
    questions: [
      "Wie schnell tilge ich meine Kreditkarte?",
      "Lohnt sich eine Umschuldung für mich?",
      "Welche monatliche Rate passt zur Tilgung?",
      "Erst Schulden zahlen oder lieber sparen?"
    ]
  },
  {
    id: "große-anschaffungen",
    name: "Große Anschaffungen",
    emoji: "🚗",
    color: "orange",
    darkColor: "orange",
    questions: [
      "Kann ich ein 25.000€ Auto finanzieren?",
      "Passt eine Küche für 8.000€ ins Budget?",
      "Ist ein Urlaub für 3.000€ drin?",
      "Wie viel darf eine große Anschaffung kosten?"
    ]
  }
]

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categoryQuestions, setCategoryQuestions] = useState<QuestionPill[]>([])
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

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null)
      setCategoryQuestions([])
    } else {
      setSelectedCategory(categoryId)
      const category = QUESTION_CATEGORIES.find(c => c.id === categoryId)
      if (category) {
        const questions = category.questions.map((q, idx) => ({
          id: `category-${categoryId}-${idx}`,
          text: q,
          isAI: false
        }))
        setCategoryQuestions(questions)
      }
    }
  }

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

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string; hover: string; dark: { bg: string; border: string; text: string; hover: string } }> = {
      emerald: {
        bg: "bg-emerald-50",
        border: "border-emerald-400",
        text: "text-emerald-700",
        hover: "hover:bg-emerald-100",
        dark: {
          bg: "dark:bg-emerald-500/20",
          border: "dark:border-emerald-500/50",
          text: "dark:text-emerald-300",
          hover: "dark:hover:bg-emerald-500/30"
        }
      },
      blue: {
        bg: "bg-blue-50",
        border: "border-blue-400",
        text: "text-blue-700",
        hover: "hover:bg-blue-100",
        dark: {
          bg: "dark:bg-blue-500/20",
          border: "dark:border-blue-500/50",
          text: "dark:text-blue-300",
          hover: "dark:hover:bg-blue-500/30"
        }
      },
      purple: {
        bg: "bg-purple-50",
        border: "border-purple-400",
        text: "text-purple-700",
        hover: "hover:bg-purple-100",
        dark: {
          bg: "dark:bg-purple-500/20",
          border: "dark:border-purple-500/50",
          text: "dark:text-purple-300",
          hover: "dark:hover:bg-purple-500/30"
        }
      },
      red: {
        bg: "bg-red-50",
        border: "border-red-400",
        text: "text-red-700",
        hover: "hover:bg-red-100",
        dark: {
          bg: "dark:bg-red-500/20",
          border: "dark:border-red-500/50",
          text: "dark:text-red-300",
          hover: "dark:hover:bg-red-500/30"
        }
      },
      orange: {
        bg: "bg-orange-50",
        border: "border-orange-400",
        text: "text-orange-700",
        hover: "hover:bg-orange-100",
        dark: {
          bg: "dark:bg-orange-500/20",
          border: "dark:border-orange-500/50",
          text: "dark:text-orange-300",
          hover: "dark:hover:bg-orange-500/30"
        }
      }
    }
    return colorMap[color] || colorMap.emerald
  }

  return (
    <div className="space-y-4 animate-fade-in-up-delay">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
        <Label className="text-sm font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary tracking-wide">
          Beispiel-Fragen
        </Label>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {QUESTION_CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.id
          const colors = getColorClasses(category.color)
          return (
            <motion.button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`relative rounded-2xl p-4 border-2 transition-all duration-300 text-left ${
                isSelected
                  ? `${colors.bg} ${colors.dark.bg} ${colors.border} ${colors.dark.border} shadow-lg`
                  : `bg-white/60 dark:bg-white/5 border-finsim-borderLight dark:border-finsim-dark-borderLight hover:${colors.border}/50 dark:hover:${colors.dark.border}/50`
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  className={`text-3xl ${isSelected ? '' : 'opacity-70'}`}
                  animate={isSelected ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  {category.emoji}
                </motion.div>
                <span className={`text-xs font-semibold text-center ${isSelected ? `${colors.text} ${colors.dark.text}` : 'text-finsim-textSecondary dark:text-finsim-dark-textSecondary'}`}>
                  {category.name}
                </span>
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 bg-finsim-primary dark:bg-finsim-dark-primary rounded-full flex items-center justify-center"
                >
                  <ChevronUp className="h-3 w-3 text-white" />
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Category Questions */}
      <AnimatePresence>
        {selectedCategory && categoryQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                Fragen aus dieser Kategorie
              </span>
              <motion.button
                onClick={() => {
                  setSelectedCategory(null)
                  setCategoryQuestions([])
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted hover:text-finsim-textMain dark:hover:text-finsim-dark-textMain"
              >
                Schließen
              </motion.button>
            </div>
            <div 
              ref={containerRef}
              className="relative flex flex-wrap gap-3 p-2 min-h-[60px] rounded-lg"
            >
              {categoryQuestions.map((pill, index) => (
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Original Pills Container - Show when no category selected */}
      {!selectedCategory && (
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
      )}
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
          min-w-fit max-w-full
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
        <span className="relative z-10 inline-block text-left text-[13px] leading-relaxed font-medium text-finsim-textMain dark:text-finsim-dark-textMain whitespace-normal break-words">
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

