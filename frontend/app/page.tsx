"use client"

import React, { useState, useEffect, useRef } from "react"
import { FileUpload } from "@/components/FileUpload"
import { ScenarioOverview } from "@/components/ScenarioOverview"
import { ScenarioChart } from "@/components/ScenarioChart"
import { FinanceDashboard } from "@/components/FinanceDashboard"
import PdfExportButton from "@/components/PdfExportButton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { analyzeCSV, AnalysisResponse, getSuggestedQuestions, getTipDetails, updateUserProfile } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { AlertCircle, Lightbulb, Globe, User, Brain, Sparkles, LogOut, Menu, ChevronDown, ChevronUp, X, Loader2, TrendingUp, TrendingDown, FileText, CheckCircle, ArrowUp, ArrowDown, Minus, Edit2, Check, BarChart3, Target, Info, ArrowRight, Zap, Shield } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AuthModal } from "@/components/AuthModal"
import { ProfileSettings } from "@/components/ProfileSettings"
import { AnalysisHistorySidebar } from "@/components/AnalysisHistorySidebar"
import { UserMenu } from "@/components/UserMenu"
import { DraggablePills } from "@/components/DraggablePills"
import { QuizModal } from "@/components/QuizModal"
import { FinSimLogo } from "@/components/FinSimLogo"

const EXAMPLE_PROMPTS = [
  "Kann ich 500€ Autokredit monatlich stemmen?",
  "Schaffe ich 10.000€ in 12 Monaten zu sparen?",
  "Sind 800€ Miete mit meinem Budget drin?",
  "Wie erreiche ich 5.000€ Notgroschen in 6 Monaten?",
  "Reicht mein Budget für einen größeren Umzug?",
]

// Fallback подсказки на случай, если LLM не работает
const FALLBACK_TIPS = [
  {
    emoji: '🛡️',
    title: 'Notgroschen aufbauen',
    description: 'Sichere dich mit 3-6 Monatsausgaben ab.'
  },
  {
    emoji: '📊',
    title: 'Ausgaben analysieren',
    description: 'Erkenne Sparpotentiale durch Tracking.'
  },
  {
    emoji: '🎯',
    title: 'Sparziele definieren',
    description: 'Setze konkrete Ziele mit Zeitrahmen.'
  },
  {
    emoji: '💳',
    title: 'Schulden priorisieren',
    description: 'Tilge zuerst hohe Zinssätze.'
  },
  {
    emoji: '📈',
    title: 'Langfristig investieren',
    description: 'Baue Vermögen durch regelmäßige Anlagen auf.'
  },
  {
    emoji: '✂️',
    title: 'Kosten optimieren',
    description: 'Kündige ungenutzte Abos und vergleiche Preise.'
  }
]

// Детальные подсказки для fallback tips
function getFallbackTipDetails(tipTitle: string): string {
  const details: Record<string, string> = {}
  
  details['Notgroschen aufbauen'] = `Ein Notgroschen ist dein finanzielles Sicherheitsnetz für unerwartete Situationen.

**Warum ist das wichtig?**
Ein Notgroschen schützt dich vor unerwarteten Ausgaben wie Autoreparaturen, medizinischen Notfällen oder Jobverlust. Ohne Notgroschen musst du möglicherweise Kredite aufnehmen oder wichtige Ausgaben verschieben.

**Konkrete Schritte:**
1. **Ziel setzen**: Beginne mit einem Notgroschen von 1.000-2.000€. Langfristig solltest du 3-6 Monatsausgaben ansparen.
2. **Separates Konto**: Eröffne ein separates Sparkonto nur für den Notgroschen, damit du nicht in Versuchung kommst, das Geld auszugeben.
3. **Automatisches Sparen**: Richte einen Dauerauftrag ein, der monatlich einen festen Betrag auf dein Notgroschen-Konto überweist.
4. **Priorität**: Spare zuerst für den Notgroschen, bevor du andere Investitionen tätigst.

**Erwartete Ergebnisse:**
Mit einem Notgroschen hast du finanzielle Sicherheit und musst bei unerwarteten Ausgaben keine Schulden machen. Das gibt dir auch psychologische Ruhe und mehr Flexibilität bei finanziellen Entscheidungen.`
  
  details['Ausgaben analysieren'] = `Ein Haushaltsbuch hilft dir, deine Finanzen vollständig zu verstehen.

**Warum ist das wichtig?**
Viele Menschen wissen nicht genau, wohin ihr Geld fließt. Durch das Tracking deiner Ausgaben erkennst du, wo du Geld verschwendest und wo du sparen kannst. Es ist der erste Schritt zu besserer Finanzkontrolle.

**Konkrete Schritte:**
1. **Methode wählen**: Nutze eine App (wie Finanzguru, YNAB) oder ein einfaches Excel-Sheet. Wichtig ist Konsistenz.
2. **Kategorien erstellen**: Teile deine Ausgaben in Kategorien ein (Lebensmittel, Freizeit, Transport, etc.).
3. **Jede Ausgabe erfassen**: Trage jede Ausgabe sofort ein - auch kleine Beträge summieren sich.
4. **Monatlich auswerten**: Am Ende jedes Monats analysiere, wo das meiste Geld hinfließt und wo du sparen kannst.

**Erwartete Ergebnisse:**
Nach 2-3 Monaten wirst du klare Muster erkennen und kannst gezielt an deinen größten Ausgabenposten arbeiten. Oft finden Menschen so 100-300€ monatliches Sparpotential.`
  
  details['Sparziele definieren'] = `Konkrete Sparziele motivieren und geben deinem Sparen eine Richtung.

**Warum ist das wichtig?**
Ohne klare Ziele ist Sparen schwierig - du weißt nicht, wofür du sparst und wie viel du brauchst. Konkrete Ziele machen Sparen greifbar und motivierend.

**Konkrete Schritte:**
1. **SMART-Ziele formulieren**: Spezifisch, Messbar, Erreichbar, Relevant, Terminiert. Beispiel: "Ich spare 5.000€ für einen Urlaub bis Dezember 2024."
2. **Zeitrahmen setzen**: Definiere, bis wann du dein Ziel erreichen willst.
3. **Monatliche Sparrate berechnen**: Teile dein Ziel durch die Anzahl der Monate. Beispiel: 5.000€ in 10 Monaten = 500€/Monat.
4. **Fortschritt tracken**: Überprüfe monatlich, ob du auf Kurs bist, und passe bei Bedarf an.

**Erwartete Ergebnisse:**
Mit klaren Sparzielen wirst du disziplinierter sparen und schneller deine finanziellen Wünsche erreichen. Du siehst deinen Fortschritt und bleibst motiviert.`
  
  details['Schulden priorisieren'] = `Die Tilgung von Schulden mit hohen Zinsen sollte Priorität haben.

**Warum ist das wichtig?**
Schulden mit hohen Zinsen (wie Kreditkarten oder Dispokredite) kosten dich viel Geld. Jeder Euro, den du für Zinsen zahlst, fehlt dir für Sparen oder Investitionen. Die Zinsen können deine Schulden schnell wachsen lassen.

**Konkrete Schritte:**
1. **Schulden auflisten**: Erstelle eine Liste aller deiner Schulden mit Zinssätzen und Restschulden.
2. **Priorisieren**: Beginne mit der Schuld mit dem höchsten Zinssatz (Avalanche-Methode) oder der kleinsten Schuld für schnelle Erfolge (Snowball-Methode).
3. **Mehr tilgen**: Zahle mehr als die Mindestrate, wenn möglich. Jeder zusätzliche Euro reduziert die Zinslast.
4. **Umschulden prüfen**: Prüfe, ob du Schulden mit hohen Zinsen zu einem günstigeren Kredit umschulden kannst.

**Erwartete Ergebnisse:**
Durch die Reduzierung von Schulden sparst du langfristig viel Geld an Zinsen. Sobald Schulden getilgt sind, steht dir mehr Geld für Sparen und Investitionen zur Verfügung.`
  
  details['Langfristig investieren'] = `Langfristige Investitionen helfen dir, dein Vermögen zu vermehren.

**Warum ist das wichtig?**
Geld auf dem Sparbuch verliert durch Inflation an Wert. Investitionen können dir helfen, langfristig Vermögen aufzubauen und deine finanziellen Ziele schneller zu erreichen. Je früher du beginnst, desto mehr profitierst du vom Zinseszinseffekt.

**Konkrete Schritte:**
1. **Bildung**: Lese Bücher, höre Podcasts oder besuche Kurse über Investitionen. Verstehe die Grundlagen von Aktien, ETFs und Anleihen.
2. **Kleinstbeträge starten**: Beginne mit kleinen Beträgen, um Erfahrung zu sammeln, ohne große Risiken einzugehen.
3. **Diversifikation**: Streue deine Investitionen über verschiedene Anlageklassen und Regionen.
4. **Langfristig denken**: Investitionen brauchen Zeit. Plane für mindestens 5-10 Jahre.

**Erwartete Ergebnisse:**
Mit Wissen und Erfahrung kannst du langfristig bessere Renditen erzielen als mit einem Sparbuch. Selbst kleine regelmäßige Investitionen können über Jahre zu erheblichem Vermögen werden.`
  
  details['Kosten optimieren'] = `Regelmäßige Überprüfung deiner Ausgaben kann viel Geld sparen.

**Warum ist das wichtig?**
Viele Menschen zahlen monatlich für Dinge, die sie nicht mehr nutzen - Abos, Versicherungen, Mitgliedschaften. Diese "stillen Ausgaben" summieren sich schnell zu hunderten von Euros pro Jahr.

**Konkrete Schritte:**
1. **Abos prüfen**: Gehe durch alle deine Abos (Streaming, Apps, Magazine) und kündige, was du nicht mehr nutzt.
2. **Versicherungen vergleichen**: Prüfe jährlich deine Versicherungen und vergleiche Preise. Oft findest du günstigere Alternativen.
3. **Energiekosten senken**: Wechsle zu einem günstigeren Strom- oder Gasanbieter. Kleine Änderungen im Verbrauch helfen auch.
4. **Bankgebühren minimieren**: Prüfe, ob du Gebühren zahlst, die du vermeiden kannst. Viele Banken bieten kostenlose Konten an.

**Erwartete Ergebnisse:**
Durch regelmäßige Optimierung kannst du oft 200-500€ pro Jahr sparen, ohne auf etwas verzichten zu müssen. Das Geld kannst du dann für deine Sparziele nutzen.`
  
  return details[tipTitle] || 'Detaillierte Informationen zu dieser Empfehlung.'
}

// Функция для обработки текста с числами и markdown форматированием
function renderFormattedText(text: string, partIdx: number = 0): React.ReactNode[] {
  if (!text) return [<span key={`text-${partIdx}`}>{text}</span>]
  
  // Разбиваем на числа, жирный текст и обычный текст
  const parts = text.split(/(\d+[€%]?|\d+\.\d+[€%]?|\*\*[^*]+\*\*)/g)
  
  return parts.map((part, idx) => {
    const key = `${partIdx}-${idx}`
    
    // Подсвечиваем числа
    if (/^\d+[€%]?$/.test(part) || /^\d+\.\d+[€%]?$/.test(part)) {
      return (
        <span key={key} className="font-bold text-finsim-primary dark:text-finsim-dark-primary">
          {part}
        </span>
      )
    }
    
    // Обрабатываем жирный текст **text**
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      const boldText = part.replace(/\*\*/g, '')
      return (
        <strong key={key} className="font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">
          {boldText}
        </strong>
      )
    }
    
    // Обрабатываем обычный текст с возможными вложенными markdown элементами
    const boldRegex = /\*\*([^*]+)\*\*/g
    const elements: React.ReactNode[] = []
    let lastIndex = 0
    let match
    
    while ((match = boldRegex.exec(part)) !== null) {
      // Добавляем текст до жирного
      if (match.index > lastIndex) {
        elements.push(part.substring(lastIndex, match.index))
      }
      // Добавляем жирный текст
      elements.push(
        <strong key={`${key}-bold-${match.index}`} className="font-semibold text-finsim-textMain dark:text-finsim-dark-textMain">
          {match[1]}
        </strong>
      )
      lastIndex = match.index + match[0].length
    }
    
    // Добавляем оставшийся текст
    if (lastIndex < part.length) {
      elements.push(part.substring(lastIndex))
    }
    
    return elements.length > 0 ? (
      <React.Fragment key={key}>
        {elements.map((el, elIdx) => 
          typeof el === 'string' ? <span key={`${key}-${elIdx}`}>{el}</span> : el
        )}
      </React.Fragment>
    ) : (
      <span key={key}>{part}</span>
    )
  })
}

