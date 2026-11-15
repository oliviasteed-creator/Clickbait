const DEFAULT_SETTINGS = {
    enabled: true,
    volume: 0.4,
    soundPack: "synth",
    imagePack: "mixed",
    count: 0
};

chrome.runtime.onInstalled.addListener(async () => {
    const existing = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    const toSet = {};

    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
        if (existing[key] === undefined) {
            toSet[key] = defaultValue;
        }
    }

    if (Object.keys(toSet).length > 0) {
        await chrome.storage.local.set(toSet);
    }

    updateBadge(existing.enabled ?? DEFAULT_SETTINGS.enabled);
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.enabled) {
        updateBadge(changes.enabled.newValue);
    }
});

function updateBadge(isEnabled) {
    chrome.action.setBadgeText({ text: isEnabled ? "" : "OFF" });
    if (!isEnabled) {
        chrome.action.setBadgeBackgroundColor({ color: "#666666" });
    }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "test-fx" || msg.type === "clear") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (!activeTab?.id || activeTab.url?.startsWith("chrome://")) {
                sendResponse({ ok: false, reason: "Restricted page" });
                return;
            }

            chrome.tabs.sendMessage(activeTab.id, msg, (response) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ ok: false, reason: chrome.runtime.lastError.message });
                } else {
                    sendResponse(response ?? { ok: true });
                }
            });
        });
        return true; 
    }
});