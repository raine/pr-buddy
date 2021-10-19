import { URL } from 'url'
import { app } from 'electron'
import path from 'path'

export let resolveHtmlPath: (htmlFileName: string) => string

if (process.env.NODE_ENV === 'development') {
  const port = process.env.PORT || 1212
  resolveHtmlPath = (htmlFileName: string) => {
    const url = new URL(`http://localhost:${port}`)
    url.pathname = htmlFileName
    return url.href
  }
} else {
  resolveHtmlPath = (htmlFileName: string) => {
    return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`
  }
}

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../assets')

export const getAssetPath = (...paths: string[]): string =>
  path.join(RESOURCES_PATH, ...paths)
