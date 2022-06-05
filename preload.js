const {
  ipcRenderer
} = require("electron");

// 发送时间
window.sendMessage = ipcRenderer.send

window.receiveMessage = ipcRenderer.on;

window.ipcRenderer = ipcRenderer;


