const vscode = require("vscode");

function askPermission(context, analyzeCallback) {
    vscode.window.showInformationMessage(
        "Allow Code Mood Analyzer to analyze your code every 2 minutes?",
        "Yes", "No"
    ).then(choice => {
        if (choice === "Yes") {
            const interval = setInterval(analyzeCallback, 2 * 60 * 1000);
            context.subscriptions.push({ dispose: () => clearInterval(interval) });
        }
    });
}

module.exports = { askPermission };
