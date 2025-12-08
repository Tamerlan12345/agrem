require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- API Эндпоинт для Gemini ---
app.post('/api/process-text', async (req, res) => {
    // 1. Проверка наличия API-ключа
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('ОШИБКА: Ключ GEMINI_API_KEY не найден в переменных окружения.');
        return res.status(500).json({
            error: 'Ошибка конфигурации сервера.',
            suggestion: 'Администратор должен установить GEMINI_API_KEY в настройках сервера.'
        });
    }

    try {
        // 2. Валидация входящего запроса
        const { promptText } = req.body;
        if (!promptText || typeof promptText !== 'string' || promptText.trim() === '') {
            return res.status(400).json({ error: 'Bad Request: Поле promptText обязательно и не может быть пустым.' });
        }

        // 3. Формирование полного промпта для модели
        const fullPrompt = [
            "Твоя роль - юрист-методолог, специализирующийся на составлении дополнительных соглашений к договорам страхования.",
            "ЗАДАЧА: Преобразуй неформальный текст от пользователя в один, юридически грамотный и стилистически выверенный пункт для дополнительного соглашения.",
            "ПРАВИЛА:",
            "1. Строго придерживайся смысла и содержания исходного текста пользователя. Не добавляй никакой информации, которой не было в исходном тексте. Не делай предположений и не додумывай факты. Твоя задача — исключительно переформулировать предоставленный текст в юридический стиль.",
            "2. Используй исключительно официальный, деловой стиль и формулировки: \"Стороны договорились...\", \"Внести изменения в части...\", \"Считать верными следующие реквизиты...\".",
            "3. Текст на выходе должен быть ОДНИМ цельным абзацем.",
            "4. Не добавляй нумерацию пункта (например, \"3.\").",
            "5. Не задавай вопросов и не оставляй комментариев. Выдай только готовый текст пункта.",
            "",
            "ПРИМЕР 1:",
            "- Входной текст: \"поменялся адрес страхователя теперь он живет на абая 5\"",
            "- Результат: \"Стороны договорились внести изменения в реквизиты Страхователя, а именно в графу «Адрес», и считать ее верной в следующей редакции: г. Алматы, пр. Абая, д. 5.\"",
            "",
            "ИСХОДНЫЙ ТЕКСТ ОТ ПОЛЬЗОВАТЕЛЯ:",
            promptText,
            "",
            "ГОТОВЫЙ ПУНКТ СОГЛАШЕНИЯ:"
        ].join('\n');

        // 4. Подготовка запроса к Google AI API
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        };

        // 5. Выполнение запроса с детальным логированием
        console.log('Отправка запроса к Gemini API...');
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 6. Обработка ответа от API
        if (!response.ok) {
            // Если ответ не успешный, логируем и отправляем ошибку
            const errorBody = await response.text();
            console.error('ОШИБКА от Gemini API:', {
                status: response.status,
                statusText: response.statusText,
                body: errorBody,
            });
            // Формируем сообщение для фронтенда
            return res.status(response.status).json({
                error: `API вернуло ошибку ${response.status}.`,
                suggestion: 'Проверьте правильность API ключа, доступность сервиса Google AI для вашего региона или обратитесь к деталям ошибки в консоли сервера.',
                details: errorBody
            });
        }

        const data = await response.json();

        // 7. Извлечение и проверка результата
        const processedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!processedText) {
            console.error('ОШИБКА: Не удалось извлечь текст из ответа Gemini:', JSON.stringify(data, null, 2));
            return res.status(500).json({
                error: 'Не удалось обработать ответ от сервиса ИИ.',
                suggestion: 'Ответ от API не содержит ожидаемого текста. Проверьте консоль сервера для деталей.'
             });
        }

        console.log('Успешный ответ от Gemini API получен.');
        // 8. Отправка успешного результата
        return res.status(200).json({ processedText });

    } catch (error) {
        console.error('КРИТИЧЕСКАЯ ОШИБКА на сервере:', error);
        return res.status(500).json({
            error: 'Внутренняя ошибка сервера.',
            suggestion: 'Произошла непредвиденная ошибка. Проверьте лог сервера для отладки.'
        });
    }
});

// --- Раздача статических файлов (фронтенд) ---
app.use(express.static(path.join(__dirname)));

// --- Обработка всех остальных GET-запросов (возврат index.html) ---
app.get('*', (req, res) => {
    // Исключаем API-пути из этого правила
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).json({ error: 'Not Found' });
    }
});

// --- Запуск сервера ---
app.listen(PORT, () => {
    console.log(`Сервер запущен и работает на http://localhost:${PORT}`);
});
