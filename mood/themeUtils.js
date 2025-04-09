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

}

function applyChangesBasedOnState2(state) {

    const musicURL = suggestMusic(state);
    showMusicPanel(state, musicURL);
}

async function changeTheme(theme) {
    await vscode.workspace.getConfiguration().update("workbench.colorTheme", theme, true);
}

async function changeFont(font) {
    await vscode.workspace.getConfiguration().update("editor.fontFamily", font, true);
}


function suggestMusic(mood) {
    if(!mood)
    {
        return;
    }
    const musicMap = {
        normal: ["https://www.youtube.com/watch?v=jfKfPfyJRdk", "https://www.youtube.com/watch?v=lTRiuFIWV54", "https://youtube.com/playlist?list=PLVBXjbDu7z1_Hji7T4yN_GpagVpRuegy4&si=LVZqGl4ce2ofqu56" , "https://youtube.com/playlist?list=PL4quxJYkAWAGeH8otN7kPOn2sVFduakdM&si=xS2WPMnaK3LBjbVw", "https://youtube.com/playlist?list=PLQkQfzsIUwRaXZ_fgh5CI0t1dnK3u1swz&si=uMfns6ZxA8VWFfTo"], // lofi hip hop radio - beats to relax/study to
        lazy: ["https://www.youtube.com/watch?v=-Ud8EDzbWbs", "https://youtube.com/playlist?list=PLW_omwEM1aie5CjVKvAGjgI6XB9XH1Ccb&si=sEEDwLo8NUaKgFx9", "https://youtube.com/playlist?list=PLxA687tYuMWgQgPafj_RHXJlKwTQw2WO0&si=4o7QvY2Hp1xBiysI", "https://youtu.be/INCPKLSVoyo?si=K1Ho7LpuLMNu_tiB"], // INDUSTRIAL AGGRESSIVE DJENT METAL Music For ...
        relaxed: ["https://www.youtube.com/watch?v=HuFYqnbVbzY", "https://www.youtube.com/watch?v=CfqYylPCJTI", "https://youtu.be/kBLbhgMCIzU?si=nB-SpZtqI_GSq1nf", "https://youtu.be/ZPzCTOuCeVg?si=mDTG5X773ShbLMqB"], // jazz lofi radio - beats to chill/study to
        frustrated: ["https://www.youtube.com/watch?v=UVVnXZ1X6E0", "https://youtu.be/6gv-8OgrcYc?si=m2uHnvFBIQzrAIAj", "https://www.youtube.com/watch?v=EF_A2jAIcSE", "https://www.youtube.com/watch?v=TJLMQi0mNGw"], // Chillhop Beat Tapes • El Train [downtempo grooves]
        focused: ["https://www.youtube.com/watch?v=jfKfPfyJRdk", "https://youtu.be/M8FaZxxLK_o?si=hWvH1wEaRO6JMpMP", "https://youtu.be/hpltvTEiRrY?si=I9z3EpDYd2lbHYLs" , "https://youtu.be/5i0Z0E5yaYI?si=W0PrMCXqzshci9pY"], // lofi hip hop radio - beats to relax/study to
        overwhelmed:["https://youtu.be/eincGXiUjgk?si=ugq0WPgggeUagikI", "https://www.youtube.com/watch?v=gCWaRhNUvfc", "https://youtu.be/affs3g2Hmjg?si=dc6lVmQrEbzbeNhk", "https://youtu.be/QqS-vESb1zQ?si=BwwIkfFifq8ECCy8"], // Space Ambient Music Pure Cosmic Relaxation Mind Relaxation
        experimental: ["https://www.youtube.com/watch?v=isIj3tuQTDY", "https://youtube.com/playlist?list=PLs03y9BMaz8ZjV-eFsR422XyoO6HzzQDS&si=Q4qP1GnfJww1zBTZ", "https://youtube.com/playlist?list=PLFrhecWXVn5-MnOf2RRo4TrkMFKvSGMKg&si=kLJMIBHIO_bb85g8", "https://youtube.com/playlist?list=PLwKFiLdtN6B1BW3mmW8qL4JkrNnnpd11B&si=0oitQLuGZWsiIliM"], // GLITCH - A Synthwave Mix
        confident: ["https://www.youtube.com/watch?v=DjeCP5HR878", "https://youtu.be/8HaFxmMyKLk?si=kCNgubmlw2m_CHKi", "https://www.youtube.com/watch?v=IhP3J0j9JmY&list=PLMEZyDHJojxOivUPWX1aasnKcpau8WZfP", "https://youtube.com/playlist?list=PLYVjGTi85afoUsaonhk3t8m3l4IJ7xFDm&si=-EYPdp0gYH4JExdZ"], // Upbeat Funk Music Mix | Royalty Free Background Music ...
        anxious: ["https://www.youtube.com/watch?v=cYPJaHT5f3E","https://www.youtube.com/playlist?list=PLo3pNg0eiPc9hsnjWTTM4PVTKrmGaXOQ1", "https://www.youtube.com/playlist?list=PLfuKx491eAO7vVrUQCFt3z9Q2NyU19s_D", "https://youtube.com/playlist?list=PLklhd_AtN_8t8ahSl5lvyGEpMJBNgD59d&si=bO4a4rREKWScTI55"], // Peaceful Day [calm piano]
        perfectionist: ["https://www.youtube.com/watch?v=FduXLd9DNdM", "https://youtu.be/juoHTFwc1uk?si=YsH_J5arBSLxO_wi", "https://youtu.be/LXrP66ot0zs?si=hXAAu9s92-hZwfRr", "https://youtu.be/R88PFD6prq0?si=j5_Dc0TkdFvR5xe0"], // 15 MINUTES OF NEOCLASSICAL MUSIC
        procrastinating: ["https://www.youtube.com/watch?v=mGjqTQT2DS8", "https://youtu.be/4wtgmaA8xlw?si=XXDBXeOIzIysKNPM", "https://youtu.be/-sWmysGrua8?si=R9tcgMh4AedkSJI4", "https://youtu.be/GGcV6eE81xo?si=EYiYhNoJ_QxxEnKR"] // 100 Meme Songs With Their Real Names
    };

    mood = mood.toLowerCase();

    for (let key in musicMap) {
        if (mood.includes(key.toLowerCase())) {
            const options = musicMap[key];
            return options[Math.floor(Math.random() * options.length)];
        }
    }

    // Default to "normal" mood
    const normalOptions = musicMap.normal;
    return normalOptions[Math.floor(Math.random() * normalOptions.length)];
}

module.exports = { applyChangesBasedOnState, suggestMusic, applyChangesBasedOnState2 };
