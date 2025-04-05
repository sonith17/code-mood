const vscode = require("vscode");
const { spawn } = require("child_process");

let diagnosticCollection;
let client;
let interval;
let ghostTextMap = {};
let musicTerminal = null;
let musicPanel = null;

(async () => {
    try {
        const { InferenceClient } = await import("@huggingface/inference");
        client = new InferenceClient("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"); // Use your preferred token
    } catch (error) {
        console.error("Failed to initialize Hugging Face client:", error);
    }
})();

function activate(context) {
    console.log("✅ Code Mood Extension Activated");

    diagnosticCollection = vscode.languages.createDiagnosticCollection("code-smell");
    context.subscriptions.push(diagnosticCollection);

    context.subscriptions.push(vscode.commands.registerCommand("code-mood.runSmellDetector", runSmellDetector));
    context.subscriptions.push(vscode.commands.registerCommand("code-mood.analyzeMood", analyzeDeveloperMood));

    askPermission();

    // Ghost Text Provider
    const provider = {
        provideInlineCompletionItems(document, position, context, token) {
            let lineNumber = position.line + 1;
            if (ghostTextMap[lineNumber]) {
                return [
                    {
                        insertText: ghostTextMap[lineNumber],
                        range: new vscode.Range(position, position)
                    }
                ];
            }
            return [];
        }
    };
    let ghostProviderDisposable = vscode.languages.registerInlineCompletionItemProvider({ scheme: "file" }, provider);
    context.subscriptions.push(ghostProviderDisposable);
}

async function runSmellDetector() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    if (document.languageId !== "python") {
        vscode.window.showErrorMessage("This extension only works with Python files.");
        return;
    }

    const scriptPath = `${vscode.extensions.getExtension("UG3Team8.code-mood").extensionPath}/code_smell_detector.py`; // Replace with your extension ID
    const pythonProcess = spawn("python", [scriptPath, document.fileName]);

    let output = "";

    pythonProcess.stdout.on("data", (data) => output += data.toString());
    pythonProcess.stderr.on("data", (data) => console.error("Python Error:", data.toString()));
    console.log("Running Python script:", scriptPath, document.fileName);
    pythonProcess.on("close", async () => await processSmellOutput(output, document));
}

async function processSmellOutput(output, document) {
    const diagnostics = [];
    ghostTextMap = {};
    const lines = output.split("\n");

    for (const line of lines) {
        const match = line.match(/(.+):\s*(.+)\s+at line (\d+)/);
        if (match) {
            const type = match[1].trim();
            const detail = match[2].trim();
            const lineNumber = parseInt(match[3], 10) - 1;
            const aiComment = await getSarcasticComment(`${type}: ${detail}`);
            const range = new vscode.Range(lineNumber, 0, lineNumber, 100);

            diagnostics.push(new vscode.Diagnostic(range, `${type}: ${detail}`, vscode.DiagnosticSeverity.Warning));
            ghostTextMap[lineNumber + 1] = ` # ${aiComment}`;
        }
    }

    diagnosticCollection.set(document.uri, diagnostics);
}

async function getSarcasticComment(issue) {
    if (!client) return "";
    console.log("Asking Mistral API for comment:", issue);
    try {
        const chatCompletion = await client.chatCompletion({
            model: "mistralai/Mistral-7B-Instruct-v0.1",
            messages: [{
                role: "user",
                content: `A senior developer is reviewing this issue after years of dealing with bad code. Make it short, sarcastic, and brutally relatable for developers: '${issue}'`
            }],
            max_tokens: 30,
        });

        let response = chatCompletion.choices[0].message.content;
        console.log(response.split(".")[0] + ".");
        return response.split(".")[0] + "."; // Ensure one-liner
    } catch (error) {
        console.error("Mistral API Error:", error);
        return "";
    }
}

async function askPermission() {
    const choice = await vscode.window.showInformationMessage(
        "Allow Code Mood Analyzer to analyze your code every 2 minutes?",
        "Yes", "No"
    );
    if (choice === "Yes") {
        startAnalysis();
    }
}

function startAnalysis() {
    interval = setInterval(analyzeDeveloperMood, 2 * 60 * 1000); // Every 2 mins
}

async function analyzeDeveloperMood() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const code = editor.document.getText();
    vscode.window.showInformationMessage("🧠 Analyzing Developer's Mood...");

    const mood = await getDeveloperState(code);
    vscode.window.showInformationMessage(`💡 Code Mood: ${mood}`);
    applyChangesBasedOnState(mood);
}

async function getDeveloperState(code) {
    if (!client) return "normal";

    try {
        const response = await client.chatCompletion({
            model: "mistralai/Mistral-7B-Instruct-v0.1",
            messages: [
                {
                    role: "system",
                    content: `You analyze developer moods based on code. Return exactly one word like: frustrated, relaxed, lazy, focused, overwhelmed, experimental, confident, anxious, perfectionist, procrastinating, or normal.`
                },
                {
                    role: "user",
                    content: `Analyze this code and return only ONE of those words:\n\n${code}`
                }
            ],
            max_tokens: 5
        });

        const mood = response.choices[0].message.content.trim().toLowerCase();
        return mood || "normal";
    } catch (error) {
        console.error("Mood Analysis Error:", error);
        return "normal";
    }
}

