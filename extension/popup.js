const APP_URL = 'https://self-reminder.vercel.app';

function openApp(path = '/') {
  chrome.tabs.create({ url: `${APP_URL}${path}` });
  window.close();
}

document.querySelector('#open').addEventListener('click', () => openApp());
document.querySelectorAll('[data-path]').forEach((button) => {
  button.addEventListener('click', () => openApp(button.dataset.path));
});
