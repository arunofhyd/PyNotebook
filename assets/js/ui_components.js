const { useState, useEffect, useRef, useCallback, Fragment } = React;

// --- Error Boundary Component ---
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("React Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center dark:text-gray-100">
                    <h1 className="text-xl font-bold text-red-600 mb-2">Something went wrong.</h1>
                    <p className="text-gray-600 dark:text-gray-300 font-mono text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded text-left overflow-auto">
                        {this.state.error && this.state.error.toString()}
                    </p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
window.ErrorBoundary = ErrorBoundary;

window.Button = ({ onClick, children, className = "", variant = "primary", size = "md", icon, disabled = false, title }) => {
    const baseStyle = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-900 rounded-md disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm dark:bg-blue-600 dark:hover:bg-blue-500",
        secondary: "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-200 dark:focus:ring-gray-600 shadow-sm",
        ghost: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100",
        danger: "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 focus:ring-red-200",
        run: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-500",
    };

    const sizes = {
        sm: "h-7 px-2 text-xs",
        md: "h-9 px-3 text-sm",
        icon: "h-8 w-8 p-0 leading-none",
    };

    return (
        <button onClick={onClick} disabled={disabled} title={title} className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}>
            {icon && <window.SimpleIcon name={icon} className={`flex-shrink-0 h-4 w-4 ${size === 'icon' ? 'mr-0' : 'mr-2'}`} />}
            {children}
        </button>
    );
};

window.copyToClipboard = async (type, content) => {
    try {
        if (type === 'text') {
            await navigator.clipboard.writeText(content);
        } else if (type === 'image') {
            const response = await fetch(`data:image/png;base64,${content}`);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
        } else if (type === 'html') {
             const tmp = document.createElement("DIV");
             tmp.innerHTML = content;
             const plainText = tmp.innerText || tmp.textContent || "";
             const blobText = new Blob([plainText], { type: 'text/plain' });
             const blobHtml = new Blob([content], { type: 'text/html' });
             await navigator.clipboard.write([
                 new ClipboardItem({
                     "text/plain": blobText,
                     "text/html": blobHtml
                 })
             ]);
        }
    } catch (err) {
        console.error('Failed to copy:', err);
    }
};

window.CopyButton = ({ onClick, className = "" }) => {
    const [copied, setCopied] = useState(false);

    const handleClick = async (e) => {
        e.stopPropagation();
        await onClick();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleClick}
            className={`flex items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 ${className}`}
            title="Copy to clipboard"
        >
            {copied ? <window.SimpleIcon name="Check" className="h-4 w-4 text-green-500" /> : <window.SimpleIcon name="Copy" className="h-4 w-4" />}
        </button>
    );
};

window.CellRow = ({ gutter, content, className = "" }) => (
    <div className={`flex gap-2 sm:gap-4 items-start ${className}`}>
        <div className="flex-shrink-0 w-8 flex justify-center pt-1">
            {gutter}
        </div>
        <div className="flex-grow min-w-0 overflow-hidden">
            {content}
        </div>
    </div>
);

window.FormattedTraceback = ({ text }) => {
     if (!text) return null;

     const lines = text.split('\n');
     const elements = [];
     let skippingFrame = false;

     lines.forEach((line, idx) => {
         let displayLine = line;
         // Clean up Pyodide wrapper message if on first line
         if (idx === 0 && displayLine.startsWith("PythonError: ")) {
             displayLine = displayLine.replace("PythonError: ", "");
         }

         const trimmed = displayLine.trim();

         if (displayLine.includes("Traceback (most recent call last)")) {
             skippingFrame = false;
             elements.push(<div key={idx} className="tb-header mt-2 mb-1">{displayLine}</div>);
             return;
         }

         // Detect Frame Header
         if (trimmed.startsWith('File "')) {
              // Filter internal Pyodide/Python frames
              if (trimmed.includes('/lib/python') || trimmed.includes('_pyodide') || trimmed.includes('<frozen')) {
                  skippingFrame = true;
                  return;
              }
              skippingFrame = false;
              elements.push(<div key={idx} className="tb-frame-header">{displayLine}</div>);
              return;
         }

         // Detect Exception (e.g. SyntaxError: ...)
         if (/^\w+Error:/.test(displayLine) || displayLine.startsWith("AssertionError:")) {
              skippingFrame = false;
              elements.push(<div key={idx} className="tb-header font-bold mt-2">{displayLine}</div>);
              return;
         }

         if (skippingFrame) return;

         if (displayLine.trim().startsWith("---->")) {
              const parts = displayLine.split("---->");
              elements.push(
                  <div key={idx} className="bg-red-50 dark:bg-red-900/10">
                      <span className="tb-arrow select-none">----></span>{parts[1]}
                  </div>
              );
         } else {
              elements.push(<div key={idx}>{displayLine}</div>);
         }
     });

     return <div className="traceback-container">{elements}</div>;
};

window.StorageIndicator = ({ usage, limit = 950000 }) => {
    const usageKB = (usage / 1024).toFixed(1);
    const percentage = Math.min((usage / limit) * 100, 100);

    let colorClass = "bg-green-500";
    if (percentage > 70) colorClass = "bg-yellow-500";
    if (percentage > 90) colorClass = "bg-red-500";

    return (
        <div className="px-4 py-2">
            <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center text-gray-600 dark:text-gray-400 font-medium">
                    <window.SimpleIcon name="Database" className="mr-1.5 h-3 w-3" />
                    Storage
                </span>
                <span className="text-gray-500 dark:text-gray-500">
                    {usageKB}KB / {Math.round(limit/1024)}KB
                </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${colorClass}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};
