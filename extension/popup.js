// Popup logic: loads/saves preferences in chrome.storage and sends
// messages to the content script running in the current tab.
//
// Messages the content script understands (see content.js):
//   { type: "toggle", enabled: true/false }  -> replies { enabled }
//   { type: "clear" }                        -> replies { cleared: true }

// Every preference and its default. Each key matches an element id in popup.html.
const DEFAULTS = {
    enabled: true,
    volume: 0.5,
    soundPack: "synth",
    imagePack: "mixed",
};

const statusEl = document.getElementById("status");

function setStatus(text) {
    statusEl.textContent = text;
}

// Send a message to the content script in the active tab.
async function sendToTab(message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id === undefined) throw new Error("No active tab");
    return chrome.tabs.sendMessage(tab.id, message);
}

const UNREACHABLE = "Can't reach this page. Open a normal website and refresh it.";

async function applyEnabled(enabled) {
    try {
        const reply = await sendToTab({ type: "toggle", enabled });
        setStatus(reply && reply.enabled ? "Effects are ON 🎉" : "Effects are off");
    } catch {
        setStatus(UNREACHABLE);
    }
}

async function init() {
    const settings = await chrome.storage.local.get(DEFAULTS);

    for (const key of Object.keys(DEFAULTS)) {
        const el = document.getElementById(key);
        if (!el) continue;

        // Show the saved value.
        if (el.type === "checkbox") el.checked = settings[key];
        else el.value = settings[key];

        // Save whenever it changes.
        el.addEventListener("input", async () => {
            const value =
                el.type === "checkbox" ? el.checked :
                el.type === "range" ? Number(el.value) :
                el.value;
            await chrome.storage.local.set({ [key]: value });
            if (key === "enabled") applyEnabled(value);
        });
    }

    // Make the current tab match the saved on/off setting.
    applyEnabled(settings.enabled);

    document.getElementById("clear").addEventListener("click", async () => {
        try {
            await sendToTab({ type: "clear" });
            setStatus("Cleared 🧹");
        } catch {
            setStatus(UNREACHABLE);
        }
    });

    // ---------- Stupid stats ----------
    renderStats();
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && (changes.count || changes.sites)) renderStats();
    });
    document.getElementById("resetStats").addEventListener("click", async () => {
        await chrome.storage.local.set({ count: 0, sites: {} });
        setStatus("Stats wiped. Your sins are forgiven 🙏");
    });
}

// Completely made-up numbers, presented with total confidence.
const KCAL_PER_CREATURE = 0.0731;   // "lab tested"
const KCAL_PER_GRAPE = 3.4;

const RANKS = [
    [0, "Innocent Bystander"],
    [1, "Curious Clicker"],
    [10, "Cat Enjoyer"],
    [25, "Menace to Society"],
    [50, "Certified Chaos Agent"],
    [100, "Feline Overlord"],
    [250, "Click Deity"],
    [500, "Please Touch Grass"],
];

async function renderStats() {
    const { count, sites } = await chrome.storage.local.get({ count: 0, sites: {} });
    const kcal = count * KCAL_PER_CREATURE;

    document.getElementById("statCount").textContent = count.toLocaleString();
    document.getElementById("statCalories").textContent = kcal.toFixed(3) + " kcal";
    document.getElementById("statGrapes").textContent = (kcal / KCAL_PER_GRAPE).toFixed(4) + " grapes";

    const top = Object.entries(sites).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("statSite").textContent = top ? `${top[0]} (${top[1]})` : "none yet";

    const rank = RANKS.filter(([min]) => count >= min).pop()[1];
    document.getElementById("statRank").textContent = "Rank: " + rank;
}

init();
