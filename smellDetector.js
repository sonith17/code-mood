const vscode = require("vscode");
const { spawn } = require("child_process");
const { getSarcasticComment } = require("./mood/sarcasmUtils.js");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

async function runSmellDetector(diagnosticCollection, doc) {
    const extensionPath = vscode.extensions.getExtension("UG3Team8.code-mood").extensionPath;
    const scriptPath = path.join(extensionPath, "code_smell_detector.py");
    
    // Verify script exists
    if (!fs.existsSync(scriptPath)) {
        console.error(`❌ Script not found at path: ${scriptPath}`);
        vscode.window.showErrorMessage(`Python script not found at: ${scriptPath}`);
        return;
    }
    
    // Get the workspace's Python configuration if available
    let pythonPath = "";
    try {
        // First try VS Code's Python extension configuration if available
        const pythonConfig = vscode.workspace.getConfiguration("python");
        const configuredPythonPath = pythonConfig.get("defaultInterpreterPath") || pythonConfig.get("pythonPath");
        
        if (configuredPythonPath && fs.existsSync(configuredPythonPath)) {
            pythonPath = configuredPythonPath;
            console.log(`Using Python path from VS Code settings: ${pythonPath}`);
        } else {
            // Fall back to system path
            if (process.platform === "win32") {
                try {
                    // On Windows, try to find Python in the PATH with absolute paths
                    pythonPath = execSync("where python", { encoding: "utf8" }).trim().split("\r\n")[0];
                } catch (error) {
                    try {
                        pythonPath = execSync("where py", { encoding: "utf8" }).trim().split("\r\n")[0];
                    } catch (innerError) {
                        // Last resort: try some common installation paths
                        const commonPaths = [
                            "C:\\Python39\\python.exe",
                            "C:\\Python310\\python.exe",
                            "C:\\Python311\\python.exe",
                            "C:\\Program Files\\Python39\\python.exe",
                            "C:\\Program Files\\Python310\\python.exe",
                            "C:\\Program Files\\Python311\\python.exe"
                        ];
                        
                        for (const commonPath of commonPaths) {
                            if (fs.existsSync(commonPath)) {
                                pythonPath = commonPath;
                                break;
                            }
                        }
                        
                        if (!pythonPath) {
                            throw new Error("Python not found in PATH or common locations");
                        }
                    }
                }
            } else {
                pythonPath = execSync("which python3", { encoding: "utf8" }).trim();
            }
        }
        
        console.log(`Using Python path: ${pythonPath}`);
        
        // Verify Python executable exists and is runnable
        const pythonVersionOutput = execSync(`"${pythonPath}" --version`, { encoding: "utf8" });
        console.log(`Python version check: ${pythonVersionOutput.trim()}`);
    } catch (error) {
        console.error(`❌ Python not found or not executable: ${error}`);
        vscode.window.showErrorMessage(`Python not found or not executable: ${error.message}. Please make sure Python is installed and in your PATH.`);
        return;
    }

    // Prepare file path - ensure it's properly escaped for shell
    const filePath = doc.fileName.replace(/"/g, '\\"');
    console.log(`Running Python script: ${scriptPath}`);
    console.log(`File to analyze: ${filePath}`);

    // Create a temporary output file for the Python script results
    const tempOutputFile = path.join(extensionPath, `temp_output_${Date.now()}.txt`);
    
    const pythonArgs = [
        '-u',  // Unbuffered output
        scriptPath,
        filePath,
        '--output',
        tempOutputFile
    ];
    
    console.log(`Executing: "${pythonPath}" ${pythonArgs.join(' ')}`);
    
    return new Promise((resolve) => {
        const pythonProcess = spawn(pythonPath, pythonArgs, {
            shell: true, // Use shell on all platforms for this case
            env: { ...process.env }  // Pass current environment
        });

        let stdoutData = "";
        let stderrData = "";

        
        pythonProcess.stdout.on("data", (data) => {
            const dataStr = data.toString();
            console.log("PYTHON STDOUT:", dataStr);
            stdoutData += dataStr;
        });

        pythonProcess.stderr.on("data", (data) => {
            const dataStr = data.toString();
            console.error("PYTHON STDERR:", dataStr);
            stderrData += dataStr;
        });

        pythonProcess.on("error", (error) => {
            console.error(`Error spawning Python process: ${error.message}`);
            vscode.window.showErrorMessage(`Error spawning Python process: ${error.message}`);
            resolve({});
        });

        pythonProcess.on("close", async (code) => {
            console.log("Python process closed with code", code);
            
            if (code !== 0) {
                console.error(`Python process exited with code ${code}. Error: ${stderrData}`);
                vscode.window.showErrorMessage(`Error running code smell detector (exit code ${code}): ${stderrData.substring(0, 100)}${stderrData.length > 100 ? '...' : ''}`);
                resolve({});
                return;
            }
            
            let output = stdoutData;
            
            // Try to read from temp file if it exists
            try {
                if (fs.existsSync(tempOutputFile)) {
                    output = fs.readFileSync(tempOutputFile, { encoding: 'utf8' });
                    console.log(`Read ${output.length} chars from temp file`);
                    // Clean up temp file
                    fs.unlinkSync(tempOutputFile);
                }
            } catch (err) {
                console.error(`Error reading temp output file: ${err.message}`);
            }
            
            const diagnostics = [];
            const commentMap = {};
            const lines = output.split("\n");

            for (const line of lines) {
                const match = line.match(/(.+):\s*(.+)\s+at line (\d+)/);
                if (match) {
                    const [_, type, detail, lineNumStr] = match;
                    const lineNumber = parseInt(lineNumStr, 10) - 1;
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