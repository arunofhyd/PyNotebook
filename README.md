# PyNotebook - Serverless Python in Browser

PyNotebook is a lightweight, single-file Jupyter-like notebook environment that runs Python code entirely in your web browser using [Pyodide](https://pyodide.org/). It requires no backend server for execution, making it fast, private, and easy to deploy.

## Key Features

*   **Client-Side Execution**: Python runs in your browser via WebAssembly. Your code does not leave your device during execution.
*   **Rich Library Support**: Comes pre-loaded with `numpy`, `pandas`, and `matplotlib`.
*   **Persistent Storage**:
    *   **Autosave**: All changes are automatically saved.
    *   **Cloud Sync**: Sign in with Google or Email (via Firebase) to sync notebooks across devices.
    *   **Local Mode**: Guest mode saves data to your browser's LocalStorage.
*   **Rich Output**:
    *   Standard text output (stdout).
    *   **Plotting**: Supports Matplotlib figures rendered inline.
    *   **DataFrames**: Pandas DataFrames are rendered as styled HTML tables.
*   **Code Editor**:
    *   Powered by **CodeMirror 5**.
    *   Syntax highlighting, indentation, and auto-closing brackets.
    *   Robust fallback to a simple text editor if CDNs fail.
*   **Keyboard Shortcuts**:
    *   `Shift + Enter`: Run current cell and advance to the next (or create new).
    *   `Ctrl + Enter`: Run current cell and stay focused.
*   **Export**: Download your notebook as a standard `.py` script.
*   **Dark Mode**: Automatic theme detection with a manual toggle.

## Usage

### Local Development
Since Pyodide requires CORS compliance for loading packages, you cannot run this file directly via `file://` protocol.

1.  Clone or download the repository.
2.  Start a local HTTP server in the directory:
    ```bash
    python -m http.server 8000
    ```
3.  Open `http://localhost:8000` in your browser.

### Deployment
You can deploy `index.html` and the `assets` folder to any static site host:
*   GitHub Pages
*   Vercel
*   Netlify
*   Firebase Hosting

## Dependencies
This project uses the following libraries via CDN (no build step required):
*   **React 18** (UI Framework)
*   **Tailwind CSS** (Styling)
*   **Pyodide** (Python Runtime)
*   **Firebase** (Auth & Database)
*   **CodeMirror 5** (Code Editor)
*   **FontAwesome** (Icons)

## Cost
This application is designed to be **free** for personal use:
*   **Compute**: Runs on your device (Client-side).
*   **Hosting**: Can be hosted on free tiers of static hosting providers.
*   **Backend**: Uses Firebase's free "Spark" plan.

## License
MIT
