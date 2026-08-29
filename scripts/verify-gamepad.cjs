const { app, BrowserWindow } = require('electron')
const path = require('path')

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1280,
    height: 720,
    title: '星芽奇旅 - 手柄验证',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  await window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  await wait(20_000)

  const gamepads = await window.webContents.executeJavaScript(`
    JSON.stringify(Array.from(navigator.getGamepads?.() ?? [])
      .filter(Boolean)
      .map((gamepad) => ({
        index: gamepad.index,
        id: gamepad.id,
        connected: gamepad.connected,
        mapping: gamepad.mapping,
        buttonCount: gamepad.buttons.length,
        axisCount: gamepad.axes.length
      })))
  `)

  const connected = JSON.parse(gamepads).filter((gamepad) => gamepad.connected)
  const standardGamepad = connected.find((gamepad) =>
    gamepad.mapping === 'standard' && gamepad.buttonCount >= 16 && gamepad.axisCount >= 2,
  )

  console.log(gamepads)
  app.exit(standardGamepad ? 0 : connected.length > 0 ? 3 : 2)
}).catch((error) => {
  console.error(error)
  app.exit(1)
})
