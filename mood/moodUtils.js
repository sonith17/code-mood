const vscode = require("vscode");
const { getDeveloperState } = require("./sarcasmUtils.js");
const { applyChangesBasedOnState, applyChangesBasedOnState2 } = require("./themeUtils.js");

let mood;

async function analyzeDeveloperMood(Ismusic) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const code = editor.document.getText();
    vscode.window.showInformationMessage("🧠 Analyzing Developer's Mood...");

    mood = await getDeveloperState(code);
    console.log("Developer's Mood:", mood);

    vscode.window.showInformationMessage(`💡 Code Mood: ${mood}`);

    const userChoice = await vscode.window.showQuickPick(["Yes", "No"], {
        placeHolder: `Apply the theme and font for "${mood}" mood?`
    });

    if (userChoice === "Yes") {
        if (!Ismusic)
            applyChangesBasedOnState(mood);
        else
            applyChangesBasedOnState2(mood);
    } else {
        vscode.window.showInformationMessage("🚫 Theme and font change canceled.");
    }
}

module.exports = { analyzeDeveloperMood, mood };
