# Как скачать иконки Lucide

В проекте используются иконки из библиотеки [Lucide Icons](https://lucide.dev).

## Способ 1: Через официальный сайт (Рекомендуется)

1. Откройте https://lucide.dev/icons
2. Найдите нужную иконку в поиске
3. Нажмите на иконку
4. Нажмите кнопку **"Download"** или **"Copy SVG"**

## Способ 2: Используя скрипт (Все иконки сразу)

Запустите скрипт для автоматической загрузки всех используемых иконок:

```bash
./download-icons.sh
```

Иконки будут сохранены в папку `icons/` в формате SVG.

## Способ 3: Через Node.js (Если установлен)

Если у вас установлен Node.js, можно использовать Lucide CLI:

```bash
# Установка Lucide CLI
npm install -g @lucide/cli

# Экспорт всех иконок в SVG
lucide export --format svg --out icons
```

Или скачать конкретные иконки:

```bash
lucide export --format svg --out icons AlertCircle Brain Upload
```

## Используемые иконки в проекте

Полный список всех иконок, используемых в FinSim:

- AlertCircle, AlertTriangle
- ArrowDown, ArrowUp, ArrowRight, ArrowUpRight, ArrowDownRight
- Award
- BarChart3
- Brain
- Calendar
- Check, CheckCircle, CheckCircle2
- ChevronDown, ChevronUp, ChevronRight
- Clock
- DollarSign
- Edit2
- Euro
- Eye, EyeOff
- FileSpreadsheet, FileText
- Filter
- Globe
- Info
- Lightbulb
- Loader2
- LogOut
- Maximize2
- Menu
- Minus
- Moon, Sun
- Percent
- PenTool
- PiggyBank
- Plus
- RotateCcw
- Search
- Shield, ShieldCheck
- Sparkles
- Tag
- Target
- TrendingDown, TrendingUp
- Trophy
- Trash2
- Upload, ArrowUpCircle
- User, Users
- Wallet
- X
- Zap
- ZoomIn, ZoomOut

## Формат файлов

Иконки будут скачаны в формате SVG, который можно:
- Открыть в любом браузере
- Редактировать в Adobe Illustrator, Figma, Inkscape
- Использовать в веб-проектах
- Конвертировать в PNG, JPG и другие форматы
