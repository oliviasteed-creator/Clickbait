const enabledEl = document.getElementById("enabled");
const volumeEl = document.getElementById("volume");
const soundPackEl = document.getElementById("soundPack");
const imagePackEl = document.getElementById("imagePack");
const clearBtn = document.getElementById("clear");
const statusEl = document.getElementById("status");

function setStatus(text, isError = false) {
    statusEl.textContent = text || "";
    statusEl.style.color = isError ? "#c00" : "";
}

chrome.storage.local.get(
    { enabled: true, volume: 0.4, soundPack: "synth", imagePack: "mixed" },
    (data) => {
        enabledEl.checked = data.enabled;
        volumeEl.value = data.volume;
        soundPackEl.value = data.soundPack;
        imagePackEl.value = data.imagePack;
    }
);

enabledEl.addEventListener("change", () => {
    const enabled = enabledEl.checked;
    chrome.storage.local.set({ enabled });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://")) {
            setStatus("Can't control this page", true);
            return;
        }
        chrome.tabs.sendMessage(tab.id, { type: "toggle", enabled }, () => {
            if (chrome.runtime.lastError) {
                setStatus(chrome.runtime.lastError.message, true);
            } else {
                setStatus(enabled ? "Enabled" : "Disabled");
            }
        });
    });
});

volumeEl.addEventListener("input", () => {
    chrome.storage.local.set({ volume: Number(volumeEl.value) });
});

soundPackEl.addEventListener("change", () => {
    chrome.storage.local.set({ soundPack: soundPackEl.value });
});

imagePackEl.addEventListener("change", () => {
    chrome.storage.local.set({ imagePack: imagePackEl.value });
});

clearBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://")) {
            setStatus("Can't clear on this page", true);
            return;
        }
        chrome.tabs.sendMessage(tab.id, { type: "clear" }, () => {
            if (chrome.runtime.lastError) {
                setStatus(chrome.runtime.lastError.message, true);
            } else {
                setStatus("Cleared");
            }
        });
    });
});