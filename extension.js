const vscode = require("vscode");
const { askPermission } = require("./permissions.js");
const { runSmellDetector } = require("./smellDetector.js");
const { analyzeDeveloperMood } = require("./mood/moodUtils.js");
const { getChartData, getWebviewContent } = require("./timeAnalyser.js");

let diagnosticCollection;
let commentMap = {}; // line number -> sarcastic comment
let startTime = {};
let totalTime = {};
let intervalId = null;
let totalElapsedTime = 0;
let lastActiveFile = null;
let statusBarItem = null;

// Decoration for inline ghost comments
const decorationType = vscode.window.createTextEditorDecorationType({
    after: {
        margin: "0 0 0 1rem",
        color: "#6A9955", // comment-like green
        fontStyle: "italic"
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
});

function activate(context) {
    console.log("✅ Code Mood Extension Activated");
    startTimer();
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);



    diagnosticCollection = vscode.languages.createDiagnosticCollection("code-smell");
    context.subscriptions.push(diagnosticCollection);

    context.subscriptions.push(vscode.commands.registerCommand("code-mood.runSmellDetector", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const doc = editor.document;
        if (doc.languageId !== "python") {
            vscode.window.showErrorMessage("Code Mood only supports Python files.");
            return;
        }

        commentMap = await runSmellDetector(diagnosticCollection, doc);
        showGhostDecorations(editor);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("code-mood.analyzeMood", analyzeDeveloperMood));
    askPermission(context, analyzeDeveloperMood);

    // Show ghost decorations when switching files/tabs
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && editor.document.languageId === "python") {
            showGhostDecorations(editor);
        }
    });

    // Still keeping hover support (optional)
    context.subscriptions.push(
        vscode.languages.registerHoverProvider("python", {
            provideHover(document, position) {
                const line = position.line + 1;
                if (commentMap[line]) {
                    return new vscode.Hover(`💬 ${commentMap[line]}`);
                }
            }
        })
    );

    let chartCommand = vscode.commands.registerCommand("code-mood.showTimeChart", () => {
        const panel = vscode.window.createWebviewPanel(
            "codingTimeChart",
            "🕒 Coding Time Chart",
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );
    
        const data = getChartData(totalTime, startTime);
        panel.webview.html = getWebviewContent(data);
    });
    
    context.subscriptions.push(chartCommand);

    // Track when a file is opened or switched
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (!editor) return;
            const file = editor.document.fileName;
            console.log(`📂 Active file: ${file}`);
            console.log('lastActiveFile: ////', lastActiveFile);
            // If switching files, save previous file's time
            if (lastActiveFile && startTime[lastActiveFile]) {
                console.log(`stop time: ${Date.now()} - ${startTime[lastActiveFile]}`);
                console.log(Date.now() - startTime[lastActiveFile]);
                console.log(`📂 Stopped tracking: ${lastActiveFile}`);
                totalTime[lastActiveFile] = totalTime[lastActiveFile] || 0;
                totalTime[lastActiveFile] += (Date.now() - startTime[lastActiveFile]);
                delete startTime[lastActiveFile];
                console.log(`📂 Total time: ${totalTime[lastActiveFile]}`);
            }
    
            // Start time for new file
            startTime[file] = Date.now();
            console.log(`📂 Started tracking: ${file}`);
            console.log(totalTime[file]);
            lastActiveFile = file;
        })
    );
    
    // Ensure time is tracked even if the file was already open
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((document) => {
            if (!intervalId)
            { 
                startTimer();
            }
            const file = document.fileName;
            console.log(`📂 Opened file: ${file}`);
            if (!startTime[file]) {
                startTime[file] = Date.now();
            }
        })
    );

    
    // Stop timer when no files are open
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument((document) => {
            const file = document.fileName;
            if (startTime[file]) {
                console.log(`📂 Closed file: ${file}`);
                console.log(`stop time: ${Date.now()} - ${startTime[file]}`);
                totalTime[file] = Date.now() - startTime[file] + (totalTime[file] || 0);
                delete startTime[file];
            }
            const openedFiles = vscode.workspace.textDocuments;
            console.log("openedFiles:", openedFiles);
            if ( openedFiles.length==0 && intervalId) {
                clearInterval(intervalId);
                intervalId = null;
                if (statusBarItem) {
                    statusBarItem.text = "🛑 No active file. Timer stopped.";
                    statusBarItem.show();
                }
            }
        })
    );


}

function showGhostDecorations(editor) {
    if (!editor) return;

    const decorations = [];

    for (const lineStr in commentMap) {
        const line = parseInt(lineStr) - 1;
        const comment = commentMap[lineStr];

        const range = new vscode.Range(line, 1000, line, 1000); // End of line
        decorations.push({
            range,
            renderOptions: {
                after: {
                    contentText: `# ${comment}`,
                    color: "#6A9955",
                    fontStyle: "italic"
                }
            }
        });
    }

    editor.setDecorations(decorationType, decorations);
}

function startTimer() {
    console.log("Starting timer...");
    console.log("intervalId:", intervalId);
    if (intervalId) return; // Prevent multiple intervals

    intervalId = setInterval(() => {
        // console.log('start time:', startTime);
        // console.log('total time:', totalTime);
        // get active file
        let activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            let activeFile = activeEditor.document.fileName;
            // console.log(`📂 fsActive file: ${activeFile}`);
            // console.log('lastActiveFile:---', lastActiveFile);
            if (startTime[activeFile]) {
                totalElapsedTime = Date.now() - startTime[activeFile] + (totalTime[activeFile] || 0);
            } else {
                startTime[activeFile] = Date.now();
                totalElapsedTime = 0;
                lastActiveFile = activeFile;
            }
        }
        else
        {
            if (statusBarItem) {
                statusBarItem.text = "🛑 No active file. Timer stopped.";
                statusBarItem.show();
            }
            if (lastActiveFile) {
                totalElapsedTime = Date.now() - startTime[lastActiveFile] + (totalTime[lastActiveFile] || 0);
                totalTime[lastActiveFile] = totalElapsedTime;
                delete startTime[lastActiveFile];
                lastActiveFile = null;
            }
            else
            {
                totalElapsedTime = 0;
            }
            return;
        }
        // Calculate total elapsed time
        let elapsedsec = totalElapsedTime / 1000; // Convert ms to sec

        // Notify user every 30 minutes
        if (elapsedsec/60 >= 30) {
            vscode.window.showWarningMessage("🚨 You have been coding for more than 30 minutes! Take a break.");
        }

        // Keep status bar message persistent
        let elaspedhours = Math.floor(elapsedsec / 3600);
        let elaspedminutes = Math.floor((elapsedsec % 3600) / 60);
        let elaspedseconds = Math.floor(elapsedsec % 60);
        let elapsedTime = `${elaspedhours==0 ? "" : elaspedhours + "h "}${elaspedminutes==0 ? "" : elaspedminutes + "m "}${elaspedseconds<0 ? "" : elaspedseconds + "s"}`;
        if (statusBarItem) {
            statusBarItem.text = `⏳ Total Coding Time: ${elapsedTime}`;
            statusBarItem.show();
        }
        
    }, 1000);
}

function deactivate() {
    if (diagnosticCollection) diagnosticCollection.dispose();
    console.log("🛑 Code Mood Extension Deactivated");
}

module.exports = { activate, deactivate };
