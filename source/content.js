renderPhoneNumbers();
injectConfirmDialog();

function injectConfirmDialog() {
  // Inject CSS for the dialog
  const style = document.createElement('style');
  style.textContent = `
    .sippy-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .sippy-dialog {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      min-width: 320px;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: sippy-slide-in 0.2s ease-out;
    }
    @keyframes sippy-slide-in {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    .sippy-dialog-title {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sippy-dialog-title::before {
      content: '📞';
      font-size: 24px;
    }
    .sippy-dialog-number {
      font-size: 22px;
      font-weight: 700;
      color: #0066cc;
      margin: 16px 0;
      padding: 12px;
      background: #f0f7ff;
      border-radius: 8px;
      text-align: center;
      word-break: break-all;
    }
    .sippy-dialog-buttons {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }
    .sippy-dialog-btn {
      flex: 1;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .sippy-dialog-btn-cancel {
      background: #e5e5e5;
      color: #333;
    }
    .sippy-dialog-btn-cancel:hover {
      background: #d5d5d5;
    }
    .sippy-dialog-btn-call {
      background: #28a745;
      color: #fff;
    }
    .sippy-dialog-btn-call:hover {
      background: #218838;
    }
  `;
  document.head.appendChild(style);
}

function showCallConfirmDialog(phoneNumber) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'sippy-dialog-overlay';

    overlay.innerHTML = `
      <div class="sippy-dialog">
        <h2 class="sippy-dialog-title">Anruf starten?</h2>
        <div class="sippy-dialog-number">${phoneNumber}</div>
        <div class="sippy-dialog-buttons">
          <button class="sippy-dialog-btn sippy-dialog-btn-cancel">Abbrechen</button>
          <button class="sippy-dialog-btn sippy-dialog-btn-call">Anrufen</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('.sippy-dialog-btn-cancel');
    const callBtn = overlay.querySelector('.sippy-dialog-btn-call');

    function cleanup(result) {
      overlay.remove();
      resolve(result);
    }

    cancelBtn.addEventListener('click', () => cleanup(false));
    callBtn.addEventListener('click', () => cleanup(true));

    // Close on overlay click (outside dialog)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });

    // Close on Escape key
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleKeydown);
        cleanup(false);
      } else if (e.key === 'Enter') {
        document.removeEventListener('keydown', handleKeydown);
        cleanup(true);
      }
    };
    document.addEventListener('keydown', handleKeydown);

    // Focus the call button
    callBtn.focus();
  });
}

async function renderPhoneNumbers() {
  const clickConfiguration = await getAllStorageSyncData();

  const formats = [
    '(xxx) xxx-xxxx',
    '(xxx)xxx-xxxx',
    '+xx xx xx xx xx',
    '+xx xxx xx xx xx',
    '+xx(0)xx/xx-xx-xx',
    '+xx(0)xxx/xx-xx-xx',
    '+xx/xx-xx-xx',
    '+x{10,15}',
    'x{2,3}+x{9,15}',
    'x xx xx xx xx',
    'xx xx xx xx xx',
    'xx+xxxxxxxxxx',
    'xxx-xxx-xxxx',
    'xxx/xx-xx-xx',
    'xxx+xxxxxxxxxx',
    'x{9,14}',
  ];

  // Create the search string by merging all patterns listed above and normalizing its content
  const str = formats.join('|')
    .replace(/[()+]/g, '\\$&')
    .replace(/-/g, '[-. ]')
    .replace(/(^|[|])x/g, '$1\\bx')
    .replace(/x($|[|])/g, 'x\\b$1')
    .replace(/x/g, '\\d')
  ;

  let node;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);

  while (node = walker.nextNode()) {
    // Ignore form and script tags
    if (node.parentNode.tagName.search(/SCRIPT|SELECT|OPTION|BUTTON|TEXTAREA|LABEL/) === -1) {
      if (node.parentNode.tagName === 'A' && node.parentNode.href.includes('tel:')) {
        const telNumber = node.parentNode.href.slice(4).replace(/\+?[^\d+]/g, '');
        const displayNumber = node.textContent || telNumber;
        node.parentNode.setAttribute('href', '#');
        node.parentNode.classList.add('sippy-click-touched');
        node.parentNode.removeAttribute('target');
        node.parentNode.addEventListener('click', async (e) => {
          e.preventDefault();
          const confirmed = await showCallConfirmDialog(displayNumber);
          if (confirmed) {
            window.open(callableUri(clickConfiguration, telNumber), '_blank');
          }
        });
      } else {
        // Split elements between phone and normal text
        const regex = RegExp('(' + str + ')', '');
        const nodeCompartments = node.nodeValue.split(regex);

        while (nodeCompartments.length > 1) {
          const text = nodeCompartments.shift();

          if (text.length) {
            // Insert new text node for normal text
            node.parentNode.insertBefore(document.createTextNode(text), node);
          }

          // Create an anchor element for phone numbers
          const phoneNumber = nodeCompartments.shift();
          const cleanNumber = phoneNumber.replace(/\+?[^\d+]/g, '');
          const anchor = document.createElement('a');
          anchor.setAttribute('href', '#');
          anchor.setAttribute('class', 'sippy-click-touched');
          anchor.style.cursor = 'pointer';
          anchor.textContent = phoneNumber;

          // Add click handler with confirmation dialog
          anchor.addEventListener('click', async (e) => {
            e.preventDefault();
            const confirmed = await showCallConfirmDialog(phoneNumber);
            if (confirmed) {
              window.open(callableUri(clickConfiguration, cleanNumber), '_blank');
            }
          });

          // Re-insert phonenumber
          node.parentNode.insertBefore(anchor, node);
        }

        // reduce the original node to the ending non-phone part
        node.nodeValue = nodeCompartments[0];
      }
    };
  }
}

function getAllStorageSyncData() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, (items) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }

      resolve(items);
    });
  });
}

function callableUri(config, number) {
  return `${config.http}://${config.username}:${encodeURIComponent(config.password)}@${config.address}/servlet?key=number=${encodeURIComponent(number)}`;
}
