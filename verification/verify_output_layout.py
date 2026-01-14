
import os
from playwright.sync_api import sync_playwright, expect

def verify_output_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server
        page.goto("http://localhost:8000/")

        # Handle Auth Screen
        print("Waiting for Auth Screen...")
        try:
            # Click 'Continue as Guest'
            guest_btn = page.get_by_role("button", name="Continue as Guest")
            expect(guest_btn).to_be_visible(timeout=10000)
            guest_btn.click()
            print("Clicked 'Continue as Guest'")
        except Exception as e:
            print(f"Auth screen interaction failed: {e}")
            raise e

        # Wait for Pyodide to be ready
        print("Waiting for Pyodide to initialize...")
        expect(page.get_by_text("Ready")).to_be_visible(timeout=60000)
        print("Pyodide is ready.")

        print("Running code cell...")
        run_all_btn = page.get_by_role("button", name="Run All")
        if run_all_btn.is_visible():
            run_all_btn.click()
        else:
            page.locator("button[title='Run Cell']").nth(0).click()

        # Wait for output in the Output Area
        # The output area has border-l-4 and border-green-500
        output_locator = page.locator(".border-l-4.border-green-500").get_by_text("Hello from Python!")

        print("Waiting for execution output...")
        expect(output_locator).to_be_visible(timeout=30000)

        # Take screenshot of the code cell (id="cell-2")
        cell_locator = page.locator("#cell-2")

        # Wait a bit for layout to settle
        page.wait_for_timeout(1000)

        output_path = "/home/jules/verification/output_layout.png"
        cell_locator.screenshot(path=output_path)
        print(f"Screenshot saved to {output_path}")

        browser.close()

if __name__ == "__main__":
    os.makedirs("/home/jules/verification", exist_ok=True)
    verify_output_layout()
