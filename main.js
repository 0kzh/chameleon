const fs = require('fs');
// const { settings } = require('./js/settings-db.js');
const { app, BrowserWindow } = require('electron');
require('electron-dl')();

let mainWindow;
var os = process.platform;
var downloadId = 0;

app.on('window-all-closed', function() {
    app.quit();
});

app.on('ready', function() {
    // settings.onLoad(() => {
    //     mainWindow.show();
    // });
    if (os === "win32") {
        mainWindow = new BrowserWindow({ titleBarStyle: 'hidden', show: false, frame: false, autoHideMenuBar: true, useContentSize: true, minWidth: 320, minHeight: 38, webPreferences: { plugins: true } });
    } else {
        mainWindow = new BrowserWindow({ titleBarStyle: 'hidden', show: false, frame: false, useContentSize: true, minWidth: 320, minHeight: 38, webPreferences: { plugins: true } });
    }
    // This method is only available in the 4.0.0 nightly pre-releases
    if (os === "darwin" && process.versions.electron.includes("4.0.0")) {
        mainWindow.setWindowButtonVisibility(false);
    }
    mainWindow.loadURL('file://' + __dirname + '/browser.html');
    //add extensions
    // BrowserWindow.addDevToolsExtension('extensions/DisableAutoplay');

    //removes .css files (style tags not included)
    // const ses = mainWindow.webContents.session
    // ses.webRequest.onBeforeRequest({urls: ['https://*/*.css', 'http://*/*.css']}, function(details, callback) {
    //   callback({cancel: true});
    // });
    require('./menu.js')(mainWindow);
    mainWindow.openDevTools();
    // mainWindow.maximize();
    mainWindow.show()
});

function onDownloadStarted(item){
    mainWindow.webContents.send('download' , {action: "start",
                                              name: item.getFilename(),
                                              totalSize: item.getTotalBytes(),
                                              saveLocation: item.getSavePath()});
    console.log(item.getETag());
}

function onDownloadProgress(item){
  console.log(item);
    // mainWindow.webContents.send('download' , {action: "progress",
    //                                           downloadedSize: item.getReceivedBytes(),
    //                                           timestamp: item.getLastModifiedTime()});  
}