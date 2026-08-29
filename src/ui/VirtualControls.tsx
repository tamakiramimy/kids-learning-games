import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { GameAction, inputManager, type ControlProfile } from '../input/InputManager'

const DIRECTIONS = [
  { action: GameAction.UP, label: '▲', className: 'up' },
  { action: GameAction.LEFT, label: '◀', className: 'left' },
  { action: GameAction.RIGHT, label: '▶', className: 'right' },
  { action: GameAction.DOWN, label: '▼', className: 'down' },
] as const

function VirtualButton({ action, label, description, className = '' }: {
  action: GameAction
  label: string
  description: string
  className?: string
}) {
  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    inputManager.releaseVirtual(action, event.pointerId)
  }
  return (
    <button
      type="button"
      className={`virtual-button ${className}`}
      aria-label={description}
      title={description}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        inputManager.pressVirtual(action, event.pointerId)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <span className="virtual-button-label">{label}</span>
      {description && <span className="virtual-button-description">{description}</span>}
    </button>
  )
}

function VirtualStick() {
  const baseRef = useRef<HTMLDivElement>(null)
  const activePointer = useRef<number | null>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const update = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = baseRef.current?.getBoundingClientRect()
    if (!bounds) return
    const radius = bounds.width * 0.31
    const rawX = event.clientX - (bounds.left + bounds.width / 2)
    const rawY = event.clientY - (bounds.top + bounds.height / 2)
    const distance = Math.hypot(rawX, rawY)
    const scale = distance > radius ? radius / distance : 1
    const x = rawX * scale
    const y = rawY * scale
    setPosition({ x, y })
    inputManager.setVirtualAxis(x / radius, y / radius)
  }
  const release = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return
    activePointer.current = null
    setPosition({ x: 0, y: 0 })
    inputManager.setVirtualAxis(0, 0)
  }

  return (
    <div
      ref={baseRef}
      className="virtual-stick"
      role="application"
      aria-label="移动摇杆"
      onPointerDown={(event) => {
        event.preventDefault()
        activePointer.current = event.pointerId
        event.currentTarget.setPointerCapture(event.pointerId)
        update(event)
      }}
      onPointerMove={(event) => {
        if (activePointer.current === event.pointerId) update(event)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div className="virtual-stick-ring" />
      <div className="virtual-stick-knob" style={{ transform: `translate(${position.x}px, ${position.y}px)` }} />
    </div>
  )
}

export function VirtualControls() {
  const [profile, setProfile] = useState<ControlProfile | null>(null)
  const [touchControls, setTouchControls] = useState(false)

  useEffect(() => inputManager.onControlProfile(setProfile), [])
  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)')
    const refresh = () => setTouchControls(media.matches || navigator.maxTouchPoints > 0)
    refresh()
    media.addEventListener('change', refresh)
    return () => media.removeEventListener('change', refresh)
  }, [])

  if (!profile) return null

  const directions = profile.direction === 'horizontal'
    ? DIRECTIONS.filter(({ action }) => action === GameAction.LEFT || action === GameAction.RIGHT)
    : DIRECTIONS

  return (
    <div className={`virtual-controls virtual-controls--${profile.direction}${touchControls ? ' virtual-controls--touch' : ''}`} data-profile={profile.id}>
      <div className="control-guide" aria-live="polite">
        <span>{profile.keyboardHint}</span>
        <span>{profile.gamepadHint}</span>
      </div>
      {touchControls && profile.direction !== 'none' && (
        <div className="virtual-direction-zone">
          {profile.direction === 'stick' ? <VirtualStick /> : (
            <div className={`virtual-dpad virtual-dpad--${profile.direction}`}>
              {directions.map((direction) => (
                <VirtualButton key={direction.action} {...direction} description={`${direction.label}方向`} />
              ))}
            </div>
          )}
        </div>
      )}
      {touchControls && (
        <div className="virtual-action-zone">
          {profile.buttons.map((button) => (
            <VirtualButton key={`${profile.id}-${button.action}`} {...button} className={`action-${button.label.toLowerCase()}`} />
          ))}
        </div>
      )}
    </div>
  )
}