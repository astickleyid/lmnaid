const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // Streaming (placeholder for obs-studio-node integration)
  startStream: (config) => ipcRenderer.invoke('start-stream', config),
  stopStream: () => ipcRenderer.invoke('stop-stream'),
  getStreamStatus: () => ipcRenderer.invoke('get-stream-status'),
  
  // Screen capture sources
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  
  // Deep linking
  onDeepLink: (callback) => ipcRenderer.on('deep-link', (event, url) => callback(url)),
  
  // Stream events
  onStreamStarted: (callback) => ipcRenderer.on('stream-started', callback),
  onStreamStopped: (callback) => ipcRenderer.on('stream-stopped', callback),
  onStreamError: (callback) => ipcRenderer.on('stream-error', (event, error) => callback(error)),
  
  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  
  // Native streaming
  generateStreamKey: (userId, serverId) => ipcRenderer.invoke('generate-stream-key', { userId, serverId }),
  getActiveStreams: () => ipcRenderer.invoke('get-active-streams'),
  getStreamUrl: () => ipcRenderer.invoke('get-stream-url'),
  
  // Database
  dbQuery: (query, params) => ipcRenderer.invoke('db:query', { query, params }),
  dbExecute: (query, params) => ipcRenderer.invoke('db:execute', { query, params }),
  
  // API
  getApiUrl: () => ipcRenderer.invoke('get-api-url'),
  
  // File system (for settings, etc.)
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, data) => ipcRenderer.invoke('write-file', { path, data }),
  
  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info')
});

console.log('Preload script loaded');
