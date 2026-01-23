const { useState, useEffect, useRef, useCallback, Fragment } = React;
const { Button, CopyButton, CellRow, FormattedTraceback, SimpleIcon, ErrorBoundary, StorageIndicator, Icon, Icons, copyToClipboard } = window;

// --- Auth Component ---
const AuthScreen = ({ onLogin, onGuest }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loadingAction, setLoadingAction] = useState(null);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    // Helper for setting error
    const setAuthMessage = (msg, isError = true) => {
        setError(msg);
    };

    const handleSignup = async () => {
        setAuthMessage(null);
        if (!email || !password) return setAuthMessage("Please enter email and password.");
        if (password.length < 6) return setAuthMessage("Password must be at least 6 characters.");

        setLoadingAction('signup');
        const { auth, createUserWithEmailAndPassword } = window.firebaseServices;
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setAuthMessage(err.message.replace("Firebase: ", ""));
        } finally {
            setLoadingAction(null);
        }
    };

    const handleSignin = async () => {
        setAuthMessage(null);
        if (!email || !password) return setAuthMessage("Please enter email and password.");

        setLoadingAction('signin');
        const { auth, signInWithEmailAndPassword } = window.firebaseServices;
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setAuthMessage("Invalid email or password. Please try again.");
        } finally {
            setLoadingAction(null);
        }
    };

    const handleGoogle = async () => {
        setAuthMessage(null);
        const { auth, GoogleAuthProvider, signInWithPopup } = window.firebaseServices;
        if (!auth) return setAuthMessage("Firebase not initialized.");

        try {
            setLoadingAction('google');
            await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (err) {
            setAuthMessage(err.message);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setAuthMessage(null);
        if (!email) return setAuthMessage('Please enter your email to reset password.');

        const { auth, sendPasswordResetEmail } = window.firebaseServices;
        try {
            await sendPasswordResetEmail(auth, email);
            setAuthMessage('Password reset email sent! Check your inbox.', false);
        } catch (err) {
            setAuthMessage(err.message);
        }
    };

    return (
        <main className="auth-form-container screen-transition">
            <div className="w-full max-w-md">
                <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-colors duration-200">
                    <header className="text-center transform transition-all duration-300 mb-8">
                        <img src="/assets/logo.png" className="logo-glow w-24 h-24 mb-4 mx-auto rounded-full object-cover transition-all duration-300" alt="PyNotebook Logo" onError={(e) => e.target.style.display='none'} />
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-black dark:text-white tracking-tight mb-2 sm:mb-4 break-words transition-colors duration-300 pb-2">PyNotebook</h1>
                        <div className="flex items-center justify-center gap-2 mb-2 sm:mb-4">
                            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base transition-colors duration-300">Python in your browser.</p>
                        </div>
                    </header>

                    <div className="space-y-4">
                        <input
                            id="email-input"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <div className="relative">
                            <input
                                id="password-input"
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                            <button
                                id="password-toggle"
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                        <div className="flex justify-end items-center">
                            <a href="#" onClick={handleForgotPassword} className="text-sm text-blue-600 hover:underline dark:text-blue-400">Forgot Password?</a>
                        </div>
                    </div>

                    <div className={`text-sm mt-4 text-center h-4 ${error && !error.includes('sent') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {error}
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                        <button
                            onClick={handleSignin}
                            disabled={!!loadingAction}
                            className="w-full py-3 text-white font-semibold rounded-lg shadow-md hover:opacity-90 transition main-gradient-box flex justify-center items-center h-12 disabled:opacity-50"
                        >
                            {loadingAction === 'signin' ? <i className="fas fa-spinner fa-spin"></i> : "Sign In"}
                        </button>
                        <button
                            onClick={handleSignup}
                            disabled={!!loadingAction}
                            className="w-full py-3 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold rounded-lg transition flex justify-center items-center h-12 disabled:opacity-50"
                        >
                            {loadingAction === 'signup' ? <i className="fas fa-spinner fa-spin"></i> : "Sign Up"}
                        </button>
                    </div>

                    <div className="flex items-center my-6">
                        <hr className="flex-grow border-t border-gray-300 dark:border-gray-700" />
                        <span className="px-3 text-gray-500 dark:text-gray-400 text-sm">OR</span>
                        <hr className="flex-grow border-t border-gray-300 dark:border-gray-700" />
                    </div>

                    <button
                        onClick={handleGoogle}
                        disabled={!!loadingAction}
                        className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition h-12"
                    >
                        {loadingAction === 'google' ? (
                            <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                            <>
                                <img src="/assets/google.webp" alt="Google Icon" className="w-5 h-5" loading="lazy" />
                                <span>Continue with Google</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={onGuest}
                        className="w-full text-center mt-3 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold rounded-lg transition"
                    >
                        Continue as Guest
                        <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">(Saves data only on this device)</span>
                    </button>
                </section>

                <footer className="text-center mt-8">
                    <a href="mailto:arunthomas04042001@gmail.com" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors dark:text-gray-400 dark:hover:text-blue-400">
                        <i className="fas fa-envelope"></i>
                        Contact Developer
                    </a>
                </footer>
            </div>
        </main>
    );
};

const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const sections = [
        {
            title: "Execution",
            shortcuts: [
                { keys: ["Ctrl/Cmd", "Enter"], desc: "Run cell" },
                { keys: ["Shift", "Enter"], desc: "Run cell and select next" },
                { keys: ["Alt/Opt", "Enter"], desc: "Run cell and insert below" }
            ]
        },
        {
            title: "Command Mode (Ctrl+M / Cmd+M)",
            desc: "Press Ctrl+M or Cmd+M, release, then press...",
            shortcuts: [
                { keys: ["A"], desc: "Insert cell above" },
                { keys: ["B"], desc: "Insert cell below" },
                { keys: ["D"], desc: "Delete cell" },
                { keys: ["K"], desc: "Move cell up" },
                { keys: ["J"], desc: "Move cell down" },
                { keys: ["M"], desc: "Convert to Markdown" },
                { keys: ["Y"], desc: "Convert to Code" }
            ]
        }
    ];

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center">
                        <SimpleIcon name="Keyboard" className="mr-2 text-blue-600" />
                        Keyboard Shortcuts
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <SimpleIcon name="XCircle" className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto">
                    {sections.map((section, idx) => (
                        <div key={idx} className="mb-6 last:mb-0">
                            <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">{section.title}</h4>
                            {section.desc && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 italic">{section.desc}</p>}
                            <div className="space-y-2">
                                {section.shortcuts.map((shortcut, sIdx) => (
                                    <div key={sIdx} className="flex justify-between items-center text-sm">
                                        <div className="flex gap-1">
                                            {shortcut.keys.map((k, kIdx) => (
                                                <kbd key={kIdx} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400 font-semibold shadow-sm">
                                                    {k}
                                                </kbd>
                                            ))}
                                        </div>
                                        <span className="text-gray-600 dark:text-gray-400 text-right">{shortcut.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const TurtleModal = ({ isOpen, onClose }) => {
    const canvasRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!isOpen || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const queue = window.turtleQueue || [];

        if (queue.length === 0) return;

        setIsPlaying(true);

        // Canvas Setup
        const width = canvas.width = 600;
        const height = canvas.height = 400;

        // State: Map of turtles by ID
        let turtles = {};

        let cmdIndex = 0;
        let requestID;

        // Helper to map turtle coords to canvas coords
        // Center (0,0) is at (width/2, height/2)
        // Y is inverted (Turtle Y up, Canvas Y down)
        const toCanvas = (x, y) => ({
            x: x + width / 2,
            y: height / 2 - y
        });

        // Helper to get or create turtle
        const getTurtle = (id) => {
            if (turtles[id]) return turtles[id];
            // Default fallback if not created explicitly (should use create_turtle cmd)
            turtles[id] = {
                x: 0, y: 0, angle: 0,
                penDown: true, penColor: "black", fillColor: "black",
                penSize: 1, isVisible: true, speed: 6, shape: "classic"
            };
            return turtles[id];
        };

        // Initial Draw
        ctx.fillStyle = "white"; // Bgcolor default
        ctx.fillRect(0, 0, width, height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const drawShape = (ctx, shape, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            if (shape === "turtle") {
                // Shell
                ctx.ellipse(0, 0, 6, 8, 0, 0, 2 * Math.PI);
                // Head
                ctx.ellipse(0, 9, 3, 3, 0, 0, 2 * Math.PI);
                // Legs
                ctx.ellipse(6, 5, 2, 4, Math.PI/4, 0, 2 * Math.PI);
                ctx.ellipse(-6, 5, 2, 4, -Math.PI/4, 0, 2 * Math.PI);
                ctx.ellipse(6, -5, 2, 4, -Math.PI/4, 0, 2 * Math.PI);
                ctx.ellipse(-6, -5, 2, 4, Math.PI/4, 0, 2 * Math.PI);
            } else if (shape === "circle") {
                ctx.arc(0, 0, 6, 0, 2 * Math.PI);
            } else if (shape === "square") {
                ctx.rect(-6, -6, 12, 12);
            } else if (shape === "triangle") {
                ctx.moveTo(0, 10);
                ctx.lineTo(8, -7);
                ctx.lineTo(-8, -7);
            } else {
                // Classic / Arrow
                ctx.moveTo(10, 0);
                ctx.lineTo(-5, 5);
                ctx.lineTo(-5, -5);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        };

        const drawTurtles = () => {
            Object.values(turtles).forEach(t => {
                if (!t.isVisible) return;
                const { x, y } = toCanvas(t.x, t.y);
                ctx.save();
                ctx.translate(x, y);
                // Canvas rotation is clockwise, Turtle is counter-clockwise.
                // Standard 'classic' shape points East (0).
                // If shape is 'turtle', it usually points North (90)?
                // Standard python turtle shape points Right/East by default.
                // But 'turtle' shape drawing: (0, 9) is head. That's +Y (North).
                // So if angle is 0 (East), we need to rotate drawing by -90?
                // Let's assume standard orientation is East.
                // My 'turtle' drawing head is at +Y. East is +X.
                // So I need to rotate turtle shape by -90 deg to face East.

                let rotation = -t.angle * Math.PI / 180;
                if (t.shape === 'turtle') {
                    rotation += Math.PI / 2;
                }
                if (t.shape === 'triangle') {
                    rotation += Math.PI / 2; // My triangle points +Y
                }

                ctx.rotate(rotation);

                // Draw
                ctx.strokeStyle = t.penColor; // Outline same as pen
                drawShape(ctx, t.shape, t.fillColor);

                ctx.restore();
            });
        };

        // Persistent drawing layer
        const drawingCanvas = document.createElement('canvas');
        drawingCanvas.width = width;
        drawingCanvas.height = height;
        const dCtx = drawingCanvas.getContext('2d');
        dCtx.fillStyle = "white";
        dCtx.fillRect(0, 0, width, height);

        const renderFrame = () => {
            let batchSize = 1;

            // Determine speed from current command
            if (cmdIndex < queue.length) {
                const nextCmd = queue[cmdIndex];
                // If global cmd, default speed. If turtle cmd, use turtle speed.
                if (nextCmd.id !== null && turtles[nextCmd.id]) {
                    const s = turtles[nextCmd.id].speed;
                    batchSize = (s === 0) ? 10000 : s;
                }
            }

            for (let i = 0; i < batchSize; i++) {
                if (cmdIndex >= queue.length) {
                    setIsPlaying(false);
                    // Final Draw
                    ctx.drawImage(drawingCanvas, 0, 0);
                    drawTurtles();
                    return;
                }

                const { id, cmd, args } = queue[cmdIndex++];

                // Global commands
                if (cmd === 'bgcolor') {
                    dCtx.fillStyle = args[0];
                    dCtx.fillRect(0, 0, width, height);
                    continue;
                }
                if (cmd === 'clear_screen') {
                    dCtx.fillStyle = "white"; // Reset to white or keep current?
                    // Standard clear resets everything.
                    dCtx.fillRect(0, 0, width, height);
                    continue;
                }

                // Turtle Commands
                if (id === null) continue; // Should not happen for draw commands

                if (cmd === 'create_turtle') {
                    turtles[id] = {
                        x: 0, y: 0, angle: 0,
                        penDown: true,
                        penColor: "black",
                        fillColor: "black",
                        penSize: 1,
                        isVisible: true,
                        speed: 6,
                        shape: "classic"
                    };
                    continue;
                }

                let t = getTurtle(id);

                switch (cmd) {
                    case "forward": {
                        const dist = args[0];
                        const rad = t.angle * Math.PI / 180;
                        const dx = dist * Math.cos(rad);
                        const dy = dist * Math.sin(rad);
                        const newX = t.x + dx;
                        const newY = t.y + dy;

                        if (t.penDown) {
                            const start = toCanvas(t.x, t.y);
                            const end = toCanvas(newX, newY);
                            dCtx.beginPath();
                            dCtx.moveTo(start.x, start.y);
                            dCtx.lineTo(end.x, end.y);
                            dCtx.strokeStyle = t.penColor;
                            dCtx.lineWidth = t.penSize;
                            dCtx.stroke();
                        }
                        t.x = newX;
                        t.y = newY;
                        break;
                    }
                    case "right":
                        t.angle -= args[0];
                        break;
                    case "left":
                        t.angle += args[0];
                        break;
                    case "goto":
                        t.x = args[0];
                        t.y = args[1];
                        break;
                    case "penup":
                        t.penDown = false;
                        break;
                    case "pendown":
                        t.penDown = true;
                        break;
                    case "color":
                        t.penColor = args[0];
                        t.fillColor = args[1];
                        break;
                    case "pencolor":
                        t.penColor = args[0];
                        break;
                    case "fillcolor":
                        t.fillColor = args[0];
                        break;
                    case "pensize":
                        t.penSize = args[0];
                        break;
                    case "speed":
                        t.speed = args[0];
                        break;
                    case "reset":
                    case "clear":
                        // If clear, just clear drawing? But global clear was separate.
                        // Turtle.clear() clears what *this* turtle drew.
                        // That is hard with single canvas layer.
                        // For now, treat as no-op or clear screen?
                        // Standard turtle: clear() deletes the turtle's drawings from the screen.
                        // With one canvas, we can't delete just one turtle's lines.
                        // IGNORE for now or implement layers later.
                        if (cmd === 'reset') {
                                t.x = 0; t.y = 0; t.angle = 0;
                                t.penDown = true; t.penColor="black"; t.fillColor="black";
                        }
                        break;
                    case "hideturtle":
                        t.isVisible = false;
                        break;
                    case "showturtle":
                        t.isVisible = true;
                        break;
                    case "shape":
                        t.shape = args[0];
                        break;
                    default:
                        break;
                }
            }

            // Render to Main Canvas
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(drawingCanvas, 0, 0);
            drawTurtles();

            requestID = requestAnimationFrame(renderFrame);
        };

        renderFrame();

        return () => cancelAnimationFrame(requestID);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl overflow-hidden max-w-2xl w-full border border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center">
                        <SimpleIcon name="Play" className="mr-2 text-green-600" />
                        Turtle Graphics
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <SimpleIcon name="XCircle" className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-4 bg-gray-100 dark:bg-gray-950 flex justify-center overflow-auto">
                    <canvas ref={canvasRef} className="bg-white shadow-sm border border-gray-300 dark:border-gray-700 max-w-full" style={{ maxWidth: '100%', maxHeight: '60vh' }}></canvas>
                </div>
                <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 text-xs text-center text-gray-500">
                    {isPlaying ? "Drawing..." : "Finished"}
                </div>
            </div>
        </div>
    );
};

const UserAvatar = ({ user, isGuest }) => {
    let content;
    let title;

    if (isGuest || !user) {
        content = <i className="fas fa-user text-xs"></i>;
        title = "Guest Session";
    } else {
        const letter = (user.email && user.email[0]) ? user.email[0].toUpperCase() : "?";
        content = <span>{letter}</span>;
        title = user.email;
    }

    return (
        <div
            className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-700 via-gray-800 to-black text-white font-bold shadow-md border border-gray-600 select-none"
            title={title}
        >
            {content}
        </div>
    );
};

const CodeEditor = ({ value, onChange, placeholder, className, onRun, onRunAndAdvance, onRunAndInsert, onBlur, showLineNumbers, searchQuery, onInsertAbove, onInsertBelow, onDelete, onMoveUp, onMoveDown, onConvertCode, onConvertMarkdown, completionEngine, visible }) => {
    const editorRef = useRef(null);
    const cmInstance = useRef(null);
    const [hasError, setHasError] = useState(false);
    const [docTooltip, setDocTooltip] = useState(null);

    // Refresh CodeMirror when visibility changes (fixes empty cell issue)
    useEffect(() => {
        if (visible && cmInstance.current) {
            setTimeout(() => cmInstance.current.refresh(), 10);
        }
    }, [visible]);


    // Latest props ref to avoid stale closures in CodeMirror handlers
    const handlersRef = useRef({ onRun, onRunAndAdvance, onRunAndInsert, onInsertAbove, onInsertBelow, onDelete, onMoveUp, onMoveDown, onConvertCode, onConvertMarkdown, completionEngine });

    useEffect(() => {
        handlersRef.current = { onRun, onRunAndAdvance, onRunAndInsert, onInsertAbove, onInsertBelow, onDelete, onMoveUp, onMoveDown, onConvertCode, onConvertMarkdown, completionEngine };
    }, [onRun, onRunAndAdvance, onRunAndInsert, onInsertAbove, onInsertBelow, onDelete, onMoveUp, onMoveDown, onConvertCode, onConvertMarkdown, completionEngine]);

    // Theme detection for CodeMirror
    const isDark = document.documentElement.classList.contains('dark');

    useEffect(() => {
        if (!editorRef.current) return;

        // Fallback if CodeMirror fails to load
        if (!window.CodeMirror) {
            console.warn("CodeMirror not loaded, falling back to textarea.");
            setHasError(true);
            return;
        }

        // Initialize CodeMirror

        // Helper for Hints
        if (window.CodeMirror) {
            window.CodeMirror.registerHelper("hint", "python", async (editor, options) => {
                const engine = handlersRef.current.completionEngine;
                if (!engine) return null;

                const cur = editor.getCursor();
                const line = editor.getLine(cur.line);

                // Grab line up to cursor
                const lineBefore = line.slice(0, cur.ch);
                const match = /([a-zA-Z_0-9\.]+)$/.exec(lineBefore);

                if (!match) return null;

                const word = match[1];
                const start = cur.ch - word.length;
                const end = cur.ch;

                const suggestions = await engine.getCompletions(word);
                if (!suggestions || suggestions.length === 0) return null;

                return {
                    list: suggestions.map(s => ({
                        text: s,
                        displayText: s.split('.').pop()
                    })),
                    from: window.CodeMirror.Pos(cur.line, start),
                    to: window.CodeMirror.Pos(cur.line, end)
                };
            });
        }

        const cm = window.CodeMirror(editorRef.current, {
            value: value || "",
            mode: "python",
            theme: isDark ? "monokai" : "eclipse", // 'default' or 'eclipse' for light
            lineNumbers: showLineNumbers || false,
            lineWrapping: true,
            placeholder: placeholder,
            viewportMargin: Infinity, // Auto-height
            hintOptions: { hint: window.CodeMirror.hint.python, completeSingle: false },
            extraKeys: {
                "Shift-Enter": () => handlersRef.current.onRunAndAdvance && handlersRef.current.onRunAndAdvance(),
                "Cmd-Shift-Enter": () => handlersRef.current.onRunAndAdvance && handlersRef.current.onRunAndAdvance(),

                "Ctrl-Enter": () => handlersRef.current.onRun && handlersRef.current.onRun(),
                "Cmd-Enter": () => handlersRef.current.onRun && handlersRef.current.onRun(),

                "Alt-Enter": () => handlersRef.current.onRunAndInsert && handlersRef.current.onRunAndInsert(),

                "Ctrl-Space": "autocomplete",
                "Ctrl-Shift-Space": async (cm) => {
                        const engine = handlersRef.current.completionEngine;
                        if (!engine) return;
                        const cur = cm.getCursor();
                        const lineBefore = cm.getLine(cur.line).slice(0, cur.ch);
                        const match = /([a-zA-Z_0-9\.]+)$/.exec(lineBefore);
                        if (match) {
                            const doc = await engine.getDocstring(match[1]);
                            if (doc) {
                                const coords = cm.charCoords(cur, "page");
                                // Adjust coordinates to be relative to viewport or fixed
                                // For simplicity, we use fixed position based on page coords
                                // Note: React state update will trigger re-render
                                setDocTooltip({ x: coords.left, y: coords.bottom + 5, content: doc });
                            }
                        }
                },

                "Tab": (cm) => {
                    cm.replaceSelection("    ", "end");
                },
                "Ctrl-M": (cm) => enterCommandMode(),
                "Cmd-M": (cm) => enterCommandMode()
            }
        });

        // Auto-trigger completion
        cm.on("keyup", (cm, event) => {
            if (!cm.state.completionActive && event.key === '.') {
                setTimeout(() => {
                    if (!cm.state.completionActive) {
                        cm.showHint({ completeSingle: false });
                    }
                }, 50);
            }
            if (event.key === '(') {
                const engine = handlersRef.current.completionEngine;
                if (!engine) return;
                const cur = cm.getCursor();
                const lineBefore = cm.getLine(cur.line).slice(0, cur.ch - 1);
                const match = /([a-zA-Z_0-9\.]+)$/.exec(lineBefore);
                    if (match) {
                        engine.getDocstring(match[1]).then(doc => {
                            if (doc) {
                                const coords = cm.charCoords(cur, "page");
                                setDocTooltip({ x: coords.left, y: coords.bottom + 5, content: doc });
                            }
                        });
                    }
            }
        });

        cm.on("mousedown", () => setDocTooltip(null));
        cm.on("blur", () => setDocTooltip(null));

        const enterCommandMode = () => {
            // Colab Command Mode
            const keyHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const key = e.key.toLowerCase();
                const h = handlersRef.current;

                switch(key) {
                    case 'a': if (h.onInsertAbove) h.onInsertAbove(); break;
                    case 'b': if (h.onInsertBelow) h.onInsertBelow(); break;
                    case 'd': if (h.onDelete) h.onDelete(); break;
                    case 'k': if (h.onMoveUp) h.onMoveUp(); break;
                    case 'j': if (h.onMoveDown) h.onMoveDown(); break;
                    case 'y': if (h.onConvertCode) h.onConvertCode(); break;
                    case 'm': if (h.onConvertMarkdown) h.onConvertMarkdown(); break;
                    default: break;
                }

                // Remove listener after one key press
                document.removeEventListener('keydown', keyHandler, { capture: true });
            };

            document.addEventListener('keydown', keyHandler, { capture: true, once: true });
        };

        cm.on("change", (instance) => {
            const val = instance.getValue();
            if (val !== value) {
                onChange(val);
            }
        });

        if (onBlur) {
            cm.on("blur", () => {
                onBlur();
            });
        }

        cmInstance.current = cm;

        // Cleanup
        return () => {
            // CodeMirror 5 attaches to the DOM node, so clearing innerHTML or similar is usually enough
            // if React doesn't do it. But React will remove the ref's container.
        };
    }, []); // Init once.

    // Sync value updates from outside (e.g. initial load or reset)
    useEffect(() => {
        if (cmInstance.current && cmInstance.current.getValue() !== value) {
            const cursor = cmInstance.current.getCursor();
            cmInstance.current.setValue(value);
            cmInstance.current.setCursor(cursor);
        }
    }, [value]);

    // Sync line numbers
    useEffect(() => {
        if (cmInstance.current) {
            cmInstance.current.setOption("lineNumbers", showLineNumbers);
        }
    }, [showLineNumbers]);

    // Sync Search Highlight
    useEffect(() => {
        if (!cmInstance.current) return;
        const cm = cmInstance.current;

        // Clear old marks
        if (cm._searchMarks) {
            cm._searchMarks.forEach(m => m.clear());
        }
        cm._searchMarks = [];

        if (!searchQuery) return;

        // Requires searchcursor.js
        if (cm.getSearchCursor) {
            const cursor = cm.getSearchCursor(searchQuery);
            while (cursor.findNext()) {
                cm._searchMarks.push(cm.markText(cursor.from(), cursor.to(), { className: "search-highlight" }));
            }
        }
    }, [searchQuery, value]);

    // Sync theme changes
    useEffect(() => {
            // Watch for class changes on html element or use a context.
            // Since we don't have a direct context for theme in this isolated component easily,
            // we can rely on a MutationObserver or just a simple prop if passed.
            // For now, let's just assume parent re-renders or we check periodically?
            // Better: Pass `isDark` as prop or use context.
            // Let's use a MutationObserver for robustness since theme is on <html>

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const isDarkNow = document.documentElement.classList.contains('dark');
                        if (cmInstance.current) {
                            cmInstance.current.setOption("theme", isDarkNow ? "monokai" : "eclipse");
                        }
                    }
                });
            });

            observer.observe(document.documentElement, { attributes: true });

            // Initial set
            if (cmInstance.current) {
                const isDarkNow = document.documentElement.classList.contains('dark');
                cmInstance.current.setOption("theme", isDarkNow ? "monokai" : "eclipse");
            }

            return () => observer.disconnect();
    }, []);

    if (hasError) {
        // Fallback Textarea
        return (
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                className={`w-full h-auto min-h-[50px] font-mono text-sm p-2 bg-transparent border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 ${className}`}
                onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        if (onRunAndAdvance) onRunAndAdvance();
                    } else if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        if (onRun) onRun();
                    }
                }}
            />
        );
    }

    return (
        <div className="relative">
                <div ref={editorRef} className={`rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}></div>
                {docTooltip && (
                    ReactDOM.createPortal(
                        <div
                            className="doc-tooltip"
                            style={{ left: docTooltip.x, top: docTooltip.y }}
                        >
                            {docTooltip.content}
                        </div>,
                        document.body
                    )
                )}
        </div>
    );
};

const Cell = ({ cell, index, updateCell, removeCell, moveCell, runCell, stopCell, focusNextCell, isFocused, setFocusedId, isRuntimeReady, inputRequest, submitInput, triggerSave, searchQuery, onInsertAbove, onInsertBelow, onConvertCode, onConvertMarkdown, completionEngine, pyodide, showNotification }) => {
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const [inputValue, setInputValue] = useState("");
    const [outputCollapsed, setOutputCollapsed] = useState(false);
    const [showLineNumbers, setShowLineNumbers] = useState(false);

    // Auto-resize for markdown cells
    useEffect(() => {
        if (textareaRef.current && cell.type === 'markdown') {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [cell.content, cell.type]);

    const isInputActive = inputRequest && inputRequest.cellId === cell.id;
    const hasOutput = (cell.output || cell.error || (cell.images && cell.images.length) || cell.html);
    const isError = !!cell.error;

    return (
        <section
            className={`group relative mb-6 rounded-lg border transition-all duration-200 ${
                isFocused
                ? 'bg-white dark:bg-gray-900 ring-2 ring-blue-400 dark:ring-blue-500 shadow-md border-transparent'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:shadow-sm'
            }`}
            onClick={() => setFocusedId(cell.id)}
            aria-label={`Cell ${index + 1}`}
        >
            {/* Header */}
            <div
                className={`flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-t-lg border-b border-gray-100 dark:border-gray-800 cursor-pointer select-none`}
                onClick={(e) => { if(cell.type === 'code') updateCell(cell.id, { codeCollapsed: !cell.codeCollapsed }); }}
                title={cell.type === 'code' ? "Click to toggle code visibility" : ""}
            >
                <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-gray-400 dark:text-gray-500">[{index + 1}]</span>
                    <span className={`text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        cell.type === 'code'
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                        {cell.type}
                    </span>
                    {cell.type === 'code' && cell.codeCollapsed && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic ml-2">(Code Hidden)</span>
                    )}
                </div>

                <div className="flex items-center space-x-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        icon="Paperclip"
                        title="Import File Content (Replace current)"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onClick={(e) => { e.stopPropagation(); }}
                        onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;

                            if (cell.content && cell.content.trim().length > 0) {
                                if (!window.confirm("Importing a file will replace the current cell content. Continue?")) {
                                    e.target.value = '';
                                    return;
                                }
                            }

                            try {
                                const name = file.name;
                                const ext = name.split('.').pop().toLowerCase();
                                let newContent = "";

                                // Data Files -> Upload to FS & Generate Code
                                if (['csv', 'json', 'xlsx', 'xls', 'parquet'].includes(ext)) {
                                    if (!pyodide) {
                                        alert("Runtime not ready yet. Please wait.");
                                        return;
                                    }
                                    const buffer = await file.arrayBuffer();
                                    const data = new Uint8Array(buffer);
                                    pyodide.FS.writeFile(name, data);

                                    if (ext === 'csv') {
                                        newContent = `import pandas as pd\n\n# Read ${name}\ndf = pd.read_csv('${name}')\ndf`;
                                    } else if (ext === 'json') {
                                        newContent = `import pandas as pd\n\n# Read ${name}\ndf = pd.read_json('${name}')\ndf`;
                                    } else if (ext === 'parquet') {
                                        newContent = `import pandas as pd\n\n# Read ${name}\ndf = pd.read_parquet('${name}')\ndf`;
                                    } else {
                                        // Excel requires openpyxl, might not be installed.
                                        newContent = `import pandas as pd\n\n# Read ${name} (Requires openpyxl)\n# await micropip.install('openpyxl')\ndf = pd.read_excel('${name}')\ndf`;
                                    }
                                    showNotification(`Uploaded ${name} to runtime`);
                                }
                                // Text/Code Files -> Load Content Directly
                                else if (['py', 'txt', 'md', 'js', 'html', 'css'].includes(ext)) {
                                    newContent = await file.text();
                                }
                                // Default -> Upload to FS & Generic Open
                                else {
                                    if (pyodide) {
                                        const buffer = await file.arrayBuffer();
                                        pyodide.FS.writeFile(name, new Uint8Array(buffer));
                                        newContent = `# File uploaded: ${name}\nwith open('${name}', 'rb') as f:\n    data = f.read()\n    print(f"Loaded {len(data)} bytes")`;
                                        showNotification(`Uploaded ${name} to runtime`);
                                    } else {
                                        // Fallback if pyodide not ready, just try text
                                        newContent = await file.text();
                                    }
                                }

                                updateCell(cell.id, { content: newContent });
                                e.target.value = ''; // Reset
                            } catch (err) {
                                alert("Failed to import file: " + err.message);
                            }
                        }}
                    />
                    <Button variant="ghost" size="icon" icon="MoveUp" onClick={(e) => { e.stopPropagation(); moveCell(index, -1); }} disabled={index === 0} />
                    <Button variant="ghost" size="icon" icon="MoveDown" onClick={(e) => { e.stopPropagation(); moveCell(index, 1); }} />
                    <Button variant="ghost" size="icon" icon="Trash2" className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" onClick={(e) => { e.stopPropagation(); removeCell(cell.id); }} />
                </div>
            </div>

            <div className="p-4">
                {/* Markdown Cell */}
                {cell.type !== 'code' && (
                    <textarea
                        ref={textareaRef}
                        value={cell.content}
                        onChange={(e) => updateCell(cell.id, { content: e.target.value })}
                        onBlur={triggerSave}
                        onKeyDown={(e) => {
                            if (e.key.toLowerCase() === 'm' && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                // Command Mode logic for Markdown
                                const keyHandler = (ev) => {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                    const key = ev.key.toLowerCase();
                                    switch(key) {
                                        case 'a': if (onInsertAbove) onInsertAbove(); break;
                                        case 'b': if (onInsertBelow) onInsertBelow(); break;
                                        case 'd': removeCell(cell.id); break;
                                        case 'k': moveCell(index, -1); break;
                                        case 'j': moveCell(index, 1); break;
                                        case 'y': if (onConvertCode) onConvertCode(); break;
                                        case 'm': if (onConvertMarkdown) onConvertMarkdown(); break;
                                        default: break;
                                    }
                                };
                                document.addEventListener('keydown', keyHandler, { capture: true, once: true });
                            }
                        }}
                        placeholder='# Write markdown notes here...'
                        className="w-full bg-transparent resize-none focus:outline-none font-sans text-sm leading-relaxed text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600"
                        spellCheck={false}
                        rows={1}
                    />
                )}

                {/* Code Cell - Editor Row */}
                {cell.type === 'code' && (
                    <CellRow
                        gutter={
                            <div className="flex flex-col gap-2 items-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (cell.isRunning) stopCell(cell.id);
                                        else runCell(cell.id);
                                    }}
                                    disabled={!cell.isRunning && !isRuntimeReady}
                                    title={cell.isRunning ? "Stop Execution" : "Run Cell"}
                                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                                        cell.isRunning
                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'
                                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 text-gray-500 dark:text-gray-400'
                                    }`}
                                >
                                {cell.isRunning ? <SimpleIcon name="Square" className="h-3 w-3" /> : <SimpleIcon name="Play" className="h-4 w-4 ml-0.5" />}
                                </button>
                                {!cell.codeCollapsed && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowLineNumbers(!showLineNumbers); }}
                                        title={showLineNumbers ? "Hide Line Numbers" : "Show Line Numbers"}
                                        className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                                            showLineNumbers ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                                        }`}
                                    >
                                        <span className="text-xs font-mono font-bold">#</span>
                                    </button>
                                )}
                            </div>
                        }
                        content={
                            <div className={cell.codeCollapsed ? 'hidden' : 'block'}>
                                <CodeEditor
                                    visible={!cell.codeCollapsed}
                                    value={cell.content}
                                    onChange={(newContent) => updateCell(cell.id, { content: newContent })}
                                    onRun={() => runCell(cell.id)}
                                    onRunAndAdvance={async () => {
                                        await runCell(cell.id);
                                        focusNextCell();
                                    }}
                                    onRunAndInsert={async () => {
                                        await runCell(cell.id);
                                        onInsertBelow();
                                    }}
                                    onInsertAbove={onInsertAbove}
                                    onInsertBelow={onInsertBelow}
                                    onDelete={() => removeCell(cell.id)}
                                    onMoveUp={() => moveCell(index, -1)}
                                    onMoveDown={() => moveCell(index, 1)}
                                    onConvertCode={onConvertCode}
                                    onConvertMarkdown={onConvertMarkdown}
                                    onBlur={triggerSave}
                                    showLineNumbers={showLineNumbers}
                                    searchQuery={searchQuery}
                                    completionEngine={completionEngine}
                                    className="w-full text-gray-800 dark:text-gray-200"
                                    placeholder='print("Hello Python")'
                                />
                            </div>
                        }
                    />
                )}

                {/* Input Request Row */}
                {cell.type === 'code' && isInputActive && (
                    <div className="mt-2 ml-2 sm:ml-12 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md animate-in fade-in slide-in-from-top-1">
                        {inputRequest.title && (
                            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">{inputRequest.title}</h4>
                        )}
                        <p className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">{inputRequest.prompt}</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        submitInput(inputValue);
                                        setInputValue("");
                                    }
                                }}
                                className="flex-grow px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Enter value..."
                                autoFocus
                            />
                            <Button size="sm" onClick={() => { submitInput(inputValue); setInputValue(""); }}>
                                <span className="hidden sm:inline">Submit</span>
                                <SimpleIcon name="Check" className="sm:hidden h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Output Section */}
                {cell.type === 'code' && hasOutput && (
                    <div className="mt-2">
                        {outputCollapsed ? (
                            <CellRow
                                gutter={
                                    <div className="flex flex-col items-center gap-1">
                                        <button
                                            onClick={() => setOutputCollapsed(false)}
                                            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            title="Show Output"
                                        >
                                            <SimpleIcon name="EyeOff" className="h-4 w-4" />
                                        </button>
                                    </div>
                                }
                                content={
                                    <div className="text-xs text-gray-400 dark:text-gray-500 italic py-2 cursor-pointer select-none" onClick={() => setOutputCollapsed(false)}>
                                        Output hidden
                                    </div>
                                }
                            />
                        ) : (
                            <div className="space-y-2">
                                {(() => {
                                    const items = [];
                                    if (cell.error || cell.output) {
                                        items.push({
                                            id: 'text',
                                            content: (
                                                <div className={`p-3 font-mono text-sm whitespace-pre-wrap rounded-r-md border-l-4 pl-4 ${
                                                    isError
                                                    ? 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border-red-500'
                                                    : 'bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-green-500'
                                                }`}>
                                                    {isError ? <FormattedTraceback text={cell.error} /> : cell.output}
                                                </div>
                                            ),
                                            copyContent: cell.error || cell.output,
                                            copyType: 'text'
                                        });
                                    }
                                    if (cell.images) {
                                        cell.images.forEach((imgSrc, i) => items.push({
                                            id: `img-${i}`,
                                            content: (
                                                <div className="overflow-auto bg-white dark:bg-gray-800 p-2 rounded border-l-4 border-green-500 border-t border-r border-b border-gray-200 dark:border-gray-700 text-center pl-4">
                                                    <img src={`data:image/png;base64,${imgSrc}`} alt="Plot" className="max-w-full h-auto mx-auto" loading="lazy" />
                                                </div>
                                            ),
                                            copyContent: imgSrc,
                                            copyType: 'image'
                                        }));
                                    }
                                    if (cell.html) {
                                        items.push({
                                            id: 'html',
                                            content: (
                                                <div className="overflow-x-auto bg-white dark:bg-gray-800 p-4 rounded border-l-4 border-green-500 border-t border-r border-b border-gray-200 dark:border-gray-700 pl-4">
                                                    <div dangerouslySetInnerHTML={{ __html: cell.html }} className="prose dark:prose-invert max-w-none text-sm" />
                                                </div>
                                            ),
                                            copyContent: cell.html,
                                            copyType: 'html'
                                        });
                                    }

                                    return items.map((item, idx) => (
                                        <CellRow
                                            key={item.id}
                                            gutter={
                                                <div className="flex flex-col items-center gap-1">
                                                    {idx === 0 && (
                                                        <>
                                                            <button
                                                                onClick={() => setOutputCollapsed(true)}
                                                                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                                                title="Hide Output"
                                                            >
                                                                <SimpleIcon name="Eye" className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => updateCell(cell.id, { output: '', error: null, images: [], html: null })}
                                                                className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                                                title="Clear Output"
                                                            >
                                                                <SimpleIcon name="Eraser" className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <CopyButton onClick={() => copyToClipboard(item.copyType, item.copyContent)} />
                                                </div>
                                            }
                                            content={item.content}
                                        />
                                    ));
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

window.AuthScreen = AuthScreen;
window.KeyboardShortcutsModal = KeyboardShortcutsModal;
window.TurtleModal = TurtleModal;
window.UserAvatar = UserAvatar;
window.CodeEditor = CodeEditor;
window.Cell = Cell;
