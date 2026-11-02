const activeTimers = new Map();
const countdownIntervals = new Map();
const tabSecondsLeft = new Map(); 
const pausedTabStates = new Map();

function getRandomTimeout(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

// Полноценный интеллектуальный генератор активности внутри страницы
function injectAdvancedActivityScript(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      if (window.hasActivitySimulatorInjected) return;
      window.hasActivitySimulatorInjected = true;

      let lastUserInteractionTime = Date.now();

      // Отслеживаем действия реального человека
      const recordInteraction = () => { lastUserInteractionTime = Date.now(); };
      ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, recordInteraction, { passive: true });
      });

      // Цикл случайных микро-активностей
      const runRandomSimulationLoop = () => {
        const timeSinceLastInteraction = Date.now() - lastUserInteractionTime;

        // Если пользователь не трогал страницу более 4 секунд — генерируем активность
        if (timeSinceLastInteraction > 4000) {
          const choice = Math.random();

          if (choice < 0.4) {
            // Имитируем микроскролл
            const amount = Math.floor(Math.random() * 6) + 3;
            window.scrollBy({ top: amount, behavior: 'smooth' });
            setTimeout(() => window.scrollBy({ top: -amount, behavior: 'smooth' }), 250);
          } else if (choice < 0.8) {
            // Имитируем прохождение мыши по элементам (вызов mouseover / mousemove для счетчиков)
            const randomX = Math.floor(Math.random() * window.innerWidth);
            const randomY = Math.floor(Math.random() * window.innerHeight);
            const dummyEvent = new MouseEvent('mousemove', {
              clientX: randomX,
              clientY: randomY,
              bubbles: true
            });
            document.dispatchEvent(dummyEvent);
          } else {
            // Безопасный фейковый клик по свободному месту документа
            const el = document.elementFromPoint(10, 10) || document.body;
            const clickEvent = new MouseEvent('click', { bubbles: true });
            el.dispatchEvent(clickEvent);
          }
        }

        // Планируем следующую микро-активность в случайном окне от 3 до 7 секунд
        setTimeout(runRandomSimulationLoop, Math.floor(Math.random() * 4000) + 3000);
      };

      setTimeout(runRandomSimulationLoop, 3000);
    }
  }).catch(() => {});
}

function updateTabBadge(tabId, secondsLeft, isPaused = false) {
  if (isPaused) {
    chrome.action.setBadgeText({ text: "II", tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#ff9800", tabId: tabId });
  } else if (secondsLeft > 0) {
    chrome.action.setBadgeText({ text: secondsLeft.toString(), tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: secondsLeft < 5 ? "#d9534f" : "#4CAF50", tabId: tabId });
  } else {
    chrome.action.setBadgeText({ text: "", tabId: tabId });
  }
}

function scheduleNextRefresh(tabId) {
  clearTimers(tabId);

  chrome.storage.local.get([`tab_${tabId}`], (result) => {
    const config = result[`tab_${tabId}`];
    if (!config || !config.active) return;

    const ms = getRandomTimeout(config.min, config.max);
    let secondsLeft = Math.floor(ms / 1000);
    
    tabSecondsLeft.set(tabId, secondsLeft);
    updateTabBadge(tabId, secondsLeft);

    const intervalId = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(intervalId);
        tabSecondsLeft.delete(tabId);
        chrome.action.setBadgeText({ text: "", tabId: tabId });
      } else {
        tabSecondsLeft.set(tabId, secondsLeft);
        updateTabBadge(tabId, secondsLeft);
        
        // Постоянная инъекция симулятора на протяжении жизненного цикла таймера
        if (config.simulateActivity && secondsLeft % 5 === 0) {
          injectAdvancedActivityScript(tabId);
        }
      }
    }, 1000);
    
    countdownIntervals.set(tabId, intervalId);

    const timerId = setTimeout(() => {
      chrome.tabs.reload(tabId, () => {
        if (chrome.runtime.lastError) cleanUpTab(tabId);
      });
    }, ms);

    activeTimers.set(tabId, timerId);
  });
}

function pauseTabTimer(tabId) {
  const currentLeft = tabSecondsLeft.get(tabId);
  if (currentLeft !== undefined) pausedTabStates.set(tabId, currentLeft);
  
  if (activeTimers.has(tabId)) clearTimeout(activeTimers.get(tabId));
  if (countdownIntervals.has(tabId)) clearInterval(countdownIntervals.get(tabId));
  
  activeTimers.delete(tabId);
  countdownIntervals.delete(tabId);
  tabSecondsLeft.delete(tabId);

  chrome.storage.local.get([`tab_${tabId}`], (result) => {
    const config = result[`tab_${tabId}`];
    if (config) {
      chrome.storage.local.set({ [`tab_${tabId}`]: { ...config, active: false, paused: true } });
    }
  });
  updateTabBadge(tabId, 0, true);
}

