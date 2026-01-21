// Sanitize phone number - keep only digits, +, *, #
function sanitizePhoneNumber(input) {
  return input.replace(/[^\d+*#]/g, '');
}

// Get config from storage
function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      username: '',
      password: '',
      http: 'http',
      address: '',
      outgoingUri: ''
    }, resolve);
  });
}

// Send command to Yealink phone via background tab
async function sendCommand(key) {
  const config = await getConfig();

  if (!config.address) {
    updateStatus('Keine IP-Adresse konfiguriert', 'error');
    return false;
  }

  const url = `${config.http}://${config.username}:${encodeURIComponent(config.password)}@${config.address}/servlet?key=${key}`;

  // Open tab in background and close after 1 second (Firefox doesn't allow fetch with embedded credentials)
  chrome.tabs.create({ url: url, active: false }, (tab) => {
    setTimeout(() => chrome.tabs.remove(tab.id), 1000);
  });

  updateStatus('Befehl gesendet: ' + key, 'success');
  return true;
}

// Dial a number via background tab
async function dialNumber(number) {
  const config = await getConfig();

  if (!config.address) {
    updateStatus('Keine IP-Adresse konfiguriert', 'error');
    return false;
  }

  if (!number) {
    updateStatus('Keine Nummer eingegeben', 'error');
    return false;
  }

  // Sanitize phone number
  const cleanNumber = sanitizePhoneNumber(number);
  if (!cleanNumber) {
    updateStatus('Ungültige Nummer', 'error');
    return false;
  }

  let url = `${config.http}://${config.username}:${encodeURIComponent(config.password)}@${config.address}/servlet?key=number=${encodeURIComponent(cleanNumber)}`;

  if (config.outgoingUri) {
    url += `&outgoing_uri=${encodeURIComponent(config.outgoingUri)}`;
  }

  // Open tab in background and close after 1 second
  chrome.tabs.create({ url: url, active: false }, (tab) => {
    setTimeout(() => chrome.tabs.remove(tab.id), 1000);
  });

  updateStatus('Anruf: ' + cleanNumber, 'success');
  return true;
}

// Update status display
function updateStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = 'status';
  if (type === 'error') {
    statusEl.classList.add('error');
  } else if (type === 'success') {
    // Success is default green
  } else {
    statusEl.classList.add('pending');
  }
}

// Check connection on load
async function checkConnection() {
  const config = await getConfig();

  if (!config.address) {
    updateStatus('Bitte IP-Adresse konfigurieren', 'error');
    return;
  }

  updateStatus('Bereit: ' + config.address, 'success');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkConnection();

  // Dial button
  document.getElementById('dialBtn').addEventListener('click', () => {
    const number = document.getElementById('dialNumber').value.trim();
    dialNumber(number);
  });

  // Dial on Enter key
  document.getElementById('dialNumber').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const number = document.getElementById('dialNumber').value.trim();
      dialNumber(number);
    }
  });

  // End call
  document.getElementById('endCallBtn').addEventListener('click', () => {
    sendCommand('CALLEND');
  });

  // Hold
  document.getElementById('holdBtn').addEventListener('click', () => {
    sendCommand('HOLD');
  });

  // Mute
  document.getElementById('muteBtn').addEventListener('click', () => {
    sendCommand('MUTE');
  });

  // Speaker
  document.getElementById('speakerBtn').addEventListener('click', () => {
    sendCommand('SPEAKER');
  });

  // Headset
  document.getElementById('headsetBtn').addEventListener('click', () => {
    sendCommand('HEADSET');
  });

  // Redial
  document.getElementById('redialBtn').addEventListener('click', () => {
    sendCommand('RD');
  });

  // Volume down
  document.getElementById('volDownBtn').addEventListener('click', () => {
    sendCommand('VOLUME_DOWN');
  });

  // Volume up
  document.getElementById('volUpBtn').addEventListener('click', () => {
    sendCommand('VOLUME_UP');
  });

  // DND On
  document.getElementById('dndOnBtn').addEventListener('click', () => {
    sendCommand('DND_ON');
  });

  // DND Off
  document.getElementById('dndOffBtn').addEventListener('click', () => {
    sendCommand('DND_OFF');
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Footer settings link
  document.getElementById('openSettings').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});
