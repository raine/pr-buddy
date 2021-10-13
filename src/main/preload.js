const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  fetchPullRequests: () => ipcRenderer.invoke('fetchPullRequests'),
  rebaseBranchOnLatestBase: (...args) =>
    ipcRenderer.invoke('rebaseBranchOnLatestBase', ...args)
})
