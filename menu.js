const {Menu} = require('electron');
const electron = require('electron');

const app = electron.app;
var mainWindow;

module.exports = function(window) {
    // because app comes as a parameter, it's the very same you've created in app.js
    mainWindow = window;
}

const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New Tab',
        accelerator: 'CmdOrCtrl+T',
        click: () => { mainWindow.webContents.send('shortcut' , {action:'addTab'}); }
      },
      {
        type: 'separator'
      },
      {
        label: 'Close Window',
        accelerator: 'CmdOrCtrl+Shift+W',
        role: 'close'
      },
      {
        label: 'Close Tab',
        accelerator: 'CmdOrCtrl+W',
        click: () => { mainWindow.webContents.send('shortcut' , {action:'closeTab'}); }
      },
      {
        type: 'separator'
      },
      {
        label: 'Save As',
        accelerator: 'CmdOrCtrl+S',
        click: () => { mainWindow.webContents.send('shortcut', {action: 'savePage'}); }
      },
      {
        label: 'Print',
        accelerator: 'CmdOrCtrl+P',
        click: () => { mainWindow.webContents.send('shortcut', {action: 'printPage'}); }
      },
      {
        label: 'Settings',
        accelerator: 'CmdOrCtrl+,',
        click: () => { mainWindow.webContents.send('shortcut' , {action:'viewSettings'}); }
      },
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        role: 'undo'
      },
      {
        role: 'redo'
      },
      {
        type: 'separator'
      },
      {
        role: 'cut'
      },
      {
        role: 'copy'
      },
      {
        role: 'paste'
      },
      {
        role: 'pasteandmatchstyle'
      },
      {
        role: 'delete'
      },
      {
        role: 'selectall'
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Reload App',
        accelerator: 'CmdOrCtrl+Shift+R',
        click (item, focusedWindow) {
          if (focusedWindow) focusedWindow.reload()
        }
      },
      {
        label: 'Reload Page',
        accelerator: 'CmdOrCtrl+R',
        click: () => { mainWindow.webContents.send('shortcut' , {action:'reloadPage'}); }
      },
      {
        label: 'History',
        accelerator: 'CmdOrCtrl+H',
        click: () => { mainWindow.webContents.send('shortcut' , {action:'viewHistory'}); }
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
         click: () => { mainWindow.webContents.send('shortcut' , {action:'toggleDevTools'}); }
        // click (item, focusedWindow) {
        //   if (focusedWindow) focusedWindow.webContents.toggleDevTools()
        // }
      },
      {
        type: 'separator'
      },
      {
        role: 'resetzoom'
      },
      {
        role: 'zoomin'
      },
      {
        role: 'zoomout'
      },
      {
        type: 'separator'
      },
      {
        role: 'togglefullscreen'
      }
    ]
  },
  {
    role: 'Window',
    submenu: [
      {
        role: 'minimize'
      },
      {
        label: 'Close Window',
        accelerator: 'CmdOrCtrl+Q',
        role: "close"
      },
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click () { require('electron').shell.openExternal('http://electron.atom.io') }
      }
    ]
  }
]

if (process.platform === 'darwin') {
  const name = app.getName()
  template.unshift({
    label: name,
    submenu: [
      {
        role: 'about'
      },
      {
        type: 'separator'
      },
      {
        role: 'services',
        submenu: []
      },
      {
        type: 'separator'
      },
      {
        role: 'hide'
      },
      {
        role: 'hideothers'
      },
      {
        role: 'unhide'
      },
      {
        type: 'separator'
      },
      {
        role: 'quit'
      }
    ]
  })
  // Edit menu.
  template[2].submenu.push(
    {
      type: 'separator'
    },
    {
      label: 'Speech',
      submenu: [
        {
          role: 'startspeaking'
        },
        {
          role: 'stopspeaking'
        }
      ]
    }
  )
  // Window menu.
  template[4].submenu = [
    {
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    },
    {
      label: 'Zoom',
      role: 'zoom'
    },
    {
      type: 'separator'
    },
    {
      label: 'Bring All to Front',
      role: 'front'
    }
  ]
}

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)