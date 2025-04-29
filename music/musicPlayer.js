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

    // Run commands to set up virtual environment and play music
    try {
        // Step 1: Create virtual environment
        musicTerminal.sendText('python3 -m venv ~/yt-dlp-env');

        // Step 2: Activate virtual environment (This step may need manual intervention or a different command for cross-platform)
        musicTerminal.sendText('source ~/yt-dlp-env/bin/activate');

        // Step 3: Install yt-dlp from GitHub
        musicTerminal.sendText('pip install -U git+https://github.com/yt-dlp/yt-dlp.git');

        // Step 4: Run yt-dlp command to extract audio and stream it via ffplay
        const command = `yt-dlp --no-part --live-from-start -f bestaudio "${url}" -o - | ffplay -nodisp -autoexit -i -`;

        musicTerminal.sendText(command);
    } catch (error) {
        console.error('Error during music playback:', error.message);
    }
}

function stopMusic() {
    if (musicTerminal) {
        musicTerminal.dispose();
        musicTerminal = null;
    }
    vscode.window.showInformationMessage("🛑 Music stopped.");
}



module.exports = { showMusicPanel, playMusic };
