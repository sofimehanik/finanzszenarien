# Инструкция по деплою на Render

## Быстрый старт (с render.yaml)

1. Зайдите на [render.com](https://render.com) и зарегистрируйтесь через GitHub
2. Нажмите "New" → "Blueprint"
3. Подключите ваш GitHub репозиторий
4. Render автоматически обнаружит `render.yaml` и создаст все сервисы
5. После деплоя обновите переменные окружения:
   - В Backend Service: `FRONTEND_URL` = URL вашего фронтенда
   - В Frontend Service: `NEXT_PUBLIC_API_URL` = URL вашего бэкенда

## Ручной деплой (без render.yaml)

### 1. Создайте PostgreSQL Database

1. New → PostgreSQL
2. Name: `finanzszenarien-db`
3. Database: `finanzszenarien`
4. User: `finanzszenarien_user`
5. Plan: Free
6. Create Database
7. Скопируйте **Internal Database URL**

### 2. Создайте Backend Service

1. New → Web Service → Connect GitHub
2. Repository: выберите `finanzszenarien`
3. Name: `finanzszenarien-backend`
4. Root Directory: `backend`
5. Environment: `Python 3`
6. Build Command: `pip install -r requirements.txt`
7. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
8. Plan: Free

**Environment Variables:**
- `DATABASE_URL` = (Internal Database URL из PostgreSQL)
- `FRONTEND_URL` = `https://finanzszenarien-frontend.onrender.com` (обновите после деплоя фронтенда)
- `PORT` = `8000`
- `OPENAI_API_KEY` = (опционально, если используете)
- `GEMINI_API_KEY` = (опционально, если используете)
- `LLM_PROVIDER` = `openai` или `gemini` (опционально)

9. Create Web Service

### 3. Создайте Frontend Service

1. New → Web Service → Connect GitHub
2. Repository: выберите `finanzszenarien`
3. Name: `finanzszenarien-frontend`
4. Root Directory: `frontend`
5. Environment: `Node`
6. Build Command: `npm install && npm run build`
7. Start Command: `npm start`
8. Plan: Free

**Environment Variables:**
- `NEXT_PUBLIC_API_URL` = `https://finanzszenarien-backend.onrender.com` (URL вашего бэкенда)

9. Create Web Service

### 4. Обновите переменные окружения

После того, как оба сервиса задеплоены:

1. Откройте Backend Service → Environment
2. Обновите `FRONTEND_URL` на реальный URL фронтенда
3. Откройте Frontend Service → Environment
4. Убедитесь, что `NEXT_PUBLIC_API_URL` указывает на правильный URL бэкенда

## Важные замечания

⚠️ **Free план на Render:**
- Сервисы могут "засыпать" после 15 минут бездействия
- Первый запрос после простоя может занять 30-60 секунд (cold start)
- Для демонстрации: откройте оба сервиса за 5-10 минут до презентации

✅ **Рекомендации:**
- Используйте один регион для всех сервисов (например, Frankfurt)
- Убедитесь, что все переменные окружения установлены правильно
- Проверьте логи, если что-то не работает

## Проверка деплоя

1. Откройте URL фронтенда в браузере
2. Проверьте, что приложение загружается
3. Попробуйте зарегистрироваться/войти
4. Проверьте загрузку CSV файла

## Troubleshooting

**Проблема: Backend не подключается к базе данных**
- Проверьте, что `DATABASE_URL` установлен правильно
- Убедитесь, что используете **Internal Database URL**, а не Public URL

**Проблема: CORS ошибки**
- Проверьте, что `FRONTEND_URL` в бэкенде совпадает с реальным URL фронтенда
- Убедитесь, что URL без слеша в конце

**Проблема: Frontend не может подключиться к Backend**
- Проверьте, что `NEXT_PUBLIC_API_URL` установлен правильно
- Убедитесь, что бэкенд запущен и доступен

**Проблема: Медленный первый запрос**
- Это нормально для Free плана (cold start)
- Откройте сервисы заранее перед демонстрацией

