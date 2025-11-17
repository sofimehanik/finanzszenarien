"use client"

import { useState } from "react"
import { FileUpload } from "@/components/FileUpload"
import { ScenarioCard } from "@/components/ScenarioCard"
import { ScenarioChart } from "@/components/ScenarioChart"
import { FinanceDashboard } from "@/components/FinanceDashboard"
import PdfExportButton from "@/components/PdfExportButton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { analyzeCSV, AnalysisResponse } from "@/lib/api"
import { AlertCircle, Lightbulb, Globe, User, Brain, Sparkles } from "lucide-react"

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
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userGoal, setUserGoal] = useState("")

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

  return (
    <main className="min-h-screen bg-finsim-surfaceMuted">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {/* Header */}
        <header className="flex items-center justify-between mb-12 sm:mb-16">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-finsim-textMain">FinSim</h1>
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-finsim-primaryLight text-finsim-primary font-medium tracking-wide uppercase">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg hover:bg-finsim-surface transition-colors">
              <Globe className="h-4 w-4 text-finsim-textSecondary" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-finsim-surface transition-colors">
              <User className="h-4 w-4 text-finsim-textSecondary" />
            </button>
          </div>
        </header>

        {/* Main content */}
        <div className="space-y-8 sm:space-y-12">
          {!analysis && (
            <>
              <div className="text-center space-y-3 mb-12">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-finsim-textMain text-balance">
                  Finanzszenarien
                </h2>
                <p className="text-base sm:text-lg text-finsim-textSecondary max-w-2xl mx-auto leading-relaxed">
                  Analysiere deine Finanzen basierend auf deinen Zielen
                </p>
              </div>

              <div className="space-y-6">
                {/* Goal Input Section */}
                <section className="bg-finsim-surface border border-finsim-border rounded-xl p-6 sm:p-8 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-finsim-primary" />
                      <h3 className="text-lg font-semibold text-finsim-textMain tracking-tight">
                        Dein finanzielles Ziel
                      </h3>
                    </div>
                    <p className="text-sm text-finsim-textSecondary leading-relaxed">
                      Beschreibe, was du erreichen möchtest oder welche finanzielle Entscheidung du treffen willst
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="goal" className="text-sm font-medium text-finsim-textMain">Ziel / Frage</Label>
                    <textarea
                      id="goal"
                      value={userGoal}
                      onChange={(e) => setUserGoal(e.target.value)}
                      placeholder="z.B. Kann ich mir eine monatliche Rate von 500€ für ein Auto leisten?"
                      className="w-full min-h-[120px] rounded-lg border border-finsim-border bg-finsim-surfaceElevated py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-finsim-primary/20 focus:border-finsim-primary transition resize-none"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-finsim-textSecondary uppercase tracking-wide">Beispiel-Fragen</Label>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_PROMPTS.map((example, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleExampleClick(example)}
                          disabled={isLoading}
                          className="text-xs px-3 py-1.5 rounded-md border border-finsim-borderLight bg-finsim-surfaceElevated text-finsim-textSecondary hover:border-finsim-border hover:bg-finsim-surface transition-colors text-left"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2.5 text-red-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {analysis ? (
            <div id="finsim-analysis-root" className="space-y-6">
              {/* User Goal Display */}
              {userGoal && (
                <section className="bg-finsim-primaryLight border border-finsim-border rounded-xl p-6 sm:p-8">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-finsim-primary flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <h3 className="text-sm font-medium text-finsim-textSecondary uppercase tracking-wide">Dein Ziel</h3>
                      <p className="text-base text-finsim-textMain">{userGoal}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Übersicht */}
              <section className="bg-finsim-surface border border-finsim-border rounded-xl p-6 sm:p-8 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-finsim-textMain tracking-tight">Finanzübersicht</h3>
                  <p className="text-sm text-finsim-textSecondary leading-relaxed">
                    Basierend auf deinen hochgeladenen Daten
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-finsim-textSecondary">Gesamteinnahmen</p>
                    <p className="text-xl font-semibold font-mono text-finsim-accent">
                      {analysis.finance_data.total_income.toFixed(2)} €
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-finsim-textSecondary">Gesamtausgaben</p>
                    <p className="text-xl font-semibold font-mono text-red-500">
                      {analysis.finance_data.total_expenses.toFixed(2)} €
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-finsim-textSecondary">Aktuelles Guthaben</p>
                    <p className="text-xl font-semibold font-mono text-finsim-textMain">
                      {analysis.finance_data.net_balance >= 0 ? "+" : ""}
                      {analysis.finance_data.net_balance.toFixed(2)} €
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-finsim-textSecondary">Transaktionen</p>
                    <p className="text-xl font-semibold font-mono text-finsim-textMain">
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
              <section className="bg-finsim-surface border border-finsim-border rounded-xl p-6 sm:p-8 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-finsim-textMain tracking-tight">Projektionen</h3>
                  <p className="text-sm text-finsim-textSecondary leading-relaxed">12-Monats-Vorschau der Szenarien</p>
                </div>
                <Tabs defaultValue="best_case" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 rounded-lg bg-finsim-surfaceElevated p-1 border border-finsim-borderLight h-auto">
                    <TabsTrigger value="best_case" className="rounded-md data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm text-sm font-medium py-2.5 px-4 transition-all duration-200 data-[state=active]:font-semibold">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 data-[state=active]:bg-emerald-600" />
                        Best Case
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="realistic_case" className="rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm text-sm font-medium py-2.5 px-4 transition-all duration-200 data-[state=active]:font-semibold">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 data-[state=active]:bg-blue-600" />
                        Realistisch
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="worst_case" className="rounded-md data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:shadow-sm text-sm font-medium py-2.5 px-4 transition-all duration-200 data-[state=active]:font-semibold">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 data-[state=active]:bg-red-600" />
                        Worst Case
                      </span>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="best_case" className="mt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                    <div className="bg-finsim-surfaceElevated border border-finsim-borderLight rounded-lg p-5 sm:p-6">
                      <ScenarioChart projections={analysis.scenarios.best_case.projections} title="Best Case Projektion" />
                    </div>
                  </TabsContent>
                  <TabsContent value="realistic_case" className="mt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                    <div className="bg-finsim-surfaceElevated border border-finsim-borderLight rounded-lg p-5 sm:p-6">
                      <ScenarioChart projections={analysis.scenarios.realistic_case.projections} title="Realistische Projektion" />
                    </div>
                  </TabsContent>
                  <TabsContent value="worst_case" className="mt-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                    <div className="bg-finsim-surfaceElevated border border-finsim-borderLight rounded-lg p-5 sm:p-6">
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

               {/* KI-Analysen - всегда показываем, если есть анализ */}
               {analysis && (plausibilityText || tipsText) && (
                 <section className="bg-finsim-surface border border-finsim-border rounded-xl p-6 sm:p-8 space-y-6">
                   <div className="flex items-center justify-between gap-3">
                     <div className="space-y-1">
                       <h3 className="text-lg font-semibold text-finsim-textMain tracking-tight">
                         Vertiefte Analyse & KI-Empfehlungen
                       </h3>
                       <p className="text-sm text-finsim-textSecondary leading-relaxed">
                         {isPlausibilityFromLLM || isTipsFromLLM
                           ? "Individuelle Auswertung deiner Daten durch KI"
                           : "Individuelle Auswertung deiner Daten"}
                       </p>
                     </div>
                     <div className="inline-flex items-center gap-2 rounded-full bg-finsim-primaryLight px-3 py-1">
                       <Brain className="h-4 w-4 text-finsim-primary" />
                       <span className="text-[11px] font-semibold uppercase tracking-wide text-finsim-primary">
                         {isPlausibilityFromLLM || isTipsFromLLM ? "KI-Analyse" : "Analyse"}
                       </span>
                     </div>
                   </div>

                   <div className="grid gap-6 md:grid-cols-2">
                     {plausibilityText && (
                       <div className="rounded-2xl bg-finsim-surfaceElevated border border-finsim-borderLight p-5 sm:p-6 space-y-4">
                         <div className="flex items-center gap-2">
                           <Sparkles className="h-4 w-4 text-finsim-primary flex-shrink-0" />
                           <div className="space-y-0.5">
                             <p className="text-xs font-semibold text-finsim-textSecondary uppercase tracking-wide">
                               Plausibilitätsanalyse
                             </p>
                             <p className="text-[11px] text-finsim-textMuted">
                               Bewertung, wie realistisch die Szenarien im Kontext deines Ziels sind.
                             </p>
                           </div>
                         </div>
                         <div className="min-h-[400px] max-h-[1200px] overflow-y-auto pr-4 custom-scrollbar">
                           <div className={`prose prose-sm max-w-none ${
                             isPlausibilityFromLLM ? 'text-finsim-textMain' : 'text-finsim-textSecondary'
                           }`}>
                             {formatLLMText(plausibilityText).map((item, idx) => {
                               if (item.type === 'heading') {
                                 return (
                                   <h4 key={idx} className="text-base font-semibold text-finsim-textMain mt-8 mb-4 first:mt-0 border-b border-finsim-borderLight pb-2">
                                     {item.content}
                                   </h4>
                                 )
                               }
                               if (item.type === 'subheading') {
                                 return (
                                   <h5 key={idx} className="text-sm font-semibold text-finsim-textMain mt-6 mb-3 first:mt-0 uppercase tracking-wide">
                                     {item.content}
                                   </h5>
                                 )
                               }
                               if (item.type === 'numbered') {
                                 return (
                                   <div key={idx} className="flex gap-4 mb-5 group">
                                     <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-finsim-primary/20 to-finsim-primary/10 text-finsim-primary text-xs font-bold flex items-center justify-center mt-0.5 border border-finsim-primary/30 shadow-sm group-hover:shadow transition-shadow">
                                       {item.number}
                                     </span>
                                     <div className="flex-1 pt-0.5">
                                       <p className="text-sm md:text-base leading-7 text-finsim-textMain">
                                         {item.content}
                                       </p>
                                     </div>
                                   </div>
                                 )
                               }
                               if (item.type === 'bullet') {
                                 return (
                                   <div key={idx} className="flex gap-3 mb-3 pl-1">
                                     <span className="flex-shrink-0 w-2 h-2 rounded-full bg-finsim-primary mt-2.5" />
                                     <p className="flex-1 text-sm md:text-base leading-7 text-finsim-textMain">
                                       {item.content}
                                     </p>
                                   </div>
                                 )
                               }
                               return (
                                 <p key={idx} className="mb-5 last:mb-0 text-sm md:text-base leading-7 text-finsim-textMain">
                                   {item.content}
                                 </p>
                               )
                             })}
                           </div>
                         </div>
                       </div>
                     )}

                     {tipsText && (
                       <div className="rounded-2xl bg-finsim-primarySoft/40 border border-finsim-borderLight p-5 sm:p-6 space-y-4">
                         <div className="flex items-center gap-2">
                           <Sparkles className="h-4 w-4 text-finsim-primary flex-shrink-0" />
                           <div className="space-y-0.5">
                             <p className="text-xs font-semibold text-finsim-textSecondary uppercase tracking-wide">
                               Personalisierte Tipps
                             </p>
                             <p className="text-[11px] text-finsim-textMuted">
                               Konkrete Handlungsempfehlungen auf Basis deiner Einnahmen, Ausgaben und Ziele.
                             </p>
                           </div>
                         </div>
                         <div className="min-h-[400px] max-h-[1200px] overflow-y-auto pr-4 custom-scrollbar">
                           <div className={`prose prose-sm max-w-none ${
                             isTipsFromLLM ? 'text-finsim-textMain' : 'text-finsim-textSecondary'
                           }`}>
                             {formatLLMText(tipsText).map((item, idx) => {
                               if (item.type === 'heading') {
                                 return (
                                   <h4 key={idx} className="text-base font-semibold text-finsim-textMain mt-8 mb-4 first:mt-0 border-b border-finsim-borderLight pb-2">
                                     {item.content}
                                   </h4>
                                 )
                               }
                               if (item.type === 'subheading') {
                                 return (
                                   <h5 key={idx} className="text-sm font-semibold text-finsim-textMain mt-6 mb-3 first:mt-0 uppercase tracking-wide">
                                     {item.content}
                                   </h5>
                                 )
                               }
                               if (item.type === 'numbered') {
                                 return (
                                   <div key={idx} className="flex gap-4 mb-6 group hover:bg-finsim-surfaceElevated/50 rounded-lg p-3 -ml-3 transition-colors">
                                     <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-finsim-primary/25 to-finsim-primary/15 text-finsim-primary text-sm font-bold flex items-center justify-center mt-0.5 border-2 border-finsim-primary/30 shadow-md group-hover:shadow-lg transition-all">
                                       {item.number}
                                     </span>
                                     <div className="flex-1 pt-0.5">
                                       <p className="text-sm md:text-base leading-7 text-finsim-textMain">
                                         {item.content}
                                       </p>
                                     </div>
                                   </div>
                                 )
                               }
                               if (item.type === 'bullet') {
                                 return (
                                   <div key={idx} className="flex gap-3 mb-3 pl-1">
                                     <span className="flex-shrink-0 w-2 h-2 rounded-full bg-finsim-primary mt-2.5" />
                                     <p className="flex-1 text-sm md:text-base leading-7 text-finsim-textMain">
                                       {item.content}
                                     </p>
                                   </div>
                                 )
                               }
                               return (
                                 <p key={idx} className="mb-5 last:mb-0 text-sm md:text-base leading-7 text-finsim-textMain">
                                   {item.content}
                                 </p>
                               )
                             })}
                           </div>
                         </div>
                       </div>
                     )}
                   </div>
                 </section>
               )}

               {/* Actions */}
               <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                 <button
                   onClick={() => {
                     setAnalysis(null)
                     setError(null)
                   }}
                   className="inline-flex items-center justify-center rounded-lg bg-finsim-primary text-white px-6 py-2.5 text-sm font-medium hover:bg-finsim-primaryHover transition-colors"
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
    </main>
  )
}

