const vscode = require("vscode");
const { showMusicPanel } = require("../music/musicPlayer.js");

function applyChangesBasedOnState(state) {
    const themeMap = {
        normal: "Default Light+",
        frustrated: "Dark+ (default dark)",
        relaxed: "Quiet Light",
        lazy: "Night Owl",
        focused: "Monokai",
        overwhelmed: "Abyss",
        experimental: "Tomorrow Night Blue",
        confident: "Dracula",
        anxious: "Solarized Dark",
        perfectionist: "One Dark Pro",
        procrastinating: "Gruvbox Dark"
    };

    const fontMap = {
        normal: "Consolas",
        frustrated: "Comic Sans MS",
        relaxed: "Comfortaa",
        lazy: "Papyrus",
        focused: "Consolas",
        overwhelmed: "Courier New",
        experimental: "JetBrains Mono",
        confident: "Hack",
        anxious: "Arial Narrow",
        perfectionist: "IBM Plex Mono",
        procrastinating: "Handwriting Font"
    };

    changeTheme(themeMap[state] || "Default Light+");
    changeFont(fontMap[state] || "Consolas");

    const musicURL = suggestMusic(state);
    showMusicPanel(state, musicURL);
}

async function changeTheme(theme) {
    await vscode.workspace.getConfiguration().update("workbench.colorTheme", theme, true);
}

async function changeFont(font) {
    await vscode.workspace.getConfiguration().update("editor.fontFamily", font, true);
}

function suggestMusic(state) {
    const musicMap = {
        normal: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
        frustrated: "https://www.youtube.com/watch?v=-Ud8EDzbWbs",
        relaxed: "https://www.youtube.com/watch?v=HuFYqnbVbzY",
        lazy: "https://www.youtube.com/watch?v=UVVnXZ1X6E0",
        focused: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
        overwhelmed: "https://www.youtube.com/watch?v=gCWaRhNUvfc",
        experimental: "https://www.youtube.com/watch?v=isIj3tuQTDY",
        confident: "https://www.youtube.com/watch?v=DjeCP5HR878",
        anxious: "https://www.youtube.com/watch?v=cYPJaHT5f3E",
        perfectionist: "https://www.youtube.com/watch?v=FduXLd9DNdM",
        procrastinating: "https://www.youtube.com/watch?v=mGjqTQT2DS8"
    };

    return musicMap[state] || musicMap.normal;
}

module.exports = { applyChangesBasedOnState };
