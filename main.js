const fs = require('fs');
// const { settings } = require('./js/settings-db.js');
const { app, BrowserWindow } = require('electron');
require('electron-dl')();

let mainWindow;
var isWin = process.platform === "win32";
var downloadId = 0;

app.on('window-all-closed', function() {
    app.quit();
});

app.on('ready', function() {
    // settings.onLoad(() => {
    //     mainWindow.show();
    // });
    if (isWin) {
        mainWindow = new BrowserWindow({ titleBarStyle: 'customButtonsOnHover', show: false, frame: false, autoHideMenuBar: true, useContentSize: true, minWidth: 320, minHeight: 38, webPreferences: { plugins: true } });
    } else {
        mainWindow = new BrowserWindow({ titleBarStyle: 'customButtonsOnHover', show: false, frame: false, useContentSize: true, minWidth: 320, minHeight: 38, webPreferences: { plugins: true } });
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