# Agreement Generator - Генератор Дополнительных Соглашений

Это единое Node.js/Express приложение, которое предоставляет веб-интерфейс для генерации дополнительных соглашений и использует Gemini AI для обработки текста.

## 1. Настройка API-ключа Gemini

- Получите API-ключ: https://aistudio.google.com/apikey
- При развертывании на хостинге (например, Railway) добавьте переменную окружения:
  - **Имя:** `GEMINI_API_KEY`
  - **Значение:** ваш ключ API

## 2. Локальная разработка

1.  **Клонируйте репозиторий:**
    ```bash
    git clone [https://github.com/Tamerlan12345/agrem.git](https://github.com/Tamerlan12345/agrem.git)
    cd agrem
    ```

2.  **Установите зависимости:**
    ```bash
    npm install
    ```

3.  **Создайте файл `.env`** в корне проекта для локального хранения ключа:
    ```
    GEMINI_API_KEY=Ваш_API_ключ_здесь
    ```

4.  **(Важно!) Установите `dotenv`** для чтения `.env` файла (только для локальной разработки):
    ```bash
    npm install dotenv
    ```

5.  **Добавьте `dotenv` в `server.js`:**
    * Откройте `server.js` и добавьте `require('dotenv').config();` **самой первой строкой**:
    ```javascript
    require('dotenv').config(); // <-- ДОБАВИТЬ ЭТУ СТРОКУ
    const express = require('express');
    const fetch = require('node-fetch');
    // ... остальной код
    ```

6.  **Запустите сервер:**
    ```bash
    npm start
    ```
    Откройте `http://localhost:3000` в вашем браузере.

## 3. Развертывание (Deploy) на Railway

1.  **Push** ваш обновленный код в GitHub.
2.  Создайте новый проект в Railway и подключите ваш GitHub репозиторий.
3.  Railway автоматически обнаружит `package.json` и использует команду `npm start`.
4.  Перейдите в "Variables" в настройках проекта Railway и добавьте `GEMINI_API_KEY`.
5.  Развертывание произойдет автоматически.

## 4. Диагностика проблем

- Для проверки API-ключа откройте `/api/health` на вашем развернутом сервисе.
- Проверьте логи в панели управления Railway.