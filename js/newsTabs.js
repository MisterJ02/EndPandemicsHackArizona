window.switchNewsTab = function(tab) {
  const whoPanel = document.getElementById('who-panel');
  const cdcPanel = document.getElementById('cdc-panel');
  const buttons = document.querySelectorAll('.tab-btn');

  buttons.forEach(btn => btn.classList.remove('active'));

  if (tab === 'who') {
    whoPanel.classList.add('active');
    cdcPanel.classList.remove('active');

    document.querySelector('[onclick*="who"]').classList.add('active');
  } else {
    cdcPanel.classList.add('active');
    whoPanel.classList.remove('active');

    document.querySelector('[onclick*="cdc"]').classList.add('active');
  }
};