const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// API endpoint to process text with Gemini
app.post('/api/process-text', async (req, res) => {
    // 1. Get API Key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY is not set in environment variables.');
        return res.status(500).json({ error: 'Server configuration error: Missing API key.' });
    }

    try {
        // 2. Parse the incoming request body to get user input
        const { promptText } = req.body;
        if (!promptText) {
            return res.status(400).json({ error: 'Bad Request: promptText is required.' });
        }

        // 3. Construct the full prompt for the Gemini API
        const fullPrompt = `
Твоя роль - юрист-методолог, специализирующийся на составлении дополнительных соглашений к договорам страхования.
ЗАДАЧА: Преобразуй неформальный текст от пользователя в один, юридически грамотный и стилистически выверенный пункт для дополнительного соглашения.
ПРАВИЛА:
1. Сохрани ключевой смысл текста пользователя.
2. Используй исключительно официальный, деловой стиль и формулировки: "Стороны договорились...", "Внести изменения в части...", "Считать верными следующие реквизиты...".
3. Текст на выходе должен быть ОДНИМ цельным абзацем.
4. Не добавляй нумерацию пункта.
5. Не задавай вопросов и не оставляй комментариев. Выдай только готовый текст пункта.

ПРИМЕР 1:
- Входной текст: "поменялся адрес страхователя теперь он живет на абая 5"
- Результат: "Стороны договорились внести изменения в реквизиты Страхователя, а именно в графу «Адрес», и считать ее верной в следующей редакции: г. Алматы, пр. Абая, д. 5."

ПРИМЕР 2:
- Входной текст: "ошиблись в марке машины в договоре. не камри а королла"
- Результат: "Стороны договорились внести изменения в Приложение №1 к Договору, а именно в данные о марке/модели застрахованного транспортного средства, и считать верным следующее наименование: Toyota Corolla."

ИСХОДНЫЙ ТЕКСТ ОТ ПОЛЬЗОВАТЕЛЯ:
"${promptText}"

ГОТОВЫЙ ПУНКТ СОГЛАШЕНИЯ:`;

        // 4. Prepare the request payload for the Gemini API
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{
                parts: [{
                    text: fullPrompt
                }]
            }]
        };

        // 5. Make the API call to Google Gemini
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Gemini API Error:', response.status, errorBody);
            return res.status(response.status).json({ error: `Failed to process text with Gemini API. Status: ${response.status}` });
        }

        const data = await response.json();

        // 6. Extract the processed text from the response
        const processedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!processedText) {
            console.error('Could not extract text from Gemini response:', JSON.stringify(data, null, 2));
            return res.status(500).json({ error: 'Failed to parse response from AI service.' });
        }

        // 7. Send the successful response back to the frontend
        return res.status(200).json({ processedText: processedText });

    } catch (error) {
        console.error('Error in server endpoint:', error);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// Serve static files from the root directory (for index.html)
app.use(express.static(path.join(__dirname)));

// Serve the main index.html file on the root route as a fallback for any other GET request
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});