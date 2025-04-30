const vscode = require("vscode");
const MoodPanelViewProvider = require("./MoodPanelViewProvider.js");
const TreeDataProvider = require("./TreeViewProvider.js");

let undoCount = 0;
let redoCount = 0;
let copyCount = 0;
let pasteCount = 0;
let cutCount = 0;

function registerKeybindingTrackers(context, moodPanelProvider) {
  const undoCommand = vscode.commands.registerCommand(
    "codeMood.trackUndo",
    async () => {
      undoCount++;
      if (undoCount >= 5) {
        // vscode.window.showInformationMessage(
        //   "Frequent Undo actions detected. Feeling stuck?"
        // );
        moodPanelProvider.updateContent(
          "Frequent Undo actions detected. Feeling stuck?",
          "undo.gif"
        );
        undoCount = 0; // Reset after showing the message
      }
      await vscode.commands.executeCommand("undo");
    }
  );

  const redoCommand = vscode.commands.registerCommand(
    "codeMood.trackRedo",
    async () => {
      redoCount++;
      if (redoCount >= 5) {
        // vscode.window.showInformationMessage(
        //   "Frequent Redo actions detected. Repeated retries?"
        // );
        moodPanelProvider.updateContent(
          "Frequent Redo actions detected. Repeated retries?"
        );
        redoCount = 0; // Reset after showing the message
      }
      await vscode.commands.executeCommand("redo");
    }
  );

  const copyCommand = vscode.commands.registerCommand(
    "codeMood.trackCopy",
    async () => {
      copyCount++;
      if (copyCount >= 5) {
        // vscode.window.showInformationMessage(
        //   "You seem to be copying a lot. Reusing chunks?"
        // );
        moodPanelProvider.updateContent(
          "You seem to be copying a lot. Reusing chunks?",
          "copy.gif"
        );
        copyCount = 0; // Reset after showing the message
      }
      await vscode.commands.executeCommand("editor.action.clipboardCopyAction");
    }
  );

  const pasteCommand = vscode.commands.registerCommand(
    "codeMood.trackPaste",
    async () => {
      pasteCount++;
      if (pasteCount >= 5) {
        // vscode.window.showInformationMessage(
        //   "Frequent pastes detected. Patching things up?"
        // );
        moodPanelProvider.updateContent(
          "Frequent pastes detected. Patching things up?"
        );
        pasteCount = 0; // Reset after showing the message
      }
      await vscode.commands.executeCommand(
        "editor.action.clipboardPasteAction"
      );
    }
  );

  const cutCommand = vscode.commands.registerCommand(
    "codeMood.trackCut",
    async () => {
      cutCount++;
      if (cutCount >= 5) {
        // vscode.window.showInformationMessage(
        //   "Cutting code repeatedly. Refactoring or indecisive?"
        // );
        moodPanelProvider.updateContent(
          "Cutting code repeatedly. Refactoring or indecisive?",
          "cut.gif"
        );
        cutCount = 0; // Reset after showing the message
      }
      await vscode.commands.executeCommand("editor.action.clipboardCutAction");
    }
  );

  context.subscriptions.push(
    undoCommand,
    redoCommand,
    copyCommand,
    pasteCommand,
    cutCommand
  );
}

let debugInsertTimestamps = [];

