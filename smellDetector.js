const vscode = require("vscode");
const { spawn } = require("child_process");
const { getSarcasticComment } = require("./mood/sarcasmUtils.js");
const { execSync } = require("child_process");

async function runSmellDetector(diagnosticCollection, doc) {
    const scriptPath = vscode.extensions.getExtension("UG3Team8.code-mood").extensionPath + "/code_smell_detector.py";
    let pythonPath = "";
    try {
        if (process.platform === "win32") {
            pythonPath = execSync("where python").toString().trim();
            if(pythonPath === ""){
                pythonPath = 'python';
            }
        }
        else {
            pythonPath = execSync("which python3").toString().trim();
        }
        
    } catch (error) {
        console.error(`❌ Python not found: ${error}`);
        vscode.window.showErrorMessage(`Python not found: ${error.message}`);
        return;
    }
   console.log(`Python Path: ${pythonPath}`);
    const pythonProcess = spawn(pythonPath, [scriptPath, doc.fileName]);

    let output = "";
    pythonProcess.stdout.on("data", (data) => output += data.toString());
    pythonProcess.stderr.on("data", (data) => console.error("Python Error:", data.toString()));
    console.log("Running smell detector...");
    console.log("output:", output);

    return new Promise((resolve) => {
        pythonProcess.on("close", async () => {
            const diagnostics = [];
            const commentMap = {};
            const lines = output.split("\n");

            for (const line of lines) {
                const match = line.match(/(.+):\s*(.+)\s+at line (\d+)/);
                if (match) {
                    const [_, type, detail, lineNumStr] = match;
                    const lineNumber = parseInt(lineNumStr, 10) - 1;
                    console.log(" API request in process lineNumber:", lineNumber);
                    const comment = await getSarcasticComment(`${type}: ${detail}`);
                    const range = new vscode.Range(lineNumber, 0, lineNumber, 100);
                    diagnostics.push(new vscode.Diagnostic(range, `${type}: ${detail}`, vscode.DiagnosticSeverity.Warning));
                    commentMap[lineNumber + 1] = comment;
                }
            }

            diagnosticCollection.set(doc.uri, diagnostics);
            resolve(commentMap);
        });
    });
}

module.exports = { runSmellDetector };