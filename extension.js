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
	const diagnostics = [];
	const lines = output.split("\n");

	lines.forEach((line) => {
		const match = line.match(/(.+):\s*(.+)\s+at line (\d+)/);
		if (match) {
			const type = match[1].trim(); // e.g., "Long Method"
			const detail = match[2].trim(); // e.g., "__init__()"
			const lineNumber = parseInt(match[3], 10) - 1; // Convert to 0-based index

			const range = new vscode.Range(lineNumber, 0, lineNumber, 100);
			const message = `${type}: ${detail}`;

			const diagnostic = new vscode.Diagnostic(
				range,
				message,
				vscode.DiagnosticSeverity.Warning
			);
			diagnostics.push(diagnostic);
		}
	});

	// Update the diagnostic collection with new results
	diagnosticCollection.set(document.uri, diagnostics);
}

function deactivate() {
	console.log("🛑 Code Mood Extension Deactivated");
	if (diagnosticCollection) {
		diagnosticCollection.dispose();
	}
}

module.exports = { activate, deactivate };



