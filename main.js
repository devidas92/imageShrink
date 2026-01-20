'use strict';
const path = require('path');
const os = require('os')
const log = require('electron-log'); // "C:\Users\USER\AppData\Roaming\image-shrink\logs\main.log"

const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');

// Environment checks
const isDev = !app.isPackaged;
const isMac = process.platform === 'darwin';

let mainWindow;
let aboutWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: isDev,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'assets/icons/Icon_256x256.png'),
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'app/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createAboutWindow() {
  if (aboutWindow) {
    aboutWindow.focus();
    return;
  }

  aboutWindow = new BrowserWindow({
    width: 300,
    height: 300,
    resizable: false,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'assets/icons/Icon_256x256.png')
  });

  aboutWindow.loadFile(path.join(__dirname, 'app/about.html'));

  aboutWindow.on('closed', () => {
    aboutWindow = null;
  });
}

const menuTemplate = [
  ...(isMac
    ? [{
      label: app.name,
      submenu: [
        {
          label: 'About',
          click: createAboutWindow
        }
      ]
    }]
    : []),

  { role: 'fileMenu' },

  {
    label: 'Help',
    submenu: [
      {
        label: 'About',
        click: createAboutWindow
      }
    ]
  },

  ...(isDev
    ? [{
      label: 'Developer',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'separator' },
        { role: 'toggledevtools' }
      ]
    }]
    : [])
];

app.whenReady().then(() => {
  createMainWindow();

  const mainMenu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(mainMenu);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

ipcMain.on('image:minimize', (e, data) => {
  data.dest = path.join(os.homedir(), 'ImageShrink')
  shrinkImage(data)
})

async function shrinkImage({ imgPath, quality, dest }) {
  const { default: imagemin } = await import('imagemin');
  const { default: imageminMozjpeg } = await import('imagemin-mozjpeg');
  const { default: imageminPngquant } = await import('imagemin-pngquant');
  const { default: slash } = await import('slash');


  try {
    const pngQuality = quality / 100;
    const files = await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [imageminMozjpeg({ quality }),
      imageminPngquant({ quality: [pngQuality, pngQuality] })
      ]
    });
    log.info(files);
    shell.openPath(dest)
    mainWindow.webContents.send('image:done');
  } catch (error) {
    log.error(error)
  }

}


app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
