import { app } from 'electron'
import * as path from 'path'

// https://github.com/electron-react-boilerplate/electron-react-boilerplate/issues/2197
if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  const { build } = require('../../package.json')
  const appData = app.getPath('appData')
  app.setPath('userData', path.join(appData, build.productName))
}
