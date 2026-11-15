let enabled = true;
let count = 0;
const MAX_POPUPS = 10;

const MEMES = ["cat_image.jpeg"]

function randomImage() {
    const img = document.createElement("img");
    const choice = MEMES[Math.floor(Math.random() * MEMES.length)];
    img.src = chrome.runtime.getURL("img/" + choice);
    return img;
}

function spawnImage(x,y) {
    if (document.querySelectorAll('.popup-image').length >= MAX_POPUPS) return; // limit the number of popups
    
    const box = document.createElement("div");
    box.className = "popup-image";    
    box.appendChild(randomImage());
    
    // close button here 

}



// event listener for clicks
document.addEventListener("click", (e) => {
    if(!enabled) return; 
    if(e.target.closet && e.target.closest('.popup-image')) return; // ignores when user clicks on popup imgs
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