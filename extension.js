const vscode = require("vscode");
const { spawn } = require("child_process");

let diagnosticCollection;
let client; // Declare client globally

(async () => {
    const { InferenceClient } = await import("@huggingface/inference"); // Dynamic import
    client = new InferenceClient("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"); // Replace with actual HF key
})();

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log("✅ Code Mood Extension Activated");

    // Initialize diagnostic collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection("code-smell");
    context.subscriptions.push(diagnosticCollection);

    let disposable = vscode.commands.registerCommand("code-mood.runSmellDetector", function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("❌ No active editor found!");
            return;
        }

        const document = editor.document;
        if (document.languageId !== "python") {
            vscode.window.showErrorMessage("⚠️ This extension only works with Python files.");
            return;
        }

        vscode.window.showInformationMessage("🔍 Running Code Smell Detector...");

        try {
            const scriptPath = `${context.extensionPath}/code_smell_detector.py`;
            console.log(`🚀 Executing script: ${scriptPath}`);

            const pythonProcess = spawn("/usr/bin/python3", [scriptPath, document.fileName]); // Pass file path

            let output = "";

            pythonProcess.stdout.on("data", (data) => {
                output += data.toString();
                console.log(`🐍 Python Output: ${data}`);
            });

            pythonProcess.stderr.on("data", (data) => {
                console.error(`❌ Python Error: ${data}`);
                vscode.window.showErrorMessage(`Python Error: ${data}`);
            });

            pythonProcess.on("error", (error) => {
                console.error(`❌ Failed to start Python process: ${error}`);
                vscode.window.showErrorMessage(`Failed to start Python: ${error.message}`);
            });

            pythonProcess.on("close", async (code) => {
                console.log(`🔄 Process exited with code: ${code}`);
                await processSmellOutput(output, document); // Process output after completion
            });

        } catch (error) {
            console.error(`❌ Unexpected Error: ${error}`);
            vscode.window.showErrorMessage(`Unexpected Error: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

/**
 * Sends an issue to Mistral AI for a sarcastic response
 */
async function getSarcasticComment(issue) {
    if (!client) {
        console.error("❌ Hugging Face client is not initialized.");
        return `(LLM failed) ${issue}`;
    }

    try {
        const chatCompletion = await client.chatCompletion({
            model: "mistralai/Mistral-7B-Instruct-v0.1",
            messages: [
                { 
                    role: "user", 
                    content: `Review this code issue in the style of a software developer who's seen too much technical debt. Make it funny, a little sarcastic, and point out the issue in a way that developers will relate to: '${issue}'` 
                }
                
            ],
            provider: "hf-inference",
            max_tokens: 50,
        });

        return chatCompletion.choices[0].message.content;
    } catch (error) {
        console.error(`❌ Mistral API Error: ${error}`);
        return `(LLM failed) ${issue}`;
    }
}

/**
 * Processes the code smell output and updates diagnostics with AI-enhanced comments.
 */
async function processSmellOutput(output, document) {
    const diagnostics = [];
    const lines = output.split("\n");

    for (const line of lines) {
        const match = line.match(/(.+):\s*(.+)\s+at line (\d+)/);
        if (match) {
            const type = match[1].trim();
            const detail = match[2].trim(); 
            const lineNumber = parseInt(match[3], 10) - 1; 
            // Get sarcastic AI response
            const aiComment = await getSarcasticComment(`${type}: ${detail}`);

            const range = new vscode.Range(lineNumber, 0, lineNumber, 100);
            const message = `${type}: ${detail}\n${aiComment.replace("/n", " ").replace(/\\/g, "").replace(/\s+/g, " ").trim()}`;

            const diagnostic = new vscode.Diagnostic(
                range,
                message,
                vscode.DiagnosticSeverity.Warning
            );
            diagnostics.push(diagnostic);
        }
    }

    // Update the diagnostic collection with AI-enhanced results
    diagnosticCollection.set(document.uri, diagnostics);
}

function deactivate() {
    console.log("🛑 Code Mood Extension Deactivated");
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
    }
}

module.exports = { activate, deactivate };
