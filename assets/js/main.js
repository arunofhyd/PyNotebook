const { useState, useEffect, useRef, useCallback, Fragment } = React;
const { AuthScreen, KeyboardShortcutsModal, TurtleModal, UserAvatar, Cell, StorageIndicator, Button, SimpleIcon, ErrorBoundary } = window;

const usePyodide = () => {
    const [pyodide, setPyodide] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState("Initializing...");
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        if (window.location.protocol === 'file:') {
            if (isMounted) {
                setError("PROTOCOL_ERROR");
                setIsLoading(false);
            }
            return;
        }

        // Initialize Turtle Queue globally
        window.turtleQueue = [];
        window.resetTurtleQueue = () => { window.turtleQueue = []; };
        window.pushTurtleCmd = (id, cmd, args) => {
            let jsArgs = args;
            if (args && typeof args.toJs === 'function') {
                jsArgs = args.toJs();
            }
            window.turtleQueue.push({ id, cmd, args: jsArgs });
        };

        const loadPyodideScript = async () => {
            try {
                if (window.loadPyodide) {
                    setStatus("Loading Engine...");
                    const py = await window.loadPyodide({
                        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
                    });

                    setStatus("Loading Numpy & Pandas (Heavy)...");
                    await py.loadPackage("micropip");
                    await py.loadPackage(["numpy", "pandas", "matplotlib"]);

                    // Inject Turtle Shim
                    py.FS.writeFile("pynotebook_turtle.py", window.TURTLE_SHIM);

                    // Inject Helpers
                    py.FS.writeFile("pynotebook_helpers.py", window.PYTHON_HELPERS);
                    py.runPython("import pynotebook_helpers");

                    if (isMounted) {
                        setPyodide(py);
                        setIsLoading(false);
                    }
                    return;
                }

                setStatus("Downloading Pyodide...");
                const script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
                script.async = true;

                script.onload = async () => {
                    try {
                        setStatus("Starting Python Engine...");
                        const py = await window.loadPyodide({
                            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
                        });

                        setStatus("Loading Numpy & Pandas...");
                        await py.loadPackage("micropip");
                        await py.loadPackage(["numpy", "pandas", "matplotlib"]);

                        // Inject Turtle Shim
                        py.FS.writeFile("pynotebook_turtle.py", window.TURTLE_SHIM);

                        // Inject Helpers
                        py.FS.writeFile("pynotebook_helpers.py", window.PYTHON_HELPERS);
                        py.runPython("import pynotebook_helpers");

                        if (isMounted) {
                            setPyodide(py);
                            setIsLoading(false);
                        }
                    } catch (err) {
                        if (isMounted) setError(err.message);
                    }
                };

                script.onerror = () => {
                    if (isMounted) setError("Failed to load Pyodide script from CDN. Check your internet connection.");
                };

                document.body.appendChild(script);
            } catch (err) {
                 if (isMounted) setError(err.message);
            }
        };

        loadPyodideScript();
        return () => { isMounted = false; };
    }, []);

    return { pyodide, isLoading, status, error };
};

