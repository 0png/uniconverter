const DiscordRPC = require('discord-rpc')

// Discord Application ID - 你需要在 Discord Developer Portal 建立應用程式並取得 Client ID
const CLIENT_ID = '1460557310652059760' // 請替換為你的 Discord Application Client ID

let rpc = null
let startTimestamp = null
let isConnected = false
let isEnabled = false

// 初始化 Discord RPC
async function initDiscordRPC() {
  if (rpc || !isEnabled) return

  try {
    DiscordRPC.register(CLIENT_ID)
    rpc = new DiscordRPC.Client({ transport: 'ipc' })

    rpc.on('ready', () => {
      console.log('[Discord RPC] Connected as', rpc.user.username)
      isConnected = true
      startTimestamp = new Date()
      updatePresence('idle')
    })

    rpc.on('disconnected', () => {
      console.log('[Discord RPC] Disconnected')
      isConnected = false
    })

    await rpc.login({ clientId: CLIENT_ID })
  } catch (err) {
    console.error('[Discord RPC] Failed to connect:', err.message)
    rpc = null
  }
}

// 設定是否啟用 Discord RPC
async function setDiscordRPCEnabled(enabled) {
  isEnabled = enabled
  
  if (enabled) {
    await initDiscordRPC()
  } else {
    await destroyDiscordRPC()
  }
  
  return { enabled: isEnabled, connected: isConnected }
}

// 取得 Discord RPC 狀態
function getDiscordRPCStatus() {
  return { enabled: isEnabled, connected: isConnected }
}

// 更新 Discord 狀態
async function updatePresence(state, details = null) {
  if (!rpc || !isConnected || !isEnabled) return

  const activity = {
    startTimestamp,
    largeImageKey: 'uniconvert_logo', // 需要在 Discord Developer Portal 上傳圖片
    largeImageText: 'Uniconvert',
    instance: false,
    buttons: [
      {
        label: 'View on GitHub',
        url: 'https://github.com/0png/uniconverter'
      }
    ]
  }

  switch (state) {
    case 'idle':
      activity.details = '等待中'
      activity.state = '準備轉換檔案'
      activity.smallImageKey = 'idle'
      activity.smallImageText = '閒置'
      break

    case 'converting':
      activity.details = '轉換中...'
      activity.state = details || '處理檔案'
      activity.smallImageKey = 'converting'
      activity.smallImageText = '轉換中'
      break

    case 'completed':
      activity.details = '轉換完成'
      activity.state = details || '檔案已轉換'
      activity.smallImageKey = 'completed'
      activity.smallImageText = '完成'
      break

    case 'error':
      activity.details = '發生錯誤'
      activity.state = details || '轉換失敗'
      activity.smallImageKey = 'error'
      activity.smallImageText = '錯誤'
      break

    default:
      activity.details = 'Uniconvert'
      activity.state = '檔案轉換工具'
  }

  try {
    await rpc.setActivity(activity)
  } catch (err) {
    console.error('[Discord RPC] Failed to update presence:', err.message)
  }
}

// 清除 Discord 狀態
async function clearPresence() {
  if (!rpc || !isConnected) return

  try {
    await rpc.clearActivity()
  } catch (err) {
    console.error('[Discord RPC] Failed to clear presence:', err.message)
  }
}

// 關閉 Discord RPC 連線
async function destroyDiscordRPC() {
  if (!rpc) return

  try {
    await clearPresence()
    await rpc.destroy()
  } catch (err) {
    console.error('[Discord RPC] Failed to destroy:', err.message)
  } finally {
    rpc = null
    isConnected = false
    console.log('[Discord RPC] Destroyed')
  }
}

// 檢查是否已連線
function isRPCConnected() {
  return isConnected
}

module.exports = {
  initDiscordRPC,
  setDiscordRPCEnabled,
  getDiscordRPCStatus,
  updatePresence,
  clearPresence,
  destroyDiscordRPC,
  isRPCConnected
}