// Функция для очистки markdown форматирования и улучшения читаемости
function cleanMarkdownText(text: string): string {
  if (!text) return text
  
  return text
    // Убираем жирный текст **text** -> text (для старой функции)
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
// Улучшенная функция для извлечения эмодзи (поддерживает все современные эмодзи)
function extractEmoji(text: string): { emoji: string; rest: string } {
  if (!text) return { emoji: '💡', rest: text }
  
  // Более полный regex для эмодзи (включая все современные эмодзи)
  // Поддерживает: базовые эмодзи, флаги, скины, комбинированные эмодзи
  // Используем совместимый подход без Unicode property escapes
  
  // Сначала пробуем найти комбинированные эмодзи (флаги, скины, ZWJ)
  // Флаги (2 пары surrogate pairs)
  const flagMatch = text.match(/^[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/)
  if (flagMatch) {
    return { emoji: flagMatch[0], rest: text.substring(flagMatch[0].length).trim() }
  }
  
  // Комбинированные эмодзи с ZWJ (например, 👨‍💻)
  const zwjMatch = text.match(/^[\uD83C-\uD83E][\uDC00-\uDFFF]\u200D[\uD83C-\uD83E][\uDC00-\uDFFF]/)
  if (zwjMatch) {
    return { emoji: zwjMatch[0], rest: text.substring(zwjMatch[0].length).trim() }
  }
  
  // Эмодзи с модификатором скина (например, 👍🏻)
  const skinToneMatch = text.match(/^[\uD83C-\uD83E][\uDC00-\uDFFF][\uD83C][\uDFFB-\uDFFF]/)
  if (skinToneMatch) {
    return { emoji: skinToneMatch[0], rest: text.substring(skinToneMatch[0].length).trim() }
  }
  
  // Обычные эмодзи (surrogate pairs)
  const emojiMatch = text.match(/^[\uD83C-\uD83E][\uDC00-\uDFFF]/)
  if (emojiMatch) {
    return { emoji: emojiMatch[0], rest: text.substring(emojiMatch[0].length).trim() }
  }
  
  // Базовые символы эмодзи (Unicode блоки)
  const basicEmojiMatch = text.match(/^[\u2600-\u26FF\u2700-\u27BF\u2190-\u21FF\u2300-\u23FF\u2B50-\u2B55\u3030-\u303F]/)
  if (basicEmojiMatch) {
    return { emoji: basicEmojiMatch[0], rest: text.substring(basicEmojiMatch[0].length).trim() }
  }
  
  // Специальные эмодзи для Plausibilitätsanalyse (⚠️, 💡, 🎯)
  // ⚠️ = U+26A0 U+FE0F (variation selector)
  // 💡 = U+1F4A1
  // 🎯 = U+1F3AF
  const warningMatch = text.match(/^⚠️|^⚠/)
  if (warningMatch) {
    return { emoji: '⚠️', rest: text.substring(warningMatch[0].length).trim() }
  }
  
  const lightbulbMatch = text.match(/^💡/)
  if (lightbulbMatch) {
    return { emoji: '💡', rest: text.substring(lightbulbMatch[0].length).trim() }
  }
  
  const targetMatch = text.match(/^🎯/)
  if (targetMatch) {
    return { emoji: '🎯', rest: text.substring(targetMatch[0].length).trim() }
  }
  
  return { emoji: '💡', rest: text }
}

function parseTips(text: string): Array<{ emoji: string; title: string; description: string }> {
  if (!text) return []
  
  const tips: Array<{ emoji: string; title: string; description: string }> = []
  const lines = text.split('\n')
  
  // Ищем секцию TIPPS или Tipps
  let inTipsSection = false
  const tipsSectionStart = /^(TIPPS|Tipps|TIPPS:|Tipps:|PERSONALISIERTE TIPPS|Personalisiert|Tipps für dich)/i
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (tipsSectionStart.test(line)) {
      inTipsSection = true
      continue
    }
    
    // Если встретили новый заголовок после секции TIPPS, останавливаемся
    if (inTipsSection && /^[A-ZÄÖÜ][A-ZÄÖÜ\s]+:?$/.test(line) && !/^\d+\./.test(line)) {
      break
    }
    
    if (inTipsSection && line) {
      // Парсим формат: "1. [Emoji] [Titel] - [Beschreibung]"
      const tipMatch = line.match(/^\d+\.\s*(.+?)\s*-\s*(.+)$/)
      if (tipMatch) {
        const fullContent = tipMatch[1].trim()
        const description = tipMatch[2].trim()
        
        // Извлекаем эмодзи
        const { emoji, rest } = extractEmoji(fullContent)
        const title = rest || fullContent
        
        if (title && description) {
          tips.push({ emoji, title, description })
        }
      } else {
        // Альтернативный формат: "1. [Emoji] [Titel] [Beschreibung]" (без тире)
        const altMatch = line.match(/^\d+\.\s*(.+)$/)
        if (altMatch) {
          const content = altMatch[1].trim()
          
          // Извлекаем эмодзи
          const { emoji, rest } = extractEmoji(content)
          
          // Пытаемся найти разделитель между заголовком и описанием
          // Ищем точку, двоеточие или просто разделяем по длине
          const colonIndex = rest.indexOf(':')
          const dotIndex = rest.indexOf('.')
          
          let title = rest
          let description = ''
          
          if (colonIndex > 0 && colonIndex < 50) {
            title = rest.substring(0, colonIndex).trim()
            description = rest.substring(colonIndex + 1).trim()
          } else if (dotIndex > 0 && dotIndex < 50) {
            title = rest.substring(0, dotIndex).trim()
            description = rest.substring(dotIndex + 1).trim()
          } else {
            // Разделяем по словам: первые 3-6 слов = заголовок
            const words = rest.split(/\s+/)
            if (words.length > 3) {
              const titleWords = words.slice(0, Math.min(6, Math.floor(words.length / 2)))
              title = titleWords.join(' ')
              description = words.slice(titleWords.length).join(' ')
            } else {
              title = rest
            }
          }
          
          if (title) {
            tips.push({
              emoji,
              title: title.trim(),
              description: description.trim() || title.trim()
            })
          }
        }
      }
    }
  }
  
  // Если не нашли в секции TIPPS, ищем нумерованные списки в конце текста
  if (tips.length === 0) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim()
      
      // Парсим формат с тире
      const tipMatch = line.match(/^\d+\.\s*(.+?)\s*-\s*(.+)$/)
      if (tipMatch) {
        const fullContent = tipMatch[1].trim()
        const description = tipMatch[2].trim()
        const { emoji, rest } = extractEmoji(fullContent)
        const title = rest || fullContent
        
        if (title && description) {
          tips.unshift({ emoji, title, description })
          if (tips.length >= 6) break
        }
      } else {
        // Парсим формат без тире
        const altMatch = line.match(/^\d+\.\s*(.+)$/)
        if (altMatch) {
          const content = altMatch[1].trim()
          const { emoji, rest } = extractEmoji(content)
          
          // Простое разделение
          const words = rest.split(/\s+/)
          const titleWords = words.slice(0, Math.min(6, words.length))
          const descWords = words.slice(titleWords.length)
          
          tips.unshift({
            emoji,
            title: titleWords.join(' ').trim() || rest,
            description: descWords.join(' ').trim() || rest
          })
          if (tips.length >= 6) break
        }
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
  const monthlySavings = avgIncome - avgExpenses
  const savingsRate = avgIncome > 0 ? (monthlySavings / avgIncome * 100) : 0
  
  // Определяем, какое сценарий наиболее реалистично
  let mostRealistic = 'Realistic Case'
  let realisticReason = 'deinen durchschnittlichen Einnahmen und Ausgaben'
  
  if (savingsRate > 20) {
    mostRealistic = 'Best Case'
    realisticReason = 'deiner hohen Sparrate'
  } else if (savingsRate < 5) {
    mostRealistic = 'Worst Case'
    realisticReason = 'deiner geringen Sparrate und möglichen Schwankungen'
  }

  const paragraphs = [
    userGoal
      ? `Basierend auf deinem Ziel "${userGoal}" und deinen aktuellen Finanzdaten zeigt die Analyse drei mögliche Entwicklungen. Das ${mostRealistic} erscheint am wahrscheinlichsten, da es ${realisticReason} entspricht.`
      : `Basierend auf deinen aktuellen Finanzdaten zeigt die Analyse drei mögliche Entwicklungen. Das ${mostRealistic} erscheint am wahrscheinlichsten, da es ${realisticReason} entspricht.`,
    `⚠️ Das Realistic Case mit monatlich ${realistic.monthly_savings.toFixed(2)}€ Ersparnissen und einem Endguthaben von ${realistic.final_balance.toFixed(2)}€ nach 12 Monaten basiert auf deinen Durchschnittswerten (Einnahmen: ${avgIncome.toFixed(2)}€, Ausgaben: ${avgExpenses.toFixed(2)}€). Dieses Szenario erfordert Disziplin und regelmäßige Kontrolle deiner Ausgaben.`,
    `🎯 Um dein Ziel zu erreichen, solltest du besonders auf unerwartete Ausgaben achten und deine Sparrate von ${monthlySavings.toFixed(2)}€ pro Monat (${savingsRate.toFixed(1)}% Sparrate) beibehalten oder wenn möglich erhöhen. Der Best Case (${best.final_balance.toFixed(2)}€) ist erreichbar, wenn du Ausgaben optimierst, während der Worst Case (${worst.final_balance.toFixed(2)}€) zeigt, was bei unerwarteten Kosten passieren kann.`
  ]
  
  return paragraphs.join("\n\n")
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
  const [monthsAhead, setMonthsAhead] = useState<number>(12)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [scenarioSliderValue, setScenarioSliderValue] = useState(50) // For interactive range slider
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [isQuizOpen, setIsQuizOpen] = useState(false)
  const [showHistorySidebar, setShowHistorySidebar] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [orderedExamplePrompts, setOrderedExamplePrompts] = useState<string[]>(EXAMPLE_PROMPTS)
  const [selectedTip, setSelectedTip] = useState<{ emoji: string; title: string; description: string } | null>(null)
  const [tipDetails, setTipDetails] = useState<string | null>(null)
  const [isLoadingTipDetails, setIsLoadingTipDetails] = useState(false)
  const [editingQuizField, setEditingQuizField] = useState<string | null>(null)
  const [quizEditValues, setQuizEditValues] = useState<Record<string, string>>({})
  const [isSavingQuiz, setIsSavingQuiz] = useState(false)
  
  // Greeting variations for authenticated users - random on each page load/refresh
  const [greeting, setGreeting] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  
  // Refs for scroll tracking
  const heroRef = useRef<HTMLElement>(null)
  const fileUploadRef = useRef<HTMLDivElement>(null)
  const financeSummaryRef = useRef<HTMLElement>(null)
  const projectionsRef = useRef<HTMLElement>(null)
  const deepAnalysisRef = useRef<HTMLElement>(null)

  // Scroll tracking with Intersection Observer (macOS style - background gradient shift)
  useEffect(() => {
    if (!analysis) {
      // Only track sections when no analysis is shown
      const sections = [
        { id: 'hero', ref: heroRef },
        { id: 'fileUpload', ref: fileUploadRef },
      ].filter(s => s.ref.current)

      const observers = sections.map(({ id, ref }) => {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.15) {
              setActiveSection(id)
            }
          },
          {
            threshold: [0, 0.15, 0.3, 0.5, 0.7, 1],
            rootMargin: '-10% 0px -10% 0px',
          }
        )

        if (ref.current) {
          observer.observe(ref.current)
        }

        return observer
      })

      return () => {
        observers.forEach(observer => observer.disconnect())
      }
    } else {
      // Track analysis sections
      const sections = [
        { id: 'financeSummary', ref: financeSummaryRef },
        { id: 'projections', ref: projectionsRef },
        { id: 'deepAnalysis', ref: deepAnalysisRef },
      ].filter(s => s.ref.current)

      const observers = sections.map(({ id, ref }) => {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.15) {
              setActiveSection(id)
            }
          },
          {
            threshold: [0, 0.15, 0.3, 0.5, 0.7, 1],
            rootMargin: '-10% 0px -10% 0px',
          }
        )

        if (ref.current) {
          observer.observe(ref.current)
        }

        return observer
      })

      return () => {
        observers.forEach(observer => observer.disconnect())
      }
    }
  }, [analysis])
  
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

  // Функция для генерации CSV из quiz_profile
  const generateCSVFromQuiz = (): File | null => {
    if (!user?.quiz_profile || Object.keys(user.quiz_profile).length === 0) {
      return null
    }

    const profile = user.quiz_profile
    
    // Парсим числовые значения, убирая валютные символы и пробелы
    const parseAmount = (value: string | undefined): number => {
      if (!value) return 0
      // Убираем валютные символы, пробелы и точки-разделители тысяч
      let cleaned = value.toString().replace(/[€\s]/g, '')
      // Если есть запятая, это европейский формат (1.234,56)
      if (cleaned.includes(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.')
      }
      return parseFloat(cleaned) || 0
    }

    const netIncome = parseAmount(profile.net_income)
    const fixedCosts = parseAmount(profile.fixed_costs)
    
    // Пытаемся вычислить дополнительные расходы на основе savings_rate
    let additionalExpenses = 0
    if (profile.savings_rate) {
      const savingsRate = parseFloat(profile.savings_rate.toString().replace(/[%,\s]/g, '')) || 0
      const savingsAmount = netIncome * (savingsRate / 100)
      // Дополнительные расходы = доход - фиксированные расходы - сбережения
      additionalExpenses = Math.max(0, netIncome - fixedCosts - savingsAmount)
    } else {
      // Если нет savings_rate, используем примерно 25% от дохода
      additionalExpenses = netIncome * 0.25
    }

    if (!netIncome || netIncome <= 0) {
      return null
    }

    // Генерируем 12 месяцев данных на основе quiz_profile
    const today = new Date()
    const csvRows: string[] = ['date,amount,category,description']
    
    // Категории расходов
    const expenseCategories = [
      { name: 'groceries', label: 'Lebensmittel', ratio: 0.15 },
      { name: 'transport', label: 'Transport', ratio: 0.10 },
      { name: 'entertainment', label: 'Freizeit', ratio: 0.10 },
      { name: 'other', label: 'Sonstige', ratio: 0.20 }
    ]
    
    // Генерируем транзакции за последние 12 месяцев
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const dateStr = date.toISOString().split('T')[0]
      
      // Доход (в начале месяца)
      csvRows.push(`${dateStr},${netIncome.toFixed(2)},income,Gehalt`)
      
      // Фиксированные расходы (в начале месяца)
      if (fixedCosts > 0) {
        csvRows.push(`${dateStr},-${fixedCosts.toFixed(2)},rent,Fixkosten`)
      }
      
      // Дополнительные расходы по категориям (в течение месяца)
      let remainingExpenses = additionalExpenses
      expenseCategories.forEach((cat, idx) => {
        if (remainingExpenses > 0) {
          const amount = idx === expenseCategories.length - 1 
            ? remainingExpenses 
            : additionalExpenses * cat.ratio
          if (amount > 0) {
            const expenseDate = new Date(date)
            expenseDate.setDate(expenseDate.getDate() + 5 + idx * 7) // Распределяем по месяцам
            const expenseDateStr = expenseDate.toISOString().split('T')[0]
            csvRows.push(`${expenseDateStr},-${amount.toFixed(2)},${cat.name},${cat.label}`)
            remainingExpenses -= amount
          }
        }
      })
    }

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    return new File([blob], 'quiz_data.csv', { type: 'text/csv' })
  }

  const handleUseQuizData = async () => {
    if (!userGoal.trim()) {
      setError("Bitte beschreibe dein finanzielles Ziel oder deine Frage.")
      return
    }

    if (!user?.quiz_profile || Object.keys(user.quiz_profile).length === 0) {
      setError("Bitte fülle zuerst das Quiz aus, um deine Daten zu verwenden.")
      return
    }

    const csvFile = generateCSVFromQuiz()
    if (!csvFile) {
      setError("Fehler beim Generieren der Daten aus dem Quiz. Bitte überprüfe deine Quiz-Antworten.")
      return
    }

    setIsLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      console.log('Using quiz data for analysis')
      console.log('User goal:', userGoal)
      setCurrentFile(csvFile)
      const result = await analyzeCSV(csvFile, userGoal.trim(), monthsAhead)
      console.log('Analysis result:', result)
      setAnalysis(result)
    } catch (err) {
      console.error('Analysis error:', err)
      const errorMessage = err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
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
      setCurrentFile(file)
      const result = await analyzeCSV(file, userGoal.trim(), monthsAhead)
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

  const handleTipClick = async (tip: { emoji: string; title: string; description: string }, isFallback: boolean = false) => {
    setSelectedTip(tip)
    setTipDetails(null)
    setIsLoadingTipDetails(true)
    
    try {
      // Если это fallback подсказка, используем предопределенные детали
      if (isFallback) {
        setTipDetails(getFallbackTipDetails(tip.title))
      } else if (analysis) {
        // Иначе пытаемся получить детали от LLM
        const response = await getTipDetails(
          tip.title,
          tip.description,
          analysis.finance_data,
          userGoal
        )
        setTipDetails(response.details)
      }
    } catch (error) {
      console.error("Error loading tip details:", error)
      // Если LLM не работает, используем fallback детали
      setTipDetails(getFallbackTipDetails(tip.title))
    } finally {
      setIsLoadingTipDetails(false)
    }
  }

  const handleCloseTipModal = () => {
    setSelectedTip(null)
    setTipDetails(null)
  }

  // Закрытие модального окна по Escape
  useEffect(() => {
    if (!selectedTip) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseTipModal()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [selectedTip])

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
  // Если LLM работает - используем его подсказки, иначе null (будем показывать FALLBACK_TIPS)
  const tipsText = analysis && hasLLMTips ? analysis.ai_analysis.tips : null
  const isTipsFromLLM = !!hasLLMTips

  const scenarioAnalysisText = analysis?.ai_analysis?.scenario_analysis || null
  const summaryText = analysis?.ai_analysis?.summary || null
  
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

  // Dynamic background gradient based on active section (macOS style)
  const getGradientClasses = () => {
    const gradients: Record<string, string> = {
      hero: 'from-finsim-primary/3 via-transparent to-finsim-accent/2 dark:from-finsim-dark-primary/4 dark:via-transparent dark:to-finsim-dark-accent/3',
      fileUpload: 'from-finsim-primary/4 via-finsim-accent/2 to-transparent dark:from-finsim-dark-primary/5 dark:via-finsim-dark-accent/3 dark:to-transparent',
      financeSummary: 'from-emerald-500/3 via-finsim-primary/2 to-transparent dark:from-emerald-500/4 dark:via-finsim-dark-primary/3 dark:to-transparent',
      projections: 'from-blue-500/3 via-finsim-accent/2 to-transparent dark:from-blue-500/4 dark:via-finsim-dark-accent/3 dark:to-transparent',
      deepAnalysis: 'from-purple-500/3 via-finsim-primary/2 to-finsim-accent/2 dark:from-purple-500/4 dark:via-finsim-dark-primary/3 dark:to-finsim-dark-accent/3'
    }
    
    const defaultGradient = 'from-finsim-primary/2 via-transparent to-finsim-accent/2 dark:from-finsim-dark-primary/3 dark:via-transparent dark:to-finsim-dark-accent/3'
    
    return activeSection ? gradients[activeSection] || defaultGradient : defaultGradient
  }

  return (
    <main className="min-h-screen gradient-bg dark:bg-finsim-dark-surfaceMuted relative overflow-hidden">
      {/* Animated background gradient overlay - macOS style */}
      <motion.div
        key={activeSection || 'default'}
        className={`absolute inset-0 bg-gradient-to-br ${getGradientClasses()} pointer-events-none`}
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.4, 0.55, 0.4] }}
        transition={{
          opacity: {
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.5, 1]
          },
          // Smooth transition when section changes
          layout: {
            duration: 0.8,
            ease: [0.4, 0, 0.2, 1]
          }
        }}
        style={{ willChange: 'opacity' }}
      />
      {/* Additional subtle gradient layers for depth */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-tl from-transparent via-transparent to-finsim-primary/2 dark:to-finsim-dark-primary/3 pointer-events-none"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        style={{ willChange: 'opacity, transform' }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      {/* Subtle radial gradient for extra depth */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-finsim-accent/1 via-transparent to-transparent dark:from-finsim-dark-accent/2 pointer-events-none"
        animate={{
          opacity: [0.2, 0.3, 0.2],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(66, 201, 135, 0.05) 0%, transparent 70%)'
        }}
      />
      <div className={`relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 transition-all duration-500 bg-white/70 dark:bg-[#0b0f1c]/70 backdrop-blur-2xl rounded-[36px] border border-white/40 dark:border-white/10 shadow-[0_30px_120px_rgba(15,23,42,0.15)] ${
        showHistorySidebar && isAuthenticated ? 'md:ml-80' : ''
      }`}>
        {/* Header - Premium Minimalist Design */}
        <motion.header
          className="relative z-30 mb-8 sm:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="flex items-center justify-between gap-4 px-2 py-3">
            {/* Left: Logo + History Button */}
          <div className="flex items-center gap-3">
            {isAuthenticated && (
                <motion.button
                onClick={() => setShowHistorySidebar(true)}
                  className="p-2.5 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 text-finsim-textSecondary dark:text-finsim-dark-textSecondary hover:text-finsim-primary dark:hover:text-finsim-dark-primary hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                title="Analyse-Verlauf"
              >
                  <Menu className="h-4 w-4" />
                </motion.button>
            )}
              <motion.button
              onClick={() => {
                setAnalysis(null)
                setError(null)
                setUserGoal("")
              }}
                className="flex items-center gap-2.5 group cursor-pointer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FinSimLogo size="md" showWordmark={true} />
                <motion.span
                  className="relative text-[9px] px-2.5 py-0.5 rounded-md bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 text-finsim-textSecondary dark:text-finsim-dark-textSecondary font-medium tracking-[0.12em] uppercase overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="relative z-10">Beta</span>
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-finsim-primary/10 via-finsim-accent/10 to-finsim-primary/10 dark:from-finsim-dark-primary/15 dark:via-finsim-dark-accent/15 dark:to-finsim-dark-primary/15"
                    animate={{
                      x: ['-100%', '100%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: "easeInOut"
                    }}
                  />
                </motion.span>
              </motion.button>
          </div>

            {/* Right: Auth */}
            <div className="flex items-center">
            {isAuthenticated && user ? (
              <UserMenu onOpenProfile={() => setShowProfileSettings(true)} />
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 rounded-xl border-white/50 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl hover:bg-white/80 dark:hover:bg-white/10 transition-all"
              >
                <User className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Anmelden</span>
              </Button>
            )}
          </div>
          </div>
        </motion.header>

        {/* Main content */}
        <div className="space-y-8 sm:space-y-12">
          {!analysis && (
            <div className="space-y-10">
              <motion.section
                ref={heroRef}
                className="relative overflow-hidden glass-effect premium-shadow rounded-[32px] px-6 sm:px-10 py-10 sm:py-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                {/* Animated background gradients */}
                <div className="absolute inset-0 bg-gradient-to-br from-finsim-primary/8 via-transparent to-finsim-accent/6" />
                <motion.div
                  className="absolute -top-20 -right-20 w-80 h-80 bg-finsim-primary/15 dark:bg-finsim-dark-primary/15 blur-3xl rounded-full"
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.3, 0.45, 0.3],
                  }}
                  transition={{ 
                    duration: 8, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    times: [0, 0.5, 1]
                  }}
                />
                <motion.div
                  className="absolute -bottom-20 -left-20 w-72 h-72 bg-finsim-accent/10 dark:bg-finsim-dark-accent/10 blur-3xl rounded-full"
                  animate={{
                    scale: [1, 1.12, 1],
                    opacity: [0.2, 0.35, 0.2],
                  }}
                  transition={{ 
                    duration: 10, 
                    repeat: Infinity, 
                    ease: "easeInOut", 
                    delay: 1,
                    times: [0, 0.5, 1]
                  }}
                />

              <div className="relative grid gap-8 lg:grid-cols-[1fr_1fr] items-center">
            {/* Left Column - Content */}
            <div className="space-y-5">
              {/* Tagline */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-finsim-primaryLight/40 dark:bg-finsim-dark-primaryLight/30 border border-finsim-primary/20 dark:border-finsim-dark-primary/20"
              >
                <Sparkles className="h-3.5 w-3.5 text-finsim-primary dark:text-finsim-dark-primary" />
                <span className="text-[11px] font-semibold text-finsim-primary dark:text-finsim-dark-primary tracking-wide">
                  Smart Finance Lab
                </span>
              </motion.div>

              {/* Headline */}
              <div className="space-y-3">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl sm:text-4xl font-bold tracking-tight text-finsim-textMain dark:text-white text-balance leading-[1.1]"
                >
                  Finanzklarheit
                  <br />
                  <span className="bg-gradient-to-r from-finsim-primary to-finsim-accent dark:from-finsim-dark-primary dark:to-finsim-dark-accent bg-clip-text text-transparent">
                    in Minuten
                  </span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-base text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed"
                >
                  Ziel beschreiben, Daten hochladen, sofort verstehen – ob dein Plan realistisch ist.
                </motion.p>
              </div>

              {/* Quiz Button */}
              {isAuthenticated && (
                <motion.button
                  data-quiz-main-button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsQuizOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-finsim-primary to-finsim-accent dark:from-finsim-dark-primary dark:to-finsim-dark-accent text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <Sparkles className={`h-4 w-4 ${user?.quiz_profile ? "text-white" : "text-white"}`} />
                  {user?.quiz_profile ? "Profil aktualisieren" : "Quiz starten"}
                </motion.button>
              )}
            </div>

            {/* Right Column - Quiz Profile Preview */}
            <motion.div
              className="relative rounded-[28px] glass-effect premium-shadow border border-white/40 dark:border-white/10 overflow-hidden"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {user?.quiz_profile && Object.keys(user.quiz_profile).length > 0 ? (
                <>
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-finsim-primary/10 via-transparent to-finsim-accent/8 pointer-events-none" />
                  <motion.div
                    className="absolute top-0 right-0 w-32 h-32 bg-finsim-primary/10 dark:bg-finsim-dark-primary/10 rounded-full blur-2xl"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />

                  <div className="relative p-6 space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-finsim-textMuted dark:text-finsim-dark-textMuted font-semibold mb-1">
                          Dein Profil
                        </p>
                        <p className="text-lg font-bold text-finsim-textMain dark:text-white">Finanzprofil</p>
                      </div>
              </div>

                    {/* Quiz Data Cards */}
                    <div className="space-y-2.5">
                      {Object.entries(user.quiz_profile).slice(0, 4).map(([key, value], idx) => {
                        const emojis: Record<string, string> = {
                          profession: "💼",
                          net_income: "💸",
                          fixed_costs: "🏠",
                          main_goal: "🎯",
                          risk_profile: "🎲",
                          savings_rate: "📈",
                          emergency_buffer: "💰",
                        }
                        const labels: Record<string, string> = {
                          profession: "Beruf",
                          net_income: "Einkommen",
                          fixed_costs: "Fixkosten",
                          main_goal: "Hauptziel",
                          risk_profile: "Risikoprofil",
                          savings_rate: "Sparquote",
                          emergency_buffer: "Notgroschen",
                        }
                        const emoji = emojis[key] || "✨"
                        const label = labels[key] || key
                        const isEditing = editingQuizField === key
                        const currentValue = isEditing ? (quizEditValues[key] !== undefined ? quizEditValues[key] : String(value)) : String(value)

                        const handleSaveQuizField = async () => {
                          if (!user?.quiz_profile) return
                          
                          setIsSavingQuiz(true)
                          try {
                            const updatedProfile = { ...user.quiz_profile, ...quizEditValues }
                            await updateUserProfile({
                              quiz_profile: updatedProfile,
                            })
                            await checkAuth()
                            setEditingQuizField(null)
                            setQuizEditValues({})
                          } catch (err) {
                            console.error("Failed to update quiz profile:", err)
                          } finally {
                            setIsSavingQuiz(false)
                          }
                        }

                        const handleCancelEdit = () => {
                          setEditingQuizField(null)
                          setQuizEditValues({})
                        }

                        return (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + idx * 0.1 }}
                            whileHover={{ scale: isEditing ? 1 : 1.02, x: isEditing ? 0 : 2 }}
                            className="group relative flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-all"
                          >
                            <span className="text-xl flex-shrink-0">{emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-finsim-textMuted dark:text-finsim-dark-textMuted font-medium">
                                {label}
                              </p>
                              {!isEditing ? (
                                <>
                                  <p className="text-sm font-semibold text-finsim-textMain dark:text-white truncate">
                                    {String(value)}
                                  </p>
                                  <motion.button
                                    onClick={() => {
                                      setEditingQuizField(key)
                                      setQuizEditValues({ [key]: String(value) })
                                    }}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/60 dark:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Edit2 className="h-3 w-3 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
                                  </motion.button>
                                </>
                              ) : (
                                <div className="space-y-2 mt-1">
                                  <input
                                    value={currentValue}
                                    onChange={(e) => setQuizEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveQuizField()
                                      } else if (e.key === 'Escape') {
                                        handleCancelEdit()
                                      }
                                    }}
                                    autoFocus
                                    className="w-full text-sm font-semibold text-finsim-textMain dark:text-white bg-white/80 dark:bg-white/10 border border-finsim-primary/40 dark:border-finsim-dark-primary/40 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-finsim-primary/40"
                                  />
                                  <div className="flex items-center gap-2">
                                    <motion.button
                                      onClick={handleSaveQuizField}
                                      disabled={isSavingQuiz}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      className="p-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 disabled:opacity-50"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </motion.button>
                                    <motion.button
                                      onClick={handleCancelEdit}
                                      disabled={isSavingQuiz}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      className="p-1 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 disabled:opacity-50"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </motion.button>
                                    <span className="text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted ml-auto">
                                      Enter zum Speichern
                                    </span>
                      </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>

                    {/* Completion Badge - Only count filled fields */}
                    {(() => {
                      const totalFields = 7 // Total possible quiz fields
                      const filledFields = Object.entries(user.quiz_profile).filter(([_, value]) => 
                        value && String(value).trim() !== ''
                      ).length
                      const completenessPercentage = Math.round((filledFields / totalFields) * 100)
                      
                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9 }}
                          className="pt-3 border-t border-white/20 dark:border-white/10"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">Vollständigkeit</span>
                            <span className="text-sm font-bold text-finsim-primary dark:text-finsim-dark-primary">
                              {completenessPercentage}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/20 dark:bg-white/5 mt-2 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-finsim-primary to-finsim-accent"
                              initial={{ width: 0 }}
                              animate={{ width: `${completenessPercentage}%` }}
                              transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                        </motion.div>
                      )
                    })()}
                  </div>
                </>
              ) : (
                <>
                  {/* Empty State - Call to Action */}
                  <div className="absolute inset-0 bg-gradient-to-br from-finsim-primary/8 via-transparent to-finsim-accent/6 pointer-events-none" />
                  <motion.div
                    className="absolute top-0 right-0 w-40 h-40 bg-finsim-primary/10 dark:bg-finsim-dark-primary/10 rounded-full blur-2xl"
                    animate={{
                      scale: [1, 1.2, 1],
                      x: [0, 12, 0],
                      y: [0, -12, 0],
                    }}
                    transition={{ 
                      duration: 5, 
                      repeat: Infinity, 
                      ease: "easeInOut",
                      times: [0, 0.5, 1]
                    }}
                  />

                  <div className="relative p-6 space-y-5 text-center">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-finsim-primary to-finsim-accent flex items-center justify-center shadow-xl"
                    >
                      <Sparkles className="h-8 w-8 text-white" />
                    </motion.div>

                    <div className="space-y-2">
                      <motion.h3
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl font-bold text-finsim-textMain dark:text-white"
                      >
                        Profil erstellen
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary"
                      >
                        Erstelle dein Finanzprofil für personalisierte Empfehlungen
                      </motion.p>
                    </div>

                    {isAuthenticated ? (
                      user?.quiz_profile ? (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setIsQuizOpen(true)}
                          className="w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-finsim-primary to-finsim-accent dark:from-finsim-dark-primary dark:to-finsim-dark-accent text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                          Quiz starten →
                        </motion.button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="space-y-3 pt-2"
                        >
                          <div className="space-y-2.5">
                            {[
                              {
                                icon: Zap,
                                text: "Personalisierte Analysen",
                                iconColor: "text-yellow-500 dark:text-yellow-400",
                                bgColor: "from-yellow-500/20 to-yellow-400/10 dark:from-yellow-500/20 dark:to-yellow-400/10"
                              },
                              {
                                icon: Target,
                                text: "Präzise Zielsetzung",
                                iconColor: "text-blue-500 dark:text-blue-400",
                                bgColor: "from-blue-500/20 to-blue-400/10 dark:from-blue-500/20 dark:to-blue-400/10"
                              },
                              {
                                icon: Shield,
                                text: "Sichere Datenverarbeitung",
                                iconColor: "text-emerald-500 dark:text-emerald-400",
                                bgColor: "from-emerald-500/20 to-emerald-400/10 dark:from-emerald-500/20 dark:to-emerald-400/10"
                              }
                            ].map((item, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + idx * 0.1 }}
                                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/40 dark:bg-white/5 border border-finsim-borderLight/30 dark:border-finsim-dark-borderLight/30 hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                              >
                                <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", item.bgColor)}>
                                  <item.icon className={cn("h-4 w-4", item.iconColor)} />
                                </div>
                                <span className="text-xs font-medium text-finsim-textMain dark:text-finsim-dark-textMain">
                                  {item.text}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )
                    ) : (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAuthModal(true)}
                        className="w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-finsim-primary to-finsim-accent dark:from-finsim-dark-primary dark:to-finsim-dark-accent text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                      >
                        Anmelden & Quiz starten →
                      </motion.button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </div>
              </motion.section>

              <div className="space-y-8">
                {/* Goal Input Section - Premium Redesign with Gamification */}
                <motion.section 
                  className="relative glass-effect premium-shadow rounded-[28px] p-8 sm:p-10 space-y-8 animate-fade-in-up overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Animated Background Gradients */}
                  <div className="absolute inset-0 bg-gradient-to-br from-finsim-primary/8 via-transparent to-finsim-accent/6 pointer-events-none" />
                  <motion.div
                    className="absolute -top-20 -right-20 w-80 h-80 bg-finsim-primary/15 dark:bg-finsim-dark-primary/15 blur-3xl rounded-full"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.5, 0.3],
                      x: [0, 30, 0],
                      y: [0, -30, 0],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute -bottom-20 -left-20 w-72 h-72 bg-finsim-accent/10 dark:bg-finsim-dark-accent/10 blur-3xl rounded-full"
                    animate={{
                      scale: [1, 1.15, 1],
                      opacity: [0.2, 0.4, 0.2],
                      x: [0, -20, 0],
                      y: [0, 20, 0],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  />

                  {/* Header with enhanced design */}
                  <div className="relative space-y-4">
                    <motion.div 
                      className="flex items-center gap-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <motion.div 
                        className="relative p-3 rounded-2xl bg-gradient-to-br from-finsim-primary/20 via-finsim-primary/10 to-finsim-accent/20 dark:from-finsim-dark-primary/30 dark:via-finsim-dark-primary/20 dark:to-finsim-dark-accent/30 border border-finsim-primary/30 dark:border-finsim-dark-primary/30"
                        whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.3 }}
                      >
                        <Lightbulb className="h-6 w-6 text-finsim-primary dark:text-finsim-dark-primary" />
                        <motion.div
                          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-finsim-primary/20 to-finsim-accent/20 blur-xl"
                          animate={{
                            opacity: [0.3, 0.5, 0.3],
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            times: [0, 0.5, 1]
                          }}
                        />
                      </motion.div>
                      <div className="flex-1">
                        <motion.h3 
                          className="text-2xl sm:text-3xl font-bold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                        {greeting || "Dein finanzielles Ziel"}
                        </motion.h3>
                        <motion.div
                          className="h-1 w-20 bg-gradient-to-r from-finsim-primary to-finsim-accent rounded-full mt-2"
                          initial={{ width: 0 }}
                          animate={{ width: 80 }}
                          transition={{ delay: 0.5, duration: 0.6 }}
                        />
                    </div>
                    </motion.div>
                    <motion.p 
                      className="text-base text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed pl-14"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      Beschreibe, was du erreichen möchtest oder welche finanzielle Entscheidung du treffen möchtest.
                    </motion.p>
                  </div>

                  {/* Premium Input Field with enhanced styling */}
                  <motion.div 
                    className="relative space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="relative">
                      {/* Glow effect on focus */}
                      <motion.div
                        className="absolute inset-0 rounded-[22px] bg-gradient-to-r from-finsim-primary/20 via-finsim-accent/20 to-finsim-primary/20 blur-xl opacity-0"
                        animate={{
                          opacity: userGoal ? 0.3 : 0,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    <textarea
                      id="goal"
                      value={userGoal}
                      onChange={(e) => setUserGoal(e.target.value)}
                      placeholder="Formuliere dein finanzielles Ziel … ich analysiere alles für dich."
                        className="relative glass-input premium-shadow premium-hover w-full min-h-[90px] rounded-[22px] text-finsim-textMain dark:text-finsim-dark-textMain py-5 px-6 text-base font-normal placeholder:text-finsim-textMuted/60 dark:placeholder:text-finsim-dark-textMuted/60 focus:outline-none focus:ring-2 focus:ring-finsim-primary/40 dark:focus:ring-finsim-dark-primary/40 focus:border-finsim-primary/50 dark:focus:border-finsim-dark-primary/50 transition-all duration-300 resize-none leading-relaxed border-2 border-transparent"
                      disabled={isLoading}
                      style={{
                        fontSize: '16px',
                        lineHeight: '1.6',
                        fontWeight: 400
                      }}
                    />
                      {/* Character counter / progress indicator */}
                      {userGoal && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute bottom-3 right-4 flex items-center gap-2"
                        >
                          <motion.div
                            className="w-2 h-2 rounded-full bg-emerald-500"
                            animate={{
                              scale: [1, 1.15, 1],
                            }}
                            transition={{ 
                              duration: 1.5, 
                              repeat: Infinity,
                              ease: "easeInOut",
                              times: [0, 0.5, 1]
                            }}
                          />
                          <span className="text-xs font-medium text-finsim-textMuted dark:text-finsim-dark-textMuted">
                            {userGoal.length} Zeichen
                          </span>
                        </motion.div>
                      )}
                  </div>
                  </motion.div>
                  
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
                </motion.section>

                <div ref={fileUploadRef}>
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    isLoading={isLoading}
                    canUseQuizData={
                      isAuthenticated && !!user?.quiz_profile && Object.keys(user.quiz_profile).length > 0
                    }
                    onUseQuizData={handleUseQuizData}
                  />
              </div>
              </div>
            </div>
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
              {/* Übersicht */}
              <section 
                ref={financeSummaryRef}
                className="glass-effect premium-shadow rounded-2xl p-5 sm:p-6 space-y-5 animate-fade-in-up relative overflow-hidden"
              >
                {/* User Goal Display - Always Visible */}
              {userGoal && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="pb-4 border-b border-finsim-borderLight/50 dark:border-finsim-dark-borderLight/50 relative z-10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-finsim-primary/10 dark:bg-finsim-dark-primary/20">
                        <Target className="h-4 w-4 text-finsim-primary dark:text-finsim-dark-primary" />
                    </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-finsim-textMuted dark:text-finsim-dark-textMuted uppercase tracking-wider mb-0.5">
                          Dein Ziel
                        </p>
                        <p className="text-sm font-medium text-finsim-textMain dark:text-white truncate">
                          {userGoal}
                        </p>
                  </div>
                    </div>
                  </motion.div>
                )}
                
                <div className="relative z-10">
                  <div className="mb-5">
                    <h3 className="text-base font-semibold text-finsim-textMain dark:text-white tracking-tight mb-1">
                      Finanzübersicht
                    </h3>
                    <p className="text-xs text-finsim-textMuted dark:text-finsim-dark-textMuted">
                      Basierend auf deinen Daten
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: "Einnahmen",
                        value: analysis.finance_data.total_income,
                        color: "text-emerald-600 dark:text-emerald-400",
                        icon: TrendingUp,
                        delay: 0.1
                      },
                      {
                        label: "Ausgaben",
                        value: analysis.finance_data.total_expenses,
                        color: "text-red-500 dark:text-red-400",
                        icon: TrendingDown,
                        delay: 0.15
                      },
                      {
                        label: "Guthaben",
                        value: analysis.finance_data.net_balance,
                        color: analysis.finance_data.net_balance >= 0 
                          ? "text-emerald-600 dark:text-emerald-400" 
                          : "text-red-600 dark:text-red-400",
                        icon: analysis.finance_data.net_balance >= 0 ? TrendingUp : TrendingDown,
                        delay: 0.2
                      },
                      {
                        label: "Transaktionen",
                        value: analysis.finance_data.transaction_count,
                        color: "text-blue-600 dark:text-blue-400",
                        icon: FileText,
                        delay: 0.25,
                        isCount: true
                      }
                    ].map((metric, idx) => {
                      const Icon = metric.icon
                      return (
                        <motion.div
                          key={metric.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            duration: 0.3, 
                            delay: metric.delay,
                            ease: "easeOut"
                          }}
                          className="p-3 rounded-lg bg-white/50 dark:bg-white/5 border border-finsim-borderLight/50 dark:border-finsim-dark-borderLight/50 hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={cn("h-3.5 w-3.5", metric.color)} />
                            <p className="text-[10px] font-medium text-finsim-textMuted dark:text-finsim-dark-textMuted uppercase tracking-wider">
                              {metric.label}
                            </p>
              </div>
                          <p className={cn("text-lg font-bold font-mono", metric.color)}>
                            {metric.isCount 
                              ? metric.value.toLocaleString()
                              : `${metric.value >= 0 ? "+" : ""}${metric.value.toFixed(2)} €`}
                          </p>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </section>

              {/* Szenarien Overview */}
              {analysis && analysis.scenarios && (
                <ScenarioOverview analysis={analysis} />
              )}

              {/* Charts */}
              <section 
                ref={projectionsRef}
                className="glass-effect premium-shadow rounded-[24px] p-6 sm:p-8 space-y-6 animate-fade-in-up"
              >
                <ScenarioChart 
                  bestCase={analysis.scenarios.best_case.projections}
                  realisticCase={analysis.scenarios.realistic_case.projections}
                  worstCase={analysis.scenarios.worst_case.projections}
                  monthsAhead={monthsAhead}
                  onMonthsAheadChange={async (months: number) => {
                    if (!currentFile || !userGoal.trim()) {
                      setError("Bitte lade zuerst eine Datei hoch und gib ein Ziel an.")
                      return
                    }
                    setMonthsAhead(months)
                    setIsLoading(true)
                    setError(null)
                    try {
                      const result = await analyzeCSV(currentFile, userGoal.trim(), months)
                      setAnalysis(result)
                    } catch (err) {
                      console.error('Recalculation error:', err)
                      const errorMessage = err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
                      setError(errorMessage)
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                />
              </section>

              {/* Finance Dashboard */}
              {analysis.finance_data.transactions.length > 0 && (
                <section className="mt-10">
                  <FinanceDashboard transactions={analysis.finance_data.transactions} />
                </section>
              )}

              {/* Vertiefte Analyse & KI-Empfehlungen - Redesigned */}
              {analysis && (plausibilityText || tipsText || summaryText) && (
                <section 
                  ref={deepAnalysisRef}
                  className="space-y-6 animate-fade-in-up"
                >
                  {/* Header */}
                  <div className="glass-effect premium-shadow rounded-[24px] p-6 sm:p-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-gradient-to-br from-finsim-primary/10 to-purple-500/10 dark:from-finsim-dark-primary/20 dark:to-purple-500/20 backdrop-blur-sm">
                        <Brain className="h-5 w-5 text-finsim-primary dark:text-finsim-dark-primary" />
                      </div>
                      <div className="space-y-1 flex-1">
                    <h3 className="text-lg font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
                          Vertiefte Analyse & KI-Empfehlungen
                    </h3>
                    <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
                          Individuelle Auswertung deiner Daten durch KI
                    </p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-finsim-primaryLight dark:bg-finsim-dark-primaryLight px-3 py-1.5">
                        <Brain className="h-3.5 w-3.5 text-finsim-primary dark:text-finsim-dark-primary" />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-finsim-primary dark:text-finsim-dark-primary">
                          KI
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Plausibilitätsanalyse - Enhanced with More Information */}
                  {plausibilityText && analysis && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      className="glass-effect premium-shadow rounded-2xl p-5 sm:p-6 space-y-5 animate-fade-in-up"
                    >
                      <div className="flex items-center gap-3">
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
                          className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20"
                        >
                          <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </motion.div>
                        <div className="space-y-0.5 flex-1">
                          <h4 className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
                            Plausibilitätsanalyse
                          </h4>
                          <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                            Bewertung der Szenarien basierend auf deinen Finanzdaten
                          </p>
                        </div>
                      </div>

                      {/* Goal Achievement Analysis - Gamified */}
                      {analysis?.finance_data?.monthly_averages && (() => {
                        const monthlySavings = (analysis.finance_data.monthly_averages.income ?? 0) - (analysis.finance_data.monthly_averages.expenses ?? 0)
                        const realisticFinal = analysis.scenarios.realistic_case.final_balance
                        const bestFinal = analysis.scenarios.best_case.final_balance
                        const worstFinal = analysis.scenarios.worst_case.final_balance
                        
                        // Calculate probability based on scenarios
                        const avgFinal = (realisticFinal + bestFinal + worstFinal) / 3
                        const range = Math.abs(bestFinal - worstFinal)
                        const avgAbs = Math.abs(avgFinal) || 1
                        // Confidence: higher when range is smaller relative to average
                        const confidence = range > 0 
                          ? Math.max(50, Math.min(95, 100 - (range / avgAbs * 30))) 
                          : 85
                        
                        // Estimate months to reach realistic scenario (simplified)
                        const monthsToReach = monthlySavings > 0 
                          ? Math.ceil(Math.abs(realisticFinal) / monthlySavings) 
                          : null
                        
                        return (
                          <div className="space-y-4">
                            {/* Confidence Score - Gamified */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
                              className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 dark:from-blue-500/15 dark:via-indigo-500/15 dark:to-purple-500/15 border border-blue-500/20 dark:border-blue-500/30 relative overflow-hidden"
                            >
                              <motion.div
                                className="absolute inset-0 opacity-10"
                                animate={{
                                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                                }}
                                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                                style={{
                                  background: "linear-gradient(90deg, rgba(59,130,246,0.2) 0%, rgba(99,102,241,0.2) 50%, rgba(147,51,234,0.2) 100%)",
                                  backgroundSize: "200% 200%"
                                }}
                              />
                              <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider text-finsim-textMuted dark:text-finsim-dark-textMuted mb-1">
                                      Prognose-Zuverlässigkeit
                                    </p>
                                    <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                                      Basierend auf deinen Daten
                                    </p>
                                  </div>
                                  <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ 
                                      delay: 0.3, 
                                      type: "spring", 
                                      stiffness: 200,
                                      damping: 20
                                    }}
                                    className="relative"
                                  >
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ 
                                        duration: 30, 
                                        repeat: Infinity, 
                                        ease: "linear" 
                                      }}
                                      className="absolute inset-0 rounded-full border-2 border-blue-500/20"
                                    />
                                    <motion.div
                                      animate={{ 
                                        scale: [1, 1.04, 1],
                                        opacity: [0.85, 1, 0.85]
                                      }}
                                      transition={{ 
                                        duration: 3, 
                                        repeat: Infinity, 
                                        ease: "easeInOut",
                                        times: [0, 0.5, 1]
                                      }}
                                      className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-500/30 dark:to-indigo-500/30 flex items-center justify-center border-2 border-blue-500/30"
                                    >
                                      <motion.p 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="text-lg font-bold text-blue-600 dark:text-blue-400"
                                      >
                                        {Math.round(confidence)}%
                                      </motion.p>
                                    </motion.div>
                                  </motion.div>
                  </div>
                  
                                {/* Animated Progress Bar */}
                                <div className="relative h-2.5 bg-white/20 dark:bg-white/10 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${confidence}%` }}
                                    transition={{ 
                                      delay: 0.5, 
                                      duration: 1.5, 
                                      ease: [0.4, 0, 0.2, 1]
                                    }}
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full"
                                  >
                                    <motion.div
                                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                      animate={{
                                        x: ["-100%", "200%"],
                                      }}
                                      transition={{
                                        duration: 2.5,
                                        repeat: Infinity,
                                        ease: "linear",
                                        repeatDelay: 0.5
                                      }}
                                    />
                                  </motion.div>
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                    className="absolute inset-0 flex items-center justify-end pr-2"
                                  >
                                    <div className="w-1 h-full bg-white/50 rounded-full" />
                                  </motion.div>
                                </div>
                              </div>
                            </motion.div>

                            {/* Time to Goal - Gamified */}
                            {userGoal && monthsToReach && monthsToReach > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/15 dark:to-teal-500/15 border border-emerald-500/20 dark:border-emerald-500/30"
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <motion.div
                                    animate={{ scale: [1, 1.08, 1] }}
                                    transition={{ 
                                      duration: 2, 
                                      repeat: Infinity, 
                                      ease: "easeInOut",
                                      times: [0, 0.5, 1]
                                    }}
                                    className="p-2 rounded-lg bg-emerald-500/20 dark:bg-emerald-500/30"
                                  >
                                    <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  </motion.div>
                                  <div className="flex-1">
                                    <p className="text-xs font-semibold text-finsim-textMain dark:text-white mb-0.5">
                                      Geschätzte Zeitspanne
                                    </p>
                                    <p className="text-[10px] text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                                      {monthsToReach <= 12 
                                        ? `Erreichbar in ${monthsToReach} ${monthsToReach === 1 ? 'Monat' : 'Monaten'}`
                                        : `Erreichbar in ca. ${Math.round(monthsToReach / 12 * 10) / 10} Jahren`}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Progress Indicator */}
                                <div className="flex items-center gap-2">
                                  {Array.from({ length: 12 }).map((_, idx) => {
                                    const isActive = idx < Math.min(monthsToReach, 12)
                                    return (
                                      <motion.div
                                        key={idx}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.3 + idx * 0.05 }}
                                        className={cn(
                                          "h-1.5 flex-1 rounded-full",
                                          isActive 
                                            ? "bg-emerald-500 dark:bg-emerald-400" 
                                            : "bg-white/20 dark:bg-white/10"
                                        )}
                                      />
                                    )
                                  })}
                                </div>
                              </motion.div>
                            )}

                            {/* Monthly Savings Potential - If no goal */}
                            {!userGoal && monthlySavings > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/15 dark:to-teal-500/15 border border-emerald-500/20 dark:border-emerald-500/30"
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <motion.div
                                    animate={{ scale: [1, 1.08, 1] }}
                                    transition={{ 
                                      duration: 2, 
                                      repeat: Infinity, 
                                      ease: "easeInOut",
                                      times: [0, 0.5, 1]
                                    }}
                                    className="p-2 rounded-lg bg-emerald-500/20 dark:bg-emerald-500/30"
                                  >
                                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  </motion.div>
                                  <div className="flex-1">
                                    <p className="text-xs font-semibold text-finsim-textMain dark:text-white mb-0.5">
                                      Sparpotenzial
                                    </p>
                                    <p className="text-[10px] text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                                      {monthlySavings >= 0 ? "+" : ""}{monthlySavings.toFixed(2)} € monatlich möglich
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Potential visualization */}
                                <div className="space-y-2">
                                  <div className="flex justify-between text-[10px] text-finsim-textMuted dark:text-finsim-dark-textMuted">
                                    <span>Realistisch: {realisticFinal >= 0 ? "+" : ""}{realisticFinal.toFixed(0)} €</span>
                                    <span>Best Case: {bestFinal >= 0 ? "+" : ""}{bestFinal.toFixed(0)} €</span>
                                  </div>
                                  <div className="relative h-2 bg-white/20 dark:bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: "100%" }}
                                      transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
                                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-emerald-500 to-emerald-600 rounded-full"
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            {/* Interactive Scenario Range Slider - Gamified */}
                            {analysis?.scenarios && (() => {
                              // Improved interpolation with clamping
                              const getInterpolatedValue = (value: number) => {
                                const clamped = Math.max(0, Math.min(100, value))
                                if (clamped <= 50) {
                                  const ratio = clamped / 50
                                  return worstFinal + (realisticFinal - worstFinal) * ratio
                                } else {
                                  const ratio = (clamped - 50) / 50
                                  return realisticFinal + (bestFinal - realisticFinal) * ratio
                                }
                              }
                              
                              const currentValue = getInterpolatedValue(scenarioSliderValue)
                              const difference = currentValue - realisticFinal
                              
                              const getScenarioLabel = (value: number) => {
                                if (value < 25) return "Konservativ"
                                if (value < 75) return "Realistisch"
                                return "Optimistisch"
                              }
                              
                              return (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3 }}
                                  className="p-4 rounded-xl bg-gradient-to-br from-slate-500/10 via-gray-500/10 to-slate-500/10 dark:from-slate-500/15 dark:via-gray-500/15 dark:to-slate-500/15 border border-slate-500/20 dark:border-slate-500/30 relative overflow-hidden"
                                >
                                  {/* Subtle animated background */}
                                  <motion.div
                                    className="absolute inset-0 opacity-[0.02]"
                                    animate={{
                                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                                    }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    style={{
                                      background: "linear-gradient(90deg, rgba(239,68,68,0.1) 0%, rgba(59,130,246,0.1) 50%, rgba(16,185,129,0.1) 100%)",
                                      backgroundSize: "200% 200%"
                                    }}
                                  />
                                  
                                  <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                      <div>
                                        <p className="text-xs font-semibold text-finsim-textMain dark:text-white mb-1">
                                          Mögliche Spannweite
                                        </p>
                                        <p className="text-[10px] text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                                          Erkunde verschiedene Szenarien
                                        </p>
                                      </div>
                                      <motion.div
                                        key={Math.round(scenarioSliderValue)}
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.2 }}
                                        className={cn(
                                          "px-3 py-1.5 rounded-lg text-xs font-bold font-mono",
                                          scenarioSliderValue < 25 ? "bg-red-500/20 text-red-600 dark:text-red-400" :
                                          scenarioSliderValue < 75 ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" :
                                          "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                        )}
                                      >
                                        {currentValue >= 0 ? "+" : ""}{currentValue.toFixed(0)} €
                                      </motion.div>
                                    </div>
                                    
                                    {/* Interactive Slider Track */}
                                    <div className="relative mb-6">
                                      {/* Background gradient track */}
                                      <div className="relative h-3 bg-white/10 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div className="absolute inset-0 flex">
                                          <motion.div 
                                            className="flex-1 bg-gradient-to-r from-red-500/30 to-red-500/20"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                          />
                                          <motion.div 
                                            className="flex-1 bg-gradient-to-r from-red-500/20 via-blue-500/30 to-blue-500/20"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                          />
                                          <motion.div 
                                            className="flex-1 bg-gradient-to-r from-blue-500/20 via-emerald-500/30 to-emerald-500/20"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.6 }}
                                          />
                                        </div>
                                        
                                        {/* Interactive Slider Handle */}
                                        <div className="relative w-full h-full">
                                          {/* Native range input for accessibility */}
                                          <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={scenarioSliderValue}
                                            onChange={(e) => setScenarioSliderValue(Number(e.target.value))}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                                            style={{ 
                                              WebkitAppearance: 'none', 
                                              appearance: 'none',
                                              background: 'transparent'
                                            }}
                                          />
                                          
                                          {/* Visual handle - Fixed positioning */}
                                          <motion.div
                                            animate={{
                                              left: `${scenarioSliderValue}%`,
                                            }}
                                            whileHover={{ scale: 1.1 }}
                                            transition={{
                                              left: { 
                                                type: "spring", 
                                                stiffness: 300, 
                                                damping: 25,
                                                mass: 0.5
                                              },
                                              scale: { duration: 0.15, ease: "easeOut" }
                                            }}
                                            style={{
                                              transform: 'translateX(-50%)'
                                            }}
                                            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400 shadow-lg z-20 pointer-events-none"
                                          >
                                            <motion.div
                                              className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20"
                                              animate={{ rotate: 360 }}
                                              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                            />
                                          </motion.div>
                                          
                                          {/* Active track fill */}
                                          <motion.div
                                            animate={{ width: `${scenarioSliderValue}%` }}
                                            transition={{ 
                                              type: "spring", 
                                              stiffness: 300, 
                                              damping: 25,
                                              mass: 0.5
                                            }}
                                            className={cn(
                                              "absolute left-0 top-0 h-full rounded-full z-10",
                                              scenarioSliderValue < 25 ? "bg-gradient-to-r from-red-500/50 to-red-500/30" :
                                              scenarioSliderValue < 75 ? "bg-gradient-to-r from-red-500/30 via-blue-500/50 to-blue-500/30" :
                                              "bg-gradient-to-r from-red-500/30 via-blue-500/30 to-emerald-500/50"
                                            )}
                                          />
                                        </div>
                                        
                                        {/* Fixed markers */}
                                        <div className="absolute inset-0 flex items-center justify-between px-0.5">
                                          {[0, 50, 100].map((pos) => (
                                            <div
                                              key={pos}
                                              className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                pos === 0 ? "bg-red-500 dark:bg-red-400" :
                                                pos === 50 ? "bg-blue-500 dark:bg-blue-400" :
                                                "bg-emerald-500 dark:bg-emerald-400"
                                              )}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                      
                                      {/* Compact value labels */}
                                      <div className="flex justify-between mt-2 text-[9px] text-finsim-textMuted dark:text-finsim-dark-textMuted">
                                        <span>{worstFinal >= 0 ? "+" : ""}{worstFinal.toFixed(0)}€</span>
                                        <span>{realisticFinal >= 0 ? "+" : ""}{realisticFinal.toFixed(0)}€</span>
                                        <span>{bestFinal >= 0 ? "+" : ""}{bestFinal.toFixed(0)}€</span>
                                      </div>
                                    </div>
                                    
                                    {/* Compact scenario info */}
                                    <motion.div
                                      key={Math.round(scenarioSliderValue)}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ duration: 0.2 }}
                                      className={cn(
                                        "p-2.5 rounded-lg border text-center",
                                        scenarioSliderValue < 25 ? "bg-red-500/10 border-red-500/20" :
                                        scenarioSliderValue < 75 ? "bg-blue-500/10 border-blue-500/20" :
                                        "bg-emerald-500/10 border-emerald-500/20"
                                      )}
                                    >
                                      <div className="flex items-center justify-center gap-2">
                                        <p className={cn(
                                          "text-xs font-semibold",
                                          scenarioSliderValue < 25 ? "text-red-600 dark:text-red-400" :
                                          scenarioSliderValue < 75 ? "text-blue-600 dark:text-blue-400" :
                                          "text-emerald-600 dark:text-emerald-400"
                                        )}>
                                          {getScenarioLabel(scenarioSliderValue)}
                                        </p>
                                        {scenarioSliderValue !== 50 && (
                                          <span className={cn(
                                            "text-[10px] font-medium",
                                            difference >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                          )}>
                                            {difference >= 0 ? "+" : ""}{difference.toFixed(0)}€
                                          </span>
                                        )}
                                      </div>
                                    </motion.div>
                                  </div>
                                </motion.div>
                              )
                            })()}
                          </div>
                        )
                      })()}

                      {/* AI Analysis Text - Enhanced Formatting */}
                      <div className="space-y-3 pt-2">
                        {(() => {
                          // Split by double newlines first
                          const paragraphs = plausibilityText.split(/\n\n+/).filter(p => p.trim().length > 0)
                          
                          return paragraphs.map((paragraph, paraIdx) => {
                            const trimmed = paragraph.trim()
                            
                            // Check if it's a numbered list item (1. 2. 3. or 1) 2) 3))
                            const numberedMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)/)
                            if (numberedMatch) {
                              return (
                                <motion.div
                                  key={paraIdx}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: paraIdx * 0.08 }}
                                  className="flex items-start gap-3 p-3 rounded-lg bg-white/40 dark:bg-white/5 border border-finsim-borderLight/30 dark:border-finsim-dark-borderLight/30 hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                                >
                                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 dark:bg-blue-500/30 flex items-center justify-center">
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                      {numberedMatch[1]}
                                    </span>
                                  </div>
                                  <p className="text-sm leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain flex-1">
                                    {numberedMatch[2].split(/(\d+[€%]?|\d+\.\d+[€%]?)/g).map((part, partIdx) => {
                                      if (/^\d+[€%]?$/.test(part) || /^\d+\.\d+[€%]?$/.test(part)) {
                                        return (
                                          <span key={partIdx} className="font-semibold text-finsim-primary dark:text-finsim-dark-primary">
                                            {part}
                                          </span>
                                        )
                                      }
                                      return part
                                    })}
                                  </p>
                                </motion.div>
                              )
                            }
                            
                            // Check if it's a bullet point (- • * ▸)
                            if (/^[-•*▸]\s/.test(trimmed)) {
                              const content = trimmed.replace(/^[-•*▸]\s+/, '')
                              return (
                                <motion.div
                                  key={paraIdx}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: paraIdx * 0.08 }}
                                  className="flex items-start gap-3 p-3 rounded-lg bg-white/40 dark:bg-white/5 border border-finsim-borderLight/30 dark:border-finsim-dark-borderLight/30 hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                                >
                                  <motion.div
                                    animate={{ scale: [1, 1.12, 1] }}
                                    transition={{ 
                                      duration: 2, 
                                      repeat: Infinity,
                                      delay: paraIdx * 0.1,
                                      ease: "easeInOut",
                                      times: [0, 0.5, 1]
                                    }}
                                    className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-2"
                                  />
                                  <p className="text-sm leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain flex-1">
                                    {content.split(/(\d+[€%]?|\d+\.\d+[€%]?)/g).map((part, partIdx) => {
                                      if (/^\d+[€%]?$/.test(part) || /^\d+\.\d+[€%]?$/.test(part)) {
                                        return (
                                          <span key={partIdx} className="font-semibold text-finsim-primary dark:text-finsim-dark-primary">
                                            {part}
                                          </span>
                                        )
                                      }
                                      return part
                                    })}
                                  </p>
                                </motion.div>
                              )
                            }
                            
                            // Check if it's a heading (ends with : or is short and uppercase)
                            const isHeading = trimmed.endsWith(':') || (trimmed.length < 100 && /^[A-ZА-ЯЁ]/.test(trimmed) && !trimmed.includes('.') && trimmed.split(' ').length <= 8)
                            if (isHeading) {
                              return (
                                <motion.h5
                                  key={paraIdx}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: paraIdx * 0.08 }}
                                  className="text-sm font-semibold text-finsim-textMain dark:text-white mb-2 mt-4 first:mt-0"
                                >
                                  {trimmed.replace(/:$/, '')}
                                </motion.h5>
                              )
                            }
                            
                            // Regular paragraph
                            return (
                              <motion.div
                                key={paraIdx}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: paraIdx * 0.08 }}
                                className="p-4 rounded-lg bg-white/40 dark:bg-white/5 border border-finsim-borderLight/30 dark:border-finsim-dark-borderLight/30"
                              >
                                <p className="text-sm leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain">
                                  {trimmed.split(/(\d+[€%]?|\d+\.\d+[€%]?)/g).map((part, partIdx) => {
                                    if (/^\d+[€%]?$/.test(part) || /^\d+\.\d+[€%]?$/.test(part)) {
                                      return (
                                        <span key={partIdx} className="font-semibold text-finsim-primary dark:text-finsim-dark-primary">
                                          {part}
                                        </span>
                                      )
                                    }
                                    return part
                                  })}
                                </p>
                              </motion.div>
                            )
                          })
                        })()}
                      </div>
                    </motion.div>
                  )}

                  {/* Personalisierte Tipps */}
                  {(tipsText || analysis) && (
                    <div className="glass-effect premium-shadow rounded-[24px] p-6 sm:p-8 space-y-5 animate-fade-in-up">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20">
                          <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
                              Personalisierte Tipps
                            </h4>
                            {(() => {
                              // Проверяем, есть ли LLM tips
                              let parsedTips: Array<{ emoji: string; title: string; description: string }> = []
                              if (tipsText) {
                                parsedTips = parseTips(tipsText)
                              }
                              const isUsingLLM = tipsText && parsedTips.length > 0
                              
                              return isUsingLLM ? (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                                    KI-generiert
                                  </span>
                                </motion.div>
                              ) : null
                            })()}
                          </div>
                          <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                            {(() => {
                              let parsedTips: Array<{ emoji: string; title: string; description: string }> = []
                              if (tipsText) {
                                parsedTips = parseTips(tipsText)
                              }
                              const isUsingLLM = tipsText && parsedTips.length > 0
                              return isUsingLLM 
                                ? "KI-generierte Handlungsempfehlungen auf Basis deiner Daten und Ziele."
                                : "Konkrete Handlungsempfehlungen auf Basis deiner Einnahmen, Ausgaben und Ziele."
                            })()}
                          </p>
                        </div>
                      </div>
                  
                      {(() => {
                        // Если есть tipsText от LLM, пытаемся распарсить
                        let parsedTips: Array<{ emoji: string; title: string; description: string }> = []
                        if (tipsText) {
                          parsedTips = parseTips(tipsText)
                        }
                        
                        // Используем fallback подсказки, если LLM не вернул подсказки или они не распарсились
                        const tipsToShow = parsedTips.length > 0 ? parsedTips : FALLBACK_TIPS
                        const isUsingFallback = !tipsText || parsedTips.length === 0
                        
                        return (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {tipsToShow.map((tip, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.08, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                whileHover={{ 
                                  scale: 1.02,
                                  y: -2,
                                  transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
                                }}
                                onClick={() => handleTipClick(tip, isUsingFallback)}
                                className="group relative p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-finsim-borderLight dark:border-finsim-dark-borderLight 
                                  hover:bg-white/90 dark:hover:bg-white/10 
                                  hover:border-finsim-primary/40 dark:hover:border-finsim-dark-primary/40 
                                  hover:shadow-lg dark:hover:shadow-xl
                                  transition-all duration-300 cursor-pointer
                                  hover:ring-1 hover:ring-finsim-primary/20 dark:hover:ring-finsim-dark-primary/20
                                  active:scale-[0.98]"
                              >
                                {/* Subtle glow on hover */}
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-finsim-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                
                                <div className="relative flex items-start gap-3">
                                  <motion.div 
                                    className="text-2xl flex-shrink-0 w-10 h-10 flex items-center justify-center"
                                    whileHover={{ scale: 1.15, rotate: 5 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ 
                                      fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
                                      lineHeight: 1
                                    }}
                                  >
                                    {tip.emoji || '💡'}
                                  </motion.div>
                                  <div className="flex-1 space-y-1.5 min-w-0">
                                    <h5 className="text-sm font-semibold text-finsim-textMain dark:text-finsim-dark-textMain group-hover:text-finsim-primary dark:group-hover:text-finsim-dark-primary transition-colors">
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
                        )
                      })()}
                    </div>
                  )}

                  {/* Zusammenfassung - Apple/OpenAI Style */}
                  {summaryText && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      className="glass-effect premium-shadow rounded-2xl p-4 sm:p-5 animate-fade-in-up"
                    >
                      {/* Minimalist Header */}
                      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-finsim-borderLight/30 dark:border-finsim-dark-borderLight/30">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-500/20">
                          <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-finsim-textMain dark:text-white tracking-tight">
                            Zusammenfassung
                          </h4>
                        </div>
                      </div>
                      
                      {/* Clean Content */}
                      <div className="space-y-3">
                        {(() => {
                          // Split by sentences or paragraphs for better readability
                          const sentences = summaryText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
                          
                          // Group into logical paragraphs (max 2-3 sentences per paragraph)
                          const paragraphs: string[] = []
                          let currentParagraph = ""
                          
                          sentences.forEach((sentence, idx) => {
                            currentParagraph += (currentParagraph ? " " : "") + sentence.trim()
                            // Create new paragraph every 2-3 sentences or if sentence is very long
                            if ((idx + 1) % 2 === 0 || sentence.length > 150 || idx === sentences.length - 1) {
                              if (currentParagraph.trim()) {
                                paragraphs.push(currentParagraph.trim())
                                currentParagraph = ""
                              }
                            }
                          })
                          
                          return paragraphs.map((paragraph, paraIdx) => (
                            <motion.p
                              key={paraIdx}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: paraIdx * 0.1, duration: 0.3 }}
                              className="text-sm leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain"
                            >
                              {paragraph.split(/(\d+[€%]?|\d+\.\d+[€%]?)/g).map((part, partIdx) => {
                                if (/^\d+[€%]?$/.test(part) || /^\d+\.\d+[€%]?$/.test(part)) {
                                  return (
                                    <span key={partIdx} className="font-semibold text-finsim-primary dark:text-finsim-dark-primary">
                                      {part}
                                    </span>
                                  )
                                }
                                return part
                              })}
                            </motion.p>
                          ))
                        })()}
                      </div>
                    </motion.div>
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
                {analysis && (
                <PdfExportButton
                  summary={{
                    goal: userGoal,
                    totalIncome: analysis.finance_data.total_income,
                    totalExpenses: analysis.finance_data.total_expenses,
                    netBalance: analysis.finance_data.net_balance,
                    savingsRate: analysis.finance_data.total_income > 0 
                      ? ((analysis.finance_data.total_income - analysis.finance_data.total_expenses) / analysis.finance_data.total_income) * 100 
                      : 0,
                    bestTitle: analysis.scenarios.best_case.title,
                    bestFinal: analysis.scenarios.best_case.final_balance,
                    bestProjections: analysis.scenarios.best_case.projections.map(p => ({
                      month: p.month,
                      cumulative_balance: p.cumulative_balance
                    })),
                    realisticTitle: analysis.scenarios.realistic_case.title,
                    realisticFinal: analysis.scenarios.realistic_case.final_balance,
                    realisticProjections: analysis.scenarios.realistic_case.projections.map(p => ({
                      month: p.month,
                      cumulative_balance: p.cumulative_balance
                    })),
                    worstTitle: analysis.scenarios.worst_case.title,
                    worstFinal: analysis.scenarios.worst_case.final_balance,
                    worstProjections: analysis.scenarios.worst_case.projections.map(p => ({
                      month: p.month,
                      cumulative_balance: p.cumulative_balance
                    })),
                    summary: analysis.ai_analysis?.summary || undefined,
                    tips: analysis.ai_analysis?.tips || undefined,
                  }}
                  analysis={analysis}
                />
                )}
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
          onOpenQuiz={() => {
            setShowProfileSettings(false)
            setIsQuizOpen(true)
          }}
        />
      {isAuthenticated && (
        <QuizModal
          open={isQuizOpen}
          onClose={() => setIsQuizOpen(false)}
          onCompleted={async () => {
            await checkAuth()
            setIsQuizOpen(false)
          }}
          existingProfile={user?.quiz_profile || undefined}
          defaultProfession={user?.profession || undefined}
        />
      )}
      {isAuthenticated && (
        <AnalysisHistorySidebar
          open={showHistorySidebar}
          onClose={() => setShowHistorySidebar(false)}
          onSelectAnalysis={handleSelectAnalysis}
        />
      )}

      {/* Tip Details Modal */}
      <AnimatePresence mode="wait">
        {selectedTip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={handleCloseTipModal}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden glass-effect premium-shadow rounded-[28px] border border-finsim-borderLight dark:border-finsim-dark-borderLight"
            >
            {/* Header */}
            <div className="relative p-6 sm:p-8 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
              <button
                onClick={handleCloseTipModal}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-finsim-textSecondary dark:text-finsim-dark-textSecondary" />
              </button>
              
              <div className="flex items-start gap-4 pr-10">
                <div 
                  className="text-4xl flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20"
                  style={{ 
                    fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
                    lineHeight: 1
                  }}
                >
                  {selectedTip.emoji || '💡'}
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
                    {selectedTip.title}
                  </h3>
                  <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary leading-relaxed">
                    {selectedTip.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar">
              {isLoadingTipDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-finsim-primary dark:text-finsim-dark-primary animate-spin" />
                </div>
              ) : tipDetails ? (
                <div className="space-y-5">
                  {(() => {
                    // Разбиваем текст на строки для обработки (сохраняем пустые строки для разделения абзацев)
                    const allLines = tipDetails.split(/\n/)
                    const result: JSX.Element[] = []
                    let currentParagraph: string[] = []
                    let currentBullets: string[] = []
                    
                    allLines.forEach((line, lineIdx) => {
                      const trimmed = line.trim()
                      const isEmpty = trimmed.length === 0
                      
                      // Проверяем, является ли строка заголовком (начинается с ** и заканчивается на ** или заканчивается на :)
                      const isHeading = (trimmed.startsWith('**') && trimmed.endsWith('**')) || 
                                       (trimmed.endsWith(':') && trimmed.length < 100 && !trimmed.includes('.'))
                      
                      // Если пустая строка - завершаем текущий блок
                      if (isEmpty) {
                        if (currentParagraph.length > 0) {
                          result.push(
                            <motion.div
                              key={`para-${result.length}`}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: result.length * 0.08 }}
                              className="mb-5"
                            >
                              <p className="text-sm leading-7 text-finsim-textMain dark:text-finsim-dark-textMain">
                                {renderFormattedText(currentParagraph.join(' '), result.length)}
                              </p>
                            </motion.div>
                          )
                          currentParagraph = []
                        }
                        if (currentBullets.length > 0) {
                          result.push(
                            <motion.div
                              key={`bullets-${result.length}`}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: result.length * 0.08 }}
                              className="space-y-2.5 mb-5"
                            >
                              {currentBullets.map((bullet, bulletIdx) => {
                                let processed = bullet.trim()
                                if (!processed) return null
                                
                                processed = processed.replace(/^\d+\.\s*/, '')
                                const { emoji, rest } = extractEmoji(processed)
                                const textWithoutEmoji = rest || processed.replace(/^•\s*/, '').trim()
                                
                                let accentColor = 'text-emerald-500 dark:text-emerald-400'
                                let bgColor = 'bg-emerald-500/10 dark:bg-emerald-500/20'
                                
                                if (emoji.includes('⚠️') || emoji.includes('⚠')) {
                                  accentColor = 'text-amber-500 dark:text-amber-400'
                                  bgColor = 'bg-amber-500/10 dark:bg-amber-500/20'
                                } else if (emoji.includes('✅') || emoji.includes('✓')) {
                                  accentColor = 'text-green-500 dark:text-green-400'
                                  bgColor = 'bg-green-500/10 dark:bg-green-500/20'
                                } else if (emoji.includes('📊') || emoji.includes('📈')) {
                                  accentColor = 'text-blue-500 dark:text-blue-400'
                                  bgColor = 'bg-blue-500/10 dark:bg-blue-500/20'
                                } else if (emoji.includes('🎯')) {
                                  accentColor = 'text-red-500 dark:text-red-400'
                                  bgColor = 'bg-red-500/10 dark:bg-red-500/20'
                                } else if (emoji.includes('💡')) {
                                  accentColor = 'text-yellow-500 dark:text-yellow-400'
                                  bgColor = 'bg-yellow-500/10 dark:bg-yellow-500/20'
                                }
                                
                                return (
                                  <div
                                    key={bulletIdx}
                                    className={`flex gap-3 items-start p-3.5 rounded-xl ${bgColor} border border-finsim-borderLight dark:border-finsim-dark-borderLight`}
                                  >
                                    {emoji ? (
                                      <span 
                                        className={`text-lg flex-shrink-0 ${accentColor}`}
                                        style={{ 
                                          fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
                                          lineHeight: 1
                                        }}
                                      >
                                        {emoji}
                                      </span>
                                    ) : (
                                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-finsim-primary dark:bg-finsim-dark-primary mt-2" />
                                    )}
                                    <p className="text-sm leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain flex-1">
                                      {renderFormattedText(textWithoutEmoji, bulletIdx)}
                                    </p>
                                  </div>
                                )
                              })}
                            </motion.div>
                          )
                          currentBullets = []
                        }
                        return // Пропускаем пустую строку
                      }
                      
                      // Если это заголовок, обрабатываем отдельно
                      if (isHeading) {
                        // Сохраняем накопленные элементы перед заголовком
                        if (currentParagraph.length > 0) {
                          result.push(
                            <motion.div
                              key={`para-${result.length}`}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: result.length * 0.08 }}
                              className="mb-5"
                            >
                              <p className="text-sm leading-7 text-finsim-textMain dark:text-finsim-dark-textMain">
                                {renderFormattedText(currentParagraph.join(' '), result.length)}
                              </p>
                            </motion.div>
                          )
                          currentParagraph = []
                        }
                        if (currentBullets.length > 0) {
                          result.push(
                            <motion.div
                              key={`bullets-${result.length}`}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: result.length * 0.08 }}
                              className="space-y-2.5 mb-5"
                            >
                              {currentBullets.map((bullet, bulletIdx) => {
                                let processed = bullet.trim()
                                if (!processed) return null
                                processed = processed.replace(/^\d+\.\s*/, '')
                                const { emoji, rest } = extractEmoji(processed)
                                const textWithoutEmoji = rest || processed.replace(/^•\s*/, '').trim()
                                let accentColor = 'text-blue-500 dark:text-blue-400'
                                let bgColor = 'bg-blue-500/10 dark:bg-blue-500/20'
                                if (emoji.includes('⚠️') || emoji.includes('⚠')) {
                                  accentColor = 'text-amber-500 dark:text-amber-400'
                                  bgColor = 'bg-amber-500/10 dark:bg-amber-500/20'
                                } else if (emoji.includes('🎯')) {
                                  accentColor = 'text-red-500 dark:text-red-400'
                                  bgColor = 'bg-red-500/10 dark:bg-red-500/20'
                                }
                                return (
                                  <div
                                    key={bulletIdx}
                                    className={`flex gap-3 items-start p-3.5 rounded-xl ${bgColor} border border-finsim-borderLight dark:border-finsim-dark-borderLight`}
                                  >
                                    {emoji ? (
                                      <span 
                                        className={`text-lg flex-shrink-0 ${accentColor}`}
                                        style={{ 
                                          fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
                                          lineHeight: 1
                                        }}
                                      >
                                        {emoji}
                                      </span>
                                    ) : (
                                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-2" />
                                    )}
                                    <p className="text-sm leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain flex-1">
                                      {renderFormattedText(textWithoutEmoji, bulletIdx)}
                                    </p>
                                  </div>
                                )
                              })}
                            </motion.div>
                          )
                          currentBullets = []
                        }
                        // Отображаем заголовок
                        const headingText = trimmed.replace(/\*\*/g, '').replace(/:$/, '')
                        result.push(
                          <motion.h4
                            key={`heading-${result.length}`}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: result.length * 0.08 }}
                            className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain mb-3 mt-5 first:mt-0"
                          >
                            {headingText}
                          </motion.h4>
                        )
                        return
                      }
                      
                      // Проверяем, является ли строка bullet point
                      const isBullet = trimmed.startsWith('•') || 
                                      /^[💡✅⚠️📊🎯]/.test(trimmed) ||
                                      /^\d+\.\s*[💡✅⚠️📊🎯]/.test(trimmed) ||
                                      /^\d+\.\s*•/.test(trimmed)
                      
                      if (isBullet) {
                        // Если накопился параграф, сохраняем его
                        if (currentParagraph.length > 0) {
                          result.push(
                            <motion.div
                              key={`para-${result.length}`}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: result.length * 0.08 }}
                              className="mb-5"
                            >
                              <p className="text-sm leading-7 text-finsim-textMain dark:text-finsim-dark-textMain">
                                {renderFormattedText(currentParagraph.join(' '), result.length)}
                              </p>
                            </motion.div>
                          )
                          currentParagraph = []
                        }
                        // Добавляем bullet point
                        currentBullets.push(trimmed)
      } else {
                        // Если накопились bullet points, сохраняем их
                        if (currentBullets.length > 0) {
                          result.push(
                            <motion.div
                              key={`bullets-${result.length}`}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: result.length * 0.08 }}
                              className="space-y-2.5 mb-5"
                            >
                              {currentBullets.map((bullet, bulletIdx) => {
                                let processed = bullet.trim()
                                if (!processed) return null
                                
                                processed = processed.replace(/^\d+\.\s*/, '')
                                const { emoji, rest } = extractEmoji(processed)
                                const textWithoutEmoji = rest || processed.replace(/^•\s*/, '').trim()
                                
                                let accentColor = 'text-emerald-500 dark:text-emerald-400'
                                let bgColor = 'bg-emerald-500/10 dark:bg-emerald-500/20'
                                
                                if (emoji.includes('⚠️') || emoji.includes('⚠')) {
                                  accentColor = 'text-amber-500 dark:text-amber-400'
                                  bgColor = 'bg-amber-500/10 dark:bg-amber-500/20'
                                } else if (emoji.includes('✅') || emoji.includes('✓')) {
                                  accentColor = 'text-green-500 dark:text-green-400'
                                  bgColor = 'bg-green-500/10 dark:bg-green-500/20'
                                } else if (emoji.includes('📊') || emoji.includes('📈')) {
                                  accentColor = 'text-blue-500 dark:text-blue-400'
                                  bgColor = 'bg-blue-500/10 dark:bg-blue-500/20'
                                } else if (emoji.includes('🎯')) {
                                  accentColor = 'text-red-500 dark:text-red-400'
                                  bgColor = 'bg-red-500/10 dark:bg-red-500/20'
                                } else if (emoji.includes('💡')) {
                                  accentColor = 'text-yellow-500 dark:text-yellow-400'
                                  bgColor = 'bg-yellow-500/10 dark:bg-yellow-500/20'
                                }

  return (
                                  <div
                                    key={bulletIdx}
                                    className={`flex gap-3 items-start p-3.5 rounded-xl ${bgColor} border border-finsim-borderLight dark:border-finsim-dark-borderLight`}
                                  >
                                    {emoji ? (
                                      <span 
                                        className={`text-lg flex-shrink-0 ${accentColor}`}
                                        style={{ 
                                          fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
                                          lineHeight: 1
                                        }}
                                      >
                                        {emoji}
                                      </span>
                                    ) : (
                                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-finsim-primary dark:bg-finsim-dark-primary mt-2" />
                                    )}
                                    <p className="text-sm leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain flex-1">
                                      {textWithoutEmoji.split(/(\d+[€%]?|\d+\.\d+[€%]?)/g).map((part, partIdx) => {
                                        if (/^\d+[€%]?$/.test(part) || /^\d+\.\d+[€%]?$/.test(part)) {
                                          return (
                                            <span key={partIdx} className="font-bold text-finsim-primary dark:text-finsim-dark-primary">
                                              {part}
                                            </span>
                                          )
                                        }
                                        return part
                                      })}
        </p>
      </div>
                                )
                              })}
                            </motion.div>
                          )
                          currentBullets = []
                        }
                        // Добавляем к параграфу
                        currentParagraph.push(trimmed)
                      }
                    })
                    
                    // Сохраняем оставшиеся элементы
                    if (currentParagraph.length > 0) {
                      result.push(
                        <motion.div
                          key={`para-final-${result.length}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: result.length * 0.08 }}
                          className="mb-5"
          >
                          <p className="text-sm leading-7 text-finsim-textMain dark:text-finsim-dark-textMain">
                            {currentParagraph.join(' ').split(/(\d+[€%]?|\d+\.\d+[€%]?)/g).map((part, partIdx) => {
                              if (/^\d+[€%]?$/.test(part) || /^\d+\.\d+[€%]?$/.test(part)) {
                                return (
                                  <span key={partIdx} className="font-bold text-finsim-primary dark:text-finsim-dark-primary">
                                    {part}
                                  </span>
                                )
                              }
                              return part
                            })}
                          </p>
                        </motion.div>
                      )
                    }
                    
                    if (currentBullets.length > 0) {
                      result.push(
                        <motion.div
                          key={`bullets-final-${result.length}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: result.length * 0.08 }}
                          className="space-y-2.5 mb-5"
                        >
                          {currentBullets.map((bullet, bulletIdx) => {
                            let processed = bullet.trim()
                            if (!processed) return null
                            
                            processed = processed.replace(/^\d+\.\s*/, '')
                            const { emoji, rest } = extractEmoji(processed)
                            const textWithoutEmoji = rest || processed.replace(/^•\s*/, '').trim()
                            
                            let accentColor = 'text-emerald-500 dark:text-emerald-400'
                            let bgColor = 'bg-emerald-500/10 dark:bg-emerald-500/20'
                            
                            if (emoji.includes('⚠️') || emoji.includes('⚠')) {
                              accentColor = 'text-amber-500 dark:text-amber-400'
                              bgColor = 'bg-amber-500/10 dark:bg-amber-500/20'
                            } else if (emoji.includes('✅') || emoji.includes('✓')) {
                              accentColor = 'text-green-500 dark:text-green-400'
                              bgColor = 'bg-green-500/10 dark:bg-green-500/20'
                            } else if (emoji.includes('📊') || emoji.includes('📈')) {
                              accentColor = 'text-blue-500 dark:text-blue-400'
                              bgColor = 'bg-blue-500/10 dark:bg-blue-500/20'
                            } else if (emoji.includes('🎯')) {
                              accentColor = 'text-red-500 dark:text-red-400'
                              bgColor = 'bg-red-500/10 dark:bg-red-500/20'
                            } else if (emoji.includes('💡')) {
                              accentColor = 'text-yellow-500 dark:text-yellow-400'
                              bgColor = 'bg-yellow-500/10 dark:bg-yellow-500/20'
                            }

  return (
                              <div
                                key={bulletIdx}
                                className={`flex gap-3 items-start p-3.5 rounded-xl ${bgColor} border border-finsim-borderLight dark:border-finsim-dark-borderLight`}
                              >
                                {emoji ? (
                                  <span 
                                    className={`text-lg flex-shrink-0 ${accentColor}`}
                                    style={{ 
                                      fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
                                      lineHeight: 1
                                    }}
                                  >
                                    {emoji}
                                  </span>
                                ) : (
                                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-finsim-primary dark:bg-finsim-dark-primary mt-2" />
                                )}
                                <p className="text-sm leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain flex-1">
                                  {textWithoutEmoji.split(/(\d+[€%]?|\d+\.\d+[€%]?)/g).map((part, partIdx) => {
                                    if (/^\d+[€%]?$/.test(part) || /^\d+\.\d+[€%]?$/.test(part)) {
                                      return (
                                        <span key={partIdx} className="font-bold text-finsim-primary dark:text-finsim-dark-primary">
                                          {part}
                                        </span>
                                      )
                                    }
                                    return part
                                  })}
                                </p>
      </div>
                            )
                          })}
                        </motion.div>
                      )
                    }
                    
                    return result.length > 0 ? result : (
                      <p className="text-sm leading-7 text-finsim-textMain dark:text-finsim-dark-textMain">
                        {tipDetails}
                      </p>
                    )
                  })()}
    </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                    Lade detaillierte Informationen...
                  </p>
    </div>
              )}
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

