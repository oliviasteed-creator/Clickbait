let enabled = true;
let count = 0;
const MAX_POPUPS = 10;

const MEMES = ["cat_image.jpeg"]

function randomImage() {
    const img = document.createElement("img");
    const choice = MEMES[Math.floor(Math.random() * MEMES.length)];
    img.src = chrome.runtime.getURL("img/" + choice);
    // only limit the width; height: auto keeps the original ratio
    img.style.cssText = "display:block;width:150px;height:auto;";
    return img;
}

function spawnImage() {
    if (document.querySelectorAll(".popup-image").length >= MAX_POPUPS) return;

    const box = document.createElement("div");
    box.className = "popup-image";
    box.style.cssText =
        "position:fixed;z-index:2147483647;background:#fff;padding:4px;" +
        "border:3px solid #000;border-radius:8px;visibility:hidden;";

    // play random sound -- meme
    const img = randomImage();
    box.appendChild(img);

    const close = document.createElement("button");
    close.textContent = "x";
    close.style.cssText = "position:absolute;top:-12px;right:-12px;cursor:pointer;";
    close.onclick = (e) => {
        e.stopPropagation();
        box.remove();
    };
    box.appendChild(close);

    document.body.appendChild(box);

    // once the image has loaded, we know its real size, so place it randomly
    img.onload = () => {
        const maxX = Math.max(0, window.innerWidth - box.offsetWidth);
        const maxY = Math.max(0, window.innerHeight - box.offsetHeight);
        box.style.left = Math.random() * maxX + "px";
        box.style.top = Math.random() * maxY + "px";
        box.style.visibility = "visible";
    };
    count++;
}



// event listener for clicks
document.addEventListener("click", (e) => {
    if(!enabled) return; 
    if(e.target.closest && e.target.closest('.popup-image')) return; // ignores when user clicks on popup imgs
    spawnImage(e.clientX, e.clientY);
}, true);

// listen for messages from other scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "toggle") {
        enabled = msg.enabled ?? !enabled;
        sendResponse({ enabled });
    } else if (msg.type === "clear") {
        document.querySelectorAll(".popup-image").forEach((el) => el.remove());
        sendResponse({ cleared: true });
    }
});