import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  MenuItemConstructorOptions
} from 'electron'
import { emitMessageToWindow } from './api'
import { createWindow } from './main'

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string
  submenu?: DarwinMenuItemConstructorOptions[] | Menu
}

export async function openRepositoryFromMenu() {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })

  if (!result.canceled) {
    const repositoryPath = result.filePaths[0]
    void createWindow({ repositoryPath })
  }
}

function setupDevelopmentEnvironment(mainWindow: BrowserWindow): void {
  mainWindow.webContents.on('context-menu', (_, props) => {
    const { x, y } = props

    Menu.buildFromTemplate([
      {
        label: 'Inspect element',
        click: () => {
          mainWindow.webContents.inspectElement(x, y)
        }
      }
    ]).popup({ window: mainWindow })
  })
}

export default function buildMenu(mainWindow: BrowserWindow): Menu {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    setupDevelopmentEnvironment(mainWindow)
  }

  const template =
    process.platform === 'darwin'
      ? buildDarwinTemplate(mainWindow)
      : buildDefaultTemplate(mainWindow)

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  return menu
}

function buildDarwinTemplate(
  mainWindow: BrowserWindow
): MenuItemConstructorOptions[] {
  const subMenuAbout: DarwinMenuItemConstructorOptions = {
    label: 'PR Buddy',
    submenu: [
      {
        label: 'About PR Buddy',
        selector: 'orderFrontStandardAboutPanel:'
      },
      { type: 'separator' },
      { label: 'Services', submenu: [] },
      { type: 'separator' },
      {
        label: 'Hide PR Buddy',
        accelerator: 'Command+H',
        selector: 'hide:'
      },
      {
        label: 'Hide Others',
        accelerator: 'Command+Shift+H',
        selector: 'hideOtherApplications:'
      },
      { label: 'Show All', selector: 'unhideAllApplications:' },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => {
          app.quit()
        }
      }
    ]
  }
  const subMenuFile: DarwinMenuItemConstructorOptions = {
    label: 'File',
    submenu: [
      {
        label: 'Open Repository...',
        accelerator: 'Command+O',
        click: () => {
          void openRepositoryFromMenu()
        }
      }
    ]
  }
  const subMenuEdit: DarwinMenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
      { label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
      { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
      { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
      {
        label: 'Select All',
        accelerator: 'Command+A',
        selector: 'selectAll:'
      }
    ]
  }
  const subMenuView: MenuItemConstructorOptions = {
    label: 'View',
    submenu: [
      {
        label: 'Refresh Pull Requests',
        accelerator: 'Command+R',
        click: (menuItem, window) => {
          if (window) {
            emitMessageToWindow(window)({ type: 'REFRESH_PULL_REQUESTS' })
          }
        }
      },
      {
        label: 'Reload',
        accelerator: 'Shift+Command+R',
        click: () => {
          mainWindow.webContents.reload()
        }
      },
      ...(process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
        ? [
            {
              label: 'Toggle Developer Tools',
              accelerator: 'Alt+Command+I',
              click: () => {
                mainWindow.webContents.toggleDevTools()
              }
            }
          ]
        : [])
    ]
  }
  const subMenuWindow: DarwinMenuItemConstructorOptions = {
    label: 'Window',
    submenu: [
      {
        label: 'Minimize',
        accelerator: 'Command+M',
        selector: 'performMiniaturize:'
      },
      { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
      { type: 'separator' },
      { label: 'Bring All to Front', selector: 'arrangeInFront:' }
    ]
  }

  return [subMenuAbout, subMenuFile, subMenuEdit, subMenuView, subMenuWindow]
}

function buildDefaultTemplate(mainWindow: BrowserWindow) {
  const templateDefault = [
    {
      label: '&File',
      submenu: [
        {
          label: '&Open',
          accelerator: 'Ctrl+O'
        },
        {
          label: '&Close',
          accelerator: 'Ctrl+W',
          click: () => {
            mainWindow.close()
          }
        }
      ]
    },
    {
      label: '&View',
      submenu:
        process.env.NODE_ENV === 'development' ||
        process.env.DEBUG_PROD === 'true'
          ? [
              {
                label: '&Reload',
                accelerator: 'Ctrl+R',
                click: () => {
                  mainWindow.webContents.reload()
                }
              },
              {
                label: 'Toggle &Full Screen',
                accelerator: 'F11',
                click: () => {
                  mainWindow.setFullScreen(!mainWindow.isFullScreen())
                }
              },
              {
                label: 'Toggle &Developer Tools',
                accelerator: 'Alt+Ctrl+I',
                click: () => {
                  mainWindow.webContents.toggleDevTools()
                }
              }
            ]
          : [
              {
                label: 'Toggle &Full Screen',
                accelerator: 'F11',
                click: () => {
                  mainWindow.setFullScreen(!mainWindow.isFullScreen())
                }
              }
            ]
    }
  ]

  return templateDefault
}
