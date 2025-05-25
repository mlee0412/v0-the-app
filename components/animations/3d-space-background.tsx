"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

export function ThreeDSpaceBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create scene
    const scene = new THREE.Scene()

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 5

    // Create renderer with high pixel ratio for better quality
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    })

    // Use device pixel ratio for higher resolution
    const pixelRatio = window.devicePixelRatio || 1
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000022, 1)
    containerRef.current.appendChild(renderer.domElement)

    // Load textures for realistic space background
    const textureLoader = new THREE.TextureLoader()

    // Preload all textures to ensure they're available
    const spaceTexture = textureLoader.load("/cosmic-canvas.png")
    const nebulaTexture1 = textureLoader.load("/cosmic-cyan-magenta.png")
    const nebulaTexture2 = textureLoader.load("/cosmic-core.png")
    const nebulaTexture3 = textureLoader.load("/cyan-nebula-dream.png")
    const nebulaTexture4 = textureLoader.load("/cosmic-dance.png")

    // Create stars with better visuals
    const starsGeometry = new THREE.BufferGeometry()
    const starsMaterial = new THREE.PointsMaterial({
      size: 0.15 * pixelRatio,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    })

    const starsCount = 3000
    const starsPositions = new Float32Array(starsCount * 3)
    const starsColors = new Float32Array(starsCount * 3)
    const starsSizes = new Float32Array(starsCount)

    for (let i = 0; i < starsCount; i++) {
      const i3 = i * 3

      // Position with better distribution
      const radius = 50
      const theta = 2 * Math.PI * Math.random()
      const phi = Math.acos(2 * Math.random() - 1)

      starsPositions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      starsPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      starsPositions[i3 + 2] = radius * Math.cos(phi)

      // Color - create vibrant color variation
      const colorChoice = Math.random()
      if (colorChoice < 0.2) {
        // Cyan stars
        starsColors[i3] = 0.5 + Math.random() * 0.5
        starsColors[i3 + 1] = 0.8 + Math.random() * 0.2
        starsColors[i3 + 2] = 1.0
      } else if (colorChoice < 0.4) {
        // Magenta stars
        starsColors[i3] = 1.0
        starsColors[i3 + 1] = 0.3 + Math.random() * 0.3
        starsColors[i3 + 2] = 0.8 + Math.random() * 0.2
      } else if (colorChoice < 0.6) {
        // Yellow stars
        starsColors[i3] = 1.0
        starsColors[i3 + 1] = 1.0
        starsColors[i3 + 2] = 0.3 + Math.random() * 0.3
      } else if (colorChoice < 0.8) {
        // Green stars
        starsColors[i3] = 0.3 + Math.random() * 0.3
        starsColors[i3 + 1] = 1.0
        starsColors[i3 + 2] = 0.3 + Math.random() * 0.3
      } else {
        // White stars
        starsColors[i3] = 0.9 + Math.random() * 0.1
        starsColors[i3 + 1] = 0.9 + Math.random() * 0.1
        starsColors[i3 + 2] = 0.9 + Math.random() * 0.1
      }

      // Vary star sizes
      starsSizes[i] = Math.random() * 2 + 0.5
    }

    starsGeometry.setAttribute("position", new THREE.BufferAttribute(starsPositions, 3))
    starsGeometry.setAttribute("color", new THREE.BufferAttribute(starsColors, 3))
    starsGeometry.setAttribute("size", new THREE.BufferAttribute(starsSizes, 1))

    const stars = new THREE.Points(starsGeometry, starsMaterial)
    scene.add(stars)

    // Create space background with real images
    const createSpaceBackground = () => {
      // Create a large sphere for the background
      const geometry = new THREE.SphereGeometry(100, 64, 64)
      geometry.scale(-1, 1, 1) // Invert the sphere so we see the texture from inside

      // Use the preloaded space texture
      const material = new THREE.MeshBasicMaterial({
        map: spaceTexture,
        side: THREE.BackSide, // Render on the inside
        transparent: true,
        opacity: 0.8,
      })

      const spaceSphere = new THREE.Mesh(geometry, material)
      scene.add(spaceSphere)

      return spaceSphere
    }

    const spaceBackground = createSpaceBackground()

    // Create nebula planes with realistic textures
    const createNebula = (textureIndex: number) => {
      const size = 40
      const geometry = new THREE.PlaneGeometry(size, size)

      // Use one of the preloaded nebula textures
      let texture
      switch (textureIndex) {
        case 0:
          texture = nebulaTexture1
          break
        case 1:
          texture = nebulaTexture2
          break
        case 2:
          texture = nebulaTexture3
          break
        case 3:
        default:
          texture = nebulaTexture4
          break
      }

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })

      const nebula = new THREE.Mesh(geometry, material)
      nebula.position.z = -30
      nebula.rotation.z = Math.random() * Math.PI

      return nebula
    }

    // Add multiple nebulae
    for (let i = 0; i < 4; i++) {
      const nebula = createNebula(i)
      nebula.position.x = (Math.random() - 0.5) * 60
      nebula.position.y = (Math.random() - 0.5) * 60
      nebula.position.z = -30 - Math.random() * 20
      scene.add(nebula)
    }

    // Add Galaga-style enemies that occasionally fly across
    const createGalagaEnemy = () => {
      const group = new THREE.Group()

      // Main body
      const bodyGeometry = new THREE.BoxGeometry(1, 1, 0.2)
      const bodyMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(Math.random() > 0.5 ? 0xff00ff : 0x00ffff),
        transparent: true,
        opacity: 0.8,
      })
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
      group.add(body)

      // Wings
      const wingGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.1)
      const wingMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(Math.random() > 0.5 ? 0x00ffff : 0xff00ff),
        transparent: true,
        opacity: 0.8,
      })

      const leftWing = new THREE.Mesh(wingGeometry, wingMaterial)
      leftWing.position.set(-0.75, 0, 0)
      group.add(leftWing)

      const rightWing = new THREE.Mesh(wingGeometry, wingMaterial)
      rightWing.position.set(0.75, 0, 0)
      group.add(rightWing)

      return group
    }

    // Enemies array
    const enemies: THREE.Group[] = []

    // Function to add a new enemy
    const addEnemy = () => {
      if (enemies.length < 10 && Math.random() < 0.01) {
        const enemy = createGalagaEnemy()
        enemy.position.set((Math.random() - 0.5) * 20, -15, Math.random() * 10 - 20)
        enemy.userData = {
          speed: Math.random() * 0.05 + 0.02,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          horizontalSpeed: (Math.random() - 0.5) * 0.05,
        }
        scene.add(enemy)
        enemies.push(enemy)
      }
    }

    // Update enemies
    const updateEnemies = () => {
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i]
        enemy.position.y += enemy.userData.speed
        enemy.position.x += enemy.userData.horizontalSpeed
        enemy.rotation.z += enemy.userData.rotationSpeed

        // Remove if out of view
        if (enemy.position.y > 15) {
          scene.remove(enemy)
          enemies.splice(i, 1)
        }
      }
    }

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)

      // Update pixel ratio on resize
      const pixelRatio = window.devicePixelRatio || 1
      renderer.setPixelRatio(pixelRatio)
    }

    // Add resize observer for more reliable size tracking
    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(document.body)

    window.addEventListener("resize", handleResize)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)

      // Rotate stars slowly
      stars.rotation.y += 0.0003
      stars.rotation.x += 0.0001

      // Rotate space background very slowly
      spaceBackground.rotation.y += 0.0001

      // Subtle camera movement
      camera.position.x = Math.sin(Date.now() * 0.0001) * 0.5
      camera.position.y = Math.cos(Date.now() * 0.0001) * 0.3

      // Add and update enemies
      addEnemy()
      updateEnemies()

      renderer.render(scene, camera)
    }

    animate()

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize)
      resizeObserver.disconnect()
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: "linear-gradient(to bottom, #000033, #000011)" }}
    />
  )
}
