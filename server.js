require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
// Railway и другие хостинги предоставят порт через переменную окружения
const PORT = process.env.PORT || 3000;

// Middleware для парсинга JSON-запросов
app.use(express.json());

// --- API Эндпоинт для Gemini ---
// (Логика взята из netlify/functions/api.js и адаптирована)
app.post('/api/process-text', async (req, res) => {
    // 1. Получаем API-ключ из переменных окружения
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY is not set in environment variables.');
        return res.status(500).json({
            error: 'Server configuration error: Missing API key.',
            suggestion: 'Установите GEMINI_API_KEY в настройках хостинга.'
        });
    }

    try {
        // 2. Получаем текст от пользователя
        const { promptText } = req.body;
        if (!promptText) {
            return res.status(400).json({ error: 'Bad Request: promptText is required.' });
        }

        // 3. Собираем промпт для ИИ
        const fullPrompt = [
            "Твоя роль - юрист-методолог, специализирующийся на составлении дополнительных соглашений к договорам страхования.",
            "ЗАДАЧА: Преобразуй неформальный текст от пользователя в один, юридически грамотный и стилистически выверенный пункт для дополнительного соглашения.",
            "ПРАВИЛА:",
            "1. Строго придерживайся смысла и содержания исходного текста пользователя. Не добавляй никакой информации, которой не было в исходном тексте. Не делай предположений и не додумывай факты. Твоя задача — исключительно переформулировать предоставленный текст в юридический стиль.",
            "2. Используй исключительно официальный, деловой стиль и формулировки: \"Стороны договорились...\", \"Внести изменения в части...\", \"Считать верными следующие реквизиты...\".",
            "3. Текст на выходе должен быть ОДНИМ цельным абзацем.",
            "4. Не добавляй нумерацию пункта.",
            "5. Не задавай вопросов и не оставляй комментариев. Выдай только готовый текст пункта.",
            "",
            "ПРИМЕР 1:",
            "- Входной текст: \"поменялся адрес страхователя теперь он живет на абая 5\"",
            "- Результат: \"Стороны договорились внести изменения в реквизиты Страхователя, а именно в графу «Адрес», и считать ее верной в следующей редакции: г. Алматы, пр. Абая, д. 5.\"",
            "",
            "ПРИМЕР 2:",
            "- Входной текст: \"ошиблись в марке машины в договоре. не камри а королла\"",
            "- Результат: \"Стороны договорились внести изменения в Приложение №1 к Договору, а именно в данные о марке/модели застрахованного транспортного средства, и считать верным следующее наименование: Toyota Corolla.\"",
            "",
            "ИСХОДНЫЙ ТЕКСТ ОТ ПОЛЬЗОВАТЕЛЯ:",
            promptText,
            "",
            "ГОТОВЫЙ ПУНКТ СОГЛАШЕНИЯ:"
        ].join('\n');

        // 4. Готовим запрос к Gemini API
        // Используем модель 'gemini-1.5-flash-latest', как в netlify/functions/api.js
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{
                parts: [{
                    text: fullPrompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024
            }
        };

        // 5. Выполняем запрос
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Gemini API Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorBody,
            });
            return res.status(400).json({
                error: `Gemini API Error: ${response.status}`,
                details: errorBody,
                suggestion: 'Check API key and request format'
            });
        }

       const data = await response.json();

        // 6. Извлекаем текст
        const processedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!processedText) {
            console.error('Could not extract text from Gemini response:', JSON.stringify(data, null, 2));
            return res.status(500).json({ error: 'Failed to parse response from AI service.' });
        }

        // 7. Отправляем успешный ответ
        return res.status(200).json({ processedText: processedText });

    } catch (error) {
        console.error('Error in server endpoint:', error);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// --- API Эндпоинт для проверки работоспособности (Health Check) ---
app.get('/api/health', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            status: 'error',
            message: 'API key not configured'
        });
    }

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Test" }] }]
            })
        });

        if (response.ok) {
            return res.status(200).json({
                status: 'ok',
                message: 'API key is valid'
            });
        } else {
            return res.status(500).json({
                status: 'error',
                message: `API key test failed: ${response.status}`
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});


// --- Раздача статики (Фронтенд) ---
// Указываем Express, что нужно раздавать файлы из корневой папки
app.use(express.static(path.join(__dirname)));

// --- Фолбэк для всех GET-запросов ---
// Любой GET-запрос, который не является API-вызовом или файлом,
// должен вернуть index.html.
app.get('*', (req, res) => {
    // Проверяем, что это не API-запрос, чтобы избежать конфликтов
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        // Если это GET-запрос на /api/, которого не существует
        res.status(404).json({ error: 'Not Found' });
   }
});

// --- Запуск сервера ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});