let enabled = true;
const MAX_POPUPS = 60;
const MEMES = [
    "cat_image.jpeg",
    "cat2.jpg",
    "cat3.jpg",
    "dog1.jpg",
    "dog2.jpg",
    "horse1.jpg",
    "kermit.png",
    "and_i_walk_in.jpeg",
    "meme1.gif",
    "meme2.gif",
    "meme3.gif"
];

// sound effects
const SOUND_FILES = [
    "fah.mp3",
    "goofy.mp3",
    "uwu.mp3",
    "vineboom.mp3",
]; 

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

// Fleeing behavior settings
const FLEE_RADIUS = 280;
const MAX_SPEED = 20;
const IDLE_CLEAR_MS = 10000;   // stop mouse for 10s → fade everything out
const FADE_MS = 1200;          // how long the fade animation lasts

let mouseX = -9999;
let mouseY = -9999;
let lastMouseMoveTime = Date.now();
const activeFleeingBoxes = new Set();
let animationRunning = false;
let idleCheckInterval = null;
let isFadingOut = false;

window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    lastMouseMoveTime = Date.now();
}, { capture: true, passive: true });

function clearAllPopups() {
    isFadingOut = false;
    activeFleeingBoxes.clear();
    document.querySelectorAll(".popup-image").forEach((el) => el.remove());
}

function fadeOutAllPopups() {
    if (isFadingOut) return;
    const boxes = Array.from(document.querySelectorAll(".popup-image"));
    if (boxes.length === 0) return;

    isFadingOut = true;
    activeFleeingBoxes.clear();
    animationRunning = false;

    boxes.forEach((box) => {
        // Force reflow so the transition actually runs
        box.style.transition = "none";
        box.style.opacity = "1";
        void box.offsetWidth;

        box.style.transition = `opacity ${FADE_MS}ms ease-out`;
        box.style.opacity = "0";
        box.style.pointerEvents = "none";
    });

    setTimeout(() => {
        boxes.forEach((box) => {
            if (box.parentNode) box.remove();
        });
        isFadingOut = false;
    }, FADE_MS + 100);
}

function updateFleeingPopups() {
    if (isFadingOut) {
        animationRunning = false;
        return;
    }

    const now = Date.now();
    if (now - lastMouseMoveTime >= IDLE_CLEAR_MS) {
        fadeOutAllPopups();
        return;
    }

    for (const box of activeFleeingBoxes) {
        if (!box.isConnected) {
            activeFleeingBoxes.delete(box);
            continue;
        }

        const width = box.offsetWidth || 168;
        const height = box.offsetHeight || 180;
        const centerX = box._posX + width / 2;
        const centerY = box._posY + height / 2;

        const dx = centerX - mouseX;
        const dy = centerY - mouseY;
        const distance = Math.hypot(dx, dy);

        if (distance < FLEE_RADIUS && distance > 0) {
            const force = (FLEE_RADIUS - distance) / FLEE_RADIUS;
            const speed = Math.max(3, force * MAX_SPEED);

            box._posX += (dx / distance) * speed;
            box._posY += (dy / distance) * speed;

            const maxX = Math.max(0, window.innerWidth - width);
            const maxY = Math.max(0, window.innerHeight - height);
            box._posX = Math.min(Math.max(0, box._posX), maxX);
            box._posY = Math.min(Math.max(0, box._posY), maxY);

            box.style.left = Math.round(box._posX) + "px";
            box.style.top = Math.round(box._posY) + "px";
        }
    }

    if (activeFleeingBoxes.size > 0) {
        requestAnimationFrame(updateFleeingPopups);
    } else {
        animationRunning = false;
    }
}

function startFleeLoop() {
    if (!animationRunning && !isFadingOut) {
        animationRunning = true;
        requestAnimationFrame(updateFleeingPopups);
    }
}

function ensureIdleChecker() {
    if (idleCheckInterval) return;
    idleCheckInterval = setInterval(() => {
        if (
            !isFadingOut &&
            Date.now() - lastMouseMoveTime >= IDLE_CLEAR_MS &&
            document.querySelectorAll(".popup-image").length > 0
        ) {
            fadeOutAllPopups();
        }
    }, 400);
}

