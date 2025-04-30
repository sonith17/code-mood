const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const { runSmellDetector } = require("./smellDetector.js");
const { analyzeDeveloperMood } = require("./mood/moodUtils.js");
const { getChartData, getWebviewContent } = require("./timeAnalyser.js");
const { verifyDeveloperMood } = require("./verifiability/features.js");
const { getWebviewContent_sound } = require("./music/piano.js");
const { addFunkyEffect } = require("./funkytext.js");

/**
 * CodeMood extension controller class
 */
class CodeMoodExtension {
  constructor(context) {
    // Initialize state
    this.context = context;
    this.diagnosticCollection = null;
    this.commentMap = {}; // line number -> sarcastic comment
    this.decorationType = this._createDecorationType();
    this.statusBarItem = null;
    this.soundPanel = null;
    this.funkyModeEnabled = false;
    this.funkyListner = null;

    // Time tracking state
    this.timeTracker = new TimeTracker();

    // Register commands and event handlers
    this._registerCommands();
    this._registerEventHandlers();
  }

  /**
   * Creates text decoration type for ghost comments
   */
  _createDecorationType() {
    return vscode.window.createTextEditorDecorationType({
      after: {
        margin: "0 0 0 1rem",
        color: "#6A9955", // comment-like green
        fontStyle: "italic",
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
    });
  }

  /**
   * Register all extension commands
   */
  _registerCommands() {
    // Register code smell detector command
    this.context.subscriptions.push(
      vscode.commands.registerCommand("codeMood.runSmellDetector", () =>
        this._runSmellDetector()
      )
    );

    // Register mood analysis commands
    this.context.subscriptions.push(
      vscode.commands.registerCommand("codeMood.analyzeMood", () =>
        analyzeDeveloperMood(false)
      )
    );

    this.context.subscriptions.push(
      vscode.commands.registerCommand("codeMood.openMusicPanel", () =>
        analyzeDeveloperMood(true)
      )
    );

    // Register time chart command
    this.context.subscriptions.push(
      vscode.commands.registerCommand("codeMood.showTimeChart", () =>
        this._showTimeChart()
      )
    );

    // Register piano player command
    this.context.subscriptions.push(
      vscode.commands.registerCommand("codeMood.enablePiano", () =>
        this._enablePiano()
      )
    );

    this.context.subscriptions.push(
      vscode.commands.registerCommand("codeMood.funkyType", () => {
        this._funkyType();
      })
    );
    // Register game commands
    this._registerGameCommands();
  }

  /**
   * Register game-related commands
   */
  _registerGameCommands() {
    // Bug Smasher game
    this.context.subscriptions.push(
      vscode.commands.registerCommand("codeMood.playBugSmasher", () => {
        this._createGameWebview("bugSmasher", "Bug Smasher", "bugSmasher.html");
      })
    );

    // Brick Wall game
    this.context.subscriptions.push(
      vscode.commands.registerCommand("codeMood.playBrickWall", () => {
        this._createGameWebview("brickWall", "Brick Wall", "brickWall.html");
      })
    );

    // 2048 game
    this.context.subscriptions.push(
      vscode.commands.registerCommand("codeMood.play2048", () => {
        this._createGameWebview("Two048", "Two048", "Two048.html");
      })
    );
  }

  /**
   * Creates a webview panel for a game
   * @param {string} viewType - Unique identifier for the webview
   * @param {string} title - Title for the webview panel
   * @param {string} htmlFile - Filename in the media folder
   */
  _createGameWebview(viewType, title, htmlFile) {
    const panel = vscode.window.createWebviewPanel(
      viewType,
      title,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    try {
      const htmlPath = path.join(this.context.extensionPath, "media", htmlFile);
      const html = fs.readFileSync(htmlPath, "utf8");
      panel.webview.html = html;
    } catch (error) {
      vscode.window.showErrorMessage(`Error loading game: ${error.message}`);
      console.error(`Failed to load ${htmlFile}:`, error);
      panel.dispose();
    }
  }

  /**
   * Register event handlers for editor events
   */
  _registerEventHandlers() {
    // Handle active editor changes for ghost decorations
    this.context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        // Update tracked file in time tracker
        this.timeTracker.updateActiveFile(editor?.document?.fileName);

        // Show ghost decorations if it's a Python file
        if (editor && editor.document.languageId === "python") {
          this._showGhostDecorations(editor);
        }
      })
    );

    // Hover provider for comment tooltips
    this.context.subscriptions.push(
      vscode.languages.registerHoverProvider("python", {
        provideHover: (document, position) => {
          const line = position.line + 1;
          if (this.commentMap[line]) {
            return new vscode.Hover(`💬 ${this.commentMap[line]}`);
          }
        },
      })
    );

