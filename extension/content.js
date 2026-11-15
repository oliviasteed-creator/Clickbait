let enabled = true;
const MAX_POPUPS = 60;

const MEMES = [
    "cat_image.jpeg",
    "cat2.jpg",
    "cat3.jpg",
    "dog1.jpg",
    "dog2.jpg",
    "horse1.jpg",
    "kermit.png"
];

// ---------- Sound effects (custom files only) ----------
// Files live in extension/sounds/. To add one: drop it in that folder and
// add its name here. manifest.json already allows everything in sounds/.
const SOUND_FILES = [
    "35f4997a-677c-4e79-a2b8-f33b688d5233.mp3",
    "707db471-c834-494e-a3d9-ada985203ef6.mp3",
    "7734a0d8-d26f-49b1-9b87-45e8272b1183.mp3",
    "fb64d9f6-7584-4a3f-930b-ba6094d37fd5.mp3",
];

// Volume comes from the popup's slider (chrome.storage.local), 0..1.
let volume = 0.5;
chrome.storage.local.get({ volume }, (s) => { volume = s.volume; });
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.volume) volume = changes.volume.newValue;
});

function playRandomSound() {
    if (!SOUND_FILES.length) return;
    const file = SOUND_FILES[Math.floor(Math.random() * SOUND_FILES.length)];
    const audio = new Audio(chrome.runtime.getURL("sounds/" + file));
    audio.volume = volume;
    audio.play().catch((err) => console.warn("[FX] sound failed:", file, err.message));
}

//xp window style... ignore that it is in content.js LOL
function injectStyles() {
    if (document.getElementById("xp-popup-styles")) return;
    const style = document.createElement("style");
    style.id = "xp-popup-styles";
    style.textContent = `
    .popup-image {
        position: fixed;
        z-index: 2147483647;
        visibility: hidden;
        box-sizing: border-box;
        background: #0054e3;
        padding: 0 3px 3px 3px;
        border-radius: 8px 8px 0 0;
        box-shadow: 2px 2px 6px rgba(0,0,0,0.5);
        font-family: Tahoma, "Trebuchet MS", sans-serif;
    }
    .popup-image .xp-titlebar {
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 3px 0 5px;
        margin: 0 -3px;
        border-radius: 8px 8px 0 0;
        background: linear-gradient(to bottom,
            #0058ee 0%, #3593ff 4%, #288eff 6%, #127dff 8%, #036ffc 10%,
            #0262ee 14%, #0057e5 20%, #0054e3 24%, #0055eb 56%, #005bf5 66%,
            #026afe 76%, #0062ef 86%, #0052d6 92%, #0040ab 94%, #003092 100%);
    }
    .popup-image .xp-icon {
        color: #fff;
        font-size: 18px;
        line-height: 1;
        text-shadow: 1px 1px 0 #0a246a;
        user-select: none;
    }
    .popup-image .xp-buttons {
        display: flex;
        gap: 2px;
    }
    .popup-image .xp-btn {
        position: relative;
        box-sizing: border-box;
        width: 21px;
        height: 21px;
        padding: 0;
        border: 1px solid #fff;
        border-radius: 3px;
        cursor: pointer;
        background: radial-gradient(circle at 30% 25%, #6b9bf5 0%, #2c63de 55%, #1c4cc4 100%);
    }
    .popup-image .xp-btn:hover { filter: brightness(1.15); }
    .popup-image .xp-btn:active { filter: brightness(0.85); }
    .popup-image .xp-close {
        background: radial-gradient(circle at 30% 25%, #e9957b 0%, #d9482a 55%, #b8300f 100%);
    }
    /* minimize: little bar at bottom-left */
    .popup-image .xp-min::after {
        content: "";
        position: absolute;
        left: 4px; bottom: 4px;
        width: 7px; height: 3px;
        background: #fff;
    }
    /* maximize: square with thick top edge */
    .popup-image .xp-max::after {
        content: "";
        position: absolute;
        left: 4px; top: 4px;
        width: 9px; height: 9px;
        box-sizing: border-box;
        border: 1px solid #fff;
        border-top-width: 3px;
    }
    /* close: X */
    .popup-image .xp-close::after {
        content: "\\2715";
        position: absolute;
        inset: 0;
        color: #fff;
        font: bold 13px/19px sans-serif;
        text-align: center;
    }
    .popup-image .xp-body {
        background: #ece9d8;
        padding: 6px;
    }
    .popup-image .xp-body img {
        display: block;
        width: 150px;
        height: auto;
    }`;
    document.head.appendChild(style);
}

function makeButton(cls) {
    const b = document.createElement("button");
    b.className = "xp-btn " + cls;
    return b;
}

function spawnImage() {
    if (document.querySelectorAll(".popup-image").length >= MAX_POPUPS) return;
    injectStyles();
    playRandomSound();

    const box = document.createElement("div");
    box.className = "popup-image";

    // title bar
    const titlebar = document.createElement("div");
    titlebar.className = "xp-titlebar";

    const icon = document.createElement("span");
    icon.className = "xp-icon";
    icon.textContent = "\u2606"; // ☆
    titlebar.appendChild(icon);

    const buttons = document.createElement("div");
    buttons.className = "xp-buttons";
    const minBtn = makeButton("xp-min");
    const maxBtn = makeButton("xp-max");
    const closeBtn = makeButton("xp-close");
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        box.remove();
    };
    buttons.append(minBtn, maxBtn, closeBtn);
    titlebar.appendChild(buttons);

    // body with the meme
    const body = document.createElement("div");
    body.className = "xp-body";

    const img = document.createElement("img");
    const choice = MEMES[Math.floor(Math.random() * MEMES.length)];

    img.onload = () => {
        const maxX = Math.max(0, window.innerWidth - box.offsetWidth);
        const maxY = Math.max(0, window.innerHeight - box.offsetHeight);
        box.style.left = Math.random() * maxX + "px";
        box.style.top = Math.random() * maxY + "px";
        box.style.visibility = "visible";
    };
    img.onerror = () => {
        console.error("Meme failed to load:", img.src);
        box.remove();
    };
    img.src = chrome.runtime.getURL("img/" + choice);

    body.appendChild(img);
    box.append(titlebar, body);
    document.body.appendChild(box);
}

// click listener
document.addEventListener("click", (e) => {
    // After the extension is reloaded, this old copy of the script can't use
    // chrome.* anymore ("Extension context invalidated"). Stop quietly.
    if (!chrome.runtime?.id) {
        console.info("[FX] Extension was reloaded. Refresh this page to use it again.");
        return;
    }
    if (!enabled) return;
    if (e.target.closest && e.target.closest(".popup-image")) return;
    spawnImage();
}, true);

// messages from other scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "toggle") {
        enabled = msg.enabled ?? !enabled;
        sendResponse({ enabled });
    } else if (msg.type === "clear") {
        document.querySelectorAll(".popup-image").forEach((el) => el.remove());
        sendResponse({ cleared: true });
    }
});