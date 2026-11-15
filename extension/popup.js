(async () => {
    const settings = await FX.getSettings();

    for (const key of Object.keys(FX.DEFAULTS)) {
    const el = document.getElementById(key);
    if (!el) continue;

    if (el.type === "checkbox") el.checked = settings[key];
    else el.value = settings[key];

    el.addEventListener("input", () => {
        const value =
        el.type === "checkbox" ? el.checked :
        el.type === "range" ? Number(el.value) :
        el.value;
        FX.saveSettings({ [key]: value });
    });
    }
})();
