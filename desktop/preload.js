const { contextBridge } = require('electron');
const { appUrl } = require('./config');

contextBridge.exposeInMainWorld('managexDesktop', {
  isDesktop: true,
  platform: process.platform,
  serverUrl: appUrl,
});
