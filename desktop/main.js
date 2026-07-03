const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const { appUrl } = require('./config');

const SESSION_PARTITION = 'persist:managex';

let mainWindow = null;
let appIsQuitting = false;

function errorPage(message) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(`
    <body style="font-family:system-ui;padding:40px;background:#f4f6f9;color:#1e293b">
      <h2>ManageX could not connect</h2>
      <p>${message}</p>
      <p>Check your internet connection, then quit (Cmd+Q) and open again.</p>
      <p style="color:#64748b;font-size:13px">Server: ${appUrl}</p>
    </body>
  `)}`;
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'ManageX',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      partition: SESSION_PARTITION,
    },
  });

  mainWindow.loadURL(appUrl);

  mainWindow.webContents.on('did-fail-load', (_event, code, desc) => {
    console.error('[ManageX] Page failed to load:', code, desc);
    mainWindow.loadURL(errorPage(`Could not reach the server (${code}: ${desc}).`));
    mainWindow.show();
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (e) => {
    if (!appIsQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
  return mainWindow;
}

function showMainWindow() {
  createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', showMainWindow);

  app.whenReady().then(async () => {
    await session.fromPartition(SESSION_PARTITION).clearStorageData({
      storages: ['serviceworkers', 'cachestorage'],
    });
    createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (!mainWindow) createWindow();
    else showMainWindow();
  });

  app.on('before-quit', () => {
    appIsQuitting = true;
  });
}
