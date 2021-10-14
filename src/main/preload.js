const { contextBridge, ipcRenderer } = require('electron')

const API_FNS = ['fetchPullRequests', 'rebaseBranchOnLatestBase']

contextBridge.exposeInMainWorld('electronAPI', {
  ...Object.fromEntries(
    API_FNS.map((fnName) => [
      fnName,
      (...args) => ipcRenderer.invoke(fnName, ...args)
    ])
  ),

  subscribe(channel, func) {
    if (channel !== 'message') return
    const listener = (event, ...args) => func(...args)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.off(channel, listener)
  }
})