function resumeTabTimer(tabId) {
  chrome.storage.local.get([`tab_${tabId}`], (result) => {
    const config = result[`tab_${tabId}`];
    if (!config) return;

    chrome.storage.local.set({ [`tab_${tabId}`]: { ...config, active: true, paused: false } }, () => {
      let secondsLeft = pausedTabStates.get(tabId) || getRandomTimeout(config.min, config.max) / 1000;
      pausedTabStates.delete(tabId);

      tabSecondsLeft.set(tabId, secondsLeft);
      updateTabBadge(tabId, secondsLeft);

      const intervalId = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
          clearInterval(intervalId);
          tabSecondsLeft.delete(tabId);
          chrome.action.setBadgeText({ text: "", tabId: tabId });
        } else {
          tabSecondsLeft.set(tabId, secondsLeft);
          updateTabBadge(tabId, secondsLeft);
        }
      }, 1000);
      countdownIntervals.set(tabId, intervalId);

      const timerId = setTimeout(() => {
        chrome.tabs.reload(tabId, () => {
          if (chrome.runtime.lastError) cleanUpTab(tabId);
        });
      }, secondsLeft * 1000);

      activeTimers.set(tabId, timerId);
    });
  });
}

function clearTimers(tabId) {
  if (activeTimers.has(tabId)) clearTimeout(activeTimers.get(tabId));
  if (countdownIntervals.has(tabId)) clearInterval(countdownIntervals.get(tabId));
  activeTimers.delete(tabId);
  countdownIntervals.delete(tabId);
  tabSecondsLeft.delete(tabId);
  pausedTabStates.delete(tabId);
}

function cleanUpTab(tabId) {
  clearTimers(tabId);
  chrome.storage.local.remove([`tab_${tabId}`]);
  chrome.action.setBadgeText({ text: "", tabId: tabId });
}

function stopAllActiveTimers(callback) {
  chrome.storage.local.get(null, (allData) => {
    const keysToRemove = [];
    for (const key in allData) {
      if (key.startsWith('tab_')) {
        const tabId = parseInt(key.replace('tab_', ''), 10);
        clearTimers(tabId);
        chrome.action.setBadgeText({ text: "", tabId: tabId });
        keysToRemove.push(key);
      }
    }
    chrome.storage.local.remove(keysToRemove, () => { if (callback) callback(); });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "start") {
    scheduleNextRefresh(message.tabId);
  } else if (message.action === "pause") {
    pauseTabTimer(message.tabId || sender.tab?.id);
  } else if (message.action === "resume") {
    resumeTabTimer(message.tabId);
  } else if (message.action === "stop") {
    cleanUpTab(message.tabId);
  } else if (message.action === "stop_all") {
    stopAllActiveTimers(sendResponse);
    return true;
  } else if (message.action === "quick_start") {
    chrome.tabs.create({ url: message.url, active: true }, (newTab) => {
      if (newTab) {
        chrome.storage.local.set({ [`tab_${newTab.id}`]: { active: true, paused: false, min: message.min, max: message.max, simulateActivity: message.simulateActivity } });
      }
    });
  } else if (message.action === "get_active_states") {
    chrome.storage.local.get(null, (allData) => {
      const activeTabIds = [];
      const pausedTabIds = [];
      for (const key in allData) {
        if (key.startsWith('tab_')) {
          const id = parseInt(key.replace('tab_', ''), 10);
          if (allData[key].active || allData[key].paused) {
            activeTabIds.push(id);
            if (allData[key].paused) pausedTabIds.push(id);
          }
        }
      }

      if (activeTabIds.length === 0) {
        sendResponse({ activeTabs: [], secondsLeftMap: {}, pausedTabs: [] });
      } else {
        chrome.tabs.query({}, (allTabs) => {
          const activeTabsData = allTabs.filter(t => activeTabIds.includes(t.id));
          const secondsLeftObj = {};
          activeTabIds.forEach(id => { secondsLeftObj[id] = tabSecondsLeft.get(id); });
          sendResponse({ activeTabs: activeTabsData, secondsLeftMap: secondsLeftObj, pausedTabs: pausedTabIds });
        });
      }
    });
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.storage.local.get([`tab_${tabId}`], (result) => {
      const config = result[`tab_${tabId}`];
      if (config && config.active && !config.paused) {
        scheduleNextRefresh(tabId);
        if (config.simulateActivity) injectAdvancedActivityScript(tabId);
      }
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => { cleanUpTab(tabId); });
