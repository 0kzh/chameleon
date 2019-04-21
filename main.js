const fs = require('fs');
// const { settings } = require('./js/settings-db.js');
const { app, BrowserWindow, ipcMain, webContents } = require('electron');
require('electron-dl')();

var os = process.platform;
var downloadId = 0;
global.draggingTab = { status: null,
                       createdTab: null, // windowID where tab was created
                       originWindowID: -1,
                       offset: 0,
                       url: null,
                       title: null,
                       favicon: null
                     };

app.on('window-all-closed', function() {
    app.quit();
});

app.on('ready', function() {
    createNewWindow(false)
});

ipcMain.on('open-window', (event, private) => {
    createNewWindow(private)
})

// Sends an ipc message to all windows
ipcMain.on('broadcast', (event, message) => {
    webContents.getAllWebContents().forEach(wc => {
        wc.send(message)
    })
})

function createNewWindow(private) {
    let window;
    if (os === "win32") {
        window = new BrowserWindow({ titleBarStyle: 'hidden', show: false, frame: false, autoHideMenuBar: true, useContentSize: true, minWidth: 320, minHeight: 38, webPreferences: { plugins: true } });
    } else {
        window = new BrowserWindow({ titleBarStyle: 'hidden', show: false, frame: false, useContentSize: true, minWidth: 320, minHeight: 38, webPreferences: { plugins: true } });
    }
    // This method is only available after version 4.0.0
    if (os === "darwin" && compareVersion(process.versions.electron, "4.0.0")) {
        window.setWindowButtonVisibility(false);
    }

    window.loadURL('file://' + __dirname + '/browser.html');
    require('./menu.js')(window);
    window.openDevTools();
    window.show()
}

function compareVersion(v1, v2) {
    if (typeof v1 !== 'string') return false;
    if (typeof v2 !== 'string') return false;
    v1 = v1.split('.');
    v2 = v2.split('.');
    const k = Math.min(v1.length, v2.length);
    for (let i = 0; i < k; ++ i) {
        v1[i] = parseInt(v1[i], 10);
        v2[i] = parseInt(v2[i], 10);
        if (v1[i] > v2[i]) return true;
        if (v1[i] < v2[i]) return false;        
    }
    return v1.length == v2.length ? false : (v1.length < v2.length ? false : true);
}