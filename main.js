const path = require('path');
const unusedFilename = require('unused-filename');
const { app, BrowserWindow, ipcMain, webContents, session } = require('electron');
const { ElectronBlocker } = require('@cliqz/adblocker-electron');
const fetch = require('cross-fetch');
const isDev = require('electron-is-dev');
const Store = require('electron-store');

let os = process.platform;
const store = new Store();
global.draggingTab = { status: null,
                       createdTab: null, // windowID where tab was created
                       originWindowID: -1,
                       offset: 0,
                       url: null,
                       title: null,
                       favicon: null
                     };

global.dir = { downloads: app.getPath('downloads'), saveImagePath: '' }

app.requestSingleInstanceLock()

app.on('before-quit', function() {
    webContents.getAllWebContents().forEach(wc => {
        wc.send("savestate")
    })
});

app.on('window-all-closed', function() {
    app.quit();
});

app.on('ready', function() {
    createNewWindow(false)
});

ipcMain.on('open-window', (event, incog) => {
    createNewWindow(incog)
})

// Sends an ipc message to all windows
ipcMain.on('broadcast', (event, message) => {
    webContents.getAllWebContents().forEach(wc => {
        wc.send(message)
    })
})

ipcMain.on('set-downloads-directory', (event, path) => {
    dir.downloads = path;
})

ipcMain.on('set-save-image-path', (event, path) => {
    dir.saveImagePath = path;
})

function createNewWindow(private) {
    let window;
    const win32 = os === "win32";

    const bounds = store.get('window_pos')
    const properties = {
        titleBarStyle: 'hidden',
        show: false,
        frame: false,
        autoHideMenuBar: win32 ? true : undefined,
        useContentSize: true,
        minWidth: 320,
        minHeight: 38,
        width: (bounds && bounds.width ? bounds.width : undefined),
        height: (bounds && bounds.height ? bounds.height : undefined),
        x: (bounds && bounds.x ? bounds.x : undefined),
        y: (bounds && bounds.y ? bounds.y : undefined),
        webPreferences: { 
            plugins: true, 
            nodeIntegration: true, 
            webviewTag: true },
        icon: win32 ? __dirname + '/img/icon.icns' : undefined 
    }

    window = new BrowserWindow(properties);
    
    // This method is only available after version 4.0.0
    if (os === "darwin" && compareVersion(process.versions.electron, "4.0.0")) {
        window.setWindowButtonVisibility(false);
    }

    ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
        blocker.enableBlockingInSession(session.defaultSession);
    });

    window.webContents.session.on('will-download', (event, item, wc) => {
        let filePath;
        const filename = item.getFilename();
        const name = path.extname(filename) ? filename : getFilenameFromMime(filename, item.getMimeType());
        filePath = dir.saveImagePath != "" ? dir.saveImagePath : unusedFilename.sync(path.join(dir.downloads, name));
        if (filePath == null) {
            event.preventDefault();
        }
        saveImagePath = "";
        item.setSavePath(filePath);
    });

    window.on('close', () => {
        store.set('window_pos', window.getBounds())
    });

    window.loadURL('file://' + __dirname + '/browser.html');
    require('./menu.js')(window);
	if (isDev) {
		window.openDevTools();
	}
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
