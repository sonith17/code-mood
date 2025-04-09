const vscode = require("vscode");

let musicPanel = null;
let musicTerminal = null;

async function showMusicPanel(mood, url) {
    // Check if panel exists and is not disposed
    if(!mood || !url ) return;
    if (musicPanel && !musicPanel._disposed) {
        musicPanel.reveal(vscode.ViewColumn.Two);
        return;
    }

    // If panel exists but was disposed, clear it out
    if (musicPanel && musicPanel._disposed) {
        musicPanel = null;
    }

    // Create a new webview panel
    musicPanel = vscode.window.createWebviewPanel(
        "codeMoodMusic",
        `🎵 Code Mood: ${mood}`,
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );

    musicPanel.webview.html = getMusicWebviewContent(mood);

    musicPanel.webview.onDidReceiveMessage((message) => {
        if (message.command === "start") {
            playMusic(url);
        } else if (message.command === "stop") {
            stopMusic();
        }
    });

    musicPanel.onDidDispose(() => {
        musicPanel = null;
    });
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

async function playMusic(url) {

    if(!url)
        return;
    // If a music terminal already exists, kill it before starting a new one
    if (musicTerminal) {
        musicTerminal.dispose();
        musicTerminal = null;
    }

    // Create a new VS Code terminal for music playback
    musicTerminal = vscode.window.createTerminal("🎵 Code Mood Music");
    musicTerminal.show();

    // Run yt-dlp to extract audio and stream it via ffplay
    const command = `yt-dlp -q -f bestaudio --no-playlist -o - "${url}" | ffplay -nodisp -autoexit -i -`;

    musicTerminal.sendText(command);
}

function stopMusic() {
    if (musicTerminal) {
        musicTerminal.dispose();
        musicTerminal = null;
    }
    vscode.window.showInformationMessage("🛑 Music stopped.");
}



module.exports = { showMusicPanel, playMusic };