    // Track when files are opened
    this.context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((document) => {
        // Start tracking time for this file
        this.timeTracker.startTrackingFile(document.fileName);
      })
    );

    // Track when files are closed
    this.context.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument((document) => {
        // Stop tracking time for this file
        this.timeTracker.stopTrackingFile(document.fileName);

        // Update status bar if no files are open
        if (vscode.workspace.textDocuments.length === 0) {
          this.timeTracker.pauseTracking();
          if (this.statusBarItem) {
            this.statusBarItem.text = "🛑 No active file. Timer stopped.";
            this.statusBarItem.show();
          }
        }
      })
    );

    // Listen for text document changes for piano sounds
    if (this.context) {
      const textChangeListener = vscode.workspace.onDidChangeTextDocument(
        (event) => {
          // Only proceed if we have an active sound panel
          if (!this.soundPanel) {
            return;
          }

          const changes = event.contentChanges;
          for (const change of changes) {
            if (change.text === "p") {
              console.log(
                "Detected 'p' keypress, sending play command to webview"
              );

              // Post message to webview to play sound
              this.soundPanel.webview.postMessage({ command: "playP" });
            } else if (change.text === "a")
              this.soundPanel.webview.postMessage({ command: "playA" });
            else if (change.text === "s")
              this.soundPanel.webview.postMessage({ command: "playS" });
            else if (change.text === "d")
              this.soundPanel.webview.postMessage({ command: "playD" });
            else if (change.text === "f")
              this.soundPanel.webview.postMessage({ command: "playF" });
            else if (change.text === "g")
              this.soundPanel.webview.postMessage({ command: "playG" });
            else if (change.text === "h")
              this.soundPanel.webview.postMessage({ command: "playH" });
            else if (change.text === "j")
              this.soundPanel.webview.postMessage({ command: "playJ" });
            else if (change.text === "k")
              this.soundPanel.webview.postMessage({ command: "playK" });
            else if (change.text === "l")
              this.soundPanel.webview.postMessage({ command: "playL" });
            else if (change.text === "z")
              this.soundPanel.webview.postMessage({ command: "playZ" });
            else if (change.text === "x")
              this.soundPanel.webview.postMessage({ command: "playX" });
            else if (change.text === "c")
              this.soundPanel.webview.postMessage({ command: "playC" });
            else if (change.text === "v")
              this.soundPanel.webview.postMessage({ command: "playV" });
            else if (change.text === "b")
              this.soundPanel.webview.postMessage({ command: "playB" });
            else if (change.text === "n")
              this.soundPanel.webview.postMessage({ command: "playN" });
            else if (change.text === "m")
              this.soundPanel.webview.postMessage({ command: "playM" });
            else if (change.text === "q")
              this.soundPanel.webview.postMessage({ command: "playQ" });
            else if (change.text === "w")
              this.soundPanel.webview.postMessage({ command: "playW" });
            else if (change.text === "e")
              this.soundPanel.webview.postMessage({ command: "playE" });
            else if (change.text === "r")
              this.soundPanel.webview.postMessage({ command: "playR" });
            else if (change.text === "t")
              this.soundPanel.webview.postMessage({ command: "playT" });
            else if (change.text === "y")
              this.soundPanel.webview.postMessage({ command: "playY" });
            else if (change.text === "u")
              this.soundPanel.webview.postMessage({ command: "playU" });
            else if (change.text === "i")
              this.soundPanel.webview.postMessage({ command: "playI" });
            else if (change.text === "o")
              this.soundPanel.webview.postMessage({ command: "playO" });
            else if (change.text === "p")
              this.soundPanel.webview.postMessage({ command: "playP" });
            else if (change.text === "[")
              this.soundPanel.webview.postMessage({
                command: "playLeftBracket",
              });
            else if (change.text === "]")
              this.soundPanel.webview.postMessage({
                command: "playRightBracket",
              });
            else if (change.text === "\\")
              this.soundPanel.webview.postMessage({ command: "playBackSlash" });
            else if (change.text === ";")
              this.soundPanel.webview.postMessage({ command: "playSemicolon" });
            else if (change.text === "'")
              this.soundPanel.webview.postMessage({
                command: "playSingleQuote",
              });
            else if (change.text === ",")
              this.soundPanel.webview.postMessage({ command: "playComma" });
            else if (change.text === ".")
              this.soundPanel.webview.postMessage({ command: "playDot" });
            else if (change.text === "/")
              this.soundPanel.webview.postMessage({ command: "playSlash" });
          }
        }
      );

      // Add the listener to subscriptions for proper disposal
      this.context.subscriptions.push(textChangeListener);
    }
  }

  /**
   * Activates the extension
   */
  activate() {
    console.log("✅ Code Mood Extension Activated");

    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    this.statusBarItem.show();
    this.context.subscriptions.push(this.statusBarItem);

    // Initialize time tracker with status bar
    this.timeTracker.init(this.statusBarItem);
    this.timeTracker.startTracking();

    // Initialize developer mood verification
    verifyDeveloperMood(this.context);

    // Create diagnostic collection for code smells
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("code-smell");
    this.context.subscriptions.push(this.diagnosticCollection);

    // Start tracking current file if any
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      this.timeTracker.startTrackingFile(activeEditor.document.fileName);
    }
  }

  /**
   * Deactivates the extension
   */
  deactivate() {
    // Cleanup
    if (this.diagnosticCollection) {
      this.diagnosticCollection.dispose();
    }

    this.timeTracker.stopTracking();
    console.log("🛑 Code Mood Extension Deactivated");
  }

  /**
   * Runs the smell detector on the current file
   */
  async _runSmellDetector() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const doc = editor.document;
    if (doc.languageId !== "python") {
      vscode.window.showErrorMessage("Code Mood only supports Python files.");
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "🔍 Detecting Code Smells...",
        cancellable: true,
      },
      async () => {
        try {
          this.commentMap = await runSmellDetector(
            this.diagnosticCollection,
            doc
          );
          this._showGhostDecorations(editor);
        } catch (error) {
          vscode.window.showErrorMessage(
            `Error detecting code smells: ${error.message}`
          );
          console.error("Code smell detection error:", error);
        }
      }
    );
  }

  /**
   * Shows ghost decorations in the editor
   */
  _showGhostDecorations(editor) {
    if (!editor) return;

    const decorations = [];

    for (const lineStr in this.commentMap) {
      const line = parseInt(lineStr) - 1;
      const comment = this.commentMap[lineStr];

      const range = new vscode.Range(line, 1000, line, 1000); // End of line
      decorations.push({
        range,
        renderOptions: {
          after: {
            contentText: `# ${comment}`,
            color: "#6A9955",
            fontStyle: "italic",
          },
        },
      });
    }

    editor.setDecorations(this.decorationType, decorations);
  }

  /**
   * Shows time chart in a webview panel
   */
  _showTimeChart() {
    const panel = vscode.window.createWebviewPanel(
      "codingTimeChart",
      "🕒 Coding Time Chart",
      vscode.ViewColumn.Two,
      { enableScripts: true }
    );

    const data = getChartData(
      this.timeTracker.totalTime,
      this.timeTracker.startTime
    );

    panel.webview.html = getWebviewContent(data);
  }

  _enablePiano() {
    if (!this.soundPanel) {
      // Create the webview panel
      this.soundPanel = vscode.window.createWebviewPanel(
        "soundPanel",
        "Piano Player",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true, // Important to keep audio context alive
          localResourceRoots: [
            vscode.Uri.joinPath(this.context.extensionUri, "media"),
            vscode.Uri.joinPath(this.context.extensionUri, "media", "sounds"),
          ],
        }
      );

      // Create proper URI for the sound file
      const soundPath = vscode.Uri.joinPath(
        this.context.extensionUri,
        "media/sounds"
      );
      const soundSrc = this.soundPanel.webview.asWebviewUri(soundPath);

      console.log(`Loading sound from: ${soundSrc}`);

      try {
        // Set up the webview content
        this.soundPanel.webview.html = getWebviewContent_sound(soundSrc);
        console.log("Webview content set successfully");

        // Send a test message to the webview after a short delay
        setTimeout(() => {
          if (this.soundPanel && this.soundPanel.webview) {
            this.soundPanel.webview.postMessage({
              command: "ping",
              message: "Testing communication",
            });
          }
        }, 2000);
      } catch (err) {
        console.error("Error creating webview content:", err);
        vscode.window.showErrorMessage(`Failed to load piano: ${err.message}`);
      }

      // Clean up resources when panel is closed
      this.soundPanel.onDidDispose(() => {
        console.log("Piano panel disposed");
        this.soundPanel = undefined;
      });
    } else {
      // If panel already exists, bring it to focus
      this.soundPanel.reveal();
    }
  }

  _funkyType() {
    this.funkyModeEnabled = !this.funkyModeEnabled;
    if (this.funkyModeEnabled) {
      vscode.window.showInformationMessage("✨ Funky Mode Activated!");
      this.funkyListner = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.contentChanges.length > 0) {
          addFunkyEffect(event);
        }
      });
      console.log("Funky typing effect enabled");
    } else {
      vscode.window.showInformationMessage("🛑 Funky Mode Deactivated!");
      if (this.funkyListner) {
        this.funkyListner.dispose();
        this.funkyListner = null;
      }
      console.log("Funky typing effect disabled");
    }
  }
}

