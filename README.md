# Agreement Generator - Генератор Дополнительных Соглашений

## Установка и настройка

### 1. Клонирование репозитория
```bash
git clone https://github.com/Tamerlan12345/agrem.git
cd agrem
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка API-ключа Gemini
- Получите API-ключ: https://aistudio.google.com/apikey
- В Netlify: Site Settings → Environment Variables → Add variable
- Имя: `GEMINI_API_KEY`
- Значение: ваш ключ API

### 4. Локальная разработка
```bash
npm run dev
```

### 5. Развертывание на Netlify
- Push в GitHub
- Netlify автоматически задеплоит изменения

## Диагностика проблем
- Проверить API-ключ: откройте `/api/health`
- Проверить логи: Netlify Dashboard → Functions → Logs
