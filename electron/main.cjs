const path = require("node:path")

const fs = require("node:fs")

const { app, BrowserWindow, screen } = require("electron")

const APP_ID = "com.leosilfar.neonfc"

const WINDOW_PROFILES_FILE = "window-profiles.json"

const DEFAULT_WINDOW_SIZE = { width: 1440, height: 900 }

const MIN_WINDOW_SIZE = { width: 1024, height: 680 }

function getWindowProfilesPath() {
  return path.join(app.getPath("userData"), WINDOW_PROFILES_FILE)
}

function readWindowProfiles() {
  try {
    const profiles = JSON.parse(
      fs.readFileSync(getWindowProfilesPath(), "utf8"),
    )

    if (typeof profiles !== "object" || profiles === null) return {}

    return profiles
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Unable to read saved window profiles.", error)
    }

    return {}
  }
}

function getDisplayForBounds(bounds) {
  return screen.getDisplayMatching(bounds)
}

function getRestoredBounds(display) {
  const profile = readWindowProfiles()[String(display.id)]

  const area = display.workArea

  if (
    !profile ||
    !Number.isFinite(profile.x) ||
    !Number.isFinite(profile.y) ||
    !Number.isFinite(profile.width) ||
    !Number.isFinite(profile.height)
  ) {
    return {
      x:
        area.x +
        Math.max(0, Math.round((area.width - DEFAULT_WINDOW_SIZE.width) / 2)),

      y:
        area.y +
        Math.max(0, Math.round((area.height - DEFAULT_WINDOW_SIZE.height) / 2)),

      width: Math.min(DEFAULT_WINDOW_SIZE.width, area.width),

      height: Math.min(DEFAULT_WINDOW_SIZE.height, area.height),
    }
  }

  const width = Math.max(
    Math.min(MIN_WINDOW_SIZE.width, area.width),

    Math.min(profile.width, area.width),
  )

  const height = Math.max(
    Math.min(MIN_WINDOW_SIZE.height, area.height),

    Math.min(profile.height, area.height),
  )

  const x = Math.min(
    Math.max(profile.x, area.x),

    area.x + area.width - width,
  )

  const y = Math.min(
    Math.max(profile.y, area.y),

    area.y + area.height - height,
  )

  return { x, y, width, height }
}

function saveWindowProfile(window) {
  if (window.isDestroyed() || window.isMinimized()) return

  const bounds = window.getNormalBounds()

  const display = getDisplayForBounds(bounds)

  const profiles = readWindowProfiles()

  profiles[String(display.id)] = bounds

  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true })

    fs.writeFileSync(getWindowProfilesPath(), JSON.stringify(profiles, null, 2))
  } catch (error) {
    console.error("Unable to save window profile.", error)
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()

  const bounds = getRestoredBounds(primaryDisplay)

  const window = new BrowserWindow({
    ...bounds,

    minWidth: Math.min(MIN_WINDOW_SIZE.width, primaryDisplay.workArea.width),

    minHeight: Math.min(MIN_WINDOW_SIZE.height, primaryDisplay.workArea.height),

    autoHideMenuBar: true,

    backgroundColor: "#05020f",

    webPreferences: {
      contextIsolation: true,

      nodeIntegration: false,

      sandbox: true,
    },
  })

  window.webContents.setZoomFactor(1)

  window.webContents.setVisualZoomLevelLimits(1, 1).catch((error) => {
    console.error("Unable to lock Electron page zoom.", error)
  })

  window.webContents.on("did-finish-load", () => {
    window.webContents.setZoomFactor(1)
  })

  let saveTimer = null

  const scheduleSave = () => {
    if (saveTimer !== null) clearTimeout(saveTimer)

    saveTimer = setTimeout(() => {
      saveWindowProfile(window)

      saveTimer = null
    }, 350)
  }

  window.on("resize", scheduleSave)

  window.on("move", scheduleSave)

  window.on("close", () => {
    if (saveTimer !== null) clearTimeout(saveTimer)

    saveWindowProfile(window)
  })

  window.loadFile(path.join(__dirname, "..", "dist", "index.html"))
}

app.whenReady().then(() => {
  app.setAppUserModelId(APP_ID)

  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
