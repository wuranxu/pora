const {
  ipcRenderer
} = require("electron");

// ειζΆι΄
window.sendMessage = ipcRenderer.send

window.receiveMessage = ipcRenderer.on;

window.ipcRenderer = ipcRenderer;


