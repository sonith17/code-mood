const vscode = require("vscode");

class MoodPanelViewProvider {
  static viewType = "codeMood.moodPanel";
  
  /**
   * @param {vscode.Uri} extensionUri
   */
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._view = undefined;
    this._message = "All clear. Keep going!";
    this._gif = "kitty.gif";
  }

  /**
   * @param {vscode.WebviewView} webviewView
   * @param {vscode.WebviewViewResolveContext} _context
   * @param {vscode.CancellationToken} _token
   */
  resolveWebviewView(webviewView, _context, _token) {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    
    // Set up message listener for communication between webview and extension
    webviewView.webview.onDidReceiveMessage(message => {
      console.log("Received message:", message);
    });
  }

  updateContent(newMessage, newGif) {
    this._message = newMessage;
    this._gif = newGif || this._gif;
    // console.log("Updating message:", newMessage);
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
      // Post a message to the webview to trigger the typing effect
      this._view.webview.postMessage({ 
        command: 'updateMessage',
        message: newMessage
      });
    }
  }

  /**
   * @param {vscode.Webview} webview
   */
  _getHtmlForWebview(webview) {
    // Create proper URI for the image
    const mascotUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", this._gif)
    );
    
    // Create proper URI for the font if you'll use a local font
    // If using web fonts, you'll need to adjust the CSP and add the font URL
    
    const nonce = getNonce();
    
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'nonce-${nonce}';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Code Mood</title>
      <link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body {
          padding: 15px;
          color: var(--vscode-foreground);
          font-family: 'Comic Neue', cursive;

          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          overflow: hidden;
          max-height: 50vh;
        }
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 300px;

          border-radius: 10px;
          padding: 15px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .mascot {
          margin-bottom: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s ease;
        }
        .mascot:hover {
          transform: scale(1.05);
        }
        .message-container {
          position: relative;
          background-color: var(--vscode-editor-inactiveSelectionBackground);
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
          width: 100%;
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .message {
          font-size: 18px;
          font-weight: bold;
          color: var(--vscode-editor-foreground);
          margin: 0;
          text-align: center;
          min-height: 1.2em;
        }
        .blinking-cursor {
          display: inline-block;
          width: 10px;
          height: 1.2em;
          background-color: var(--vscode-editor-foreground);
          margin-left: 5px;
          animation: blink 1s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <img class="mascot" src="${mascotUri}" alt="Mascot" width="200" height="200">
        <div class="message-container">
          <p class="message" id="message"></p>
          <span class="blinking-cursor" id="cursor"></span>
        </div>
      </div>
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const messageElement = document.getElementById('message');
        const cursorElement = document.getElementById('cursor');
        
        // Initial message typing effect
        const initialMessage = ${JSON.stringify(this._message)};
        typeMessage(initialMessage);
        
        // Listen for message updates from the extension
        window.addEventListener('message', event => {
          const message = event.data;
          if (message.command === 'updateMessage') {
            typeMessage(message.message);
          }
        });
        
        // Function to create typing effect
        function typeMessage(text) {
          // Reset message
          messageElement.textContent = '';
          cursorElement.style.display = 'inline-block';
          
          let i = 0;
          const typingSpeed = 50; // Milliseconds per character
          
          // Stop any previous typing
          if (window.typingInterval) {
            clearInterval(window.typingInterval);
          }
          
          // Start typing
          window.typingInterval = setInterval(() => {
            if (i < text.length) {
              messageElement.textContent += text.charAt(i);
              i++;
            } else {
              // Done typing
              clearInterval(window.typingInterval);
              
              // Hide cursor after typing is complete with a slight delay
              setTimeout(() => {
                cursorElement.style.display = 'none';
              }, 1000);
            }
          }, typingSpeed);
        }
      </script>
    </body>
    </html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

module.exports = MoodPanelViewProvider;