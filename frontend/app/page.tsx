"use client"

import React, { useState, useEffect } from "react"
import { FileUpload } from "@/components/FileUpload"
import { ScenarioCard } from "@/components/ScenarioCard"
import { ScenarioChart } from "@/components/ScenarioChart"
import { FinanceDashboard } from "@/components/FinanceDashboard"
import PdfExportButton from "@/components/PdfExportButton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { analyzeCSV, AnalysisResponse, getSuggestedQuestions, getTipDetails } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { AlertCircle, Lightbulb, Globe, User, Brain, Sparkles, LogOut, Menu, ChevronDown, ChevronUp, X, Loader2, TrendingUp, FileText, CheckCircle, ArrowUp, ArrowDown, Minus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
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
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [showHistorySidebar, setShowHistorySidebar] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [orderedExamplePrompts, setOrderedExamplePrompts] = useState<string[]>(EXAMPLE_PROMPTS)
  const [selectedTip, setSelectedTip] = useState<{ emoji: string; title: string; description: string } | null>(null)
  const [tipDetails, setTipDetails] = useState<string | null>(null)
  const [isLoadingTipDetails, setIsLoadingTipDetails] = useState(false)
  
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
              {/* Übersicht */}
              <section className="glass-effect premium-shadow rounded-[24px] p-6 sm:p-8 space-y-6 animate-fade-in-up">
              {/* User Goal Display */}
              {userGoal && (
                  <div className="pb-4 border-b border-finsim-borderLight dark:border-finsim-dark-borderLight">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-finsim-primary dark:text-finsim-dark-primary flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <h3 className="text-sm font-medium text-finsim-textSecondary dark:text-finsim-dark-textSecondary uppercase tracking-wide">Dein Ziel</h3>
                      <p className="text-base text-finsim-textMain dark:text-finsim-dark-textMain">{userGoal}</p>
                    </div>
                  </div>
                  </div>
                )}
                
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

              {/* Vertiefte Analyse & KI-Empfehlungen - Redesigned */}
              {analysis && (plausibilityText || tipsText || scenarioAnalysisText || summaryText) && (
                <section className="space-y-6 animate-fade-in-up">
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
                  
                  {/* Plausibilitätsanalyse */}
                  {plausibilityText && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      className="glass-effect premium-shadow rounded-[24px] p-6 sm:p-8 space-y-5 animate-fade-in-up"
                    >
                      <div className="flex items-center gap-3">
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                          className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 relative overflow-hidden"
                        >
                          <motion.div
                            animate={{ 
                              rotate: [0, 360],
                            }}
                            transition={{ 
                              duration: 20,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                            className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20"
                          />
                          <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400 relative z-10" />
                        </motion.div>
                        <div className="space-y-0.5 flex-1">
                          <h4 className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
                            Plausibilitätsanalyse
                          </h4>
                          <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                            Bewertung, wie realistisch die Szenarien im Kontext deines Ziels sind.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4 pt-2">
                        {(() => {
                          // Просто разбиваем на абзацы по двойным переносам строк
                          const paragraphs = plausibilityText.split(/\n\n+/).filter(p => p.trim().length > 0)
                          
                          return paragraphs.map((paragraph, paraIdx) => {
                            return (
                              <motion.div
                                key={paraIdx}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: paraIdx * 0.1 }}
                                className="mb-4 last:mb-0"
                              >
                                <p className="text-sm leading-7 text-finsim-textMain dark:text-finsim-dark-textMain">
                                  {paragraph.split(/(\d+[€%]?|\d+\.\d+[€%]?)/g).map((part, partIdx) => {
                                    // Подсвечиваем только числа и суммы
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
                          <h4 className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
                            Personalisierte Tipps
                          </h4>
                          <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                            Konkrete Handlungsempfehlungen auf Basis deiner Einnahmen, Ausgaben und Ziele.
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

                  {/* Szenario-Analyse */}
                  {scenarioAnalysisText && (
                    <div className="glass-effect premium-shadow rounded-[24px] p-6 sm:p-8 space-y-4 animate-fade-in-up">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20">
                          <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <h4 className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
                            Szenario-Analyse
                          </h4>
                          <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                            Kurze Bewertung der drei Finanzszenarien
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4 pt-2">
                        {formatLLMText(scenarioAnalysisText).map((item, idx) => {
                          if (item.type === 'paragraph') {
                            // Проверяем, начинается ли с названия сценария
                            const isBestCase = /^BEST CASE/i.test(item.content)
                            const isRealisticCase = /^REALISTIC CASE/i.test(item.content)
                            const isWorstCase = /^WORST CASE/i.test(item.content)
                            
                            if (isBestCase || isRealisticCase || isWorstCase) {
                              const parts = item.content.split(':')
                              const title = parts[0]
                              const description = parts.slice(1).join(':').trim()
                              
                              // Определяем цвет и иконку для каждого сценария
                              let accentColor = 'text-blue-600 dark:text-blue-400'
                              let bgColor = 'bg-blue-500/10 dark:bg-blue-500/20'
                              let borderColor = 'border-blue-500/20 dark:border-blue-500/30'
                              let cardBg = 'bg-blue-50/50 dark:bg-blue-950/20'
                              let Icon = TrendingUp
                              
                              if (isBestCase) {
                                accentColor = 'text-emerald-600 dark:text-emerald-400'
                                bgColor = 'bg-emerald-500/10 dark:bg-emerald-500/20'
                                borderColor = 'border-emerald-500/20 dark:border-emerald-500/30'
                                cardBg = 'bg-emerald-50/50 dark:bg-emerald-950/20'
                                Icon = ArrowUp
                              } else if (isRealisticCase) {
                                accentColor = 'text-blue-600 dark:text-blue-400'
                                bgColor = 'bg-blue-500/10 dark:bg-blue-500/20'
                                borderColor = 'border-blue-500/20 dark:border-blue-500/30'
                                cardBg = 'bg-blue-50/50 dark:bg-blue-950/20'
                                Icon = Minus
                              } else if (isWorstCase) {
                                accentColor = 'text-red-600 dark:text-red-400'
                                bgColor = 'bg-red-500/10 dark:bg-red-500/20'
                                borderColor = 'border-red-500/20 dark:border-red-500/30'
                                cardBg = 'bg-red-50/50 dark:bg-red-950/20'
                                Icon = ArrowDown
                              }
                              
                              return (
                                <motion.div 
                                  key={idx} 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className={`p-4 rounded-xl ${cardBg} border ${borderColor} relative overflow-hidden`}
                                >
                                  {/* Цветная полоска слева */}
                                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                    isBestCase ? 'bg-emerald-500/40 dark:bg-emerald-500/50' :
                                    isRealisticCase ? 'bg-blue-500/40 dark:bg-blue-500/50' :
                                    'bg-red-500/40 dark:bg-red-500/50'
                                  }`} />
                                  
                                  <div className="flex items-start gap-3 pl-2">
                                    <div className={`p-2 rounded-lg ${bgColor} flex-shrink-0`}>
                                      <Icon className={`h-4 w-4 ${accentColor}`} />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                      <h5 className={`text-sm font-semibold ${accentColor}`}>
                                        {title}
                                      </h5>
                                      {description && (
                                        <p className="text-sm leading-relaxed text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                                          {description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )
                            }
                          }
                          return (
                            <p key={idx} className="text-sm leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain">
                              {item.content}
                            </p>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Zusammenfassung/Итоги */}
                  {summaryText && (
                    <div className="glass-effect premium-shadow rounded-[24px] p-6 sm:p-8 space-y-4 animate-fade-in-up">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20">
                          <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <h4 className="text-base font-semibold text-finsim-textMain dark:text-finsim-dark-textMain tracking-tight">
                            Zusammenfassung
                          </h4>
                          <p className="text-xs text-finsim-textSecondary dark:text-finsim-dark-textSecondary">
                            Wichtigste Erkenntnisse und nächste Schritte
                          </p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <p className="text-sm leading-relaxed text-finsim-textMain dark:text-finsim-dark-textMain">
                          {summaryText}
                        </p>
                      </div>
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
                 {analysis && (
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
        />
      {isAuthenticated && (
        <AnalysisHistorySidebar
          open={showHistorySidebar}
          onClose={() => setShowHistorySidebar(false)}
          onSelectAnalysis={handleSelectAnalysis}
        />
      )}

      {/* Tip Details Modal */}
      <AnimatePresence>
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

