import type { CameraView } from "@/types"
import { VH, VW, clamp } from "@/constants/physics"

const CAMERA_ZOOM = 1.12
const CAMERA_FOLLOW_RESPONSE = 7

export function getCameraScale(viewportWidth: number, viewportHeight: number) {
  const fitScale = Math.min(
    Math.max(1, viewportWidth) / VW,
    Math.max(1, viewportHeight) / VH,
  )

  return fitScale * CAMERA_ZOOM
}

export function createCameraView(
  viewportWidth: number,
  viewportHeight: number,
): CameraView {
  return {
    x: VW / 2,
    y: VH / 2,
    scale: getCameraScale(viewportWidth, viewportHeight),
  }
}

export function updateCameraView(
  current: CameraView,
  target: { x: number; y: number },
  deltaSeconds: number,
  viewportWidth: number,
  viewportHeight: number,
): CameraView {
  const scale = getCameraScale(viewportWidth, viewportHeight)
  const halfViewWidth = Math.min(VW / 2, viewportWidth / scale / 2)
  const halfViewHeight = Math.min(VH / 2, viewportHeight / scale / 2)
  const targetX = clamp(target.x, halfViewWidth, VW - halfViewWidth)
  const targetY = clamp(target.y, halfViewHeight, VH - halfViewHeight)
  const blend = 1 - Math.exp(-CAMERA_FOLLOW_RESPONSE * deltaSeconds)

  return {
    x: clamp(
      current.x + (targetX - current.x) * blend,
      halfViewWidth,
      VW - halfViewWidth,
    ),
    y: clamp(
      current.y + (targetY - current.y) * blend,
      halfViewHeight,
      VH - halfViewHeight,
    ),
    scale,
  }
}

export function applyCameraTransform(
  scene: HTMLDivElement | null,
  view: CameraView,
  viewportWidth: number,
  viewportHeight: number,
) {
  if (!scene) return

  const left = viewportWidth / 2 - view.x * view.scale
  const top = viewportHeight / 2 - view.y * view.scale
  const transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0) scale(${view.scale.toFixed(4)})`

  if (scene.style.transform !== transform) scene.style.transform = transform
}
