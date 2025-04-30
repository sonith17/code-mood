const { random } = require("lodash");
const vscode = require("vscode");

const FUNKY_FONTS = ['"Papyrus"'];

const TEXT_EFFECTS = [
  "rotate(5deg)",
  "rotate(-5deg)",
  "scale(1.2)",
  "skewX(5deg)",
];

const funkyDecorationType = vscode.window.createTextEditorDecorationType({
  textDecoration: "none; position: absolute;",
  backgroundColor: "transparent",
});

let funkyTextBuffer = ""; // Temporarily holds typed characters
let funkyTimeout = null;
let activeFunkyDecorations = [];

function addFunkyEffect(change) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  change.contentChanges.forEach((contentChange) => {
    const startPos = contentChange.range.start;
    const endPos = contentChange.range.end;

    // Trigger only when typing a single character
    if (contentChange.text.length === 1 && startPos.isEqual(endPos)) {
      const typedChar = contentChange.text;
      funkyTextBuffer += typedChar;

      // Set target line = one line below current cursor
      const targetLine = Math.min(
        startPos.line + 1,
        editor.document.lineCount - 1
      );
      const targetChar = startPos.character;

      const targetPosition = new vscode.Position(targetLine, targetChar);

      const decoration = {
        range: new vscode.Range(targetPosition, targetPosition),
        renderOptions: {
          after: {
            contentText: funkyTextBuffer,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            fontWeight: "900",
            fontSize: "1.4em",
            fontFamily:
              FUNKY_FONTS[Math.floor(Math.random() * FUNKY_FONTS.length)],
            textShadow: "2px 2px 2px rgba(0,0,0,0.5)",
            margin: "1.4em 0 0 0.2rem", // << this makes it appear "lower"
            backgroundColor: "rgba(0,0,0,0.1)",
            padding: "1px 4px",
            borderRadius: "4px",
            border: "1px solid rgba(255,150,150,0.8)",
            transform:
              TEXT_EFFECTS[Math.floor(Math.random() * TEXT_EFFECTS.length)],
            opacity: "1",
            transition: "all 0.4s ease-out",
          },
        },
      };

      activeFunkyDecorations = [decoration];
      editor.setDecorations(funkyDecorationType, activeFunkyDecorations);

      // Reset & fade-out animation
      if (funkyTimeout) clearTimeout(funkyTimeout);
      funkyTimeout = setTimeout(() => {
        decoration.renderOptions.after.opacity = "0";
        decoration.renderOptions.after.transform += " translateY(-10px)";
        editor.setDecorations(funkyDecorationType, [decoration]);

        setTimeout(() => {
          activeFunkyDecorations = [];
          editor.setDecorations(funkyDecorationType, []);
          funkyTextBuffer = ""; // Reset for next batch
        }, 400);
      }, 300);
    }
  });
}

module.exports = { addFunkyEffect };
