/**
 * Builds the DLL for development electron renderer process
 */

const path = require('path')
const webpack = require('webpack')
const { merge } = require('webpack-merge')
const baseConfig = require('./webpack.config.base')
const webpackPaths = require('./webpack.paths')
const checkNodeEnv = require('../scripts/check-node-env')
const { dependencies } = require('../../package.json')

checkNodeEnv('development')

const dist = webpackPaths.dllPath

module.exports = merge(baseConfig, {
  context: webpackPaths.rootPath,
  devtool: 'eval',
  mode: 'development',
  target: 'electron-renderer',
  externals: ['fsevents', 'crypto-browserify'],
  module: require('./webpack.config.renderer.dev').default.module,
  entry: {
    renderer: Object.keys(dependencies || {})
  },
  output: {
    path: dist,
    filename: '[name].dev.dll.js',
    library: {
      name: 'renderer',
      type: 'var'
    }
  },

  plugins: [
    new webpack.DllPlugin({
      path: path.join(dist, '[name].json'),
      name: '[name]'
    }),

    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development'
    }),

    new webpack.LoaderOptionsPlugin({
      debug: true,
      options: {
        context: webpackPaths.srcPath,
        output: {
          path: webpackPaths.dllPath
        }
      }
    })
  ]
})
