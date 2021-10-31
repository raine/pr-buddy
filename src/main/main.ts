import 'core-js/stable'
import { app, BrowserWindow, shell } from 'electron'
import log from 'electron-log'
import path from 'path'
import querystring from 'querystring'
import 'regenerator-runtime/runtime'
import { InitData } from '../renderer/renderer'
import './api'
import './fix-dev-user-data'
import buildMenu from './menu'
import { getAssetPath, resolveHtmlPath } from './util'
import * as settings from './settings'
import { AppState } from '../renderer/App'
import Debug from 'debug'
import { fileExists } from './fs'
import { HOMEBREW_GIT_PATH } from './git'

// Send `debug` output to /Users/$USER/Library/Logs/PR\ Buddy/main.log (on Mac)
if (process.env.NODE_ENV !== 'development') {
  Debug.enable('pr-buddy:*')
  Debug.log = log.info.bind(log)
}

log.catchErrors({
  showDialog: true
})

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support')
  sourceMapSupport.install()
}

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'

if (isDevelopment) require('electron-debug')()

const installExtensions = async () => {
  const installer = require('electron-devtools-installer')
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS
  const extensions = ['REACT_DEVELOPER_TOOLS']

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log)
}

export const createWindow = async (initData: InitData) => {
  if (isDevelopment) await installExtensions()

  const mainWindow = new BrowserWindow({
    show: true,
    width: 600,
    height: 400,
    minWidth: 360,
    minHeight: 200,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#fff',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 10, y: 7 }
  })

  void mainWindow.loadURL(
    resolveHtmlPath('index.html') +
      '?' +
      querystring.stringify({ initData: JSON.stringify(initData) })
  )

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) throw new Error('"mainWindow" is not defined')
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  mainWindow.on('close', async () => {
    const { repositoryPath }: AppState =
      await mainWindow.webContents.executeJavaScript('window.appState')

    if (repositoryPath) {
      await settings.setOne('lastRepositoryPath', repositoryPath)
    }
  })

  buildMenu(mainWindow)

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault()
    void shell.openExternal(url)
  })
}

// When quitting, save the last opened repo to be opened in next start
app.on('before-quit', async () => {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) {
    const { repositoryPath }: AppState =
      await windows[0].webContents.executeJavaScript('window.appState')

    if (repositoryPath) {
      settings.setOneSync('lastRepositoryPath', repositoryPath)
    }
  }
})

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

async function onAppReady(app: Electron.App) {
  const { lastRepositoryPath, gitBinPath } = await settings.get()

  // With prod version of the app, on mac, child_process will use default git
  // from /usr/bin/git. Homebrew version of git is likely newer and has more
  // compatible output with the app so prefer it.
  if (!gitBinPath && (await fileExists(HOMEBREW_GIT_PATH))) {
    await settings.setOne('gitBinPath', '/usr/local/bin/git')
  }

  void createWindow({
    repositoryPath: lastRepositoryPath
  })

  app.on('activate', async () => {
    const windows = BrowserWindow.getAllWindows()
    if (!windows.length) {
      const { lastRepositoryPath } = await settings.get()
      void createWindow({ repositoryPath: lastRepositoryPath })
    }
  })
}

// electron-log will catch unhandled rejections
void app.whenReady().then(() => onAppReady(app))