function applyChangesBasedOnState(state) {
    const themeMapping = {
        normal: "Default Light+",
        frustrated: "Dark+ (default dark)",
        relaxed: "Quiet Light",
        lazy: "Night Owl",
        focused: "Monokai",
        overwhelmed: "Abyss",
        experimental: "Tomorrow Night Blue",
        confident: "Dracula",
        anxious: "Solarized Dark",
        perfectionist: "One Dark Pro",
        procrastinating: "Gruvbox Dark"
    };

    const fontMapping = {
        normal: "Consolas",
        frustrated: "Comic Sans MS",
        relaxed: "Comfortaa",
        lazy: "Papyrus",
        focused: "Consolas",
        overwhelmed: "Courier New",
        experimental: "JetBrains Mono",
        confident: "Hack",
        anxious: "Arial Narrow",
        perfectionist: "IBM Plex Mono",
        procrastinating: "Handwriting Font"
    };

    changeTheme(themeMapping[state] || "Default Light+");
    changeFont(fontMapping[state] || "Consolas");
    showMusicPanel(state, suggestMusic(state));
}

async function changeTheme(theme) {
    try {
        await vscode.workspace.getConfiguration().update("workbench.colorTheme", theme, vscode.ConfigurationTarget.Global);
    } catch (error) {
        console.error("Theme change error:", error);
    }
}

async function changeFont(font) {
    try {
        await vscode.workspace.getConfiguration().update("editor.fontFamily", font, vscode.ConfigurationTarget.Global);
    } catch (error) {
        console.error("Font change error:", error);
    }
}

function suggestMusic(mood) {
    const musicMap = {
        normal: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
        frustrated: "https://www.youtube.com/watch?v=-Ud8EDzbWbs",
        relaxed: "https://www.youtube.com/watch?v=HuFYqnbVbzY",
        lazy: "https://www.youtube.com/watch?v=UVVnXZ1X6E0",
        focused: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
        overwhelmed: "https://www.youtube.com/watch?v=gCWaRhNUvfc",
        experimental: "https://www.youtube.com/watch?v=isIj3tuQTDY",
        confident: "https://www.youtube.com/watch?v=DjeCP5HR878",
        anxious: "https://www.youtube.com/watch?v=cYPJaHT5f3E",
        perfectionist: "https://www.youtube.com/watch?v=FduXLd9DNdM",
        procrastinating: "https://www.youtube.com/watch?v=mGjqTQT2DS8"
    };

    return musicMap[mood] || musicMap.normal;
}

async function playYouTubeAudio(url) {
    if (musicTerminal) musicTerminal.dispose();
    musicTerminal = vscode.window.createTerminal("🎵 Code Mood Music");
    musicTerminal.show();
    musicTerminal.sendText(`yt-dlp -q -f bestaudio --no-playlist -o - "${url}" | ffplay -nodisp -autoexit -i -`);
}

function stopMusic() {
    if (musicTerminal) {
        musicTerminal.dispose();
        musicTerminal = null;
        vscode.window.showInformationMessage("🛑 Music stopped.");
    }
}

async function showMusicPanel(mood, url) {
    if (musicPanel) {
        musicPanel.reveal(vscode.ViewColumn.Two);
        return;
    }

    musicPanel = vscode.window.createWebviewPanel(
        "codeMoodMusic",
        `🎵 Code Mood: ${mood}`,
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );

    musicPanel.webview.html = getMusicWebviewContent(mood);

    musicPanel.webview.onDidReceiveMessage((message) => {
        if (message.command === "start") playYouTubeAudio(url);
        else if (message.command === "stop") stopMusic();
    });

    musicPanel.onDidDispose(() => musicPanel = null);
}

function getMusicWebviewContent(mood) {
    return `<!DOCTYPE html>
<html>
<head><style>
    body { font-family: Arial; text-align: center; padding: 20px; }
    button { padding: 10px 20px; margin: 10px; }
    #start { background: green; color: white; }
    #stop { background: red; color: white; }
</style></head>
<body>
    <h2>🎵 Code Mood: ${mood}</h2>
    <button id="start">▶ Start Music</button>
    <button id="stop">⏹ Stop Music</button>
    <script>
        const vscode = acquireVsCodeApi();
        document.getElementById("start").onclick = () => vscode.postMessage({ command: "start" });
        document.getElementById("stop").onclick = () => vscode.postMessage({ command: "stop" });
    </script>
</body>
</html>`;
}

function deactivate() {
    if (interval) clearInterval(interval);
    if (diagnosticCollection) diagnosticCollection.dispose();
    if (musicTerminal) musicTerminal.dispose();
    console.log("Code Mood Extension Deactivated");
}

module.exports = { activate, deactivate };
