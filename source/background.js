// Simple phone number validation (replaces libphonenumber-js)
function isValidPhoneNumber(number) {
  // Remove all non-digit characters except +
  const cleaned = number.replace(/[^\d+]/g, '');
  // Valid if it has 7-15 digits (international standard)
  const digitCount = cleaned.replace(/\D/g, '').length;
  return digitCount >= 7 && digitCount <= 15;
}

// Clean and normalize phone number
function cleanPhoneNumber(text) {
  // Remove common formatting characters, keep digits and +
  return text.replace(/[^\d+]/g, '');
}

chrome.runtime.onInstalled.addListener((_reason) => {
  chrome.tabs.create({
    url: 'settings/options.html'
  });
});

chrome.contextMenus.create({
  'id': 'selection-call',
  'title': 'Call %s',
  'contexts': ['selection']
});

chrome.contextMenus.create({
  'id': 'link-call',
  'title': 'Call this phone number',
  'contexts': ['link']
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  chrome.storage.sync.get(['username', 'password', 'enableTimeout', 'http', 'country', 'address', 'outgoingUri'], (config) => {
    if (info.menuItemId === 'selection-call' || info.menuItemId === 'link-call') {
      let number = '';

      if (info.menuItemId === 'selection-call') {
        number = cleanPhoneNumber(info.selectionText);
      } else if (info.menuItemId === 'link-call') {
        if (info.linkUrl.startsWith('tel:')) {
          number = info.linkUrl.substring(4);
        } else if (info.linkUrl.includes('servlet?key=number=')) {
          number = decodeURIComponent(info.linkUrl.substring(info.linkUrl.indexOf('servlet?key=number=') + 'servlet?key=number='.length));
        } else {
          number = info.linkUrl;
        }
      }

      let isValid = true;

      if (!isValidPhoneNumber(number)) {
        isValid = confirm(`The phone number (${number}) you selected isn't a valid number. Would you like to call it anyway?`);
      }

      if (isValid) {
        let callUrl = `${config.http}://${config.username}:${encodeURIComponent(config.password)}@${config.address}/servlet?key=number=${encodeURIComponent(number)}`;
        if (config.outgoingUri) {
          callUrl += `&outgoing_uri=${encodeURIComponent(config.outgoingUri)}`;
        }
        chrome.tabs.create({
          url: callUrl,
          active: false
        }, (tab) => {
          if (config.enableTimeout) {
            setTimeout(() => chrome.tabs.remove(tab.id), 1000);
          }
        });
      }
    }
  });
});
