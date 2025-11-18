"use client"

import { useState, useEffect } from "react"
import { FileUpload } from "@/components/FileUpload"
import { ScenarioCard } from "@/components/ScenarioCard"
import { ScenarioChart } from "@/components/ScenarioChart"
import { FinanceDashboard } from "@/components/FinanceDashboard"
import PdfExportButton from "@/components/PdfExportButton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { analyzeCSV, AnalysisResponse, getSuggestedQuestions } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { AlertCircle, Lightbulb, Globe, User, Brain, Sparkles, LogOut, Menu, ChevronDown, ChevronUp } from "lucide-react"
import { motion } from "framer-motion"
import { AuthModal } from "@/components/AuthModal"
import { ProfileSettings } from "@/components/ProfileSettings"
import { AnalysisHistorySidebar } from "@/components/AnalysisHistorySidebar"
import { UserMenu } from "@/components/UserMenu"
import { DraggablePills } from "@/components/DraggablePills"

const EXAMPLE_PROMPTS = [
  "Kann ich mir eine monatliche Rate von 500€ für ein Auto leisten?",
  "Ist es möglich, in 12 Monaten 10.000€ für eine Reise zu sparen?",
  "Kann ich mir eine Wohnung mit 800€ Miete leisten?",
  "Schaffe ich es, in 6 Monaten 5.000€ für einen Notgroschen anzusparen?",
  "Ist mein Budget ausreichend für einen Umzug in eine größere Wohnung?",
]

