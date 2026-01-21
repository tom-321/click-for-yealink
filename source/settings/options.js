function save_options() {
  var username = document.getElementById('username').value || '';
  var password = document.getElementById('password').value || '';
  var enableTimeout = document.getElementById('enableTimeout').checked;
  var enableClickHandler = document.getElementById('enableClickHandler').checked;
  var http = document.getElementById('http').value;
  var country = document.getElementById('country').value;
  var address = document.getElementById('address').value || '';

  let saveSet = { username, enableTimeout, enableClickHandler, http, country, address };

  if (password) {
    saveSet = { username, password, enableTimeout, enableClickHandler, http, country, address };
  }

  chrome.storage.sync.set(saveSet, function () {
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';

    setTimeout(function () {
      status.textContent = '';
    }, 1500);
  });
}

function restore_options() {
  chrome.storage.sync.get({
    username: '',
    password: '',
    enableTimeout: false,
    enableClickHandler: true,
    http: 'http',
    country: 'BE',
    address: ''
  }, function (items) {
    document.getElementById('username').value = items.username;
    document.getElementById('enableTimeout').checked = items.enableTimeout;
    document.getElementById('enableClickHandler').checked = items.enableClickHandler;
    document.getElementById('http').value = items.http;
    document.getElementById('country').value = items.country;
    document.getElementById('address').value = items.address;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  restore_options();
  document.getElementById('copyright-year').textContent = new Date().getFullYear();
});
document.getElementById('save').addEventListener('click', save_options);
