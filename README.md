# Random Auto Refresher 🚀

A completely free and private Google Chrome extension (built on **Manifest V3**) designed for auto-refreshing tabs with customizable intervals and advanced user activity simulation.

## ✨ Features

- 🔄 **Time Ranges (Randomization):** Set a fixed time or a customized range (e.g., 50 to 70 seconds) with an automatic random offset calculation for each individual refresh cycle.
- 🕵️ **Smart Activity Simulation (Anti-Bot Protection):** An intelligent tracker monitors real human behavior. If a tab is left idle, the extension automatically simulates micro-scrolls, mouse pointer movements, and safe clicks to mimic organic traffic for analytics counters.
- ⏱️ **Visual Countdown Timer:** View remaining seconds directly on the extension's badge icon. The display instantly adapts to whichever tab you are currently viewing. The badge color switches to a warning red 5 seconds before the refresh.
- 📊 **Interactive Task Manager:** Includes a dedicated "Active Tabs" dashboard where you can see all active pages, individual countdowns, and independently pause, resume, or completely stop specific tasks or all processes at once.
- 📜 **Local History & Quick Start:** Saves past sessions (URLs and time ranges) in persistent local browser storage. Allows you to instantly relaunch any configuration in a new tab with a single click.
- 🔒 **100% Privacy:** Runs entirely locally inside your browser. No external trackers, no databases, and absolutely no data sharing with third parties.

## 🛠️ Installation Guide (Developer Mode)

Since this extension runs locally and skips the Chrome Web Store registration, setup takes less than a minute:

- [random-refresher.zip](https://github.com/PavelNazaro/random-auto-refresher-chrome-plugin/blob/main/random-refresher.zip) — zip with all project files. Just download in and add into your chrome.

Or.

You can also download all 4 files below and put them in the same folder and add into your chrome:

1. **Download the source code** as a ZIP archive and extract it into a local folder (e.g., `random-auto-refresher`).
2. Open Google Chrome and navigate to: `chrome://extensions/`
3. In the top-right corner, toggle the **"Developer mode"** switch on.
4. In the top-left corner, click the **"Load unpacked"** button.
5. Select the folder containing your project files (`manifest.json`, `popup.html`, `popup.js`, `background.js`).
6. Done! Pin the extension to your browser toolbar for quick access.

## 📁 Project Structure

- `manifest.json` — Configuration file (Manifest V3 metadata and permissions)
- `popup.html` — Layout and styling for the control panel
- `popup.js` — Core interface logic, monitoring timers, and history rendering
- `background.js` — Service Worker managing background intervals, tab states, and activity injections

---
Developed by **PavelNazaro**