/**
 * Time tracker class for monitoring coding time
 */
class TimeTracker {
  constructor() {
    this.startTime = {};
    this.totalTime = {};
    this.intervalId = null;
    this.lastActiveFile = null;
    this.statusBarItem = null;
    this.updateInterval = 1000; // 1 second
  }

  /**
   * Initialize the time tracker
   */
  init(statusBarItem) {
    this.statusBarItem = statusBarItem;
  }

  /**
   * Start the tracking timer
   */
  startTracking() {
    if (this.intervalId) return; // Prevent multiple intervals

    this.intervalId = setInterval(
      () => this._updateTimer(),
      this.updateInterval
    );
    console.log("⏱️ Timer started");
  }

  /**
   * Stop the tracking timer
   */
  stopTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("⏱️ Timer stopped");
    }

    // Save times for all tracked files
    this._saveAllFileTimes();
  }

  /**
   * Pause tracking temporarily
   */
  pauseTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("⏱️ Timer paused");
    }
  }

  /**
   * Save timing data for all currently tracked files
   */
  _saveAllFileTimes() {
    // Save time for any files that are still being tracked
    for (const file in this.startTime) {
      this._saveFileTime(file);
    }
  }

  /**
   * Save the time for a specific file
   */
  _saveFileTime(file) {
    if (this.startTime[file]) {
      this.totalTime[file] =
        (this.totalTime[file] || 0) + (Date.now() - this.startTime[file]);
      delete this.startTime[file];
      console.log(
        `📂 Saved time for: ${file} - Total: ${this.totalTime[file]}ms`
      );
    }
  }

  /**
   * Start tracking time for a file
   */
  startTrackingFile(file) {
    if (!file) return;

    if (!this.intervalId) {
      this.startTracking();
    }

    if (!this.startTime[file]) {
      this.startTime[file] = Date.now();
      console.log(`📂 Started tracking: ${file}`);
    }
  }

  /**
   * Stop tracking time for a file
   */
  stopTrackingFile(file) {
    if (!file) return;

    this._saveFileTime(file);

    // If this was the last active file, clear it
    if (this.lastActiveFile === file) {
      this.lastActiveFile = null;
    }
  }

  /**
   * Update the active file being tracked
   */
  updateActiveFile(newFile) {
    if (!newFile) return;

    // If switching files, save previous file's time
    if (
      this.lastActiveFile &&
      this.lastActiveFile !== newFile &&
      this.startTime[this.lastActiveFile]
    ) {
      this._saveFileTime(this.lastActiveFile);
    }

    // Start time for new file
    this.startTrackingFile(newFile);
    this.lastActiveFile = newFile;
  }

  /**
   * Update the timer and status bar
   */
  _updateTimer() {
    const activeEditor = vscode.window.activeTextEditor;

    if (activeEditor) {
      const activeFile = activeEditor.document.fileName;

      // Ensure we're tracking this file
      if (!this.startTime[activeFile]) {
        this.startTrackingFile(activeFile);
      }

      // Calculate and display elapsed time
      this._updateStatusBar(activeFile);
    } else if (this.statusBarItem) {
      this.statusBarItem.text = "🛑 No active file. Timer paused.";
      this.statusBarItem.show();
    }
  }

  /**
   * Update the status bar with elapsed time
   */
  _updateStatusBar(file) {
    if (!this.statusBarItem || !file) return;

    // Calculate total elapsed time
    const currentFileTime = this.startTime[file]
      ? Date.now() - this.startTime[file]
      : 0;

    const totalElapsedTime = (this.totalTime[file] || 0) + currentFileTime;

    // Check if we need to show a break notification (30 minutes)
    const elapsedMinutes = totalElapsedTime / (1000 * 60);
    if (elapsedMinutes >= 30 && elapsedMinutes % 30 < 0.017) {
      // Check for exactly 30 min increments (with small buffer)
      vscode.window.showWarningMessage(
        `🚨 You have been coding in ${this._getFileName(file)} for ${Math.floor(
          elapsedMinutes
        )} minutes! Take a break.`
      );
    }

    // Format the time string
    const formattedTime = this._formatTimeString(totalElapsedTime);

    // Update status bar
    this.statusBarItem.text = `⏳ Coding Time: ${formattedTime}`;
    this.statusBarItem.show();
  }

  /**
   * Get just the filename from a path
   */
  _getFileName(filePath) {
    return filePath.split(/[\\/]/).pop();
  }

  /**
   * Format milliseconds into a human-readable time string
   */
  _formatTimeString(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0 || parts.length === 0)
      parts.push(`${remainingSeconds}s`);

    return parts.join(" ");
  }
}

/**
 * Activate the extension
 */
function activate(context) {
  const extension = new CodeMoodExtension(context);
  extension.activate();

  // Export the extension for deactivation
  return extension;
}

/**
 * Deactivate the extension
 */
function deactivate(extension) {
  if (extension) {
    extension.deactivate();
  }
}

module.exports = { activate, deactivate };