// Функция для очистки markdown форматирования и улучшения читаемости
function cleanMarkdownText(text: string): string {
  if (!text) return text
  
  return text
    // Убираем жирный текст **text** -> text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Убираем курсив *text* -> text (но не трогаем одиночные * в начале строки)
    .replace(/\*([^*\n]+)\*/g, '$1')
    // Убираем подчеркивание __text__ -> text
    .replace(/__([^_]+)__/g, '$1')
    // Убираем одинарное подчеркивание _text_ -> text
    .replace(/_([^_\n]+)_/g, '$1')
    // Убираем зачеркивание ~~text~~ -> text
    .replace(/~~([^~]+)~~/g, '$1')
    // Убираем код `text` -> text
    .replace(/`([^`]+)`/g, '$1')
    // Убираем ссылки [text](url) -> text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Убираем заголовки markdown # ## ### -> просто текст
    .replace(/^#{1,6}\s+/gm, '')
    // Очищаем множественные пробелы внутри строк (но сохраняем переносы строк)
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim()
}

// Функция для парсинга советов из текста LLM
function parseTips(text: string): Array<{ emoji: string; title: string; description: string }> {
  if (!text) return []
  
  const tips: Array<{ emoji: string; title: string; description: string }> = []
  const lines = text.split('\n')
  
  // Ищем секцию TIPPS или Tipps
  let inTipsSection = false
  const tipsSectionStart = /^(TIPPS|Tipps|TIPPS:|Tipps:)/i
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (tipsSectionStart.test(line)) {
      inTipsSection = true
      continue
    }
    
    if (inTipsSection && line) {
      // Парсим формат: "1. [Emoji] [Titel] - [Beschreibung]"
      const tipMatch = line.match(/^\d+\.\s*(.+?)\s*-\s*(.+)$/)
      if (tipMatch) {
        const fullContent = tipMatch[1].trim()
        const description = tipMatch[2].trim()
        
        // Извлекаем эмоджи (первый эмоджи в строке)
        const emojiMatch = fullContent.match(/^([\uD83C-\uDBFF\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]|[\u2190-\u21FF]|[\u2300-\u23FF]|[\u2B50-\u2B55]|[\u3030-\u303F]|[\uFE00-\uFE0F])/)
        const emoji = emojiMatch ? emojiMatch[0] : '💡'
        const title = fullContent.replace(emoji, '').trim()
        
        tips.push({ emoji, title, description })
      } else {
        // Альтернативный формат без тире: "1. [Emoji] [Titel] [Beschreibung]"
        const altMatch = line.match(/^\d+\.\s*(.+)$/)
        if (altMatch) {
          const content = altMatch[1].trim()
          const emojiMatch = content.match(/^([\uD83C-\uDBFF\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]|[\u2190-\u21FF]|[\u2300-\u23FF]|[\u2B50-\u2B55]|[\u3030-\u303F]|[\uFE00-\uFE0F])/)
          const emoji = emojiMatch ? emojiMatch[0] : '💡'
          const rest = content.replace(emoji, '').trim()
          
          // Пытаемся разделить на заголовок и описание (первые 6 слов = заголовок)
          const words = rest.split(' ')
          const titleWords = words.slice(0, 6)
          const descWords = words.slice(6)
          
          tips.push({
            emoji,
            title: titleWords.join(' '),
            description: descWords.join(' ') || rest
          })
        }
      }
    }
  }
  
  // Если не нашли в секции TIPPS, ищем нумерованные списки в конце текста
  if (tips.length === 0) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim()
      const tipMatch = line.match(/^\d+\.\s*(.+?)\s*-\s*(.+)$/)
      if (tipMatch) {
        const fullContent = tipMatch[1].trim()
        const description = tipMatch[2].trim()
        const emojiMatch = fullContent.match(/^([\uD83C-\uDBFF\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]|[\u2190-\u21FF]|[\u2300-\u23FF]|[\u2B50-\u2B55]|[\u3030-\u303F]|[\uFE00-\uFE0F])/)
        const emoji = emojiMatch ? emojiMatch[0] : '💡'
        const title = fullContent.replace(emoji, '').trim()
        tips.unshift({ emoji, title, description })
        if (tips.length >= 6) break
      }
    }
  }
  
  return tips.slice(0, 6) // Возвращаем максимум 6 советов
}

// Функция для форматирования текста с улучшенной структурой
function formatLLMText(text: string) {
  if (!text) return []
  
  // Сначала очищаем markdown
  let cleaned = cleanMarkdownText(text)
  
  // Разбиваем на параграфы (двойной перенос строки)
  const paragraphs = cleaned.split(/\n\n+/).filter(p => p.trim().length > 0)
  
  return paragraphs.map(para => {
    const trimmed = para.trim()
    
    // Нумерованный список (1. 2. 3. или 1) 2) 3))
    const numberedMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)/)
    if (numberedMatch) {
      return { type: 'numbered', number: numberedMatch[1], content: numberedMatch[2] }
    }
    
    // Маркированный список (- или • в начале строки)
    if (/^[-•*]\s/.test(trimmed)) {
      return { type: 'bullet', content: trimmed.replace(/^[-•*]\s+/, '') }
    }
    
    // Заголовок (если короткий, начинается с заглавной и заканчивается двоеточием)
    if (trimmed.length < 120 && /^[A-ZА-ЯЁ]/.test(trimmed) && trimmed.endsWith(':')) {
      return { type: 'heading', content: trimmed.replace(/:$/, '') }
    }
    
    // Подзаголовок (если содержит только заглавные буквы и короткий)
    if (trimmed.length < 80 && /^[A-ZА-ЯЁ\s]+$/.test(trimmed) && trimmed.split(' ').length <= 5) {
      return { type: 'subheading', content: trimmed }
    }
    
    // Обычный параграф
    return { type: 'paragraph', content: trimmed }
  })
}

function buildFallbackPlausibility(analysis: AnalysisResponse, userGoal: string): string {
  const best = analysis.scenarios.best_case
  const realistic = analysis.scenarios.realistic_case
  const worst = analysis.scenarios.worst_case
  const avgIncome = analysis.finance_data.monthly_averages.income
  const avgExpenses = analysis.finance_data.monthly_averages.expenses

  return [
    userGoal
      ? `Ausgehend von deinem Ziel („${userGoal}“) und deinen bisherigen Finanzdaten wirken die berechneten Szenarien insgesamt plausibel.`
      : "Ausgehend von deinen bisherigen Finanzdaten wirken die berechneten Szenarien insgesamt plausibel.",
    `Im Best Case würdest du monatlich etwa ${best.monthly_savings.toFixed(
      2
    )} € sparen und nach 12 Monaten auf ein Guthaben von rund ${best.final_balance.toFixed(
      2
    )} € kommen.`,
    `Im Realistic Case bewegst du dich näher an deinen durchschnittlichen Werten (Einnahmen ~${avgIncome.toFixed(
      2
    )} €, Ausgaben ~${avgExpenses.toFixed(
      2
    )} €) und erreichst voraussichtlich ein Endguthaben von etwa ${realistic.final_balance.toFixed(
      2
    )} €.`,
    `Der Worst Case zeigt dir, wie sich negative Entwicklungen auswirken könnten (Endguthaben ca. ${worst.final_balance.toFixed(
      2
    )} €) und dient vor allem als Warnsignal, um rechtzeitig gegenzusteuern.`
  ].join("\n\n")
}

function buildFallbackTips(analysis: AnalysisResponse, userGoal: string): string {
  const avgIncome = analysis.finance_data.monthly_averages.income
  const avgExpenses = analysis.finance_data.monthly_averages.expenses
  const monthlySavings = avgIncome - avgExpenses

  const topCategories = Object.entries(analysis.finance_data.categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, value]) => `${cat} (${value.toFixed(2)} €)`)
    .join(", ")

  return [
    userGoal
      ? `1. Formuliere dein Ziel („${userGoal}“) als konkreten Betrag mit Datum und plane rückwärts: Wie viel musst du pro Monat zurücklegen, um es realistisch zu erreichen?`
      : "1. Formuliere ein klares Sparziel mit Betrag und Datum und plane rückwärts, wie viel du pro Monat zurücklegen möchtest.",
    `2. Deine durchschnittlichen monatlichen Einnahmen liegen bei etwa ${avgIncome.toFixed(
      2
    )} € und die Ausgaben bei rund ${avgExpenses.toFixed(
      2
    )} €. Nutze diese Werte als Basis für ein einfaches Monatsbudget (Fixkosten, variable Ausgaben, Sparrate).`,
    `3. Prüfe regelmäßig deine größten Ausgabenkategorien (${topCategories}) und überlege, wo du kurzfristig 5–10 % einsparen kannst, ohne deine Lebensqualität stark zu beeinträchtigen.`,
    monthlySavings > 0
      ? `4. Da du aktuell im Schnitt etwa ${monthlySavings.toFixed(
          2
        )} € pro Monat übrig hast, lohnt es sich, diesen Betrag automatisiert direkt nach Gehaltseingang auf ein separates Spar- oder Anlagekonto zu überweisen.`
      : `4. Da deine durchschnittlichen Ausgaben deine Einnahmen leicht übersteigen, starte mit kleinen Anpassungen (Abos prüfen, variable Ausgaben tracken), bis du eine positive monatliche Sparrate erreichst.`,
    "5. Wiederhole die Analyse alle paar Monate, um zu prüfen, ob du noch auf Kurs bist, und passe dein Budget sowie deine Ziele schrittweise an."
  ].join("\n\n")
}

export default function Home() {
  const { isAuthenticated, user, logout, checkAuth } = useAuth()
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userGoal, setUserGoal] = useState("")
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [showHistorySidebar, setShowHistorySidebar] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [orderedExamplePrompts, setOrderedExamplePrompts] = useState<string[]>(EXAMPLE_PROMPTS)
  const [isKIAnalysisExpanded, setIsKIAnalysisExpanded] = useState(false)
  
  // Greeting variations for authenticated users - random on each page load/refresh
  const [greeting, setGreeting] = useState<string | null>(null)
  
  useEffect(() => {
    if (isAuthenticated && user?.full_name) {
      const greetings = [
        `Wie kann ich dir helfen, ${user.full_name}?`,
        `Was möchtest du heute analysieren, ${user.full_name}?`,
        `Welche finanzielle Frage beschäftigt dich, ${user.full_name}?`
      ]
      // Random greeting on each page load/refresh
      setGreeting(greetings[Math.floor(Math.random() * greetings.length)])
    } else {
      setGreeting(null)
    }
  }, [isAuthenticated, user?.full_name])

  // Load suggested questions from user's financial goals
  const loadSuggestedQuestions = async () => {
    if (isAuthenticated && user) {
      try {
        const result = await getSuggestedQuestions()
        if (result.questions && result.questions.length > 0) {
          setSuggestedQuestions(result.questions)
        } else {
          setSuggestedQuestions([])
        }
      } catch (error) {
        console.error("Fehler beim Laden von Vorschlägen:", error)
        setSuggestedQuestions([])
      }
    } else {
      setSuggestedQuestions([])
    }
  }

  useEffect(() => {
    loadSuggestedQuestions()
  }, [isAuthenticated, user?.financial_goals])

  // Handle profile save - refresh questions if financial goals exist
  const handleProfileSaved = async () => {
    // Wait a bit for the user data to be updated
    setTimeout(async () => {
      await loadSuggestedQuestions()
    }, 500)
  }

  const handleFileSelect = async (file: File) => {
    if (!userGoal.trim()) {
      setError("Bitte beschreibe dein finanzielles Ziel oder deine Frage.")
      return
    }

    setIsLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      console.log('Uploading file:', file.name, file.size, 'bytes')
      console.log('User goal:', userGoal)
      const result = await analyzeCSV(file, userGoal.trim())
      console.log('Analysis result:', result)
      console.log('🔍 AI Analysis Debug:', {
        plausibility: result.ai_analysis?.plausibility ? `${result.ai_analysis.plausibility.substring(0, 100)}...` : 'null/empty',
        tips: result.ai_analysis?.tips ? `${result.ai_analysis.tips.substring(0, 100)}...` : 'null/empty',
        plausibilityLength: result.ai_analysis?.plausibility?.length || 0,
        tipsLength: result.ai_analysis?.tips?.length || 0
      })
      setAnalysis(result)
    } catch (err) {
      console.error('Upload error:', err)
      const errorMessage = err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExampleClick = (example: string) => {
    setUserGoal(example)
  }

  // Приоритет: используем ответ от LLM, если он есть, иначе fallback
  // Проверяем, есть ли реальный ответ от LLM (не пустая строка, не только пробелы)
  const hasLLMPlausibility = analysis?.ai_analysis?.plausibility && 
    analysis.ai_analysis.plausibility.trim().length > 50 // Минимум 50 символов для реального ответа
  const plausibilityText = analysis 
    ? (hasLLMPlausibility 
        ? analysis.ai_analysis.plausibility 
        : buildFallbackPlausibility(analysis, userGoal))
    : null
  const isPlausibilityFromLLM = !!hasLLMPlausibility

  const hasLLMTips = analysis?.ai_analysis?.tips && 
    analysis.ai_analysis.tips.trim().length > 50 // Минимум 50 символов для реального ответа
  const tipsText = analysis 
    ? (hasLLMTips 
        ? analysis.ai_analysis.tips 
        : buildFallbackTips(analysis, userGoal))
    : null
  const isTipsFromLLM = !!hasLLMTips
  
  // Debug logging
  if (analysis) {
    console.log('🔍 Frontend Debug - Plausibility:', {
      hasValue: !!analysis.ai_analysis?.plausibility,
      isEmpty: !analysis.ai_analysis?.plausibility || analysis.ai_analysis.plausibility.trim().length === 0,
      length: analysis.ai_analysis?.plausibility?.length || 0,
      willShow: !!plausibilityText
    })
    console.log('🔍 Frontend Debug - Tips:', {
      hasValue: !!analysis.ai_analysis?.tips,
      isEmpty: !analysis.ai_analysis?.tips || analysis.ai_analysis.tips.trim().length === 0,
      length: analysis.ai_analysis?.tips?.length || 0,
      willShow: !!tipsText
    })
  }

  const handleSelectAnalysis = (selectedAnalysis: AnalysisResponse) => {
    setAnalysis(selectedAnalysis)
    setShowHistorySidebar(false)
    // Set user goal if available
    if (selectedAnalysis.finance_data) {
      // Try to extract user goal from analysis if stored
      // For now, just set the analysis
    }
  }

  return (
    <main className="min-h-screen gradient-bg dark:bg-finsim-dark-surfaceMuted">
      <div className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 transition-all duration-300 ${
        showHistorySidebar && isAuthenticated ? 'md:ml-80' : ''
      }`}>
        {/* Header */}
        <header className="flex items-center justify-between mb-12 sm:mb-16">
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <button
                onClick={() => setShowHistorySidebar(true)}
                className="p-2 rounded-lg hover:bg-finsim-surfaceElevated dark:hover:bg-finsim-dark-surfaceElevated transition-colors"
                title="Analyse-Verlauf"
              >
                <Menu className="h-5 w-5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
              </button>
            )}
            <button
              onClick={() => {
                setAnalysis(null)
                setError(null)
                setUserGoal("")
              }}
              className="text-lg sm:text-xl font-semibold tracking-tight text-finsim-textMain dark:text-finsim-dark-textMain hover:text-finsim-primary dark:hover:text-finsim-dark-primary transition-colors cursor-pointer"
            >
              FinSim
            </button>
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-finsim-primaryLight dark:bg-finsim-dark-primaryLight text-finsim-primary dark:text-finsim-dark-primary font-medium tracking-wide uppercase">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <UserMenu onOpenProfile={() => setShowProfileSettings(true)} />
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Anmelden</span>
              </Button>
            )}
          </div>
        </header>

        {/* Main content */}
        <div className="space-y-8 sm:space-y-12">
          {!analysis && (
            <>
              <div className="text-center space-y-3 mb-12">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-finsim-textMain dark:text-finsim-dark-textMain text-balance">
                  Finanzszenarien
                </h2>
                <p className="text-base sm:text-lg text-finsim-textSecondary dark:text-finsim-dark-textSecondary max-w-2xl mx-auto leading-relaxed">
                  Analysiere deine Finanzen basierend auf deinen Zielen
                </p>
              </div>

              <div className="space-y-8">
                {/* Goal Input Section - Premium Redesign */}
                <section className="glass-effect premium-shadow rounded-[24px] p-8 sm:p-10 space-y-8 animate-fade-in-up">
                  {/* Header with more spacing */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-finsim-primary/10 to-purple-500/10 dark:from-finsim-dark-primary/20 dark:to-purple-500/20">
                        <Lightbulb className="h-5 w-5 text-finsim-primary dark:text-finsim-dark-primary" />
                      </div>
                      <h3 className="text-2xl font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
                        {greeting || "Dein finanzielles Ziel"}
                      </h3>
                    </div>
                    <p className="text-base text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed pl-11">
                      Beschreibe, was du erreichen möchtest oder welche finanzielle Entscheidung du treffen möchtest.
                    </p>
                  </div>

                  {/* Premium Input Field */}
                  <div className="space-y-4">
                    <textarea
                      id="goal"
                      value={userGoal}
                      onChange={(e) => setUserGoal(e.target.value)}
                      placeholder="Formuliere dein finanzielles Ziel … ich analysiere alles für dich."
                      className="glass-input premium-shadow premium-hover w-full min-h-[70px] rounded-[22px] text-finsim-textMain dark:text-finsim-dark-textMain py-5 px-6 text-base font-normal placeholder:text-finsim-textMuted/60 dark:placeholder:text-finsim-dark-textMuted/60 focus:outline-none focus:ring-2 focus:ring-finsim-primary/30 dark:focus:ring-finsim-dark-primary/30 focus:border-transparent transition-all duration-300 resize-none leading-relaxed"
                      disabled={isLoading}
                      style={{
                        fontSize: '16px',
                        lineHeight: '1.6',
                        fontWeight: 400
                      }}
                    />
                  </div>
                  
                  {/* Interactive Draggable Pills */}
                  <DraggablePills
                    questions={orderedExamplePrompts}
                    suggestedQuestions={suggestedQuestions}
                    onQuestionSelect={handleExampleClick}
                    onQuestionReorder={(reordered) => {
                      // Update only the example prompts (not suggested questions)
                      const exampleOnly = reordered.filter(q => EXAMPLE_PROMPTS.includes(q))
                      setOrderedExamplePrompts(exampleOnly.length > 0 ? exampleOnly : orderedExamplePrompts)
                    }}
                    isLoading={isLoading}
                  />
                </section>

                <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {analysis ? (
            <div id="finsim-analysis-root" className="space-y-6">
              {/* User Goal Display */}
              {userGoal && (
                <section className="glass-effect premium-shadow rounded-[24px] p-6 sm:p-8 bg-finsim-primaryLight/30 dark:bg-finsim-dark-primaryLight/30 animate-fade-in-up">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-finsim-primary dark:text-finsim-dark-primary flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <h3 className="text-sm font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wide">Dein Ziel</h3>
                      <p className="text-base text-finsim-textMain dark:text-finsim-dark-textMain">{userGoal}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Übersicht */}
              <section className="glass-effect premium-shadow rounded-[24px] p-6 sm:p-8 space-y-6 animate-fade-in-up">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">Finanzübersicht</h3>
                  <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
                    Basierend auf deinen hochgeladenen Daten
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary">Gesamteinnahmen</p>
                    <p className="text-xl font-semibold font-mono text-finsim-accent dark:text-finsim-dark-accent">
                      {analysis.finance_data.total_income.toFixed(2)} €
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary">Gesamtausgaben</p>
                    <p className="text-xl font-semibold font-mono text-red-500 dark:text-red-400">
                      {analysis.finance_data.total_expenses.toFixed(2)} €
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary">Aktuelles Guthaben</p>
                    <p className="text-xl font-semibold font-mono text-finsim-textMain dark:text-finsim-dark-textMain">
                      {analysis.finance_data.net_balance >= 0 ? "+" : ""}
                      {analysis.finance_data.net_balance.toFixed(2)} €
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary">Transaktionen</p>
                    <p className="text-xl font-semibold font-mono text-finsim-textMain dark:text-finsim-dark-textMain">
                      {analysis.finance_data.transaction_count}
                    </p>
                  </div>
                </div>
              </section>

              {/* Szenarien Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <ScenarioCard scenario={analysis.scenarios.best_case} type="best_case" />
                <ScenarioCard scenario={analysis.scenarios.realistic_case} type="realistic_case" />
                <ScenarioCard scenario={analysis.scenarios.worst_case} type="worst_case" />
              </div>

              {/* Charts */}
              <section className="glass-effect premium-shadow rounded-[24px] p-6 sm:p-8 space-y-6 animate-fade-in-up">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">Projektionen</h3>
                  <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">12-Monats-Vorschau der Szenarien</p>
                </div>
                <Tabs defaultValue="best_case" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 rounded-lg bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated p-1 border border-finsim-borderLight dark:border-finsim-dark-borderLight h-auto">
                    <TabsTrigger value="best_case" className="rounded-md data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm text-sm font-medium py-2.5 px-4 transition-all duration-200 data-[state=active]:font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 data-[state=active]:bg-emerald-600 dark:data-[state=active]:bg-emerald-400" />
                        Best Case
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="realistic_case" className="rounded-md data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm text-sm font-medium py-2.5 px-4 transition-all duration-200 data-[state=active]:font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 data-[state=active]:bg-blue-600 dark:data-[state=active]:bg-blue-400" />
                        Realistisch
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="worst_case" className="rounded-md data-[state=active]:bg-red-50 dark:data-[state=active]:bg-red-500/20 data-[state=active]:text-red-700 dark:data-[state=active]:text-red-400 data-[state=active]:shadow-sm text-sm font-medium py-2.5 px-4 transition-all duration-200 data-[state=active]:font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400 data-[state=active]:bg-red-600 dark:data-[state=active]:bg-red-400" />
                        Worst Case
                      </span>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="best_case" className="mt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                    <div className="bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border border-finsim-borderLight dark:border-finsim-dark-borderLight rounded-lg p-5 sm:p-6">
                      <ScenarioChart projections={analysis.scenarios.best_case.projections} title="Best Case Projektion" />
                    </div>
                  </TabsContent>
                  <TabsContent value="realistic_case" className="mt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                    <div className="bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border border-finsim-borderLight dark:border-finsim-dark-borderLight rounded-lg p-5 sm:p-6">
                      <ScenarioChart projections={analysis.scenarios.realistic_case.projections} title="Realistische Projektion" />
                    </div>
                  </TabsContent>
                  <TabsContent value="worst_case" className="mt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                    <div className="bg-finsim-surfaceElevated dark:bg-finsim-dark-surfaceElevated border border-finsim-borderLight dark:border-finsim-dark-borderLight rounded-lg p-5 sm:p-6">
                      <ScenarioChart projections={analysis.scenarios.worst_case.projections} title="Worst Case Projektion" />
                    </div>
                  </TabsContent>
                </Tabs>
              </section>

              {/* Finance Dashboard */}
              {analysis.finance_data.transactions.length > 0 && (
                <section className="mt-10">
                  <FinanceDashboard transactions={analysis.finance_data.transactions} />
                </section>
              )}

               {/* KI-Analysen - collapsible */}
               {analysis && (plausibilityText || tipsText) && (
                 <section className="glass-effect premium-shadow rounded-[24px] p-6 sm:p-8 space-y-6 animate-fade-in-up">
                   <button
                     onClick={() => setIsKIAnalysisExpanded(!isKIAnalysisExpanded)}
                     className="w-full flex items-center justify-between gap-3 group hover:opacity-80 transition-opacity"
                   >
                     <div className="flex items-center gap-3 flex-1 text-left">
                       <div className="p-2.5 rounded-2xl bg-gradient-to-br from-finsim-primary/10 to-purple-500/10 dark:from-finsim-dark-primary/20 dark:to-purple-500/20 backdrop-blur-sm">
                         <Brain className="h-5 w-5 text-finsim-primary dark:text-finsim-dark-primary" />
                       </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
                           Vertiefte Analyse & KI-Empfehlungen
                    </h3>
                    <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
                           {isPlausibilityFromLLM || isTipsFromLLM
                             ? "Individuelle Auswertung deiner Daten durch KI"
                             : "Individuelle Auswertung deiner Daten"}
                    </p>
                  </div>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="inline-flex items-center gap-2 rounded-full bg-finsim-primaryLight dark:bg-finsim-dark-primaryLight px-3 py-1.5">
                         <Brain className="h-3.5 w-3.5 text-finsim-primary dark:text-finsim-dark-primary" />
                         <span className="text-[10px] font-semibold uppercase tracking-wide text-finsim-primary dark:text-finsim-dark-primary">
                           {isPlausibilityFromLLM || isTipsFromLLM ? "KI" : "AI"}
                         </span>
                       </div>
                       {isKIAnalysisExpanded ? (
                         <ChevronUp className="h-5 w-5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary group-hover:text-finsim-primary dark:group-hover:text-finsim-dark-primary transition-colors" />
                       ) : (
                         <ChevronDown className="h-5 w-5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary group-hover:text-finsim-primary dark:group-hover:text-finsim-dark-primary transition-colors" />
                       )}
                     </div>
                   </button>

                   {isKIAnalysisExpanded && (
                     <div className="grid gap-6 md:grid-cols-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                     {plausibilityText && (
                       <div className="rounded-2xl glass-effect premium-shadow p-5 sm:p-6 space-y-4">
                         <div className="flex items-center gap-2">
                           <Sparkles className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary flex-shrink-0" />
                           <div className="space-y-0.5">
                             <p className="text-xs font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wide">
                               Plausibilitätsanalyse
                             </p>
                             <p className="text-[11px] text-finsim-textMuted dark:text-finsim-dark-textMuted">
                               Bewertung, wie realistisch die Szenarien im Kontext deines Ziels sind.
                             </p>
                           </div>
                         </div>
                         <div className="min-h-[400px] max-h-[1200px] overflow-y-auto pr-4 custom-scrollbar">
                           <div className={`prose prose-sm max-w-none ${
                             isPlausibilityFromLLM ? 'text-finsim-textMain dark:text-finsim-dark-textMain' : 'text-finsim-textSecondary dark:text-finsim-dark-textSecondary'
                           }`}>
                             {formatLLMText(plausibilityText).map((item, idx) => {
                               if (item.type === 'heading') {
                                 return (
                                   <h4 key={idx} className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain mt-8 mb-4 first:mt-0 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight pb-2">
                                     {item.content}
                                   </h4>
                                 )
                               }
                               if (item.type === 'subheading') {
                                 return (
                                   <h5 key={idx} className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain mt-6 mb-3 first:mt-0 uppercase tracking-wide">
                                     {item.content}
                                   </h5>
                                 )
                               }
                               if (item.type === 'numbered') {
                                 return (
                                   <div key={idx} className="flex gap-4 mb-5 group">
                                     <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-finsim-primary/20 dark:from-finsim-dark-primary/20 to-finsim-primary/10 dark:to-finsim-dark-primary/10 text-finsim-primary dark:text-finsim-dark-primary text-xs font-bold flex items-center justify-center mt-0.5 border border-finsim-primary/30 dark:border-finsim-dark-primary/30 shadow-sm group-hover:shadow transition-shadow">
                                       {item.number}
                                     </span>
                                     <div className="flex-1 pt-0.5">
                                       <p className="text-sm md:text-base leading-7 text-finsim-textMain dark:text-finsim-dark-textMain">
                                         {item.content}
                                       </p>
                                     </div>
                                   </div>
                                 )
                               }
                               if (item.type === 'bullet') {
                                 return (
                                   <div key={idx} className="flex gap-3 mb-3 pl-1">
                                     <span className="flex-shrink-0 w-2 h-2 rounded-full bg-finsim-primary dark:bg-finsim-dark-primary mt-2.5" />
                                     <p className="flex-1 text-sm md:text-base leading-7 text-finsim-textMain dark:text-finsim-dark-textMain">
                                       {item.content}
                                     </p>
                                   </div>
                                 )
                               }
                               return (
                                 <p key={idx} className="mb-5 last:mb-0 text-sm md:text-base leading-7 text-finsim-textMain dark:text-finsim-dark-textMain">
                                   {item.content}
                                 </p>
                               )
                             })}
                           </div>
                         </div>
                       </div>
                     )}

                     {tipsText && (
                       <div className="rounded-2xl glass-effect premium-shadow p-5 sm:p-6 space-y-5">
                         <div className="flex items-center gap-2">
                           <Sparkles className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary flex-shrink-0" />
                           <div className="space-y-0.5">
                             <p className="text-xs font-semibold text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wide">
                               Personalisierte Tipps
                             </p>
                             <p className="text-[11px] text-finsim-textMuted dark:text-finsim-dark-textMuted">
                               Konkrete Handlungsempfehlungen auf Basis deiner Einnahmen, Ausgaben und Ziele.
                             </p>
                           </div>
                  </div>
                  
                         {/* Парсим и отображаем советы */}
                         {(() => {
                           const parsedTips = parseTips(tipsText)
                           const formattedText = formatLLMText(tipsText)
                           
                           // Если нашли советы, показываем их красиво
                           if (parsedTips.length > 0) {
                             return (
                               <div className="space-y-4">
                                 {/* Показываем остальной контент (FAZIT, ANTWORT) */}
                                 <div className="space-y-4 pb-4 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight">
                                   {formattedText
                                     .filter(item => item.type !== 'numbered' || !parsedTips.some(tip => item.content.includes(tip.title)))
                                     .map((item, idx) => {
                                       if (item.type === 'heading') {
                                         return (
                                           <h4 key={idx} className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain mt-4 mb-3 first:mt-0">
                                             {item.content}
                                           </h4>
                                         )
                                       }
                                       if (item.type === 'bullet') {
                                         return (
                                           <div key={idx} className="flex gap-3 mb-2">
                                             <span className="flex-shrink-0 w-2 h-2 rounded-full bg-finsim-primary dark:bg-finsim-dark-primary mt-2.5" />
                                             <p className="flex-1 text-sm leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain">
                                               {item.content}
                                             </p>
                                           </div>
                                         )
                                       }
                                       if (item.type === 'paragraph' && item.content.length > 20) {
                                         return (
                                           <p key={idx} className="text-sm leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain mb-3">
                                             {item.content}
                                           </p>
                                         )
                                       }
                                       return null
                                     })}
                  </div>
                  
                                 {/* Красивые карточки с советами */}
                                 <div className="grid gap-3">
                                   {parsedTips.map((tip, idx) => (
                                     <motion.div
                                       key={idx}
                                       initial={{ opacity: 0, y: 10 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       transition={{ delay: idx * 0.1, duration: 0.4 }}
                                       className="group relative p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-finsim-borderLight dark:border-finsim-dark-borderLight hover:bg-white/80 dark:hover:bg-white/10 hover:border-finsim-primary/30 dark:hover:border-finsim-dark-primary/30 transition-all duration-300 hover:shadow-md"
                                     >
                                       <div className="flex items-start gap-3">
                                         <div className="text-2xl flex-shrink-0">{tip.emoji}</div>
                                         <div className="flex-1 space-y-1">
                                           <h5 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">
                                             {tip.title}
                                           </h5>
                                           <p className="text-xs leading-relaxed text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                                             {tip.description}
                                           </p>
                                         </div>
                                       </div>
                                     </motion.div>
                                   ))}
                                 </div>
                               </div>
                             )
                           }
                           
                           // Fallback: обычное отображение
                           return (
                             <div className="min-h-[400px] max-h-[1200px] overflow-y-auto pr-4 custom-scrollbar">
                               <div className={`prose prose-sm max-w-none ${
                                 isTipsFromLLM ? 'text-finsim-textMain dark:text-finsim-dark-textMain' : 'text-finsim-textSecondary dark:text-finsim-dark-textSecondary'
                               }`}>
                                 {formattedText.map((item, idx) => {
                                   if (item.type === 'heading') {
                                     return (
                                       <h4 key={idx} className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain mt-8 mb-4 first:mt-0 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight pb-2">
                                         {item.content}
                                       </h4>
                                     )
                                   }
                                   if (item.type === 'subheading') {
                                     return (
                                       <h5 key={idx} className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain mt-6 mb-3 first:mt-0 uppercase tracking-wide">
                                         {item.content}
                                       </h5>
                                     )
                                   }
                                   if (item.type === 'numbered') {
                                     return (
                                       <div key={idx} className="flex gap-4 mb-6 group hover:bg-finsim-surfaceElevated/50 dark:hover:bg-finsim-dark-surfaceElevated/50 rounded-lg p-3 -ml-3 transition-colors">
                                         <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-finsim-primary/25 dark:from-finsim-dark-primary/25 to-finsim-primary/15 dark:to-finsim-dark-primary/15 text-finsim-primary dark:text-finsim-dark-primary text-sm font-bold flex items-center justify-center mt-0.5 border-2 border-finsim-primary/30 dark:border-finsim-dark-primary/30 shadow-md group-hover:shadow-lg transition-all">
                                           {item.number}
                                         </span>
                                         <div className="flex-1 pt-0.5">
                                           <p className="text-sm md:text-base leading-7 text-finsim-textMain dark:text-finsim-dark-textMain">
                                             {item.content}
                                           </p>
                                         </div>
                                       </div>
                                     )
                                   }
                                   if (item.type === 'bullet') {
                                     return (
                                       <div key={idx} className="flex gap-3 mb-3 pl-1">
                                         <span className="flex-shrink-0 w-2 h-2 rounded-full bg-finsim-primary dark:bg-finsim-dark-primary mt-2.5" />
                                         <p className="flex-1 text-sm md:text-base leading-7 text-finsim-textMain dark:text-finsim-dark-textMain">
                                           {item.content}
                                         </p>
                                       </div>
                                     )
                                   }
                                   return (
                                     <p key={idx} className="mb-5 last:mb-0 text-sm md:text-base leading-7 text-finsim-textMain dark:text-finsim-dark-textMain">
                                       {item.content}
                                     </p>
                                   )
                                 })}
                               </div>
                             </div>
                           )
                         })()}
                       </div>
                     )}
                  </div>
                   )}
                </section>
              )}

               {/* Actions */}
               <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                 <button
                   onClick={() => {
                     setAnalysis(null)
                     setError(null)
                     setUserGoal("")
                   }}
                   className="inline-flex items-center justify-center rounded-lg bg-finsim-primary dark:bg-finsim-dark-primary text-white px-6 py-2.5 text-sm font-medium hover:bg-finsim-primaryHover dark:hover:bg-finsim-dark-primaryHover transition-colors"
                 >
                   Neue Analyse starten
                 </button>
                 <PdfExportButton
                   summary={{
                     goal: userGoal,
                     totalIncome: analysis.finance_data.total_income,
                     totalExpenses: analysis.finance_data.total_expenses,
                     netBalance: analysis.finance_data.net_balance,
                     bestTitle: analysis.scenarios.best_case.title,
                     bestFinal: analysis.scenarios.best_case.final_balance,
                     realisticTitle: analysis.scenarios.realistic_case.title,
                     realisticFinal: analysis.scenarios.realistic_case.final_balance,
                     worstTitle: analysis.scenarios.worst_case.title,
                     worstFinal: analysis.scenarios.worst_case.final_balance,
                   }}
                 />
               </div>
            </div>
          ) : null}
        </div>
      </div>
      <AuthModal 
        open={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={async () => {
          setShowAuthModal(false)
          // Wait a bit for token to be set, then check auth
          setTimeout(async () => {
            try {
              await checkAuth()
            } catch (error) {
              console.error("Failed to check auth after login:", error)
              // Don't show error to user, just log it
            }
          }, 200)
        }}
      />
        <ProfileSettings
          open={showProfileSettings}
          onClose={() => setShowProfileSettings(false)}
          onProfileSaved={handleProfileSaved}
        />
      {isAuthenticated && (
        <AnalysisHistorySidebar
          open={showHistorySidebar}
          onClose={() => setShowHistorySidebar(false)}
          onSelectAnalysis={handleSelectAnalysis}
        />
      )}
    </main>
  )
}

