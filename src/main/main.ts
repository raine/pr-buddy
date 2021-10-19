import 'core-js/stable'
import { app, BrowserWindow, shell } from 'electron'
import log from 'electron-log'
import type WindowStateKeeper from 'electron-window-state'
import { debounce } from 'lodash'
import path from 'path'
import querystring from 'querystring'
import 'regenerator-runtime/runtime'
import { InitData } from '../renderer/renderer'
import './api'
import './fix-dev-user-data'
import buildMenu from './menu'
import { getAssetPath, resolveHtmlPath } from './util'
import * as settings from './settings'

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

  const windowStateKeeper: (
    opts: WindowStateKeeper.Options
  ) => WindowStateKeeper.State = require('electron-window-state')
  const mainWindowState = windowStateKeeper({
    defaultWidth: 600,
    defaultHeight: 400
  })

  const mainWindow = new BrowserWindow({
    show: true,
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  const debouncedSaveWindowState = debounce(
    (event: any) => mainWindowState.saveState(event.sender),
    500
  )

  mainWindow.on('resize', debouncedSaveWindowState)
  mainWindow.on('move', debouncedSaveWindowState)

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

  buildMenu(mainWindow)

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault()
    void shell.openExternal(url)
  })
}

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app
  .whenReady()
  .then(async () => {
    const { lastRepositoryPath } = await settings.get()
    void createWindow({ repositoryPath: lastRepositoryPath })

    app.on('activate', async () => {
      const windows = BrowserWindow.getAllWindows().filter((b) => b.isVisible())
      if (!windows.length) {
        const { lastRepositoryPath } = await settings.get()
        void createWindow({ repositoryPath: lastRepositoryPath })
      }
    })
  })
  .catch(console.log)
