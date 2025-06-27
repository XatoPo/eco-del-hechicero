"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition"

interface GameState {
  health: number
  mana: number
  healUses: number
  enemiesDefeated: number
  totalEnemies: number
  gameWon: boolean
  gameLost: boolean
  level: number
}

interface GameObject {
  x: number
  y: number
  width: number
  height: number
  velocityX: number
  velocityY: number
  onGround: boolean
}

interface Player extends GameObject {
  flipX: boolean
  health: number
  mana: number
  invulnerable: number
  currentAnimation: string
  animationFrame: number
  animationTimer: number
}

interface Enemy extends GameObject {
  type: string
  weakness: string
  health: number
  maxHealth: number
  direction: number
  speed: number
  dying: boolean
  color: string
  currentAnimation: string
  animationFrame: number
  animationTimer: number
}

interface Spell extends GameObject {
  type: string
  active: boolean
  lifetime: number
  color: string
}

export default function GameEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const { lastCommand, isListening, startListening, debugInfo, commandCount } = useVoiceRecognition()

  const [gameState, setGameState] = useState<GameState>({
    health: 100,
    mana: 100,
    healUses: 3,
    enemiesDefeated: 0,
    totalEnemies: 6,
    gameWon: false,
    gameLost: false,
    level: 1,
  })

  // Game objects
  const gameObjectsRef = useRef<{
    player: Player
    enemies: Enemy[]
    spells: Spell[]
    platforms: Array<{ x: number; y: number; width: number; height: number }>
    camera: { x: number; y: number }
    cooldowns: Record<string, number>
    shield: { active: boolean; timeLeft: number } | null
    keys: Record<string, boolean>
    lastTime: number
  }>({
    player: {
      x: 100,
      y: 400,
      width: 32,
      height: 48,
      velocityX: 0,
      velocityY: 0,
      onGround: false,
      flipX: false,
      health: 100,
      mana: 100,
      invulnerable: 0,
      currentAnimation: "idle",
      animationFrame: 0,
      animationTimer: 0,
    },
    enemies: [],
    spells: [],
    platforms: [],
    camera: { x: 0, y: 0 },
    cooldowns: {
      fireball: 0,
      shield: 0,
      light: 0,
      heal: 0,
      superJump: 0,
    },
    shield: null,
    keys: {},
    lastTime: 0,
  })

  const castFireball = useCallback(() => {
    const { player, cooldowns, spells } = gameObjectsRef.current

    if (cooldowns.fireball > 0 || gameState.mana < 20) {
      console.log("❌ Cannot cast fireball - cooldown or insufficient mana")
      return false
    }

    console.log("🔥 Casting fireball!")
    setGameState((prev) => ({ ...prev, mana: Math.max(0, prev.mana - 20) }))
    cooldowns.fireball = 500

    player.currentAnimation = "attack"
    player.animationFrame = 0

    const direction = player.flipX ? -1 : 1
    spells.push({
      x: player.x + direction * 40,
      y: player.y + 15,
      width: 16,
      height: 8,
      velocityX: direction * 300,
      velocityY: 0,
      onGround: false,
      type: "fire",
      active: true,
      lifetime: 3000,
      color: "#FF4500",
    })
    return true
  }, [gameState.mana])

  const castLight = useCallback(() => {
    const { player, cooldowns, spells } = gameObjectsRef.current

    if (cooldowns.light > 0 || gameState.mana < 15) {
      console.log("❌ Cannot cast light - cooldown or insufficient mana")
      return false
    }

    console.log("💡 Casting light!")
    setGameState((prev) => ({ ...prev, mana: Math.max(0, prev.mana - 15) }))
    cooldowns.light = 500

    player.currentAnimation = "attack"
    player.animationFrame = 0

    const direction = player.flipX ? -1 : 1
    spells.push({
      x: player.x + direction * 40,
      y: player.y + 15,
      width: 20,
      height: 20,
      velocityX: direction * 250,
      velocityY: 0,
      onGround: false,
      type: "light",
      active: true,
      lifetime: 3000,
      color: "#FFD700",
    })
    return true
  }, [gameState.mana])

  const castShield = useCallback(() => {
    const { cooldowns } = gameObjectsRef.current

    if (cooldowns.shield > 0 || gameState.mana < 30) {
      console.log("❌ Cannot cast shield - cooldown or insufficient mana")
      return false
    }

    console.log("🛡️ Casting shield!")
    setGameState((prev) => ({ ...prev, mana: Math.max(0, prev.mana - 30) }))
    cooldowns.shield = 8000

    gameObjectsRef.current.shield = { active: true, timeLeft: 5000 }
    return true
  }, [gameState.mana])

  const castHeal = useCallback(() => {
    const { cooldowns } = gameObjectsRef.current

    if (cooldowns.heal > 0 || gameState.mana < 40 || gameState.healUses <= 0) {
      console.log("❌ Cannot cast heal - cooldown, insufficient mana, or no uses left")
      return false
    }

    console.log("💚 Casting heal!")
    setGameState((prev) => ({
      ...prev,
      mana: Math.max(0, prev.mana - 40),
      health: Math.min(100, prev.health + 25),
      healUses: prev.healUses - 1,
    }))
    cooldowns.heal = 10000
    return true
  }, [gameState.mana, gameState.healUses])

  const castSuperJump = useCallback(() => {
    const { player, cooldowns } = gameObjectsRef.current

    if (cooldowns.superJump > 0 || gameState.mana < 25) {
      console.log("❌ Cannot cast super jump - cooldown or insufficient mana")
      return false
    }

    console.log("🚀 Casting super jump!")
    setGameState((prev) => ({ ...prev, mana: Math.max(0, prev.mana - 25) }))
    cooldowns.superJump = 3000

    player.velocityY = -450
    player.currentAnimation = "jump"
    player.animationFrame = 0
    return true
  }, [gameState.mana])

  // Initialize game
  useEffect(() => {
    initializeGame()
    startListening()

    const handleKeyDown = (e: KeyboardEvent) => {
      gameObjectsRef.current.keys[e.code] = true
      if (e.code === "Space") e.preventDefault()
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      gameObjectsRef.current.keys[e.code] = false
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [startListening])

  const processVoiceCommand = useCallback(
    (command: string) => {
      // Extract the actual command from the timestamped version
      const actualCommand = command.split("_")[0]
      const cmd = actualCommand.toLowerCase().trim()
      console.log("🎮 Processing command:", cmd)

      let commandExecuted = false

      if (cmd.includes("fuego") || cmd === "fuego") {
        commandExecuted = castFireball()
        if (commandExecuted) console.log("🔥 FUEGO ejecutado!")
      } else if (cmd.includes("escudo") || cmd === "escudo") {
        commandExecuted = castShield()
        if (commandExecuted) console.log("🛡️ ESCUDO ejecutado!")
      } else if (cmd.includes("luz") || cmd === "luz") {
        commandExecuted = castLight()
        if (commandExecuted) console.log("💡 LUZ ejecutado!")
      } else if (cmd.includes("curar") || cmd === "curar") {
        commandExecuted = castHeal()
        if (commandExecuted) console.log("💚 CURAR ejecutado!")
      } else if (cmd.includes("saltar") || cmd === "saltar") {
        commandExecuted = castSuperJump()
        if (commandExecuted) console.log("🚀 SALTAR ejecutado!")
      }

      if (!commandExecuted) {
        console.log("❌ Comando no ejecutado:", cmd)
      }
    },
    [gameState.mana, gameState.healUses, castFireball, castShield, castLight, castHeal, castSuperJump],
  )

  // Process voice commands
  useEffect(() => {
    if (lastCommand && !gameState.gameWon && !gameState.gameLost) {
      console.log("🎮 Processing voice command:", lastCommand)
      processVoiceCommand(lastCommand)
    }
  }, [lastCommand, gameState.gameWon, gameState.gameLost, processVoiceCommand])

  const initializeGame = () => {
    // Create platforms
    gameObjectsRef.current.platforms = [
      // Ground platforms
      { x: 0, y: 550, width: 200, height: 50 },
      { x: 200, y: 550, width: 200, height: 50 },
      { x: 400, y: 550, width: 200, height: 50 },
      { x: 600, y: 550, width: 200, height: 50 },
      { x: 800, y: 550, width: 200, height: 50 },
      { x: 1000, y: 550, width: 200, height: 50 },
      { x: 1200, y: 550, width: 200, height: 50 },
      { x: 1400, y: 550, width: 200, height: 50 },

      // Floating platforms
      { x: 250, y: 450, width: 100, height: 20 },
      { x: 450, y: 400, width: 100, height: 20 },
      { x: 650, y: 420, width: 100, height: 20 },
      { x: 850, y: 380, width: 100, height: 20 },
      { x: 1050, y: 440, width: 100, height: 20 },
      { x: 1250, y: 400, width: 100, height: 20 },
    ]

    // Create enemies
    const enemyTypes = [
      { type: "tree", weakness: "fire", color: "#228B22", health: 1 },
      { type: "slime", weakness: "fire", color: "#9370DB", health: 1 },
      { type: "golem", weakness: "light", color: "#696969", health: 2 },
      { type: "spirit", weakness: "light", color: "#4B0082", health: 2 },
    ]

    gameObjectsRef.current.enemies = []
    for (let i = 0; i < 6; i++) {
      const enemyData = enemyTypes[i % enemyTypes.length]
      const x = 300 + i * 200
      gameObjectsRef.current.enemies.push({
        x,
        y: 500,
        width: 32,
        height: 32,
        velocityX: 0,
        velocityY: 0,
        onGround: false,
        type: enemyData.type,
        weakness: enemyData.weakness,
        health: enemyData.health,
        maxHealth: enemyData.health,
        direction: Math.random() > 0.5 ? 1 : -1,
        speed: 30 + Math.random() * 30,
        dying: false,
        color: enemyData.color,
        currentAnimation: "walk",
        animationFrame: 0,
        animationTimer: 0,
      })
    }

    // Start game loop
    gameObjectsRef.current.lastTime = performance.now()
    gameLoop()
  }

  const gameLoop = () => {
    const currentTime = performance.now()
    const deltaTime = currentTime - gameObjectsRef.current.lastTime
    gameObjectsRef.current.lastTime = currentTime

    update(deltaTime)
    render()
    animationRef.current = requestAnimationFrame(gameLoop)
  }

  const update = (deltaTime: number) => {
    if (gameState.gameWon || gameState.gameLost) return

    const gameObjects = gameObjectsRef.current

    // Update cooldowns
    Object.keys(gameObjects.cooldowns).forEach((key) => {
      if (gameObjects.cooldowns[key] > 0) {
        gameObjects.cooldowns[key] -= deltaTime
      }
    })

    // Update shield
    if (gameObjects.shield?.active) {
      gameObjects.shield.timeLeft -= deltaTime
      if (gameObjects.shield.timeLeft <= 0) {
        gameObjects.shield = null
      }
    }

    // Update player
    updatePlayer(deltaTime)

    // Update enemies
    updateEnemies(deltaTime)

    // Update spells
    updateSpells(deltaTime)

    // Update animations
    updateAnimations(deltaTime)

    // Check collisions
    checkCollisions()

    // Update camera
    updateCamera()

    // Regenerate mana
    if (gameState.mana < 100) {
      setGameState((prev) => ({ ...prev, mana: Math.min(100, prev.mana + 0.05) }))
    }

    // Check win/lose conditions
    checkGameConditions()
  }

  const updatePlayer = (deltaTime: number) => {
    const { player, keys, platforms } = gameObjectsRef.current

    // Horizontal movement
    if (keys["ArrowLeft"]) {
      player.velocityX = -150
      player.flipX = true
      if (player.onGround && player.currentAnimation !== "attack") {
        player.currentAnimation = "walk"
      }
    } else if (keys["ArrowRight"]) {
      player.velocityX = 150
      player.flipX = false
      if (player.onGround && player.currentAnimation !== "attack") {
        player.currentAnimation = "walk"
      }
    } else {
      player.velocityX = 0
      if (player.onGround && player.currentAnimation !== "attack") {
        player.currentAnimation = "idle"
      }
    }

    // Jumping
    if (keys["Space"] && player.onGround) {
      player.velocityY = -350
      player.onGround = false
      player.currentAnimation = "jump"
      player.animationFrame = 0
    }

    // Apply gravity
    if (!player.onGround) {
      player.velocityY += 800 * (deltaTime / 1000)
    }

    // Update position
    player.x += player.velocityX * (deltaTime / 1000)
    player.y += player.velocityY * (deltaTime / 1000)

    // Check platform collisions
    player.onGround = false
    platforms.forEach((platform) => {
      if (
        player.x < platform.x + platform.width &&
        player.x + player.width > platform.x &&
        player.y + player.height > platform.y &&
        player.y + player.height < platform.y + platform.height + 10 &&
        player.velocityY >= 0
      ) {
        player.y = platform.y - player.height
        player.velocityY = 0
        player.onGround = true
      }
    })

    // Keep player in bounds
    player.x = Math.max(0, Math.min(1600 - player.width, player.x))

    // Respawn if fell off
    if (player.y > 700) {
      player.x = 100
      player.y = 400
      player.velocityX = 0
      player.velocityY = 0
      setGameState((prev) => ({ ...prev, health: Math.max(0, prev.health - 20) }))
    }

    // Update invulnerability
    if (player.invulnerable > 0) {
      player.invulnerable -= deltaTime
    }
  }

  const updateEnemies = (deltaTime: number) => {
    const { enemies, platforms } = gameObjectsRef.current

    enemies.forEach((enemy) => {
      if (enemy.dying) return

      // Simple AI movement
      enemy.velocityX = enemy.direction * enemy.speed

      // Change direction at platform edges
      const currentPlatform = platforms.find((p) => enemy.x >= p.x && enemy.x <= p.x + p.width && enemy.y >= p.y - 50)

      if (currentPlatform) {
        if (enemy.x <= currentPlatform.x + 10 || enemy.x >= currentPlatform.x + currentPlatform.width - 10) {
          enemy.direction *= -1
        }
      }

      // Apply gravity
      if (!enemy.onGround) {
        enemy.velocityY += 800 * (deltaTime / 1000)
      }

      // Update position
      enemy.x += enemy.velocityX * (deltaTime / 1000)
      enemy.y += enemy.velocityY * (deltaTime / 1000)

      // Check platform collisions
      enemy.onGround = false
      platforms.forEach((platform) => {
        if (
          enemy.x < platform.x + platform.width &&
          enemy.x + enemy.width > platform.x &&
          enemy.y + enemy.height > platform.y &&
          enemy.y + enemy.height < platform.y + platform.height + 10 &&
          enemy.velocityY >= 0
        ) {
          enemy.y = platform.y - enemy.height
          enemy.velocityY = 0
          enemy.onGround = true
        }
      })
    })
  }

  const updateSpells = (deltaTime: number) => {
    const { spells } = gameObjectsRef.current

    gameObjectsRef.current.spells = spells.filter((spell) => {
      if (!spell.active) return false

      spell.x += spell.velocityX * (deltaTime / 1000)
      spell.y += spell.velocityY * (deltaTime / 1000)
      spell.lifetime -= deltaTime

      // Remove spells that are too old or off screen
      if (spell.lifetime <= 0 || spell.x < -100 || spell.x > 1700 || spell.y < -100 || spell.y > 700) {
        return false
      }

      return true
    })
  }

  const updateAnimations = (deltaTime: number) => {
    const { player, enemies } = gameObjectsRef.current

    // Update player animation
    player.animationTimer += deltaTime
    if (player.animationTimer > 150) {
      player.animationTimer = 0
      player.animationFrame = (player.animationFrame + 1) % 4

      // Reset attack animation
      if (player.currentAnimation === "attack" && player.animationFrame === 0) {
        player.currentAnimation = player.onGround ? "idle" : "jump"
      }
    }

    // Update enemy animations
    enemies.forEach((enemy) => {
      enemy.animationTimer += deltaTime
      if (enemy.animationTimer > 200) {
        enemy.animationTimer = 0
        enemy.animationFrame = (enemy.animationFrame + 1) % 4
      }
    })
  }

  const updateCamera = () => {
    const { player, camera } = gameObjectsRef.current

    // Follow player
    camera.x = player.x - 400
    camera.y = player.y - 300

    // Keep camera in bounds
    camera.x = Math.max(0, Math.min(800, camera.x))
    camera.y = Math.max(-200, Math.min(200, camera.y))
  }

  const checkCollisions = () => {
    const { player, enemies, spells, shield } = gameObjectsRef.current

    // Player vs enemies
    if (player.invulnerable <= 0 && (!shield || !shield.active)) {
      enemies.forEach((enemy) => {
        if (
          enemy.dying ||
          player.x + player.width < enemy.x ||
          player.x > enemy.x + enemy.width ||
          player.y + player.height < enemy.y ||
          player.y > enemy.y + enemy.height
        )
          return

        // Player hit by enemy
        setGameState((prev) => ({ ...prev, health: Math.max(0, prev.health - 15) }))
        player.invulnerable = 2000

        // Knockback
        const direction = player.x < enemy.x ? -1 : 1
        player.velocityX = direction * 200
        player.velocityY = -150
      })
    }

    // Spells vs enemies
    spells.forEach((spell, spellIndex) => {
      enemies.forEach((enemy) => {
        if (
          enemy.dying ||
          spell.x + spell.width < enemy.x ||
          spell.x > enemy.x + enemy.width ||
          spell.y + spell.height < enemy.y ||
          spell.y > enemy.y + enemy.height
        )
          return

        // Check if spell can damage this enemy
        if (
          (spell.type === "fire" && enemy.weakness === "fire") ||
          (spell.type === "light" && enemy.weakness === "light")
        ) {
          enemy.health -= 1
          if (enemy.health <= 0) {
            enemy.dying = true
            enemy.currentAnimation = "death"
            enemy.animationFrame = 0
            setGameState((prev) => ({ ...prev, enemiesDefeated: prev.enemiesDefeated + 1 }))
          }
        }

        // Remove spell
        spell.active = false
      })
    })
  }

  const checkGameConditions = () => {
    if (gameState.enemiesDefeated >= gameState.totalEnemies && !gameState.gameWon) {
      setGameState((prev) => ({ ...prev, gameWon: true }))
    }

    if (gameState.health <= 0 && !gameState.gameLost) {
      setGameState((prev) => ({ ...prev, gameLost: true }))
    }
  }

  const render = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { player, enemies, spells, platforms, camera, shield } = gameObjectsRef.current

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, "#87CEEB")
    gradient.addColorStop(0.7, "#98FB98")
    gradient.addColorStop(1, "#228B22")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Save context for camera transform
    ctx.save()
    ctx.translate(-camera.x, -camera.y)

    // Draw platforms
    ctx.fillStyle = "#8B4513"
    ctx.strokeStyle = "#654321"
    ctx.lineWidth = 2
    platforms.forEach((platform) => {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height)
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height)

      // Add some texture
      ctx.fillStyle = "#A0522D"
      for (let i = 0; i < platform.width; i += 20) {
        ctx.fillRect(platform.x + i, platform.y, 2, platform.height)
      }
      ctx.fillStyle = "#8B4513"
    })

    // Draw player
    drawPlayer(ctx, player)

    // Draw shield
    if (shield?.active) {
      ctx.strokeStyle = "#4169E1"
      ctx.lineWidth = 3
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 35, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Draw enemies
    enemies.forEach((enemy) => {
      if (!enemy.dying) {
        drawEnemy(ctx, enemy)
      }
    })

    // Draw spells
    spells.forEach((spell) => {
      if (spell.active) {
        drawSpell(ctx, spell)
      }
    })

    // Restore context
    ctx.restore()
  }

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
    const isFlashing = player.invulnerable > 0 && Math.floor(Date.now() / 100) % 2

    if (!isFlashing) {
      // Player body
      ctx.fillStyle = "#4169E1"
      ctx.fillRect(player.x, player.y, player.width, player.height)

      // Player face
      ctx.fillStyle = "#FFE4B5"
      ctx.fillRect(player.x + 8, player.y + 8, 16, 16)

      // Player eyes
      ctx.fillStyle = "#000000"
      ctx.fillRect(player.x + 10, player.y + 12, 2, 2)
      ctx.fillRect(player.x + 20, player.y + 12, 2, 2)

      // Animation effects
      if (player.currentAnimation === "attack") {
        // Attack effect
        ctx.fillStyle = "#FFD700"
        const direction = player.flipX ? -1 : 1
        ctx.fillRect(player.x + direction * 20, player.y + 10, 15, 8)
      }

      // Player hat (wizard)
      ctx.fillStyle = "#800080"
      ctx.fillRect(player.x + 6, player.y, 20, 8)
      ctx.fillRect(player.x + 10, player.y - 5, 12, 5)
    }
  }

  const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
    // Enemy body
    ctx.fillStyle = enemy.color
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height)

    // Enemy eyes
    ctx.fillStyle = "#FF0000"
    ctx.fillRect(enemy.x + 8, enemy.y + 8, 3, 3)
    ctx.fillRect(enemy.x + 21, enemy.y + 8, 3, 3)

    // Type-specific features
    switch (enemy.type) {
      case "tree":
        // Tree branches
        ctx.fillStyle = "#654321"
        ctx.fillRect(enemy.x + 5, enemy.y - 5, 22, 5)
        break
      case "slime":
        // Slime shine
        ctx.fillStyle = "#DDA0DD"
        ctx.fillRect(enemy.x + 4, enemy.y + 4, 8, 8)
        break
      case "golem":
        // Golem cracks
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(enemy.x + 10, enemy.y + 5)
        ctx.lineTo(enemy.x + 15, enemy.y + 15)
        ctx.stroke()
        break
      case "spirit":
        // Spirit glow
        ctx.globalAlpha = 0.8
        ctx.fillStyle = "#9370DB"
        ctx.fillRect(enemy.x - 2, enemy.y - 2, enemy.width + 4, enemy.height + 4)
        ctx.globalAlpha = 1
        break
    }

    // Health bar
    ctx.fillStyle = "#FF0000"
    ctx.fillRect(enemy.x, enemy.y - 10, enemy.width, 4)
    ctx.fillStyle = "#00FF00"
    ctx.fillRect(enemy.x, enemy.y - 10, (enemy.width * enemy.health) / enemy.maxHealth, 4)
  }

  const drawSpell = (ctx: CanvasRenderingContext2D, spell: Spell) => {
    if (spell.type === "fire") {
      // Fireball
      ctx.fillStyle = "#FF4500"
      ctx.fillRect(spell.x, spell.y, spell.width, spell.height)
      ctx.fillStyle = "#FFD700"
      ctx.fillRect(spell.x + 2, spell.y + 2, spell.width - 4, spell.height - 4)

      // Fire trail
      ctx.fillStyle = "#FF6347"
      ctx.globalAlpha = 0.5
      ctx.fillRect(spell.x - 8, spell.y + 2, 8, spell.height - 4)
      ctx.globalAlpha = 1
    } else if (spell.type === "light") {
      // Light orb
      ctx.fillStyle = "#FFD700"
      ctx.beginPath()
      ctx.arc(spell.x + spell.width / 2, spell.y + spell.height / 2, spell.width / 2, 0, Math.PI * 2)
      ctx.fill()

      // Light glow
      ctx.fillStyle = "#FFFFFF"
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(spell.x + spell.width / 2, spell.y + spell.height / 2, spell.width / 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  return (
    <div className="relative w-full">
      {/* Enhanced HUD */}
      <div className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex justify-between text-white">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="w-8 text-sm font-bold">HP:</span>
              <div className="h-6 w-40 rounded-full border-2 border-red-800 bg-gray-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                  style={{ width: `${gameState.health}%` }}
                ></div>
              </div>
              <span className="text-sm font-mono">{gameState.health}/100</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 text-sm font-bold">MP:</span>
              <div className="h-6 w-40 rounded-full border-2 border-blue-800 bg-gray-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-400 transition-all duration-300"
                  style={{ width: `${gameState.mana}%` }}
                ></div>
              </div>
              <span className="text-sm font-mono">{Math.round(gameState.mana)}/100</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold text-amber-300">
              Enemigos: {gameState.totalEnemies - gameState.enemiesDefeated}/{gameState.totalEnemies}
            </div>
            <div className="text-sm text-green-300">Curaciones: {gameState.healUses}/3</div>
            <div className="text-xs text-gray-300">
              Debug: <span className="text-yellow-300">{debugInfo}</span>
            </div>
            <div className="text-xs">
              Comandos: {commandCount} | Micrófono: {isListening ? "🎤 Activo" : "❌ Inactivo"}
            </div>
            <div className="text-xs text-blue-300">
              Último: <span className="text-cyan-300">{lastCommand.split("_")[0] || "..."}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full rounded-lg border-4 border-amber-600 bg-black"
        style={{ aspectRatio: "4/3" }}
      />

      {/* Game Over Screen */}
      {gameState.gameLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="rounded-xl border-4 border-red-600 bg-gradient-to-b from-red-900 to-red-800 p-8 text-center text-white shadow-2xl">
            <h2 className="mb-4 text-6xl font-bold text-red-300">💀 GAME OVER 💀</h2>
            <p className="mb-4 text-2xl">Te quedaste sin vida</p>
            <p className="text-lg text-red-200">
              Enemigos derrotados: {gameState.enemiesDefeated}/{gameState.totalEnemies}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-600 px-6 py-3 text-lg font-bold hover:bg-red-500"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Victory Screen */}
      {gameState.gameWon && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="rounded-xl border-4 border-green-600 bg-gradient-to-b from-green-900 to-green-800 p-8 text-center text-white shadow-2xl">
            <h2 className="mb-4 text-6xl font-bold text-green-300">🎉 ¡VICTORIA! 🎉</h2>
            <p className="mb-4 text-2xl">¡Has derrotado a todos los enemigos!</p>
            <p className="text-lg text-green-200">
              ¡Perfecto! {gameState.totalEnemies}/{gameState.totalEnemies} enemigos eliminados
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-green-600 px-6 py-3 text-lg font-bold hover:bg-green-500"
            >
              Jugar de Nuevo
            </button>
          </div>
        </div>
      )}

      {/* Instructions with Voice Command Testing */}
      <div className="mt-4 rounded-lg bg-amber-900/50 p-4 text-amber-100">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold">Controles y Comandos:</h3>
          <div className="text-sm">
            <span className="text-green-400">●</span> Comandos detectados: {commandCount}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p>
              <kbd className="bg-amber-800 px-1 rounded">←</kbd> <kbd className="bg-amber-800 px-1 rounded">→</kbd> :
              Moverse
            </p>
            <p>
              <kbd className="bg-amber-800 px-1 rounded">Espacio</kbd> : Saltar
            </p>
          </div>
          <div>
            <p>
              <strong>"¡Fuego!"</strong> : Bola de fuego (20 MP)
            </p>
            <p>
              <strong>"¡Luz!"</strong> : Hechizo de luz (15 MP)
            </p>
            <p>
              <strong>"¡Escudo!"</strong> : Protección (30 MP)
            </p>
            <p>
              <strong>"¡Curar!"</strong> : Recuperar vida (40 MP)
            </p>
            <p>
              <strong>"¡Saltar!"</strong> : Salto potenciado (25 MP)
            </p>
          </div>
        </div>

        {/* Voice Command Test Buttons */}
        <div className="border-t border-amber-700 pt-3">
          <p className="text-xs mb-2 text-amber-200">🎤 Prueba de Comandos de Voz (di en voz alta):</p>
          <div className="grid grid-cols-5 gap-2">
            <button
              onClick={() => processVoiceCommand("fuego_test")}
              className="bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-xs"
            >
              🔥 Fuego
            </button>
            <button
              onClick={() => processVoiceCommand("luz_test")}
              className="bg-yellow-600 hover:bg-yellow-500 px-2 py-1 rounded text-xs"
            >
              💡 Luz
            </button>
            <button
              onClick={() => processVoiceCommand("escudo_test")}
              className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-xs"
            >
              🛡️ Escudo
            </button>
            <button
              onClick={() => processVoiceCommand("curar_test")}
              className="bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs"
            >
              💚 Curar
            </button>
            <button
              onClick={() => processVoiceCommand("saltar_test")}
              className="bg-purple-600 hover:bg-purple-500 px-2 py-1 rounded text-xs"
            >
              🚀 Saltar
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs">
          <strong>Estrategia:</strong> 🌳 Árboles y 🟣 Slimes = Fuego | 🗿 Golems y 👻 Espíritus = Luz
        </p>

        <div className="mt-2 text-xs text-amber-300 bg-amber-800/30 p-2 rounded">
          <strong>Estado del Micrófono:</strong> {debugInfo} |<strong> Comandos Procesados:</strong> {commandCount}
        </div>
      </div>
    </div>
  )
}
