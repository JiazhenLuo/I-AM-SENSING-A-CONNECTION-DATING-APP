import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MapPin, RotateCcw } from 'lucide-react'

// Real WebGL geometry, not a screenshot: buildings, streets, route and orbitable camera.
export default function CityMap({ profile, onOpenProfile }) {
  const mount = useRef(null)
  const resetCamera = useRef(() => {})
  const [pins, setPins] = useState({ you: null, nellie: null })
  const [ready, setReady] = useState(false)
  const [screenRoute, setScreenRoute] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = mount.current
    if (!element) return
    let renderer
    let frame = 0
    let resizeObserver
    let destroyed = false
    let orbit
    const geometries = []
    const materials = []
    const registerGeometry = g => (geometries.push(g), g)
    const registerMaterial = m => (materials.push(m), m)
    const mat = (hex, props = {}) => registerMaterial(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, metalness: 0.12, ...props }))
    const asphalt = mat('#151a1d')
    const road = mat('#24292c')
    const curb = mat('#343a3c')
    const rooftops = [mat('#353b40'), mat('#40474b'), mat('#292f33'), mat('#495054'), mat('#31383c')]
    const walls = [mat('#282e32'), mat('#353c41'), mat('#3c4347'), mat('#252c30')]
    const windows = [mat('#e4bc78', { emissive: '#bb8048', emissiveIntensity: .36 }), mat('#9eabb1', { emissive: '#697780', emissiveIntensity: .15 })]
    const gold = registerMaterial(new THREE.MeshBasicMaterial({ color: '#f5d492' }))
    const glow = registerMaterial(new THREE.MeshBasicMaterial({ color: '#e8af54', transparent: true, opacity: .22, depthWrite: false }))
    const lineMaterial = registerMaterial(new THREE.LineBasicMaterial({ color: '#596367', transparent: true, opacity: .44 }))
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0c1012')
    scene.fog = new THREE.FogExp2('#0c1012', .0065)
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 260)
    // Near top-down framing keeps the gold route visible on a portrait iPhone.
    const startPos = new THREE.Vector3(0, 82, 21)
    camera.position.copy(startPos)
    const target = new THREE.Vector3(0, 0, 0)
    camera.lookAt(target)

    const hemi = new THREE.HemisphereLight('#d5e4f5', '#10151b', 2.5)
    scene.add(hemi)
    const sun = new THREE.DirectionalLight('#f3e6c9', 3.0)
    sun.position.set(-18, 40, 22)
    scene.add(sun)

    const boxGeometry = registerGeometry(new THREE.BoxGeometry(1, 1, 1))
    const cylinderGeometry = registerGeometry(new THREE.CylinderGeometry(1, 1, 1, 12))
    function box(x, y, z, w, h, d, material) {
      const m = new THREE.Mesh(boxGeometry, material)
      m.position.set(x, y, z)
      m.scale.set(w, h, d)
      scene.add(m)
      return m
    }
    box(0, -.72, 0, 110, 1, 120, asphalt)
    // Expanded beyond every phone viewport edge: no empty margins when the map opens.
    // A city grid with actual 3D intersections and roadbeds.
    for (let i = -50; i <= 50; i += 5) {
      box(i, -.16, 0, 1.55, .04, 108, road)
      box(0, -.16, i, 108, .04, 1.55, road)
      const points = [new THREE.Vector3(i, -.121, -54), new THREE.Vector3(i, -.121, 54)]
      const lines = registerGeometry(new THREE.BufferGeometry().setFromPoints(points))
      scene.add(new THREE.Line(lines, lineMaterial))
    }
    let seed = 4139
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
    for (let ix = -10; ix < 10; ix++) {
      for (let iz = -10; iz < 10; iz++) {
        const baseX = ix * 5 + 2.5, baseZ = iz * 5 + 2.5
        // Dense foreground geometry, lightweight buildings at the map periphery.
        const innerDistrict = Math.abs(baseX) < 24 && Math.abs(baseZ) < 31
        if ((ix === -1 && iz === -1) || (ix === 1 && iz === 0)) {
          const park = mat('#28382f')
          box(baseX, -.065, baseZ, 3.22, .10, 3.22, park)
          for (let t = 0; t < 5; t++) {
            const x = baseX + (random() - .5) * 2.6
            const z = baseZ + (random() - .5) * 2.6
            box(x, .18, z, .15, .48, .15, mat('#374c3e'))
            const crown = new THREE.Mesh(registerGeometry(new THREE.IcosahedronGeometry(.38, 0)), mat('#526958'))
            crown.position.set(x, .55, z); scene.add(crown)
          }
          continue
        }
        box(baseX, -.06, baseZ, 3.8, .12, 3.8, curb)
        const lots = !innerDistrict ? 1 : (random() > .37 ? 4 : 2)
        for (let lot = 0; lot < lots; lot++) {
          const xs = lots === 1 ? 0 : lots === 4 ? (lot % 2 ? .87 : -.87) : (lot ? .87 : -.87)
          const zs = lots === 4 ? (lot > 1 ? .87 : -.87) : 0
          const w = lots === 1 ? 3.35 : lots === 4 ? 1.49 : 1.46
          const d = lots === 1 ? 3.30 : lots === 4 ? 1.47 : 3.15
          const h = .5 + Math.pow(random(), 1.45) * 8.1
          const x = baseX + xs, z = baseZ + zs
          box(x, h / 2, z, w, h, d, walls[Math.floor(random() * walls.length)])
          box(x, h + .045, z, w + .1, .12, d + .1, rooftops[Math.floor(random() * rooftops.length)])
          if (h > 2 && innerDistrict) {
            box(x, h + .22, z, w * .36, .27, d * .35, rooftops[0])
            // Sparse lit windows create a convincing night-city read without overwhelming the UI.
            for (let f = 1; f < Math.min(Math.floor(h / .73), 10); f++) {
              const yy = f * .71
              if (random() > .39) box(x + (random() - .5) * .5, yy, z + d / 2 + .009, .22, .24, .016, windows[random() > .33 ? 1 : 0])
              if (random() > .67) box(x + w / 2 + .009, yy, z, .016, .22, .30, windows[random() > .5 ? 1 : 0])
            }
          }
        }
      }
    }
    // A route that rises subtly above the physical streets, from YOU to Nellie.
    const youPoint = new THREE.Vector3(-5, .42, 16)
    const nelliePoint = new THREE.Vector3(5, .42, -16)
    // The opening shot always looks north: Nellie above, YOU below.
    // Route bends along the street grid and stays visible in the 2D overlay.
    const routePoints = [youPoint,
      new THREE.Vector3(-5, .42, 10), new THREE.Vector3(0, .42, 10),
      new THREE.Vector3(0, .42, 5), new THREE.Vector3(5, .42, 5),
      new THREE.Vector3(5, .42, 0), new THREE.Vector3(0, .42, 0),
      new THREE.Vector3(0, .42, -5), new THREE.Vector3(5, .42, -5),
      nelliePoint]
    const curve = new THREE.CatmullRomCurve3(routePoints, false, 'catmullrom', .08)
    scene.add(new THREE.Mesh(registerGeometry(new THREE.TubeGeometry(curve, 180, .14, 7, false)), glow))
    scene.add(new THREE.Mesh(registerGeometry(new THREE.TubeGeometry(curve, 180, .049, 7, false)), gold))
    function pointMarker(position, color) {
      const disk = new THREE.Mesh(cylinderGeometry, registerMaterial(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8 })))
      disk.scale.set(.38, .035, .38); disk.position.copy(position); scene.add(disk)
      const ring = new THREE.Mesh(registerGeometry(new THREE.TorusGeometry(.54, .035, 6, 32)), gold)
      ring.rotation.x = Math.PI / 2; ring.position.copy(position); ring.position.y += .06; scene.add(ring)
    }
    pointMarker(youPoint, '#f2c875'); pointMarker(nelliePoint, '#f5d492')

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.55
      renderer.domElement.className = 'city-canvas'
      element.appendChild(renderer.domElement)
    } catch (error) {
      console.error('3D map could not initialize', error)
      setFailed(true)
      return () => { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()) }
    }
    orbit = new OrbitControls(camera, renderer.domElement)
    orbit.enablePan = false
    orbit.enableDamping = true
    orbit.dampingFactor = .075
    orbit.minDistance = 40
    orbit.maxDistance = 150
    orbit.minPolarAngle = .08
    orbit.maxPolarAngle = 1.18
    orbit.maxAzimuthAngle = Math.PI / 2
    orbit.minAzimuthAngle = -Math.PI / 2
    orbit.target.copy(target)
    resetCamera.current = () => { camera.position.copy(startPos); orbit.target.copy(target); orbit.update() }
    function resize() {
      const w = element.clientWidth || 390, h = element.clientHeight || 750
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    function projectPoint(point) {
      const projected = point.clone().add(new THREE.Vector3(0, 1, 0)).project(camera)
      return { left: `${(projected.x + 1) * 50}%`, top: `${(1 - projected.y) * 50}%`, visible: projected.z < 1 }
    }
    // Project the route into a thin icon-like gold overlay. It stays visible
    // even when 3D buildings would otherwise obscure a ground-level line.
    function screenPath() {
      return routePoints.map((p, i) => {
        const projected = p.clone().project(camera)
        const x = ((projected.x + 1) * 50).toFixed(2)
        const y = ((1 - projected.y) * 50).toFixed(2)
        return `${i ? 'L' : 'M'} ${x} ${y}`
      }).join(' ')
    }
    let lastUpdate = 0
    function animate(time) {
      if (destroyed) return
      frame = requestAnimationFrame(animate)
      orbit.update()
      renderer.render(scene, camera)
      if (time - lastUpdate > 30) {
        setPins({ you: projectPoint(youPoint), nellie: projectPoint(nelliePoint) })
        setScreenRoute(screenPath())
        lastUpdate = time
      }
    }
    resize()
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(element)
    setReady(true)
    frame = requestAnimationFrame(animate)
    return () => {
      destroyed = true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      orbit.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === element) element.removeChild(renderer.domElement)
      geometries.forEach(g => g.dispose())
      materials.forEach(m => m.dispose())
    }
  }, [])

  return <div className="city-map">
    <div className="city-viewport" ref={mount} />
    <svg className="map-route-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path className="map-route-halo" d={screenRoute} />
      <path className="map-route-stroke" d={screenRoute} />
    </svg>
    {failed && <div className="map-fallback">3D map unavailable on this device.</div>}
    {ready && pins.you?.visible && <div className="map-marker map-marker-you" style={{ left: pins.you.left, top: pins.you.top }}><span className="marker-you-dot"/><small>YOU</small></div>}
    {ready && pins.nellie?.visible && <button type="button" className="map-marker map-marker-nellie" style={{ left: pins.nellie.left, top: pins.nellie.top }} onClick={onOpenProfile} aria-label="Open Nellie's profile"><img src={profile.photos[0]} alt="Nellie"/><span>Nellie</span></button>}
    <div className="map-location-label"><MapPin size={12}/> NEAR YOU </div>
    <button className="map-camera-reset glass" onClick={() => resetCamera.current()} aria-label="Reset 3D view"><RotateCcw size={17}/></button>
  </div>
}
