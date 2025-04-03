const vscode = require("vscode");
const { spawn } = require("child_process");

let diagnosticCollection;
let client;
let interval;

(async () => {
    try {
        const { InferenceClient } = await import("@huggingface/inference");
        client = new InferenceClient("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");
    } catch (error) {
        console.error("Failed to initialize Hugging Face client:", error);
    }
})();

function activate(context) {
    console.log("✅ Code Mood Extension Activated");

    diagnosticCollection = vscode.languages.createDiagnosticCollection("code-smell");
    context.subscriptions.push(diagnosticCollection);

    let disposableMood = vscode.commands.registerCommand("code-mood.analyzeMood", async function () {
        analyzeDeveloperMood();
    });

    context.subscriptions.push(disposableMood);
    askPermission();
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
    interval = setInterval(async () => {
        analyzeDeveloperMood();
    }, 0.5 * 60 * 1000); // Runs every 2 minutes
}

async function analyzeDeveloperMood() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("No active editor found!");
        return;
    }

    const document = editor.document;
    const code = document.getText();

    vscode.window.showInformationMessage("🧠 Analyzing Developer's Mood...");

    const mood = await getDeveloperState(code);
    vscode.window.showInformationMessage(`💡 Code Mood: ${mood}`);
    applyChangesBasedOnState(mood);
}

async function getDeveloperState(code) {
    if (!client) {
        console.error("Hugging Face client is not initialized.");
        return "normal"; // Default state if LLM fails
    }

    try {
        const response = await client.chatCompletion({
            model: "mistralai/Mistral-7B-Instruct-v0.1",
            messages: [
                { 
                    role: "system", 
                    content: `You are an expert at analyzing developer moods based on coding styles. 
                    Your job is to classify a developer's emotional state based purely on their code.
                    
                    Here are the moods and how they reflect in the code:
                    
                    - **frustrated**: Code has many TODOs, excessive console.logs, commented-out blocks, and erratic indentation.
                    - **relaxed**: Code is clean and well-organized, with descriptive comments.
                    - **lazy**: Variables have single-letter names, copy-pasted code, and minimal comments.
                    - **focused**: The code is structured, with good naming conventions and clear logic.
                    - **overwhelmed**: Large, unstructured code blocks, many unused imports, and inconsistent formatting.
                    - **experimental**: Unusual syntax, frequent use of console.log/debugging, and new libraries.
                    - **confident**: Optimized, clean, reusable code, using best practices.
                    - **anxious**: Overuse of exception handling, deeply nested conditionals, and excessive defensive programming.
                    - **perfectionist**: Highly structured, no redundant code, strong documentation, and best practices everywhere.
                    - **procrastinating**: Many unnecessary comments, excessive whitespace, and unused code.
                    - **normal**: Nothing special, just regular well-written code.

                    Always return exactly one word from this list. No explanations.`
                },
                { 
                    role: "user", 
                    content: `Analyze this code and return only ONE of these words: 
                    normal, frustrated, relaxed, lazy, focused, overwhelmed, experimental, confident, anxious, perfectionist, procrastinating.
                    
                    Code:\n\n${code}`
                }
            ],
            provider: "hf-inference",
            max_tokens: 5, // Ensure a short response
        });

        let mood = response.choices[0].message.content.trim().toLowerCase();

        // Ensure response is valid
        const validMoods = [
            "normal", "frustrated", "relaxed", "lazy", "focused", 
            "overwhelmed", "experimental", "confident", "anxious", 
            "perfectionist", "procrastinating"
        ];
        
        if (!validMoods.includes(mood)) {
            mood = "normal"; // Fallback if API gives unexpected output
        }

        return mood;

    } catch (error) {
        console.error(`LLM Error: ${error}`);
        return "normal"; // Fallback if API fails
    }
}


function applyChangesBasedOnState(state) {
    const themeMapping = {
        "normal": "Default Light+", 
        "frustrated": "Dark+ (default dark)",
        "relaxed": "Quiet Light",
        "lazy": "Night Owl",
        "focused": "Monokai",
        "overwhelmed": "Abyss",
        "experimental": "Tomorrow Night Blue",
        "confident": "Dracula",
        "anxious": "Solarized Dark",
        "perfectionist": "One Dark Pro",
        "procrastinating": "Gruvbox Dark"
    };

    const fontMapping = {
        "normal": "Consolas",
        "frustrated": "Comic Sans MS",
        "relaxed": "Comfortaa",
        "lazy": "Papyrus",
        "focused": "Consolas",
        "overwhelmed": "Courier New",
        "experimental": "JetBrains Mono",
        "confident": "Hack",
        "anxious": "Arial Narrow",
        "perfectionist": "IBM Plex Mono",
        "procrastinating": "Handwriting Font"
    };

    changeTheme(themeMapping[state] || "Default Light+");
    changeFont(fontMapping[state] || "Consolas");
}

async function changeTheme(theme) {
    try {
        console.log(`🎨 Changing theme to: ${theme}`);
        await vscode.workspace.getConfiguration().update(
            "workbench.colorTheme",
            theme,
            vscode.ConfigurationTarget.Global
        );
        vscode.window.showInformationMessage(`🌈 Theme changed to: ${theme}`);
    } catch (error) {
        console.error(`Failed to change theme: ${error}`);
        vscode.window.showErrorMessage(`Failed to change theme to: ${theme}`);
    }
}

async function changeFont(font) {
    try {
        console.log(`🔠 Changing font to: ${font}`);
        await vscode.workspace.getConfiguration().update(
            "editor.fontFamily",
            font,
            vscode.ConfigurationTarget.Global
        );
        vscode.window.showInformationMessage(`🔤 Font changed to: ${font}`);
    } catch (error) {
        console.error(`Failed to change font: ${error}`);
        vscode.window.showErrorMessage(`Failed to change font to: ${font}`);
    }
}

function deactivate() {
    console.log("Code Mood Extension Deactivated");
    if (interval) {
        clearInterval(interval);
    }
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
    }
}

module.exports = { activate, deactivate };
