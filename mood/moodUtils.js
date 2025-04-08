const vscode = require("vscode");
const { getDeveloperState } = require("./sarcasmUtils.js");
const { applyChangesBasedOnState } = require("./themeUtils.js");

async function analyzeDeveloperMood() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const code = editor.document.getText();
    vscode.window.showInformationMessage("🧠 Analyzing Developer's Mood...");

    const mood = await getDeveloperState(code);
    vscode.window.showInformationMessage(`💡 Code Mood: ${mood}`);
    applyChangesBasedOnState(mood);
}

module.exports = { analyzeDeveloperMood };
