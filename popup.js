document.addEventListener('DOMContentLoaded', async () => {
  const minInput = document.getElementById('minTime');
  const maxInput = document.getElementById('maxTime');
  const maxField = document.getElementById('maxField');
  const timeLabel = document.getElementById('timeLabel');
  const rangeCheckbox = document.getElementById('rangeTime');
  const activityCheckbox = document.getElementById('simulateUserActivity');
  const startBtn = document.getElementById('start');
  const pauseBtn = document.getElementById('pause');
  const stopBtn = document.getElementById('stop');
  const stopAllBtn = document.getElementById('stopAll');
  const historyList = document.getElementById('historyList');
  const activeList = document.getElementById('activeList');
  const activeSectionTitle = document.getElementById('activeSectionTitle');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  rangeCheckbox.addEventListener('change', () => {
    if (rangeCheckbox.checked) {
      maxField.style.display = "flex";
      timeLabel.innerText = "Мин. (сек):";
    } else {
      maxField.style.display = "none";
      timeLabel.innerText = "Время (сек):";
    }
  });

  function updateControlsUI(state) {
    if (state === "running") {
      startBtn.style.display = "none";
      pauseBtn.style.display = "block";
      stopBtn.style.display = "block";
    } else if (state === "paused") {
      startBtn.style.display = "block";
      startBtn.innerText = "Продолжить";
      startBtn.style.backgroundColor = "#008CBA";
      pauseBtn.style.display = "none";
      stopBtn.style.display = "block";
    } else {
      startBtn.style.display = "block";
      startBtn.innerText = "Запустить";
      startBtn.style.backgroundColor = "#4CAF50";
      pauseBtn.style.display = "none";
      stopBtn.style.display = "none";
    }
  }

  if (tab) {
    chrome.storage.local.get([`tab_${tab.id}`], (result) => {
      const config = result[`tab_${tab.id}`];
      if (config) {
        minInput.value = config.min;
        maxInput.value = config.max;
        activityCheckbox.checked = !!config.simulateActivity;
        if (config.min !== config.max) {
          rangeCheckbox.checked = true;
          maxField.style.display = "flex";
          timeLabel.innerText = "Мин. (сек):";
        }
        updateControlsUI(config.active ? "running" : (config.paused ? "paused" : "stopped"));
      } else {
        updateControlsUI("stopped");
      }
    });
  }

  function refreshActiveTabsMonitor() {
    chrome.runtime.sendMessage({ action: "get_active_states" }, (response) => {
      if (!response || !response.activeTabs) return;
      
      const { activeTabs, secondsLeftMap, pausedTabs } = response;
      activeSectionTitle.innerText = `Активные вкладки: ${activeTabs.length}`;
      
      stopAllBtn.style.display = activeTabs.length > 0 ? 'block' : 'none';
      activeList.innerHTML = activeTabs.length === 0 ? '<div style="color:#999; text-align:center; padding: 5px;">Нет активных процессов</div>' : '';
      
      activeTabs.forEach(t => {
        const isPaused = pausedTabs.includes(t.id);
        const div = document.createElement('div');
        div.className = `active-item ${isPaused ? 'paused' : ''}`;
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'active-title';
        titleSpan.innerText = t.title || t.url;
        titleSpan.title = t.url;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'actions-wrapper';
        
        const timerSpan = document.createElement('span');
        timerSpan.className = `active-timer ${isPaused ? 'paused' : ''}`;
        
        if (isPaused) {
          timerSpan.innerText = 'II';
        } else {
          const left = secondsLeftMap[t.id];
          timerSpan.innerText = left !== undefined ? `${left}s` : '--';
        }
        
        wrapper.appendChild(timerSpan);

        if (isPaused) {
          const resumeBtnMini = document.createElement('button');
          resumeBtnMini.className = 'action-mini-btn btn-start';
          resumeBtnMini.innerText = 'Пуск';
          resumeBtnMini.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: "resume", tabId: t.id });
            if (tab && tab.id === t.id) updateControlsUI("running");
            setTimeout(refreshActiveTabsMonitor, 100);
          });
          wrapper.appendChild(resumeBtnMini);
        } else {
          const pauseBtnMini = document.createElement('button');
          pauseBtnMini.className = 'action-mini-btn btn-pause';
          pauseBtnMini.innerText = 'Пауза';
          pauseBtnMini.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: "pause", tabId: t.id });
            if (tab && tab.id === t.id) updateControlsUI("paused");
            setTimeout(refreshActiveTabsMonitor, 100);
          });
          wrapper.appendChild(pauseBtnMini);
        }

        const stopBtnMini = document.createElement('button');
        stopBtnMini.className = 'action-mini-btn btn-stop';
        stopBtnMini.innerText = 'Стоп';
        stopBtnMini.addEventListener('click', () => {
          chrome.runtime.sendMessage({ action: "stop", tabId: t.id });
          if (tab && tab.id === t.id) updateControlsUI("stopped");
          setTimeout(refreshActiveTabsMonitor, 100);
        });
        wrapper.appendChild(stopBtnMini);
        
        div.appendChild(titleSpan);
        div.appendChild(wrapper);
        activeList.appendChild(div);
      });
    });
  }

  function renderHistory() {
    chrome.storage.local.get(['history'], (result) => {
      const history = result.history || [];
      historyList.innerHTML = history.length === 0 ? '<div style="color:#999; text-align:center; padding: 10px;">История пуста</div>' : '';
      
      history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const info = document.createElement('div');
        info.className = 'history-info';
        const displayTime = item.min === item.max ? `${item.min}с` : `${item.min}-${item.max}с`;
        info.innerHTML = `<a class="history-url" href="${item.url}" target="_blank" title="${item.url}">${item.title || item.url}</a>` +
                         `<span style="color:#666;">Время: ${displayTime}</span>`;
        
        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'actions-wrapper';

        const startBtnNew = document.createElement('button');
        startBtnNew.className = 'action-mini-btn btn-start';
        startBtnNew.innerText = 'Старт';
        startBtnNew.addEventListener('click', () => {
          chrome.runtime.sendMessage({ action: "quick_start", url: item.url, min: item.min, max: item.max, simulateActivity: item.simulateActivity });
          setTimeout(refreshActiveTabsMonitor, 200);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-mini-btn btn-delete';
        deleteBtn.innerText = '✕';
        deleteBtn.addEventListener('click', () => removeHistoryItem(index));

        actionsWrapper.appendChild(startBtnNew);
        actionsWrapper.appendChild(deleteBtn);
        div.appendChild(info);
        div.appendChild(actionsWrapper);
        historyList.appendChild(div);
      });
    });
  }

  function removeHistoryItem(index) {
    chrome.storage.local.get(['history'], (result) => {
      let history = result.history || [];
      history.splice(index, 1);
      chrome.storage.local.set({ history }, renderHistory);
    });
  }

  renderHistory();
  refreshActiveTabsMonitor();
  
  const monitorInterval = setInterval(refreshActiveTabsMonitor, 1000);
  window.addEventListener('unload', () => clearInterval(monitorInterval));

  if (tab) {
    startBtn.addEventListener('click', () => {
      const min = parseInt(minInput.value, 10);
      const max = rangeCheckbox.checked ? parseInt(maxInput.value, 10) : min;
      const simulateActivity = activityCheckbox.checked;
      
      if (min > max) { alert("Минимум не может быть больше максимума!"); return; }

      chrome.storage.local.get([`tab_${tab.id}`], (result) => {
        const prev = result[`tab_${tab.id}`];
        if (prev && prev.paused) {
          chrome.runtime.sendMessage({ action: "resume", tabId: tab.id });
        } else {
          chrome.storage.local.set({ [`tab_${tab.id}`]: { active: true, paused: false, min, max, simulateActivity } }, () => {
            chrome.runtime.sendMessage({ action: "start", tabId: tab.id });
            saveToHistory(tab.url, tab.title, min, max, simulateActivity);
          });
        }
        updateControlsUI("running");
        setTimeout(refreshActiveTabsMonitor, 100);
      });
    });

    pauseBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: "pause", tabId: tab.id });
      updateControlsUI("paused");
      setTimeout(refreshActiveTabsMonitor, 100);
    });

    stopBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: "stop", tabId: tab.id });
      updateControlsUI("stopped");
      setTimeout(refreshActiveTabsMonitor, 100);
    });
  }

  stopAllBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "stop_all" }, () => {
      if (tab) updateControlsUI("stopped");
      refreshActiveTabsMonitor();
    });
  });

  function saveToHistory(url, title, min, max, simulateActivity) {
    if (!url || url.startsWith('chrome://')) return;
    chrome.storage.local.get(['history'], (result) => {
      let history = result.history || [];
      history = history.filter(item => item.url !== url);
      history.unshift({ url, title, min, max, simulateActivity });
      if (history.length > 30) history.pop();
      chrome.storage.local.set({ history }, renderHistory);
    });
  }
});