function injectStyles() {
    if (document.getElementById("xp-popup-styles")) return;
    const style = document.createElement("style");
    style.id = "xp-popup-styles";
    style.textContent = `
    .popup-image {
        position: fixed !important;
        z-index: 2147483647;
        visibility: hidden;
        opacity: 1;
        box-sizing: border-box;
        background: #0054e3;
        padding: 0 3px 3px 3px;
        border-radius: 8px 8px 0 0;
        box-shadow: 2px 2px 6px rgba(0,0,0,0.5);
        font-family: Tahoma, "Trebuchet MS", sans-serif;
        will-change: opacity, left, top;
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
    .popup-image .xp-min::after {
        content: "";
        position: absolute;
        left: 4px; bottom: 4px;
        width: 7px; height: 3px;
        background: #fff;
    }
    .popup-image .xp-max::after {
        content: "";
        position: absolute;
        left: 4px; top: 4px;
        width: 9px; height: 9px;
        box-sizing: border-box;
        border: 1px solid #fff;
        border-top-width: 3px;
    }
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

function spawnImage(clickX, clickY) {
    if (isFadingOut) return;
    if (document.querySelectorAll(".popup-image").length >= MAX_POPUPS) return;
    injectStyles();
    ensureIdleChecker();
    playRandomSound();

    if (typeof clickX === "number" && typeof clickY === "number") {
        mouseX = clickX;
        mouseY = clickY;
        lastMouseMoveTime = Date.now();
    }

    const box = document.createElement("div");
    box.className = "popup-image";

    const titlebar = document.createElement("div");
    titlebar.className = "xp-titlebar";

    const icon = document.createElement("span");
    icon.className = "xp-icon";
    icon.textContent = "\u2606";
    titlebar.appendChild(icon);

    const buttons = document.createElement("div");
    buttons.className = "xp-buttons";
    const minBtn = makeButton("xp-min");
    const maxBtn = makeButton("xp-max");
    const closeBtn = makeButton("xp-close");
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        activeFleeingBoxes.delete(box);
        box.style.transition = "none";
        box.style.opacity = "1";
        void box.offsetWidth;
        box.style.transition = "opacity 0.3s ease-out";
        box.style.opacity = "0";
        box.style.pointerEvents = "none";
        setTimeout(() => box.remove(), 320);
    };
    buttons.append(minBtn, maxBtn, closeBtn);
    titlebar.appendChild(buttons);

    const body = document.createElement("div");
    body.className = "xp-body";

    const img = document.createElement("img");
    const choice = MEMES[Math.floor(Math.random() * MEMES.length)];

    img.onload = () => {
        const maxX = Math.max(0, window.innerWidth - box.offsetWidth);
        const maxY = Math.max(0, window.innerHeight - box.offsetHeight);
        box._posX = Math.random() * maxX;
        box._posY = Math.random() * maxY;
        box.style.left = Math.round(box._posX) + "px";
        box.style.top = Math.round(box._posY) + "px";
        box.style.visibility = "visible";
        box.style.opacity = "1";

        activeFleeingBoxes.add(box);
        startFleeLoop();
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

document.addEventListener("click", (e) => {
    if (!chrome.runtime?.id) {
        console.info("[FX] Extension was reloaded. Refresh this page to use it again.");
        return;
    }
    if (!enabled) return;
    if (e.target.closest && e.target.closest(".popup-image")) return;
    spawnImage(e.clientX, e.clientY);
}, true);

chrome.storage.local.get({ enabled: true }, (data) => {
    enabled = data.enabled;
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "toggle") {
        enabled = msg.enabled ?? !enabled;
        sendResponse({ enabled });
    } else if (msg.type === "clear") {
        clearAllPopups();
        sendResponse({ cleared: true });
    } else if (msg.type === "test-fx") {
        spawnImage(window.innerWidth / 2, window.innerHeight / 2);
        sendResponse({ ok: true });
    }
    return true;
});