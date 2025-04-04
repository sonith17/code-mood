const vscode = require("vscode");
const { spawn } = require("child_process");

let diagnosticCollection;
let client; // Declare client globally

(async () => {
    const { InferenceClient } = await import("@huggingface/inference"); // Dynamic import
    client = new InferenceClient("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"); // Replace with actual HF key
})();

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log("✅ Code Mood Extension Activated");

    // Initialize diagnostic collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection("code-smell");
    context.subscriptions.push(diagnosticCollection);

    let disposable = vscode.commands.registerCommand("code-mood.runSmellDetector", function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("❌ No active editor found!");
            return;
        }

        const document = editor.document;
        if (document.languageId !== "python") {
            vscode.window.showErrorMessage("⚠️ This extension only works with Python files.");
            return;
        }

        vscode.window.showInformationMessage("🔍 Running Code Smell Detector...");

        try {
            const scriptPath = `${context.extensionPath}/code_smell_detector.py`;
            console.log(`🚀 Executing script: ${scriptPath}`);

            const pythonProcess = spawn("/usr/bin/python3", [scriptPath, document.fileName]); // Pass file path

            let output = "";

            pythonProcess.stdout.on("data", (data) => {
                output += data.toString();
                console.log(`🐍 Python Output: ${data}`);
            });

            pythonProcess.stderr.on("data", (data) => {
                console.error(`❌ Python Error: ${data}`);
                vscode.window.showErrorMessage(`Python Error: ${data}`);
            });

            pythonProcess.on("error", (error) => {
                console.error(`❌ Failed to start Python process: ${error}`);
                vscode.window.showErrorMessage(`Failed to start Python: ${error.message}`);
            });

            pythonProcess.on("close", async (code) => {
                console.log(`🔄 Process exited with code: ${code}`);
                await processSmellOutput(output, document); // Process output after completion
                await processSmellOutput2(output, document); // Process output after completion
            });

        } catch (error) {
            console.error(`❌ Unexpected Error: ${error}`);
            vscode.window.showErrorMessage(`Unexpected Error: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

/**
 * Sends an issue to Mistral AI for a sarcastic response
 */
async function getSarcasticComment(issue) {
    if (!client) {
        console.error("❌ Hugging Face client is not initialized.");
        return `(LLM failed) ${issue}`;
    }

    try {
        const chatCompletion = await client.chatCompletion({
            model: "mistralai/Mistral-7B-Instruct-v0.1",
            messages: [
                { 
                    role: "user", 
                    content: `Review this code issue in the style of a software developer who's seen too much technical debt. Make it funny, a little sarcastic, and point out the issue in a way that developers will relate to: '${issue}'` 
                }
                
            ],
            provider: "hf-inference",
            max_tokens: 50,
        });

        return chatCompletion.choices[0].message.content;
    } catch (error) {
        console.error(`❌ Mistral API Error: ${error}`);
        return `(LLM failed) ${issue}`;
    }
}

/**
 * Processes the code smell output and updates diagnostics with AI-enhanced comments.
 */
async function processSmellOutput(output, document) {
    const diagnostics = [];
    const lines = output.split("\n");

    for (const line of lines) {
        const match = line.match(/(.+):\s*(.+)\s+at line (\d+)/);
        if (match) {
            const type = match[1].trim();
            const detail = match[2].trim(); 
            const lineNumber = parseInt(match[3], 10) - 1; 
            // Get sarcastic AI response
            const aiComment = await getSarcasticComment(`${type}: ${detail}`);

            const range = new vscode.Range(lineNumber, 0, lineNumber, 100);
            const message = `${type}: ${detail}\n${aiComment.replace("/n", " ").replace(/\\/g, "").replace(/\s+/g, " ").trim()}`;

            const diagnostic = new vscode.Diagnostic(
                range,
                message,
                vscode.DiagnosticSeverity.Warning
            );
            diagnostics.push(diagnostic);
        }
    }

    // Update the diagnostic collection with AI-enhanced results
    diagnosticCollection.set(document.uri, diagnostics);
}

async function analyzeMood(code) {
    if (!client) {
        console.error("❌ Hugging Face client is not initialized.");
        return  "Neutral";
    }

    try {

        const mood = await client.chatCompletion({
            model: "mistralai/Mistral-7B-Instruct-v0.1",
            messages: [
                { 
                    role: "user", 
                    content: `Analyze this Python code and determine the developer's mood. 
                          Possible moods: "Focused", "Frustrated", "Overwhelmed", "Playful", "Tired", "Neutral". 
                          Respond with only one of these mood names, nothing else. The code is '${code}' , give exacltly one relevant word as your output, no extra padding` 
                }
                
            ],
            provider: "hf-inference",
            max_tokens: 50,

            
        })
        return mood.choices[0].message.content;

    } catch (error) {
        console.error(`❌ Mistral API Error: ${error}`);
        return "Neutral";
    }
}

// async function analyzeMood(code) {
//     const HF_API_KEY = "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"; // Replace with actual key
//     const API_URL = "https://api-inference.huggingface.co/v1/chat/completions";

//     const headers = {
//         "Authorization": `Bearer ${HF_API_KEY}`,
//         "Content-Type": "application/json",
//     };

