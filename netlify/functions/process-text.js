const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // 1. Принимать только POST запросы
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Метод не разрешен. Используйте POST.' }),
        };
    }

    // 2. Получить API ключ из переменных окружения
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error('API ключ Gemini не найден в переменных окружения.');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Ошибка конфигурации сервера: отсутствует API ключ.' }),
        };
    }

    try {
        // 3. Получить текст от пользователя из тела запроса
        const body = JSON.parse(event.body);
        const userInput = body.promptText;

        if (!userInput || typeof userInput !== 'string' || userInput.trim() === '') {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Не предоставлен текст для обработки (promptText).' }),
            };
        }

        // 4. Сформировать промпт для модели Gemini
        const prompt = `
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
"${userInput}"

ГОТОВЫЙ ПУНКТ СОГЛАШЕНИЯ:`;

        // 5. Отправить запрос к Google Gemini API
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('Ошибка от Gemini API:', errorBody);
            return {
                statusCode: apiResponse.status,
                body: JSON.stringify({ error: `Ошибка при обращении к Gemini API: ${apiResponse.statusText}` }),
            };
        }

        const data = await apiResponse.json();

        // 6. Обработать ответ и извлечь текст
        // Путь к тексту: data.candidates[0].content.parts[0].text
        const processedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!processedText) {
            console.error('Не удалось извлечь текст из ответа Gemini API. Структура ответа:', JSON.stringify(data));
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Не удалось обработать ответ от сервиса ИИ.' }),
            };
        }

        // 7. Отправить успешный ответ на фронтенд
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ processedText: processedText.trim() }),
        };

    } catch (error) {
        console.error('Внутренняя ошибка функции:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Произошла внутренняя ошибка: ${error.message}` }),
        };
    }
};