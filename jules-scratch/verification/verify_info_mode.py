import re
from playwright.sync_api import sync_playwright, Page, expect

def run_verification(page: Page):
    """
    Верифицирует, что информационный режим корректно работает с бэкендом.
    """
    # Настраиваем автоматическое закрытие любых диалоговых окон (alert)
    page.on("dialog", lambda dialog: dialog.dismiss())

    # 1. Запустить приложение и перейти на страницу
    # Сервер уже должен быть запущен на http://localhost:8000
    page.goto("http://localhost:8000")

    # 2. Настроить мок для ответа от бессерверной функции
    mock_response_text = "Стороны договорились, что все предыдущие договоренности теряют силу."
    page.route(
        "**/.netlify/functions/process-text",
        lambda route: route.fulfill(
            status=200,
            headers={"Content-Type": "application/json"},
            body=f'{{"processedText": "{mock_response_text}"}}'
        )
    )

    # 3. Выбрать режим "Информационное"
    # Кликаем на <label>, так как сам <input> скрыт через CSS
    info_mode_label = page.locator('label[for="mode-info"]')
    info_mode_label.click()

    # 4. Ввести текст в поле
    info_textarea = page.locator("#info-general-text")
    expect(info_textarea).to_be_visible()
    info_textarea.fill("просто тестовый ввод")

    # 5. Нажать кнопку "Сгенерировать"
    generate_button = page.get_by_role("button", name="Сгенерировать текст соглашения")
    generate_button.click()

    # 6. Проверить, что в поле результата появился текст из мока
    result_textarea = page.locator("#result-text")

    # Ожидаем, что текст будет содержать наш мокированный ответ
    # Используем `to_contain_text` так как полный текст включает нумерацию и другие части.
    expect(result_textarea).to_contain_text(mock_response_text)

    # 7. Сделать скриншот для визуальной проверки
    page.screenshot(path="jules-scratch/verification/verification.png")

# Запуск скрипта
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    run_verification(page)
    browser.close()

print("Verification script finished and screenshot taken.")