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
    vscode.window.showInformationMessage(`💡 Code Mood: ${mood}`);
    if(!Ismusic)
        applyChangesBasedOnState(mood);
    else 
        applyChangesBasedOnState2(mood);
}

module.exports = { analyzeDeveloperMood , mood};
