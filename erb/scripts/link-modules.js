const fs = require('fs')
const {
  appNodeModulesPath,
  srcNodeModulesPath
} = require('../configs/webpack.paths')

if (!fs.existsSync(srcNodeModulesPath) && fs.existsSync(appNodeModulesPath)) {
  fs.symlinkSync(appNodeModulesPath, srcNodeModulesPath, 'junction')
}