// --- Main App ---
function PyNotebook() {
    const { pyodide, isLoading, status, error: loadError } = usePyodide();
    const [focusedId, setFocusedId] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [inputRequest, setInputRequest] = useState(null); // { cellId, prompt, resolve }
    const [isTurtleOpen, setIsTurtleOpen] = useState(false);
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
    const [storageUsage, setStorageUsage] = useState(0);
    const [notification, setNotification] = useState(null);
    const notificationTimeoutRef = useRef(null);

    const showNotification = (msg, duration = 3000) => {
        if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
        }
        setNotification(msg);
        notificationTimeoutRef.current = setTimeout(() => {
            setNotification(null);
            notificationTimeoutRef.current = null;
        }, duration);
    };

    // Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [currentResultIndex, setCurrentResultIndex] = useState(-1);

    // Auth State
    const [user, setUser] = useState(null);
    const [isGuest, setIsGuest] = useState(false);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    const completionEngine = {
        getCompletions: async (token) => {
            if (!pyodide || isLoading) return [];
            try {
                const safeToken = token.replace(/['"\\]/g, '\\$&');
                const res = await pyodide.runPythonAsync(`pynotebook_helpers.get_completions('${safeToken}')`);
                return res.toJs();
            } catch (e) {
                return [];
            }
        },
        getDocstring: async (name) => {
            if (!pyodide || isLoading) return null;
             try {
                const safeName = name.replace(/['"\\]/g, '\\$&');
                const res = await pyodide.runPythonAsync(`pynotebook_helpers.get_docstring('${safeName}')`);
                return res;
            } catch (e) {
                return null;
            }
        }
    };

    // --- Auth Logic ---
    useEffect(() => {
        if (window.firebaseServices && window.firebaseServices.auth) {
            const unsubscribe = window.firebaseServices.onAuthStateChanged(window.firebaseServices.auth, (u) => {
                setUser(u);
                setIsAuthChecking(false);
            });
            return () => unsubscribe();
        } else {
            setIsAuthChecking(false);
        }
    }, []);

    // Dynamic Title
    useEffect(() => {
        if (user) {
            document.title = `PyNotebook - ${user.email}`;
        } else {
            document.title = "PyNotebook - Browser Python";
        }
    }, [user]);

    const handleLogout = async () => {
        if (user) {
            await window.firebaseServices.signOut(window.firebaseServices.auth);
        }
        setIsGuest(false);
        setUser(null);
    };

    // --- Input Handling Helper ---
    const submitInput = (value) => {
        if (inputRequest) {
            inputRequest.resolve(value);
            setInputRequest(null);
        }
    };

    const stopCell = (id) => {
        // 1. Check if waiting for input
        if (inputRequest && inputRequest.cellId === id) {
            inputRequest.reject(new Error("KeyboardInterrupt"));
            setInputRequest(null);
        }
        // 2. Force state update
        // Using window.updateCell if exposed or pass it down?
        // Wait, updateCell is defined below.
        // Actually this stopCell logic needs access to updateCell which is defined inside.
        // So it's fine.
        updateCell(id, { isRunning: false, error: "Stopped by user" });
    };

    // Register global input handler for Pyodide
    useEffect(() => {
        window.pyNotebookInputHandler = (cellId, promptText, title) => {
            return new Promise((resolve, reject) => {
                setInputRequest({ cellId, prompt: promptText, title, resolve, reject });
            });
        };
    }, []);

    // --- Theme Logic ---
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('pynotebook-theme');
        if (saved) return saved === 'dark';
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('pynotebook-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('pynotebook-theme', 'light');
        }
    }, [isDark]);

    const toggleTheme = () => setIsDark(!isDark);

    // --- Notebook State ---
    const [cells, setCells] = useState([
        {
            id: '1',
            type: 'markdown',
            content: '# 🚀 PyNotebook Features Demo\n\nWelcome! This notebook showcases the unique capabilities of PyNotebook:\n\n1. 🐢 Turtle Graphics: Real-time animations.\n2. 📊 Rich Visualization: Matplotlib graphs & Pandas DataFrames.\n3. ✨ Magic HTML: Render custom HTML/CSS with `%%html`.\n\nClick **Run All** to see everything in action!',
            output: '',
            error: null,
            isRunning: false
        },
        {
            id: '2',
            type: 'code',
            content: 'import turtle\nimport random\nimport pandas as pd\nimport matplotlib.pyplot as plt\nimport numpy as np\n\n# --- 1. Setup & Run Turtle Race ---\nturtles = []\ncolors = ["red", "blue", "green", "orange", "purple"]\ny_positions = [60, 30, 0, -30, -60]\n\nturtle.clear()\nturtle.speed(0) # Fast setup\n\n# Draw finish line\nturtle.penup()\nturtle.goto(150, 100)\nturtle.pendown()\nturtle.goto(150, -100)\nturtle.penup()\n\n# Create turtles\nprint("🏁 The race is starting! Watch the popup window...")\nfor i, color in enumerate(colors):\n    t = turtle.Turtle(shape="turtle")\n    t.color(color)\n    t.penup()\n    t.goto(-150, y_positions[i])\n    turtles.append(t)\n\n# Run Race (Simulate steps)\ndistances = [0] * len(colors)\nfor _ in range(15): # 15 moves per turtle\n    for i, t in enumerate(turtles):\n        step = random.randint(5, 20)\n        t.forward(step)\n        distances[i] += step\n\n# --- 2. Rich Graph (Matplotlib) ---\nprint("\\n📊 Generating Performance Analytics...")\nplt.figure(figsize=(10, 5))\nplt.bar(colors, distances, color=colors, alpha=0.7)\nplt.title("Turtle Race Results: Distance Covered")\nplt.xlabel("Contestant")\nplt.ylabel("Distance (Units)")\nplt.grid(axis="y", alpha=0.3)\nplt.show()\n\n# --- 3. Rich Data Display (Pandas) ---\nprint("\\n🏆 Official Leaderboard:")\ndf = pd.DataFrame({\n    "Turtle": colors,\n    "Distance": distances,\n    "Speed_Rank": ["Fast", "Average", "Slow", "Light", "Turbo"] # Mock data\n})\n\n# Sort by Distance to determine rank\ndf = df.sort_values("Distance", ascending=False).reset_index(drop=True)\ndf.index += 1\ndf.index.name = "Rank"\n\n# Display DataFrame (renders as HTML table)\ndf',
            output: '',
            error: null,
            isRunning: false
        },
        {
            id: '3',
            type: 'code',
            content: '%%html\n<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; text-align: center; font-family: sans-serif; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">\n    <h2 style="margin: 0; font-size: 24px; font-weight: bold;">✨ Magic HTML Support</h2>\n    <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">\n        You can render raw <strong>HTML</strong> & <strong>CSS</strong> directly in your notebook!\n    </p>\n    <button style="margin-top: 15px; background: white; color: #764ba2; border: none; padding: 8px 16px; border-radius: 20px; font-weight: bold; cursor: pointer;">\n        Pretty Cool?\n    </button>\n</div>',
            output: '',
            error: null,
            isRunning: false
        },
    ]);

    // --- Persistence Logic ---
    const [isSaving, setIsSaving] = useState(false);
    const cellsRef = useRef(cells);
    const userRef = useRef(user);
    const isGuestRef = useRef(isGuest);

    // Keep refs synced
    useEffect(() => { cellsRef.current = cells; }, [cells]);
    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { isGuestRef.current = isGuest; }, [isGuest]);

    const performSave = async () => {
        const currentCells = cellsRef.current;
        const currentUser = userRef.current;
        const currentIsGuest = isGuestRef.current;

        if (!currentUser && !currentIsGuest) return;

        // Optimization: Strip transient output (images, html, stdout) to save storage/bandwidth.
        // Only code and markdown content is persisted.
        const cleanCells = currentCells.map(c => ({
            id: c.id,
            type: c.type,
            content: c.content,
            codeCollapsed: c.codeCollapsed || false
        }));

        // Compress data to maximize storage limit.
        // LZ-String uses LZ-based compression (lossless), similar to ZIP.
        // This is 100% safe for code/text and significantly reduces storage costs.
        // It ensures we fit much more data into the 1MB Firestore limit.
        const jsonPayload = JSON.stringify(cleanCells);
        const compressed = window.LZString ? window.LZString.compressToBase64(jsonPayload) : jsonPayload;

        // Log Compression Stats for visibility
        const originalSize = jsonPayload.length;
        const compressedSize = compressed.length;
        const ratio = originalSize > 0 ? ((1 - (compressedSize / originalSize)) * 100).toFixed(1) : 0;
        console.log(`Auto-Save: Compressed ${originalSize} chars to ${compressedSize} chars (${ratio}% saved).`);

        setStorageUsage(compressedSize);

        // Firestore Check: 1MB Limit
        // Base64 is efficient. 950KB compressed is roughly 3-5MB of raw code.
        if (compressed.length > 950000) {
            console.warn("Save aborted: Compressed notebook exceeds 1MB.");
            alert("Notebook is too large even after compression! Please split it.");
            return;
        }

        setIsSaving(true);
        try {
            if (currentUser) {
                    const { db, doc, setDoc } = window.firebaseServices;
                    await setDoc(doc(db, 'users', currentUser.uid), { cells: compressed, lastUpdated: new Date() });
            } else if (currentIsGuest) {
                    localStorage.setItem('pynotebook-content', compressed);
            }
        } catch (e) {
            console.error("Failed to save:", e);
        } finally {
            setTimeout(() => setIsSaving(false), 800);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            const parseCells = (raw) => {
                try {
                    // Try decompressing if string
                    if (typeof raw === 'string') {
                        // Check if it's JSON or Compressed Base64
                        // If it starts with [ or {, it might be JSON.
                        try {
                            const decompressed = window.LZString.decompressFromBase64(raw);
                            if (decompressed) return JSON.parse(decompressed);
                        } catch (e) { /* ignore */ }
                        // Fallback: try parsing directly (backward compat)
                        return JSON.parse(raw);
                    }
                    return raw; // Already object/array
                } catch (e) {
                    console.error("Failed to parse/decompress:", e);
                    return null;
                }
            };

            if (user) {
                try {
                    const { db, doc, getDoc } = window.firebaseServices;
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.cells && typeof data.cells === 'string') {
                            setStorageUsage(data.cells.length);
                        }
                        const cellsData = parseCells(data.cells);
                        if (cellsData && Array.isArray(cellsData)) setCells(cellsData);
                    }
                } catch (e) { console.error("Failed to load:", e); }
            } else if (isGuest) {
                const saved = localStorage.getItem('pynotebook-content');
                if (saved) {
                    setStorageUsage(saved.length);
                    const cellsData = parseCells(saved);
                    if (cellsData && Array.isArray(cellsData)) setCells(cellsData);
                }
            }
        };

        if (!isAuthChecking) {
            loadData();
        }
    }, [user, isGuest, isAuthChecking]);

    const prevCellsLength = useRef(cells.length);
    useEffect(() => {
        if (isAuthChecking) return;

        // Immediate save on structural changes (Add/Delete/Move)
        if (cells.length !== prevCellsLength.current) {
            prevCellsLength.current = cells.length;
            performSave();
        } else {
            // Debounce save on content changes (Typing)
            const timeoutId = setTimeout(performSave, 2000);
            return () => clearTimeout(timeoutId);
        }
    }, [cells, isAuthChecking]);

    // Mobile/Lifecycle Save
    useEffect(() => {
        const handleLifecycleSave = () => {
                performSave();
        };

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                handleLifecycleSave();
            }
        });
        window.addEventListener('pagehide', handleLifecycleSave);

        return () => {
            document.removeEventListener('visibilitychange', handleLifecycleSave);
            window.removeEventListener('pagehide', handleLifecycleSave);
        };
    }, []);

    const addCell = (type, index = null) => {
        const newCell = {
            id: Date.now().toString(),
            type,
            content: '',
            output: '',
            error: null,
            isRunning: false,
            images: [],
            html: null
        };

        setCells(prev => {
            if (index === null) {
                    return [...prev, newCell];
            }
            const newCells = [...prev];
            newCells.splice(index, 0, newCell);
            return newCells;
        });

        setFocusedId(newCell.id);
        return newCell.id;
    };

    const focusCell = (id) => {
        setFocusedId(id);
    };

    const focusNextCell = (currentIndex) => {
        if (currentIndex < cells.length - 1) {
            setFocusedId(cells[currentIndex + 1].id);
        } else {
            addCell('code');
            showNotification("New code cell created");
        }
    };

    const updateCell = (id, updates) => {
        // Functional update to prevent race conditions during async operations
        setCells(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const removeCell = (id) => {
        setCells(prev => prev.filter(c => c.id !== id));
    };

    const moveCell = (index, direction) => {
        setCells(prev => {
            if (index + direction < 0 || index + direction >= prev.length) return prev;
            const newCells = [...prev];
            const [moved] = newCells.splice(index, 1);
            newCells.splice(index + direction, 0, moved);
            return newCells;
        });
    };

    const runCell = async (id) => {
        if (!pyodide) return false; // Return false on failure

        const cellToRun = cells.find(c => c.id === id);
        if (!cellToRun || cellToRun.type === 'markdown') return true; // Markdown is "success"

        updateCell(id, { isRunning: true, output: '', error: null, images: [], html: null });

        // Handle Magics
        const trimmed = cellToRun.content.trim();

        // 1. %%html Magic
        if (trimmed.startsWith('%%html')) {
            const htmlContent = trimmed.substring(6);
            updateCell(id, {
                isRunning: false,
                output: '',
                images: [],
                html: htmlContent
            });
            return true;
        }

        // 2. Pip Install Magic (!pip or %pip)
        if (trimmed.startsWith('!pip') || trimmed.startsWith('%pip')) {
            updateCell(id, { isRunning: true, output: '', error: null, images: [], html: null });
            try {
                const args = trimmed.split(/\s+/).slice(1); // ['install', 'pandas', 'numpy']
                // Simple parser: look for 'install' and then package names
                if (args[0] === 'install') {
                        const packages = args.slice(1).filter(a => !a.startsWith('-')); // Ignore flags for now
                        if (packages.length > 0) {
                            updateCell(id, { output: `Installing ${packages.join(', ')}...\n` });
                            await pyodide.loadPackage("micropip");
                            const micropip = pyodide.pyimport("micropip");
                            await micropip.install(packages);
                            updateCell(id, { output: `Successfully installed: ${packages.join(', ')}\n` });
                        } else {
                            updateCell(id, { output: "Usage: !pip install <package_name>\n" });
                        }
                } else {
                        updateCell(id, { output: "Only 'pip install' is currently supported.\n" });
                }
                updateCell(id, { isRunning: false });
                return true;
            } catch (err) {
                updateCell(id, { isRunning: false, error: err.toString() });
                return false;
            }
        }

        // Reset Turtle Queue
        if (window.resetTurtleQueue) window.resetTurtleQueue();

        try {
            // Set stream callback
            window.streamOutput = (text) => {
                setCells(prev => prev.map(c => {
                    if (c.id === id) {
                        return { ...c, output: (c.output || "") + text };
                    }
                    return c;
                }));
            };

            // Inject Input Transformer and Async Input Helper
            // Set Matplotlib style based on current theme
            const themeSetup = isDark ? "plt.style.use('dark_background')" : "plt.style.use('default')";

            pyodide.runPython(`
import sys
if '.' not in sys.path: sys.path.insert(0, '.')
try:
    import pynotebook_turtle
    sys.modules['turtle'] = pynotebook_turtle
except:
    pass

import io
import ast
import builtins
import matplotlib.pyplot as plt
import pandas as pd
from js import window

# Real-time Stdout
class RealtimeStdout:
    def __init__(self):
        self.buffer = io.StringIO()
    def write(self, text):
        self.buffer.write(text)
        if hasattr(window, "streamOutput"):
                window.streamOutput(text)
    def flush(self):
        pass
    def getvalue(self):
        return self.buffer.getvalue()

class RealtimeStderr:
    def __init__(self):
        self.buffer = io.StringIO()
    def write(self, text):
        self.buffer.write(text)
        # We can stream stderr similarly, maybe wrap in a warning style if possible?
        # For now, stream as regular output but maybe we can prefix or style later.
        # Just streaming ensures visibility.
        if hasattr(window, "streamOutput"):
                window.streamOutput(text)
    def flush(self):
        pass
    def getvalue(self):
        return self.buffer.getvalue()

sys.stdout = RealtimeStdout()
sys.stderr = RealtimeStderr()

# Fix: Reset turtle queue to remove any 'create_turtle' events triggered by import side-effects
if hasattr(window, "resetTurtleQueue"):
    window.resetTurtleQueue()

${themeSetup}

# Define async input helpers that call JS
async def async_input(prompt=""):
    return await window.pyNotebookInputHandler("${id}", prompt, None)

async def async_textinput(title, prompt):
    return await window.pyNotebookInputHandler("${id}", prompt, title)

async def async_numinput(title, prompt, default=None, minval=None, maxval=None):
    val_str = await window.pyNotebookInputHandler("${id}", prompt, title)
    if val_str is None: return None
    try:
        val = float(val_str)
        if minval is not None and val < minval: return minval
        if maxval is not None and val > maxval: return maxval
        return val
    except:
        return None

# Advanced AST Transformer to handle async inputs even inside functions
class CallGraphWalker(ast.NodeVisitor):
    def __init__(self):
        self.callees = {} # function_name -> set(called_functions)
        self.calls_input = set() # set of function names that call input/async_input
        self.current_function = None

    def visit_FunctionDef(self, node):
        outer = self.current_function
        self.current_function = node.name
        self.callees[node.name] = set()
        self.generic_visit(node)
        self.current_function = outer

    def visit_AsyncFunctionDef(self, node):
        self.visit_FunctionDef(node)

    def visit_Call(self, node):
        # Identify calls to input/textinput/numinput
        is_input = False
        if isinstance(node.func, ast.Name):
            if node.func.id in ['input', 'textinput', 'numinput']:
                is_input = True
            elif self.current_function:
                    self.callees[self.current_function].add(node.func.id)
        elif isinstance(node.func, ast.Attribute):
            if node.func.attr in ['textinput', 'numinput']:
                    is_input = True
            elif self.current_function:
                    self.callees[self.current_function].add(node.func.attr)

        if is_input and self.current_function:
                self.calls_input.add(self.current_function)

        self.generic_visit(node)

class AsyncTransformer(ast.NodeTransformer):
    def __init__(self, async_functions):
        self.async_functions = async_functions

    def visit_FunctionDef(self, node):
        if node.name in self.async_functions:
            # Convert to AsyncFunctionDef
            new_node = ast.AsyncFunctionDef(
                name=node.name,
                args=node.args,
                body=node.body,
                decorator_list=node.decorator_list,
                returns=node.returns,
                type_comment=node.type_comment
            )
            self.generic_visit(new_node)
            return ast.copy_location(new_node, node)
        return self.generic_visit(node)

    def visit_Call(self, node):
        self.generic_visit(node)

        should_await = False
        # Check if calling an input function or a now-async user function
        if isinstance(node.func, ast.Name):
            if node.func.id == 'input':
                    node.func.id = 'async_input'
                    should_await = True
            elif node.func.id in ['textinput', 'numinput']:
                    node.func.id = 'async_' + node.func.id
                    should_await = True
            elif node.func.id in self.async_functions:
                    should_await = True
        elif isinstance(node.func, ast.Attribute):
                if node.func.attr in ['textinput', 'numinput']:
                    # Replace method call (e.g. screen.textinput) with global helper call
                    # We discard the object (screen/turtle) because our helpers are global singletons/proxies
                    func_name = 'async_' + node.func.attr
                    node.func = ast.Name(id=func_name, ctx=ast.Load())
                    should_await = True
                elif node.func.attr in self.async_functions:
                    should_await = True

        if should_await:
            return ast.Await(value=node)

        return node

`);

            // Reset stdout & Clear Plots
            // Use close('all') to ensure no empty white figures remain from previous incomplete runs or implicit creation
            pyodide.runPython(`
sys.stdout = RealtimeStdout()
plt.close('all')
`);

            // Transform user code
            const transformedCode = pyodide.runPython(`
import ast
source = ${JSON.stringify(cellToRun.content)}
result = source
try:
    tree = ast.parse(source)

    # 1. Build Call Graph
    walker = CallGraphWalker()
    walker.visit(tree)

    # 2. Propagate Async (Fixed-point iteration)
    changed = True
    async_funcs = set(walker.calls_input)

    while changed:
        changed = False
        for func, callees in walker.callees.items():
            if func not in async_funcs:
                if not async_funcs.isdisjoint(callees):
                    async_funcs.add(func)
                    changed = True

    # 3. Transform
    transformer = AsyncTransformer(async_funcs)
    tree = transformer.visit(tree)
    ast.fix_missing_locations(tree)
    result = ast.unparse(tree)
except Exception as e:
    print(f"Transformation skipped: {e}")
result
`);

            if (transformedCode === undefined) throw new Error("Transformation returned undefined code.");

            // Run Async
            const result = await pyodide.runPythonAsync(transformedCode);

            // Capture Outputs (stdout, plots, dataframes)
            // We assign the result to a variable so we can inspect it safely
            // Fix: Check for undefined/null explicitly to allow 0 or False to be printed
            if (result !== undefined && result !== null) {
                pyodide.globals.set("last_result", result);
            } else {
                pyodide.globals.set("last_result", null);
            }

            const analysis = pyodide.runPython(`
import base64
res_type = "text"
html_out = None
images = []

# Check result type for DataFrame or regular value
if last_result is not None:
    if isinstance(last_result, pd.DataFrame):
        res_type = "dataframe"
        html_out = last_result.to_html(classes='min-w-full text-sm text-left border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700')
    else:
        # Append other results to stdout (mimicking REPL behavior)
        current_stdout = sys.stdout.getvalue()
        if current_stdout and not current_stdout.endswith('\\n'):
            sys.stdout.write('\\n')

        # Only print if it's not None (explicit None return)
        # Note: In JS we checked !== undefined/null, but pyodide might map those.
        # But here last_result is a Python object.
        sys.stdout.write(str(last_result))

# Merge Stderr into Stdout for final display (so it doesn't vanish)
stderr_val = sys.stderr.getvalue()
if stderr_val:
    if sys.stdout.getvalue():
        sys.stdout.write('\\n')
    sys.stdout.write(stderr_val)

# Check plots
if plt.get_fignums():
    for i in plt.get_fignums():
        plt.figure(i)
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        images.append(base64.b64encode(buf.read()).decode('utf-8'))
    plt.close('all')

stdout_val = sys.stdout.getvalue()
{"stdout": stdout_val, "html": html_out, "images": images}
`);
            const outputData = analysis.toJs();
            const outputMap = Object.fromEntries(outputData);

            // Clean up proxy if needed
            if (result && result.destroy && typeof result.destroy === 'function') {
                    result.destroy();
            }

            updateCell(id, {
                isRunning: false,
                output: outputMap.stdout,
                images: outputMap.images,
                html: outputMap.html
            });

            // Check for Turtle Commands
            if (window.turtleQueue && window.turtleQueue.length > 0) {
                setIsTurtleOpen(true);
            }

            return true; // Success

        } catch (err) {
            updateCell(id, { isRunning: false, error: err.toString() });
            return false; // Failure
        }
    };

    const runAll = async () => {
        // Loop through the cells available in the current render scope
        for (const cell of cells) {
            if (cell.type === 'code') {
                // We must await here to ensure sequential execution (Python state is single-threaded)
                const success = await runCell(cell.id);
                if (!success) break; // Stop on error
            }
        }
    };

    const clearAllOutputs = () => {
        setCells(prev => prev.map(c => ({ ...c, output: '', error: null })));
    };

    const saveNotebook = () => {
            localStorage.setItem('pynotebook-content', JSON.stringify(cells));
            // Visual feedback could be added here
    };

    const backupNotebook = () => {
        const notebookData = {
            metadata: {
                kernelspec: {
                    display_name: "Python 3",
                    language: "python",
                    name: "python3"
                },
                language_info: {
                    codemirror_mode: {
                        name: "ipython",
                        version: 3
                    },
                    file_extension: ".py",
                    mimetype: "text/x-python",
                    name: "python",
                    nbconvert_exporter: "python",
                    pygments_lexer: "ipython3",
                    version: "3.8"
                }
            },
            nbformat: 4,
            nbformat_minor: 5,
            cells: cells.map(cell => ({
                cell_type: cell.type,
                metadata: {},
                source: cell.content.split('\n').map((line, i, arr) => i === arr.length - 1 ? line : line + '\n'),
                ...(cell.type === 'code' ? {
                    execution_count: null,
                    outputs: []
                } : {})
            }))
        };

        const blob = new Blob([JSON.stringify(notebookData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'notebook.ipynb';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const restoreNotebook = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ipynb,.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const content = event.target.result;
                    const data = JSON.parse(content);

                    if (!data.cells || !Array.isArray(data.cells)) {
                        alert("Invalid notebook file format.");
                        return;
                    }

                    const newCells = data.cells.map((cell, index) => {
                        let cellContent = "";
                        if (Array.isArray(cell.source)) {
                            cellContent = cell.source.join("");
                        } else if (typeof cell.source === "string") {
                            cellContent = cell.source;
                        }

                        return {
                            id: Date.now().toString() + index, // Generate unique IDs
                            type: cell.cell_type === "markdown" ? "markdown" : "code",
                            content: cellContent,
                            output: "",
                            error: null,
                            isRunning: false,
                            images: [],
                            html: null,
                            codeCollapsed: cell.metadata?.jupyter?.source_hidden || false
                        };
                    });

                    if (newCells.length > 0) {
                        setCells(newCells);
                    }
                } catch (err) {
                    console.error("Failed to parse notebook:", err);
                    alert("Failed to read file: " + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const clearNotebook = () => {
        if (window.confirm("Are you sure you want to clear all cells? This action cannot be undone unless you have a backup.")) {
            setCells([{
                id: Date.now().toString(),
                type: 'code',
                content: '',
                output: '',
                error: null,
                isRunning: false,
                images: [],
            html: null,
                codeCollapsed: false
            }]);
        }
    };

    const toggleAllCode = (shouldHide) => {
        setCells(prev => prev.map(c =>
            c.type === 'code' ? { ...c, codeCollapsed: shouldHide } : c
        ));
    };

    const allCodeHidden = cells.filter(c => c.type === 'code').every(c => c.codeCollapsed);
    const hasCodeCells = cells.some(c => c.type === 'code');

    const menuContent = (
        <div className="flex flex-col py-1">
            <div className="pb-2 border-b border-gray-100 dark:border-gray-800">
                <StorageIndicator usage={storageUsage} />
            </div>
            <button
                onClick={() => { runAll(); setIsMenuOpen(false); }}
                disabled={isLoading || !!loadError}
                className="flex lg:hidden items-center px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left disabled:opacity-50 transition-colors"
            >
                <SimpleIcon name="Play" className="mr-3 h-4 w-4 text-green-600" />
                Run All Cells
            </button>
            {hasCodeCells && (
                <button
                    onClick={() => { toggleAllCode(!allCodeHidden); setIsMenuOpen(false); }}
                    className="flex items-center px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left transition-colors"
                >
                    <SimpleIcon name={allCodeHidden ? "Eye" : "EyeOff"} className="mr-3 h-4 w-4" />
                    {allCodeHidden ? "Show All Code" : "Hide All Code"}
                </button>
            )}
            <div className="lg:hidden border-t border-gray-100 dark:border-gray-800 my-1"></div>
            <button
                onClick={() => { setIsShortcutsOpen(true); setIsMenuOpen(false); }}
                className="flex items-center px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left transition-colors"
            >
                <SimpleIcon name="Keyboard" className="mr-3 h-4 w-4" />
                Keyboard Shortcuts
            </button>
            <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
            <button
                onClick={() => { document.getElementById('file-upload-input').click(); setIsMenuOpen(false); }}
                className="flex items-center px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left transition-colors"
            >
                <SimpleIcon name="Paperclip" className="mr-3 h-4 w-4" />
                Upload File to Runtime
            </button>
            <button
                onClick={() => { backupNotebook(); setIsMenuOpen(false); }}
                className="flex items-center px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left transition-colors"
            >
                <SimpleIcon name="Download" className="mr-3 h-4 w-4" />
                Backup (.ipynb)
            </button>
            <button
                onClick={() => { restoreNotebook(); setIsMenuOpen(false); }}
                className="flex items-center px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left transition-colors"
            >
                <SimpleIcon name="Upload" className="mr-3 h-4 w-4" />
                Restore Backup
            </button>
            <button
                onClick={() => { clearNotebook(); setIsMenuOpen(false); }}
                className="flex items-center px-4 py-3 sm:py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors"
            >
                <SimpleIcon name="Trash2" className="mr-3 h-4 w-4" />
                Clear Notebook
            </button>
            <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
            <a
                href="mailto:arunthomas04042001@gmail.com"
                className="flex items-center px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left transition-colors"
                onClick={() => setIsMenuOpen(false)}
            >
                <SimpleIcon name="Mail" className="mr-3 h-4 w-4" />
                Contact Developer
            </a>
            <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
            <button
                onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                className="flex items-center px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left transition-colors"
            >
                <SimpleIcon name="LogOut" className="mr-3 h-4 w-4" />
                Logout
            </button>
        </div>
    );

    // --- Render Logic ---
    if (isAuthChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <SimpleIcon name="Loader2" className="animate-spin h-8 w-8 text-blue-600" />
            </div>
        );
    }

    if (!user && !isGuest) {
        return <AuthScreen onLogin={() => {}} onGuest={() => setIsGuest(true)} />;
    }

    // --- Error States ---
    if (loadError === "PROTOCOL_ERROR") {
            return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
                <div className="max-w-md p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-red-200 dark:border-red-900">
                        <div className="flex items-center mb-4 text-red-600 dark:text-red-400">
                            <SimpleIcon name="AlertTriangle" className="h-8 w-8 mr-3" />
                            <h2 className="text-xl font-bold">Local File Error</h2>
                        </div>
                        <p className="mb-4">You are trying to run this file directly from your computer (<code>file://</code> protocol).</p>
                        <p className="mb-4 text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded">Pyodide (Python in Browser) cannot download necessary files due to browser security restrictions (CORS) when run locally without a server.</p>
                        <h3 className="font-bold mb-2">How to fix:</h3>
                        <ul className="list-disc ml-5 space-y-2 text-sm">
                            <li><strong>Option 1 (Recommended):</strong> Deploy this file to Vercel, Netlify, or GitHub Pages.</li>
                            <li><strong>Option 2:</strong> Use a local server (e.g., VS Code "Live Server" extension).</li>
                            <li><strong>Option 3:</strong> Run <code>python -m http.server</code> in this folder.</li>
                        </ul>
                </div>
            </div>
            );
    }

    return (
        <div className="min-h-screen pb-24 transition-colors duration-200">
            <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex items-center justify-between px-4 lg:px-8 shadow-sm transition-colors duration-200">
                <div className="flex items-center space-x-3">
                    <img src="/assets/logo.png" className="h-8 w-8" alt="PyNotebook Logo" loading="lazy" />
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">PyNotebook</h1>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="hidden sm:inline">Local Runtime</span>
                            <span className="hidden sm:inline">•</span>
                            {isLoading ? (
                                <span className="flex items-center text-amber-600 dark:text-amber-500 font-medium">
                                <SimpleIcon name="Loader2" className="h-3 w-3 mr-1 spinner" />
                                {status}
                                </span>
                            ) : loadError ? (
                                <span className="flex items-center text-red-600 dark:text-red-400 font-medium">
                                <SimpleIcon name="XCircle" className="h-3 w-3 mr-1" />
                                Engine Error
                                </span>
                            ) : notification ? (
                                <span className="flex items-center text-blue-600 dark:text-blue-400 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                                <SimpleIcon name="Check" className="h-3 w-3 mr-1" />
                                {notification}
                                </span>
                            ) : (
                                <span className="flex items-center text-green-600 dark:text-green-500 font-medium">
                                {isSaving ? (
                                    <>
                                        <SimpleIcon name="Loader2" className="h-3 w-3 mr-1 spinner" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <SimpleIcon name="CheckCircle2" className="h-3 w-3 mr-1" />
                                        Ready
                                    </>
                                )}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Actions (Theme + Avatar Toggle) */}
                <div className="flex items-center space-x-2">
                        <Button
                        variant="run"
                        size="sm"
                        icon="Play"
                        onClick={runAll}
                        disabled={isLoading || !!loadError}
                        className="hidden lg:flex mr-2"
                        title="Run All Cells"
                    >
                        Run All
                    </Button>
                        <Button
                        variant="ghost"
                        size="icon"
                        icon="Search"
                        onClick={() => {
                            setIsSearchOpen(!isSearchOpen);
                            if (!isSearchOpen) {
                                setTimeout(() => document.getElementById('search-input')?.focus(), 100);
                            } else {
                                setSearchQuery("");
                                setSearchResults([]);
                            }
                        }}
                        title="Search Notebook"
                    />
                        <Button
                        variant="ghost"
                        size="icon"
                        icon={isDark ? "Sun" : "Moon"}
                        onClick={toggleTheme}
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    />
                    <input
                        type="file"
                        id="file-upload-input"
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file || !pyodide) return;
                            try {
                                const buffer = await file.arrayBuffer();
                                const data = new Uint8Array(buffer);
                                pyodide.FS.writeFile(file.name, data);
                                showNotification(`Uploaded: ${file.name}`);
                                e.target.value = ''; // Reset
                            } catch (err) {
                                showNotification(`Upload Failed: ${err.message}`);
                            }
                        }}
                    />

                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="focus:outline-none transition-opacity hover:opacity-80 rounded-full"
                        title="User Menu"
                    >
                        <UserAvatar user={user} isGuest={!user} />
                    </button>
                </div>
            </header>

            {/* Search Bar */}
            {isSearchOpen && (
                <div className="fixed top-16 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-2 shadow-md animate-in slide-in-from-top-2">
                    <div className="w-full px-4 lg:px-8 flex items-center gap-2">
                        <div className="relative flex-grow">
                            <input
                                id="search-input"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    const query = e.target.value;
                                    setSearchQuery(query);
                                    if (!query) {
                                        setSearchResults([]);
                                        setCurrentResultIndex(-1);
                                        return;
                                    }
                                    // Find matches
                                    const results = [];
                                    cells.forEach((cell, idx) => {
                                        if (cell.content.toLowerCase().includes(query.toLowerCase())) {
                                            results.push(cell.id);
                                        }
                                    });
                                    setSearchResults(results);
                                    setCurrentResultIndex(results.length > 0 ? 0 : -1);
                                    // Auto-scroll to first
                                    if (results.length > 0) {
                                        document.getElementById(`cell-${results[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        setFocusedId(results[0]);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && searchResults.length > 0) {
                                        e.preventDefault();
                                        const nextIdx = (currentResultIndex + (e.shiftKey ? -1 : 1) + searchResults.length) % searchResults.length;
                                        setCurrentResultIndex(nextIdx);
                                        const cellId = searchResults[nextIdx];
                                        document.getElementById(`cell-${cellId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        setFocusedId(cellId);
                                    }
                                }}
                                placeholder="Find in notebook..."
                                className="w-full pl-10 pr-20 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-gray-100"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SimpleIcon name="Search" className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-gray-400">
                                {searchResults.length > 0 ? `${currentResultIndex + 1}/${searchResults.length}` : searchQuery ? "No results" : ""}
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" icon="XCircle" onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery("");
                            setSearchResults([]);
                        }} />
                    </div>
                </div>
            )}

            {/* Menus */}
            {isMenuOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-30 bg-black/5 dark:bg-black/20" onClick={() => setIsMenuOpen(false)}></div>

                    {/* Desktop Bubble */}
                    <div className="hidden lg:block fixed right-4 top-16 mt-2 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Signed in as</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={user ? user.email : "Guest Session"}>
                                {user ? user.email : "Guest Session"}
                            </div>
                        </div>
                        {menuContent}
                    </div>

                    {/* Mobile Slide-down */}
                    <div className="lg:hidden fixed top-16 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-40 shadow-lg animate-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <UserAvatar user={user} isGuest={!user} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                                {user ? user.email : "Guest Session"}
                            </span>
                        </div>
                        {menuContent}
                    </div>
                </>
            )}

            <main className="pt-24 px-4 lg:px-8 w-full">
                {loadError && loadError !== "PROTOCOL_ERROR" && (
                    <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 flex items-start">
                        <SimpleIcon name="XCircle" className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="font-bold">Runtime Error</h3>
                            <p className="text-sm mt-1">{loadError}</p>
                            <p className="text-xs mt-2 text-red-600 dark:text-red-400">Please check your internet connection and refresh the page.</p>
                        </div>
                    </div>
                )}

                {cells.map((cell, index) => (
                    <div id={`cell-${cell.id}`} key={cell.id} className={`${searchResults.includes(cell.id) ? 'ring-2 ring-yellow-400 dark:ring-yellow-500 rounded-lg' : ''}`}>
                        <Cell
                            cell={cell}
                            index={index}
                            updateCell={updateCell}
                            removeCell={removeCell}
                            moveCell={moveCell}
                            runCell={runCell}
                            stopCell={stopCell}
                            focusNextCell={() => focusNextCell(index)}
                            isFocused={focusedId === cell.id}
                            setFocusedId={setFocusedId}
                            isRuntimeReady={!isLoading && !loadError}
                            inputRequest={inputRequest}
                            submitInput={submitInput}
                            triggerSave={() => performSave()}
                            searchQuery={searchQuery}
                            onInsertAbove={() => {
                                addCell('code', index);
                                showNotification("Cell inserted above");
                            }}
                            onInsertBelow={() => {
                                addCell('code', index + 1);
                                showNotification("Cell inserted below");
                            }}
                            onConvertCode={() => {
                                if (cell.type === 'markdown') {
                                    updateCell(cell.id, { type: 'code' });
                                    showNotification("Converted to Code");
                                }
                            }}
                            onConvertMarkdown={() => {
                                if (cell.type === 'code') {
                                    updateCell(cell.id, { type: 'markdown' });
                                    showNotification("Converted to Markdown");
                                }
                            }}
                            completionEngine={completionEngine}
                            pyodide={pyodide}
                            showNotification={showNotification}
                        />
                    </div>
                ))}

                <div className="mt-8 flex justify-center space-x-4 opacity-50 hover:opacity-100 transition-opacity">
                    <Button variant="secondary" icon="Plus" onClick={() => addCell('code')}>Code</Button>
                    <Button variant="secondary" icon="FileText" onClick={() => addCell('markdown')}>Text</Button>
                </div>

                <TurtleModal isOpen={isTurtleOpen} onClose={() => setIsTurtleOpen(false)} />
                <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
            </main>

        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <PyNotebook />
    </ErrorBoundary>
);
