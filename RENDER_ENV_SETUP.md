# Настройка Environment Variables на Render

## ⚠️ Важно: Разделение переменных для Backend и Frontend

### 🔴 Backend Service (finanzszenarien-backend)

**Environment Variables для бэкенда:**

| Key | Value | Описание |
|-----|-------|----------|
| `DATABASE_URL` | (автоматически из PostgreSQL) | URL подключения к базе данных |
| `FRONTEND_URL` | `https://finsim-beta-frontend.onrender.com` | URL фронтенда для CORS |
| `PORT` | `8000` | Порт для запуска сервера |
| `PYTHON_VERSION` | `3.11.9` | Версия Python |
| `OPENAI_API_KEY` | (ваш ключ) | Опционально, для LLM функций |
| `GEMINI_API_KEY` | (ваш ключ) | Опционально, для LLM функций |
| `LLM_PROVIDER` | `openai` или `gemini` | Опционально, какой LLM использовать |

**❌ НЕ добавляйте `NEXT_PUBLIC_API_URL` в бэкенд!** Это переменная только для фронтенда.

---

### 🟢 Frontend Service (finanzszenarien-frontend)

**Environment Variables для фронтенда:**

| Key | Value | Описание |
|-----|-------|----------|
| `NEXT_PUBLIC_API_URL` | `https://finsim-beta.onrender.com` | URL бэкенда |

**❌ НЕ добавляйте `FRONTEND_URL` или `DATABASE_URL` во фронтенд!** Это переменные только для бэкенда.

---

## 📝 Пошаговая настройка

### 1. После деплоя Backend на Render:

1. Откройте ваш Backend Service на Render
2. Перейдите в раздел **Environment**
3. Установите следующие переменные:
   - `FRONTEND_URL` = `https://finsim-beta-frontend.onrender.com`
   - `DATABASE_URL` = должен быть установлен автоматически из PostgreSQL
   - `PORT` = `8000`
   - `PYTHON_VERSION` = `3.11.9`
   - Опционально: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `LLM_PROVIDER`

### 2. После деплоя Frontend на Render:

1. Откройте ваш Frontend Service на Render
2. Перейдите в раздел **Environment**
3. Установите:
   - `NEXT_PUBLIC_API_URL` = `https://finsim-beta.onrender.com`

### 3. После изменения переменных:

- **Backend**: автоматически перезапустится
- **Frontend**: нужно сделать **Manual Deploy** или подождать автоматический перезапуск

---

## 🔍 Проверка правильности настройки

### Backend:
- Откройте `https://ваш-бэкенд.onrender.com/api/health`
- Должен вернуться JSON: `{"status": "ok", ...}`

### Frontend:
- Откройте консоль браузера (F12)
- Проверьте, что запросы идут на правильный URL бэкенда
- Не должно быть CORS ошибок

---

## ⚠️ Частые ошибки

1. **Добавление `NEXT_PUBLIC_API_URL` в бэкенд** ❌
   - Это переменная только для фронтенда!

2. **Неправильный `FRONTEND_URL` в бэкенде** ❌
   - Должен быть URL фронтенда, не бэкенда!

3. **Неправильный `NEXT_PUBLIC_API_URL` во фронтенде** ❌
   - Должен быть URL бэкенда, не фронтенда!

4. **Использование Public Database URL вместо Internal** ❌
   - Используйте Internal Database URL для `DATABASE_URL`

---

## 📋 Пример правильной настройки

### Backend Environment Variables:
```
DATABASE_URL=postgresql://... (Internal URL - автоматически из PostgreSQL)
FRONTEND_URL=https://finsim-beta-frontend.onrender.com
PORT=8000
PYTHON_VERSION=3.11.9
OPENAI_API_KEY=sk-... (опционально)
GEMINI_API_KEY=... (опционально)
LLM_PROVIDER=openai (опционально)
```

### Frontend Environment Variables:
```
NEXT_PUBLIC_API_URL=https://finsim-beta.onrender.com
```

---

## ✅ Текущие URL вашего проекта:

- **Backend**: https://finsim-beta.onrender.com/
- **Frontend**: https://finsim-beta-frontend.onrender.com/

**Убедитесь, что в Render настроены следующие переменные:**

### В Backend Service (finanzszenarien-backend):
- `FRONTEND_URL` = `https://finsim-beta-frontend.onrender.com`

### В Frontend Service (finanzszenarien-frontend):
- `NEXT_PUBLIC_API_URL` = `https://finsim-beta.onrender.com`

