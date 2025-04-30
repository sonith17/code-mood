function getWebviewContent_sound(soundSrc) {
    return `
      <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Piano Player</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
        button { padding: 10px 20px; font-size: 16px; margin-bottom: 15px; }
        .status { margin-top: 15px; color: #666; }
      </style>
    </head>
    <body>
      <h2>Piano Player</h2>
      <button id="startBtn">Activate Audio</button>
      <div class="status" id="status">Click button to activate audio</div>
      <div id="audioSource">Source: ${soundSrc}</div>
      <audio id="pSound" preload="auto"></audio>
      <script>
        const vscode = acquireVsCodeApi();
        const sound = document.getElementById('pSound');
        const startBtn = document.getElementById('startBtn');
        const statusEl = document.getElementById('status');
        
        // Set the audio source programmatically
        sound.src = "${soundSrc}/avengers_theme.mp3";
        
        // Log initial state
        console.log("Audio source is:", sound.src);
        sound.volume = 1.0; // Set volume to max
        console.log("Initial state - Volume:", sound.volume, "Muted:", sound.muted);
        
        let isReady = false;
        
        // Audio event listeners for debugging
        sound.addEventListener('loadstart', () => {
          console.log('Audio: load started');
          statusEl.textContent = 'Loading audio...';
        });
        
        sound.addEventListener('loadedmetadata', () => {
          console.log('Audio: metadata loaded, duration:', sound.duration);
          statusEl.textContent = 'Audio metadata loaded';
        });
        
        sound.addEventListener('canplaythrough', () => {
          console.log('Audio: can play through');
          statusEl.textContent = 'Audio ready. Waiting for activation.';
        });
        
        sound.addEventListener('play', () => {
          console.log('Audio: playback started');
        });
        
        sound.addEventListener('error', (e) => {
          console.error('Audio error code:', sound.error ? sound.error.code : 'unknown');
          console.error('Audio error message:', sound.error ? sound.error.message : 'unknown');
          console.error('Audio source that failed:', sound.src);
          statusEl.textContent = 'Error loading audio: ' + (sound.error ? sound.error.code : 'unknown error');
        });

        // Button to initialize audio context (needed for browsers/webviews due to autoplay policies)
        startBtn.addEventListener('click', () => {
          // Create a short audio context to test audio system
          try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const testContext = new AudioContext();
            console.log("Audio context created successfully:", testContext.state);
            
            // Try to play the audio
            sound.play().then(() => {
              sound.pause();
              sound.currentTime = 0;
              isReady = true;
              console.log("Audio initialized successfully");
              startBtn.textContent = "Audio Ready";
              
              statusEl.textContent = 'Audio activated! Ready to play on "p" keypress.';
            }).catch(err => {
              console.error('Audio activation failed:', err);
              statusEl.textContent = 'Failed to activate audio: ' + err.message;
            });
          } catch (err) {
            console.error('Error creating audio context:', err);
            statusEl.textContent = 'Error creating audio context: ' + err.message;
          }
        });

        // Message listener for play commands from extension
        window.addEventListener('message', event => {
          const message = event.data;
          console.log("Message received:", message);
          
          if (isReady)
          {
              sound.currentTime = 0; // Reset to beginning
              if (message.command === 'playP') sound.src = "${soundSrc}/avengers_theme.mp3";
              if (message.command === 'playS') sound.src = "${soundSrc}/c6-102822.mp3";
              if (message.command === 'playA') sound.src = "${soundSrc}/c7-102822.mp3";
              if (message.command === 'playD') sound.src = "${soundSrc}/c8-102822.mp3";
              if (message.command === 'playF') sound.src = "${soundSrc}/c9-102822.mp3";
              if (message.command === 'playG') sound.src = "${soundSrc}/c10-102822.mp3";
              if (message.command === 'playH') sound.src = "${soundSrc}/c11-102822.mp3";
              if (message.command === 'playJ') sound.src = "${soundSrc}/c12-102822.mp3";
              if (message.command === 'playK') sound.src = "${soundSrc}/c13-102822.mp3";
              if (message.command === 'playL') sound.src = "${soundSrc}/c14-102822.mp3";
              if (message.command === 'playZ') sound.src = "${soundSrc}/c15-102822.mp3";
              if (message.command === 'playX') sound.src = "${soundSrc}/c16-102822.mp3";
              if (message.command === 'playC') sound.src = "${soundSrc}/c17-102822.mp3";
              if (message.command === 'playV') sound.src = "${soundSrc}/c18-102822.mp3";
              if (message.command === 'playB') sound.src = "${soundSrc}/c19-102822.mp3";
              if (message.command === 'playN') sound.src = "${soundSrc}/c20-102822.mp3";
              if (message.command === 'playM') sound.src = "${soundSrc}/c21-102822.mp3";
              if (message.command === 'playQ') sound.src = "${soundSrc}/c22-102822.mp3";
              if (message.command === 'playW') sound.src = "${soundSrc}/c23-102822.mp3";
              if (message.command === 'playE') sound.src = "${soundSrc}/c24-102822.mp3";
              if (message.command === 'playR') sound.src = "${soundSrc}/c25-102822.mp3";
              if (message.command === 'playT') sound.src = "${soundSrc}/c26-102822.mp3";
              if (message.command === 'playY') sound.src = "${soundSrc}/c27-102822.mp3";
              if (message.command === 'playU') sound.src = "${soundSrc}/c28-102822.mp3";
              if (message.command === 'playI') sound.src = "${soundSrc}/c29-102822.mp3";
              if (message.command === 'playO') sound.src = "${soundSrc}/c30-102822.mp3";
              if (message.command === 'playLeftBracket') sound.src = "${soundSrc}/c31-102822.mp3";
              if (message.command === 'playRightBracket') sound.src = "${soundSrc}/c32-102822.mp3";
              if (message.command === 'playBackSlash') sound.src = "${soundSrc}/c33-102822.mp3";
              if (message.command === 'playSemicolon') sound.src = "${soundSrc}/c34-102822.mp3";
              if (message.command === 'playSingleQuote') sound.src = "${soundSrc}/c35-102822.mp3";
              if (message.command === 'playComma') sound.src = "${soundSrc}/c36-102822.mp3";
              if (message.command === 'playDot') sound.src = "${soundSrc}/c37-102822.mp3";
              if (message.command === 'playSlash') sound.src = "${soundSrc}/c38-102822.mp3";
              console.log("Playing sound from:", sound.src);

              let playPromise = sound.play();
                console.log("Play promise:", playPromise,sound.src,sound.volume);
                if (playPromise !== undefined) {
                console.log("Play promise is defined");
                  playPromise.then(() => {
                    console.log("Audio playback started successfully");
          
                  }).catch(err => {
                    console.error("Audio playback failed:", err);
                    statusEl.textContent = 'Error playing audio: ' + err.message;
                  });
                  console.log("Audio playback completedgfuy");
                } else {
                  console.log("Play returned undefined, older browser?");
                }

          }
          else {
              console.warn("Audio not ready yet. Please click the activate button first");
              statusEl.textContent = 'Please activate audio first!';
          }
        });
      </script>
    </body>
    </html>
    `;
  }

  module.exports = {
    getWebviewContent_sound
  };