function trackDebugInserts(context, moodPanelProvider) {
  vscode.workspace.onDidChangeTextDocument((event) => {
    const DEBUG_REGEX = /\b(console\.log|print)\s*\(/;
    const now = Date.now();
    const WINDOW_MS = 60 * 1000;
    const THRESHOLD = 7;

    event.contentChanges.forEach((change) => {
      if (DEBUG_REGEX.test(change.text)) {
        // Add current timestamp
        debugInsertTimestamps.push(now);

        // Filter out timestamps older than 1 minute
        debugInsertTimestamps = debugInsertTimestamps.filter(
          (ts) => now - ts <= WINDOW_MS
        );

        if (debugInsertTimestamps.length >= THRESHOLD) {
          //   vscode.window.showInformationMessage(
          //     "Frequent Debug Logs detected. Debugging in overdrive!"
          //   );
          moodPanelProvider.updateContent(
            "Frequent Debug Logs detected. Debugging frenzy!",
            "debug.gif"
          );
          debugInsertTimestamps = []; // Reset to avoid repeated notifications
        }
      }
    });
  });
}

// Tracker: Frequent CSS Layout churn (changes in className attributes in JSX)
let cssChurnCount = 0;

function trackCSSChurn(context, moodPanelProvider) {
  vscode.workspace.onDidChangeTextDocument((event) => {
    event.contentChanges.forEach((change) => {
      // Check for changes in class or className attributes
      const CSS_REGEX = /\b(className|class)\s*=\s*['"][^'"]+['"]/;

      if (CSS_REGEX.test(change.text)) {
        cssChurnCount++;
        if (cssChurnCount >= 5) {
          //   vscode.window.showInformationMessage(
          //     "Frequent CSS Layout churn detected. Tuning UI excessively?"
          //   );
          moodPanelProvider.updateContent(
            "Frequent CSS Layout churn detected. Tuning UI excessively?"
          );
          cssChurnCount = 0; // Reset after showing the message
        }
      }
    });
  });
}

// Tracker: Rapid changes to the same React/JS component block
let lastEditTime = 0;
let componentEditCount = 0;

function trackReactChurn(context, moodPanelProvider) {
  vscode.workspace.onDidChangeTextDocument((event) => {
    event.contentChanges.forEach((change) => {
      const currentTime = Date.now();

      // Track rapid changes within the same code block (React Component)
      if (
        change.text.includes("function") ||
        change.text.includes("return") ||
        change.text.includes("setState")
      ) {
        if (currentTime - lastEditTime < 3000) {
          // If edit happens within 3 seconds
          componentEditCount++;
          if (componentEditCount >= 3) {
            // vscode.window.showInformationMessage(
            //   "Frequent edits to the same component detected. Refactoring?"
            // );
            moodPanelProvider.updateContent(
              "Frequent edits to the same component detected. Refactoring?"
            );
            componentEditCount = 0; // Reset after showing the message
          }
        } else {
          componentEditCount = 1; // Reset counter if the edits are too far apart
        }
        lastEditTime = currentTime;
      }
    });
  });
}

let commentTimestamps = [];

function trackCommentChurn(context, moodPanelProvider) {
  const commentCommand = vscode.commands.registerCommand(
    "codeMood.trackComment",
    async () => {
      const now = Date.now();
      const WINDOW_MS = 60 * 1000;
      const THRESHOLD = 6;

      commentTimestamps.push(now);

      // Filter timestamps within time window
      commentTimestamps = commentTimestamps.filter(
        (ts) => now - ts <= WINDOW_MS
      );

      if (commentTimestamps.length >= THRESHOLD) {
        moodPanelProvider.updateContent(
          "Lots of commenting/uncommenting going on. Unsure or isolating bugs?",
          "comment.gif"
        );
        commentTimestamps = []; // Reset after notification
      }

      // Call original VS Code comment toggle action
      await vscode.commands.executeCommand("editor.action.commentLine");
    }
  );

  context.subscriptions.push(commentCommand);
}

// Wrapper Function: Verify Developer Mood based on the tracked behaviors
/**
 * @param {vscode.ExtensionContext} context
 */
function verifyDeveloperMood(context) {
  const panelProvider = new MoodPanelViewProvider(context.extensionUri);
  const treeProvider = new TreeDataProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      TreeDataProvider.viewType,
      treeProvider
    ),
    vscode.window.registerWebviewViewProvider(
      MoodPanelViewProvider.viewType,
      panelProvider
    )
  );

  registerKeybindingTrackers(context, panelProvider);
  trackDebugInserts(context, panelProvider);
  trackCSSChurn(context, panelProvider);
  trackReactChurn(context, panelProvider);
  trackCommentChurn(context, panelProvider);
}

module.exports = {
  verifyDeveloperMood,
};
