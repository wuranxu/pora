// main.js

// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut} = require('electron')
const path = require('path')
const fs = require('fs')
const request = require('request');


const renderTree = (filePath, data) => {
  const stats = fs.statSync(filePath)
  if (stats.isFile()) {
    if (path.extname(filePath).toLowerCase() === '.md') {
      data.push({
        title: path.basename(filePath),
        key: filePath,
        isLeaf: true
      })
    }
  } else if (stats.isDirectory()) {
    const children = [];
    data.push({
      title: path.basename(filePath),
      key: filePath,
      children,
    })
    const files = fs.readdirSync(filePath)
    files.forEach(filename => {
      const fileDir = path.join(filePath, filename);
      renderTree(fileDir, children)
    })
  }
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  })

  /*隐藏electron创听的菜单栏*/
  Menu.setApplicationMenu(null)

  // 加载 index.html
  // mainWindow.loadFile(path.join(__dirname, '../build/index.html'))

  // mainWindow.loadURL(url.format({
  //     pathname: path.join(__dirname, './build/index.html'), // 注意这里修改
  //     protocol: 'file:',
  //     slashes: true
  // }))
  // mainWindow.loadURL("http://localhost:8000")
  // mainWindow.webContents.openDevTools()
  mainWindow.loadFile(path.join(__dirname, './poraBuild/index.html'))
  return mainWindow;


// 打开开发工具
  // mainWindow.webContents.openDevTools()
}

// 这段程序将会在 Electron 结束初始化
// 和创建浏览器窗口的时候调用
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(() => {
  const win = createWindow()

  var currentPath;

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  ipcMain.on('open-folder', (event) => {
    dialog.showOpenDialog({properties: ['openFile', 'openDirectory']}).then(filePaths => {
      if (!filePaths.canceled) {
        const treeData = [];
        currentPath = filePaths.filePaths[0];
        renderTree(filePaths.filePaths[0], treeData)
        event.sender.send("read-file", treeData)
      }
    })
  });

  ipcMain.on('create-file', (event, data) => {
    dialog.showSaveDialog({title: "保存文件", properties: ['createDirectory']}).then(filePaths => {
      if (!filePaths.canceled) {
        try {
          const filePath = filePaths.filePath;
          fs.writeFileSync(filePath, data, 'utf8');
          event.sender.send("create-file-callback", null);
        } catch (e) {
          event.sender.send("create-file-callback", e);
        }
      }
    })
  });

  ipcMain.on("rename", (event, data) => {
    try {
      const arr = data.path.split(path.sep)
      arr[arr.length - 1] = data.title
      fs.renameSync(data.path, arr.join(path.sep))
      event.sender.send("refresh", true)
    } catch (e) {
      event.sender.send("refresh", false)
    }
  })

  ipcMain.on("add-file", (event, data) => {
    try {
      const filename = data.path + path.sep + data.title
      fs.writeFileSync(filename, "", 'utf8');
      event.sender.send("refresh", true)
    } catch (e) {
      event.sender.send("refresh", false)
    }
  })

  ipcMain.on("fetch-file", (event, data) => {
    const buffer = fs.readFileSync(data, 'utf8');
    event.sender.send("write-file", buffer)
  })

  ipcMain.on('update-file', (event, data) => {
    fs.writeFileSync(data.file, data.value, 'utf8');
  });

  ipcMain.on("refresh-file", (event, data) => {
    if (currentPath) {
      const treeData = [];
      renderTree(currentPath, treeData)
      event.sender.send("read-file", treeData)
    }
  })

  ipcMain.on("upload-file", (event, data) => {
    uploadFile(event.sender, data)
  })

  globalShortcut.register('Ctrl+S', function () {
    // win.webContents.openDevTools();
    win.webContents.send("save-file-command", null)
  })
})

const uploadFile = (sender, data) => {
  const {line, ch} = data;
  var options = {
    url: 'http://localhost:36677/upload',
    method: 'POST',
  };

  request(options, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const result = JSON.parse(body)
      if (result.success) {
        sender.send("update-image", {line, ch, data: result.result[0]})
        return
      }
    }
    sender.send("update-image", null)
  });
}

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. 也可以拆分成几个文件，然后用 require 导入。
