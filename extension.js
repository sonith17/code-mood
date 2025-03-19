const vscode = require("vscode");
const { spawn } = require("child_process");

let diagnosticCollection;


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

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

            pythonProcess.on("close", (code) => {
                console.log(`🔄 Process exited with code: ${code}`);
                processSmellOutput(output, document); // Pass the collected output
            });

        } catch (error) {
            console.error(`❌ Unexpected Error: ${error}`);
            vscode.window.showErrorMessage(`Unexpected Error: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

function processSmellOutput(output, document) {
	// throw new Error("Function not implemented.");
}

// This method is called when your extension is deactivated
function deactivate() {
	console.log("Code Mood extension is deactivated");
}

module.exports = {
	activate,
	deactivate
}


