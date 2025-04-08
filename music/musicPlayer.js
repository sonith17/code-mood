const vscode = require("vscode");

let musicPanel = null;
let musicTerminal = null;

function showMusicPanel(mood, url) {
    if (musicPanel) {
        musicPanel.reveal();
        return;
    }

    musicPanel = vscode.window.createWebviewPanel(
        "codeMoodMusic",
        `🎵 Code Mood: ${mood}`,
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );

    musicPanel.webview.html = getMusicWebviewContent(mood);

    musicPanel.webview.onDidReceiveMessage((msg) => {
        if (msg.command === "start") playMusic(url);
        else if (msg.command === "stop") stopMusic();
    });

    musicPanel.onDidDispose(() => musicPanel = null);
}

function getMusicWebviewContent(mood) {
    return `<!DOCTYPE html>
<html>
<body>
    <h2>🎵 Code Mood: ${mood}</h2>
    <button onclick="vscode.postMessage({ command: 'start' })">▶ Start Music</button>
    <button onclick="vscode.postMessage({ command: 'stop' })">⏹ Stop Music</button>
    <script>const vscode = acquireVsCodeApi();</script>
</body>
</html>`;
}

function playMusic(url) {
    if (musicTerminal) musicTerminal.dispose();
    musicTerminal = vscode.window.createTerminal("Code Mood Music");
    musicTerminal.show();
    musicTerminal.sendText(`yt-dlp -q -f bestaudio --no-playlist -o - "${url}" | ffplay -nodisp -autoexit -i -`);
}

function stopMusic() {
    if (musicTerminal) {
        musicTerminal.dispose();
        musicTerminal = null;
    }
    vscode.window.showInformationMessage("🛑 Music stopped.");
}

module.exports = { showMusicPanel };
