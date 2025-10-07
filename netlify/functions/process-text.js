const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // 1. We only accept POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 2. Get API Key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY is not set in environment variables.');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: Missing API key.' })
        };
    }

    try {
        // 3. Parse the incoming request body to get user input
        const { promptText } = JSON.parse(event.body);
        if (!promptText) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Bad Request: promptText is required.' })
            };
        }

        // 4. Construct the full prompt for the Gemini API
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

        // 5. Prepare the request payload for the Gemini API
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{
                parts: [{
                    text: fullPrompt
                }]
            }]
        };

        // 6. Make the API call to Google Gemini
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
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Failed to process text with Gemini API. Status: ${response.status}` })
            };
        }

        const data = await response.json();

        // 7. Extract the processed text from the response
        // Using optional chaining to prevent errors if the structure is unexpected
        const processedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!processedText) {
            console.error('Could not extract text from Gemini response:', JSON.stringify(data, null, 2));
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to parse response from AI service.' })
            };
        }

        // 8. Send the successful response back to the frontend
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ processedText: processedText })
        };

    } catch (error) {
        console.error('Error in serverless function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An internal server error occurred.' })
        };
    }
};