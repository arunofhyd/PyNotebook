
from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Open the local file directly
        file_path = os.path.abspath("index.html")
        page.goto(f"file://{file_path}")

        # Wait for the page to load (especially React)
        page.wait_for_selector("#root")

        # 1. Take a screenshot of the initial state (Guest mode usually)
        # We need to simulate clicking "Continue as Guest" if it appears
        if page.is_visible("text=Continue as Guest"):
            page.click("text=Continue as Guest")
            page.wait_for_timeout(500) # Wait for transition

        # 2. Add a cell to ensure we have content
        # (Assuming default content is present, but let us verify)

        # 3. Collapse Code: Click the first cell header
        # The header has a title tooltip "Click to toggle code visibility" or we can find by class
        # Let us find the first cell header. It has "text=[1]" usually.
        # We click it to collapse the code.
        header_locator = page.locator("text=[1]").first.locator("xpath=..")
        # The span is inside the header div. We need the parent div which has the click handler.
        # Actually my change put the click handler on the div.

        # Let us target the text "code" pill which is also in the header.
        page.click("text=[1]")

        # Wait for animation/react update
        page.wait_for_timeout(300)

        # 4. Collapse Output: Click the Eye icon in the output area.
        # We need to run the cell first to get output?
        # The default cells have content but not run yet?
        # Let us run the first cell.
        # Click the Play button in the first cell.
        # The play button has an icon.
        # Let us assume the default state has no output yet.
        # We need to run it.
        # Click the run button in the first cell.
        # It is the button with Play icon in the gutter.
        # But wait, local file execution of Pyodide might fail if not served.
        # The user has logic: if protocol is file:, it shows an error "PROTOCOL_ERROR".
        # If we see that error, we can still verify the UI layout of the error message,
        # but we cant verify the output collapse toggle because there is no output (just error).
        # Actually, the error message IS output.
        # My code renders output block for error too: `output={cell.error || cell.output}`
        # So we should see the error block.
        # Does the error block have the toggle? Yes, `(cell.output || cell.error ...)` renders the toggle wrapper.

        # So:
        # 1. Page loads.
        # 2. It detects file:// and sets error.
        # 3. Cell 1 should show "PROTOCOL_ERROR" in red box?
        # No, the `usePyodide` hook sets global `error` state which replaces the *entire main view* with an error screen if it is PROTOCOL_ERROR.
        # See: `if (loadError === "PROTOCOL_ERROR") { return ... }`
        # This replaces `<main>`.
        # So we won not see cells!

        # WORKAROUND: We need to serve the file to verify the cell UI.
        # I will use python http.server in background.

    browser.close()