//     const payload = {
//         model: "mistralai/Mistral-7B-Instruct-v0.1",
//         messages: [
//             {
//                 role: "user",
//                 content: `Analyze this Python code and determine the developer's mood. 
//                           Possible moods: "Focused", "Frustrated", "Overwhelmed", "Playful", "Tired", "Neutral". 
//                           Respond with only one of these mood names, nothing else.`
//             },
//             {
//                 role: "assistant",
//                 content: code
//             }
//         ],
//         max_tokens: 10
//     };

//     try {
//         const response = await fetch(API_URL, {
//             method: "POST",
//             headers: headers,
//             body: JSON.stringify(payload),
//         });

//         if (!response.ok) {
//             console.error(`❌ API Error: ${response.status} - ${await response.text()}`);
//             return "Neutral";
//         }

//         // Parse the response directly
//         const data = await response.json();

//         if (!data.content) {
//             console.warn("⚠️ Unexpected API response format:", data);
//             return "Neutral";
//         }

//         let mood = data.content.trim();

//         // Ensure mood is a valid expected value
//         const validMoods = ["Focused", "Frustrated", "Overwhelmed", "Playful", "Tired", "Neutral"];
//         if (!validMoods.includes(mood)) {
//             console.warn(`⚠️ Unexpected mood response: ${mood}, defaulting to Neutral.`);
//             mood = "Neutral";
//         }

//         console.log(`🧠 Detected Mood: ${mood}`);
//         return mood;
//     } catch (error) {
//         console.error(`❌ Mood Analysis Error: ${error}`);
//         return "Neutral";
//     }
// }

// Example usage
(async () => {
    const pythonCode = `
def find_max(numbers):
    max_val = numbers[0]
    for num in numbers:
        if num > max_val:
            max_val = num
    return max_val
`;
    const mood = await analyzeMood(pythonCode);
    console.log(`Final Mood: ${mood}`);
})();



function suggestMusic(mood) {
    const musicMap = {
        "focused": "https://www.youtube.com/watch?v=jfKfPfyJRdk", // Lo-Fi Beats
        "frustrated": "https://www.youtube.com/watch?v=WxnN05vOuSM", // Rock/Metal
        "overwhelmed": "https://www.youtube.com/watch?v=2OEL4P1Rz04", // Calm & Relaxing
        "playful": "https://www.youtube.com/watch?v=GQwxC2rMrmM", // Upbeat/Chiptune
        "tired": "https://www.youtube.com/watch?v=Dx5qFachd3A", // Soft Jazz
        "neutral": "https://www.youtube.com/watch?v=6uddGul0oAc" // Random Mix
    };

    // Convert mood to lowercase for case-insensitive matching
    mood = mood.toLowerCase();

    for (let key in musicMap) {
        if (mood.includes(key.toLowerCase())) {
            return musicMap[key]; // Return the matching music link
        }
    }

    // Default to Neutral if no match is found
    return musicMap["neutral"];
}


let musicTerminal = null; // Store the terminal instance

async function playYouTubeAudio(url) {
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
        vscode.window.showInformationMessage("🛑 Music stopped.");
    } else {
        vscode.window.showInformationMessage("⚠️ No music is currently playing.");
    }
}


let musicPanel = null; // Store the webview panel instance

async function showMusicPanel(mood, url) {
    if (musicPanel) {
        musicPanel.reveal(vscode.ViewColumn.Two);
        return;
    }

    musicPanel = vscode.window.createWebviewPanel(
        "codeMoodMusic",
        `🎵 Code Mood: ${mood}`,
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );

    musicPanel.webview.html = getMusicWebviewContent(mood);

    musicPanel.webview.onDidReceiveMessage((message) => {
        if (message.command === "start") {
            playYouTubeAudio(url);
        } else if (message.command === "stop") {
            stopMusic();
        }
    });

    musicPanel.onDidDispose(() => {
        musicPanel = null; // Reset when panel is closed
    });
}

function getMusicWebviewContent(mood) {
    return `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
        h2 { color: #007acc; }
        button { padding: 10px 20px; font-size: 16px; margin: 10px; cursor: pointer; }
        #start { background: green; color: white; }
        #stop { background: red; color: white; }
    </style>
</head>
<body>
    <h2>🎵 Code Mood: ${mood}</h2>
    <button id="start">▶ Start Music</button>
    <button id="stop">⏹ Stop Music</button>
    <script>
        const vscode = acquireVsCodeApi();
        document.getElementById("start").addEventListener("click", () => {
            vscode.postMessage({ command: "start" });
        });
        document.getElementById("stop").addEventListener("click", () => {
            vscode.postMessage({ command: "stop" });
        });
    </script>
</body>
</html>`;
}

async function processSmellOutput2(output, document) {
    let codeContent = document.getText();
    const mood = await analyzeMood(codeContent);
    const suggestedMusic = suggestMusic(mood);

    showMusicPanel(mood, suggestedMusic); // Open the persistent panel
}






async function Nothing() {
    const { InferenceClient } = await import("@huggingface/inference"); // Dynamic import
    client = new InferenceClient("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"); // Replace with actual HF key

    const chatCompletion = await client.chatCompletion({
        provider: "hf-inference",
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        messages: [
            {
                role: "user",
                content: "What is the capital of France?",
            },
        ],
        max_tokens: 500,
    });
    console.log("checking 12345 ");
    console.log(chatCompletion.choices[0].message);
}

Nothing();







function deactivate() {
    console.log("🛑 Code Mood Extension Deactivated");
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
    }
}

module.exports = { activate, deactivate };