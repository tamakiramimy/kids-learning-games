import * as THREE from 'three'

export type RaceVisualKind = 'barrier' | 'coin' | 'shield' | 'turbo' | 'magnet'

export interface RaceVisual {
  kind: RaceVisualKind
  object: THREE.Group
}

interface RoadsideObject {
  object: THREE.Group
  side: number
}

export class ThreeRaceRenderer {
  readonly laneSpacing = 3.8
  readonly playerZ = -6.2

  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 420)
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true })
  private readonly roadMarkers: THREE.Mesh[] = []
  private readonly roadsideObjects: RoadsideObject[] = []
  private readonly resizeObserver: ResizeObserver
  private readonly host: HTMLElement
  private readonly phaserCanvas: HTMLCanvasElement
  private readonly player: THREE.Group
  private readonly shield: THREE.Mesh
  private readonly boostFlames: THREE.Group
  private elapsed = 0

  constructor(host: HTMLElement, phaserCanvas: HTMLCanvasElement) {
    this.host = host
    this.phaserCanvas = phaserCanvas
    this.host.style.position = 'relative'
    this.renderer.domElement.className = 'race-three-canvas'
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.host.insertBefore(this.renderer.domElement, this.phaserCanvas)

    this.scene.background = new THREE.Color(0x82cce7)
    this.scene.fog = new THREE.Fog(0x82cce7, 62, 260)
    this.camera.position.set(0, 9.6, 21.5)

    this.createWorld()
    const playerParts = this.createPlayerCar()
    this.player = playerParts.player
    this.shield = playerParts.shield
    this.boostFlames = playerParts.boostFlames
    this.scene.add(this.player)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.host)
    this.resize()
    this.render()
  }

  update(deltaSeconds: number, lane: number, shieldActive: boolean, boostActive: boolean) {
    this.elapsed += deltaSeconds
    const roadMotion = deltaSeconds * (boostActive ? 54 : 32)
    const targetX = this.laneToX(lane)
    this.player.position.x = THREE.MathUtils.damp(this.player.position.x, targetX, 11, deltaSeconds)
    this.player.rotation.z = THREE.MathUtils.damp(this.player.rotation.z, (targetX - this.player.position.x) * -0.075, 14, deltaSeconds)
    this.player.rotation.y = THREE.MathUtils.damp(this.player.rotation.y, (targetX - this.player.position.x) * -0.025, 14, deltaSeconds)
    this.shield.visible = shieldActive
    this.shield.rotation.y += deltaSeconds * 0.9
    this.boostFlames.visible = boostActive
    this.boostFlames.scale.y = boostActive ? 0.85 + Math.sin(this.elapsed * 28) * 0.22 : 0

    for (const marker of this.roadMarkers) {
      marker.position.z += roadMotion
      if (marker.position.z > 18) marker.position.z -= 288
    }

    for (const roadside of this.roadsideObjects) {
      roadside.object.position.z += roadMotion * 0.78
      if (roadside.object.position.z > 20) {
        roadside.object.position.z -= 300
        roadside.side *= Math.random() > 0.68 ? -1 : 1
        roadside.object.position.x = roadside.side * (10.8 + Math.random() * 8)
      }
    }

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.player.position.x * 0.14, 5, deltaSeconds)
    this.camera.lookAt(this.player.position.x * 0.14, 0.7, -42)
    this.render()
  }

  createVisual(kind: RaceVisualKind, lane: number, z: number): RaceVisual {
    const object = this.createVisualObject(kind)
    object.position.set(this.laneToX(lane), 0, z)
    this.scene.add(object)
    return { kind, object }
  }

  updateVisual(visual: RaceVisual, lane: number, z: number, deltaSeconds: number) {
    visual.object.position.x = this.laneToX(lane)
    visual.object.position.z = z
    if (visual.kind === 'coin') visual.object.rotation.y += deltaSeconds * 4.2
    if (visual.kind === 'shield' || visual.kind === 'turbo' || visual.kind === 'magnet') {
      visual.object.rotation.y += deltaSeconds * 1.8
      visual.object.position.y = 0.92 + Math.sin(this.elapsed * 4 + z * 0.08) * 0.12
    }
  }

  removeVisual(visual: RaceVisual) {
    this.scene.remove(visual.object)
    this.disposeObject(visual.object)
  }

  laneToX(lane: number) {
    return lane * this.laneSpacing
  }

  get playerX() {
    return this.player.position.x
  }

  dispose() {
    this.resizeObserver.disconnect()
    this.scene.traverse((object) => this.disposeObject(object))
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
  }

  private createWorld() {
    this.scene.add(new THREE.HemisphereLight(0xdff6ff, 0x4c8b4a, 2.4))
    const sun = new THREE.DirectionalLight(0xfff3cb, 3.1)
    sun.position.set(-20, 28, 16)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -34
    sun.shadow.camera.right = 34
    sun.shadow.camera.top = 34
    sun.shadow.camera.bottom = -34
    this.scene.add(sun)

    const grass = this.mesh(new THREE.PlaneGeometry(180, 440), new THREE.MeshStandardMaterial({ color: 0x3dbf76, roughness: 1 }))
    grass.rotation.x = -Math.PI / 2
    grass.position.z = -188
    grass.receiveShadow = true
    this.scene.add(grass)

    const road = this.mesh(new THREE.BoxGeometry(14.6, 0.12, 420), new THREE.MeshStandardMaterial({ color: 0x414f5d, roughness: 0.9 }))
    road.position.set(0, 0, -188)
    road.receiveShadow = true
    this.scene.add(road)

    const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0xd8d3bd, roughness: 0.95 })
    for (const x of [-7.55, 7.55]) {
      const shoulder = this.mesh(new THREE.BoxGeometry(0.8, 0.06, 420), shoulderMaterial)
      shoulder.position.set(x, 0.08, -188)
      shoulder.receiveShadow = true
      this.scene.add(shoulder)
    }

    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
    for (const x of [-6.86, 6.86]) {
      const edge = this.mesh(new THREE.BoxGeometry(0.22, 0.05, 420), edgeMaterial)
      edge.position.set(x, 0.13, -188)
      this.scene.add(edge)
    }

    const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xf8f3dc, roughness: 0.75 })
    for (const x of [-1.9, 1.9]) {
      for (let index = 0; index < 25; index += 1) {
        const marker = this.mesh(new THREE.BoxGeometry(0.24, 0.05, 5.8), markerMaterial)
        marker.position.set(x, 0.13, 12 - index * 12)
        this.roadMarkers.push(marker)
        this.scene.add(marker)
      }
    }

    const sunDisc = this.mesh(new THREE.SphereGeometry(4.6, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffe285 }))
    sunDisc.position.set(-26, 16, -116)
    this.scene.add(sunDisc)

    for (let index = 0; index < 24; index += 1) {
      const side = index % 2 === 0 ? -1 : 1
      const tree = this.createTree()
      tree.position.set(side * (10.8 + (index % 4) * 1.8), 0, -12 - index * 12)
      const scale = 0.72 + (index % 3) * 0.18
      tree.scale.setScalar(scale)
      this.roadsideObjects.push({ object: tree, side })
      this.scene.add(tree)
    }
  }

  private createTree() {
    const tree = new THREE.Group()
    const trunk = this.mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.4, 6), new THREE.MeshStandardMaterial({ color: 0x84503d, roughness: 1 }))
    trunk.position.y = 0.7
    tree.add(trunk)
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2b875b, flatShading: true, roughness: 0.9 })
    for (const [y, radius] of [[1.4, 1.18], [2.08, 0.9], [2.7, 0.63]] as const) {
      const foliage = this.mesh(new THREE.ConeGeometry(radius, 1.48, 7), foliageMaterial)
      foliage.position.y = y
      tree.add(foliage)
    }
    return tree
  }

  private createPlayerCar() {
    const player = this.createCar(0xe65245, 0xffd35e, true)
    player.position.set(0, 0, this.playerZ)
    const shield = this.mesh(
      new THREE.SphereGeometry(2.24, 18, 12),
      new THREE.MeshBasicMaterial({ color: 0x8ae9df, transparent: true, opacity: 0.25, wireframe: true }),
    )
    shield.position.y = 0.9
    shield.visible = false
    player.add(shield)

    const boostFlames = new THREE.Group()
    for (const x of [-0.56, 0.56]) {
      const flame = this.mesh(new THREE.ConeGeometry(0.23, 1.4, 8), new THREE.MeshBasicMaterial({ color: 0x73e6ff, transparent: true, opacity: 0.88 }))
      flame.rotation.x = Math.PI / 2
      flame.position.set(x, 0.48, 2.75)
      boostFlames.add(flame)
    }
    boostFlames.visible = false
    player.add(boostFlames)
    return { player, shield, boostFlames }
  }

  private createVisualObject(kind: RaceVisualKind) {
    if (kind === 'barrier') return this.createTrafficVehicle()
    if (kind === 'coin') return this.createCoin()
    return this.createPickup(kind)
  }

  private createTrafficVehicle() {
    const colors = [0x53b9e6, 0xf2a64e, 0x9d79d1, 0x50ba7c, 0xe36b66]
    const color = colors[Math.floor(Math.random() * colors.length)]
    return Math.random() < 0.22 ? this.createTruck(color) : this.createCar(color, 0xf2f7ef, false)
  }

  private createCar(color: number, accent: number, playerCar: boolean) {
    const car = new THREE.Group()
    const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.08 })
    const body = this.mesh(new THREE.BoxGeometry(2.55, 0.58, 4.6), bodyMaterial)
    body.position.y = 0.58
    body.castShadow = true
    car.add(body)

    const cabin = this.mesh(new THREE.BoxGeometry(1.85, 0.62, 2.05), new THREE.MeshStandardMaterial({ color: 0xaedfeb, roughness: 0.25, metalness: 0.12 }))
    cabin.position.set(0, 1.16, -0.25)
    cabin.castShadow = true
    car.add(cabin)

    const hood = this.mesh(new THREE.BoxGeometry(2.25, 0.28, 1.1), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.55 }))
    hood.position.set(0, 0.96, -1.72)
    car.add(hood)

    const bumper = this.mesh(new THREE.BoxGeometry(2.62, 0.25, 0.26), new THREE.MeshStandardMaterial({ color: 0x263540, roughness: 0.8 }))
    bumper.position.set(0, 0.44, 2.34)
    car.add(bumper)

    for (const x of [-1.28, 1.28]) {
      for (const z of [-1.42, 1.48]) {
        const wheel = this.mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0x1c252c, roughness: 0.95 }))
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(x, 0.42, z)
        wheel.castShadow = true
        car.add(wheel)
      }
      const rearLight = this.mesh(new THREE.BoxGeometry(0.44, 0.14, 0.08), new THREE.MeshBasicMaterial({ color: 0xff554d }))
      rearLight.position.set(x * 0.63, 0.82, 2.34)
      car.add(rearLight)
    }

    if (playerCar) {
      const spoiler = this.mesh(new THREE.BoxGeometry(2.16, 0.15, 0.34), new THREE.MeshStandardMaterial({ color: 0x263540, roughness: 0.65 }))
      spoiler.position.set(0, 1.26, 1.85)
      car.add(spoiler)
    }
    return car
  }

  private createTruck(color: number) {
    const truck = new THREE.Group()
    const cargo = this.mesh(new THREE.BoxGeometry(3.1, 2.2, 3.4), new THREE.MeshStandardMaterial({ color: 0xe7ecea, roughness: 0.85 }))
    cargo.position.set(0, 1.38, 0.55)
    cargo.castShadow = true
    truck.add(cargo)
    const cab = this.mesh(new THREE.BoxGeometry(3.04, 1.38, 1.52), new THREE.MeshStandardMaterial({ color, roughness: 0.58 }))
    cab.position.set(0, 0.95, -1.84)
    cab.castShadow = true
    truck.add(cab)
    const windshield = this.mesh(new THREE.BoxGeometry(2.32, 0.75, 0.08), new THREE.MeshStandardMaterial({ color: 0x9bd7e7, roughness: 0.25 }))
    windshield.position.set(0, 1.34, -2.62)
    truck.add(windshield)
    for (const x of [-1.38, 1.38]) {
      for (const z of [-1.55, 1.25]) {
        const wheel = this.mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.33, 10), new THREE.MeshStandardMaterial({ color: 0x1c252c, roughness: 0.95 }))
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(x, 0.48, z)
        wheel.castShadow = true
        truck.add(wheel)
      }
      const rearLight = this.mesh(new THREE.BoxGeometry(0.5, 0.16, 0.08), new THREE.MeshBasicMaterial({ color: 0xff554d }))
      rearLight.position.set(x * 0.54, 0.76, 2.28)
      truck.add(rearLight)
    }
    return truck
  }

  private createCoin() {
    const coin = new THREE.Group()
    const ring = this.mesh(new THREE.TorusGeometry(0.48, 0.14, 8, 12), new THREE.MeshStandardMaterial({ color: 0xffc947, roughness: 0.36, metalness: 0.48 }))
    ring.position.y = 1.05
    ring.castShadow = true
    coin.add(ring)
    const center = this.mesh(new THREE.CircleGeometry(0.34, 12), new THREE.MeshBasicMaterial({ color: 0xffea91 }))
    center.position.set(0, 1.05, 0.02)
    coin.add(center)
    return coin
  }

  private createPickup(kind: Exclude<RaceVisualKind, 'barrier' | 'coin'>) {
    const colors: Record<Exclude<RaceVisualKind, 'barrier' | 'coin'>, number> = {
      shield: 0x58d7c7,
      turbo: 0xf28c3a,
      magnet: 0x9a7ee8,
    }
    const pickup = new THREE.Group()
    const core = this.mesh(new THREE.OctahedronGeometry(0.75, 1), new THREE.MeshStandardMaterial({ color: colors[kind], roughness: 0.28, metalness: 0.18, flatShading: true }))
    core.position.y = 1
    core.castShadow = true
    pickup.add(core)
    const halo = this.mesh(new THREE.TorusGeometry(0.95, 0.06, 8, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72 }))
    halo.rotation.x = Math.PI / 2
    halo.position.y = 1
    pickup.add(halo)
    return pickup
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material) {
    return new THREE.Mesh(geometry, material)
  }

  private resize() {
    const hostBounds = this.host.getBoundingClientRect()
    const canvasBounds = this.phaserCanvas.getBoundingClientRect()
    const width = Math.round(canvasBounds.width)
    const height = Math.round(canvasBounds.height)
    if (width < 1 || height < 1) return
    this.renderer.domElement.style.left = `${canvasBounds.left - hostBounds.left}px`
    this.renderer.domElement.style.top = `${canvasBounds.top - hostBounds.top}px`
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.render()
  }

  private render() {
    this.renderer.render(this.scene, this.camera)
  }

  private disposeObject(object: THREE.Object3D) {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  }
}
