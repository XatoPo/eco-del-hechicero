"use client"

import { useRef, useEffect, useState } from "react"
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition"
import * as PIXI from "pixi.js"

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

export default function PixiGameEngine() {
  const gameRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const gameObjectsRef = useRef<any>({})
  const { lastCommand, isListening, startListening } = useVoiceRecognition()

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

  useEffect(() => {
    initializeGame()
    startListening()

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true })
      }
    }
  }, [startListening])

  useEffect(() => {
    if (lastCommand && gameObjectsRef.current.gameScene) {
      processVoiceCommand(lastCommand)
    }
  }, [lastCommand])

  const initializeGame = async () => {
    if (!gameRef.current) return

    // Create PIXI Application
    const app = new PIXI.Application({
      width: 800,
      height: 600,
      backgroundColor: 0x87ceeb,
      antialias: true,
    })

    appRef.current = app
    gameRef.current.appendChild(app.view as HTMLCanvasElement)

    // Load all assets
    await loadAssets(app)

    // Create game scene
    createGameScene(app)

    // Start game loop
    app.ticker.add(gameLoop)
  }

  const loadAssets = async (app: PIXI.Application) => {
    const loader = PIXI.Assets

    // Load all sprites
    const assets = {
      // Wizard sprites
      wizardIdle: "/sprites/wizard.png",
      wizardWalk: "/sprites/wizard-walk.png",
      wizardJump: "/sprites/wizard-jump.png",
      wizardAttack: "/sprites/wizard-attack.png",

      // Spell effects
      fireball: "/sprites/fireball.png",
      shieldStatic: "/sprites/shield-static.png",
      shieldAnimated: "/sprites/shield-animated.png",
      lightEffect: "/sprites/light-effect.png",
      healEffect: "/sprites/heal-effect.png",

      // Enemies
      enemy1Walk: "/sprites/enemy1-walk.png",
      enemy1Attack: "/sprites/enemy1-attack.png",
      enemy1Death: "/sprites/enemy1-death.png",
      enemy2Walk: "/sprites/enemy2-walk.png",
      enemy2Attack: "/sprites/enemy2-attack.png",
      enemy2Death: "/sprites/enemy2-death.png",
      enemy3Walk: "/sprites/enemy3-walk.png",
      enemy3Attack: "/sprites/enemy3-attack.png",
      enemy3Death: "/sprites/enemy3-death.png",
      enemy4Walk: "/sprites/enemy4-walk.png",
      enemy4Attack: "/sprites/enemy4-attack.png",
      enemy4Death: "/sprites/enemy4-death.png",

      // Environment
      forestTiles: "/tilesets/forest-tiles.png",
      forestBg1: "/backgrounds/forest-bg-1.png",
      forestBg2: "/backgrounds/forest-bg-2.png",
      forestBg3: "/backgrounds/forest-bg-3.png",
    }

    // Load all assets
    for (const [key, url] of Object.entries(assets)) {
      try {
        await loader.load(url)
        console.log(`Loaded: ${key}`)
      } catch (error) {
        console.warn(`Failed to load ${key}:`, error)
      }
    }
  }

  const createGameScene = (app: PIXI.Application) => {
    const gameScene = new PIXI.Container()
    app.stage.addChild(gameScene)

    // Create background layers
    createBackground(gameScene)

    // Create platforms
    const platforms = createPlatforms(gameScene)

    // Create player
    const player = createPlayer(gameScene)

    // Create enemies
    const enemies = createEnemies(gameScene)

    // Create spell containers
    const spells = new PIXI.Container()
    gameScene.addChild(spells)

    // Store references
    gameObjectsRef.current = {
      app,
      gameScene,
      player,
      enemies,
      platforms,
      spells,
      camera: { x: 0, y: 0 },
      cooldowns: {
        fireball: 0,
        shield: 0,
        light: 0,
        heal: 0,
        superJump: 0,
      },
      shield: null,
      invulnerable: 0,
      keys: { left: false, right: false, space: false },
    }

    // Setup input
    setupInput()

    console.log("Game scene created successfully")
  }

  const createBackground = (gameScene: PIXI.Container) => {
    // Create parallax background layers
    const bgContainer = new PIXI.Container()
    gameScene.addChild(bgContainer)

    try {
      // Background layer 3 (farthest)
      const bg3Texture = PIXI.Texture.from("/backgrounds/forest-bg-3.png")
      const bg3 = new PIXI.TilingSprite(bg3Texture, 1600, 600)
      bg3.zIndex = -30
      bgContainer.addChild(bg3)

      // Background layer 2 (middle)
      const bg2Texture = PIXI.Texture.from("/backgrounds/forest-bg-2.png")
      const bg2 = new PIXI.TilingSprite(bg2Texture, 1600, 600)
      bg2.zIndex = -20
      bgContainer.addChild(bg2)

      // Background layer 1 (closest)
      const bg1Texture = PIXI.Texture.from("/backgrounds/forest-bg-1.png")
      const bg1 = new PIXI.TilingSprite(bg1Texture, 1600, 600)
      bg1.zIndex = -10
      bgContainer.addChild(bg1)

      gameObjectsRef.current.backgrounds = { bg1, bg2, bg3 }
    } catch (error) {
      console.warn("Could not load background images, using fallback")
      // Create gradient fallback
      const graphics = new PIXI.Graphics()
      graphics.beginFill(0x87ceeb)
      graphics.drawRect(0, 0, 1600, 300)
      graphics.beginFill(0x228b22)
      graphics.drawRect(0, 300, 1600, 300)
      graphics.endFill()
      graphics.zIndex = -40
      bgContainer.addChild(graphics)
    }
  }

  const createPlatforms = (gameScene: PIXI.Container) => {
    const platformsContainer = new PIXI.Container()
    gameScene.addChild(platformsContainer)

    const platformData = [
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

    const platforms: any[] = []

    platformData.forEach((data) => {
      try {
        // Try to use forest tiles texture
        const tileTexture = PIXI.Texture.from("/tilesets/forest-tiles.png")
        const platform = new PIXI.TilingSprite(tileTexture, data.width, data.height)
        platform.x = data.x
        platform.y = data.y
        platform.zIndex = 0
        platformsContainer.addChild(platform)
        platforms.push({ ...data, sprite: platform })
      } catch (error) {
        // Fallback to colored rectangles
        const graphics = new PIXI.Graphics()
        graphics.beginFill(0x8b4513)
        graphics.lineStyle(2, 0x654321)
        graphics.drawRect(0, 0, data.width, data.height)
        graphics.endFill()
        graphics.x = data.x
        graphics.y = data.y
        graphics.zIndex = 0
        platformsContainer.addChild(graphics)
        platforms.push({ ...data, sprite: graphics })
      }
    })

    return platforms
  }

  const createPlayer = (gameScene: PIXI.Container) => {
    const playerContainer = new PIXI.Container()
    gameScene.addChild(playerContainer)

    let playerSprite: PIXI.Sprite

    try {
      // Try to use wizard sprite
      const wizardTexture = PIXI.Texture.from("/sprites/wizard.png")
      playerSprite = new PIXI.Sprite(wizardTexture)
      playerSprite.width = 32
      playerSprite.height = 48
    } catch (error) {
      // Fallback sprite
      const graphics = new PIXI.Graphics()
      graphics.beginFill(0x4169e1)
      graphics.drawRect(0, 0, 32, 48)
      graphics.beginFill(0xffe4b5)
      graphics.drawRect(8, 8, 16, 16)
      graphics.beginFill(0x000000)
      graphics.drawRect(10, 12, 2, 2)
      graphics.drawRect(20, 12, 2, 2)
      graphics.endFill()
      playerSprite = new PIXI.Sprite(appRef.current!.renderer.generateTexture(graphics))
    }

    playerSprite.x = 100
    playerSprite.y = 450
    playerSprite.zIndex = 100
    playerContainer.addChild(playerSprite)

    return {
      container: playerContainer,
      sprite: playerSprite,
      x: 100,
      y: 450,
      width: 32,
      height: 48,
      velocityX: 0,
      velocityY: 0,
      onGround: false,
      flipX: false,
      health: 100,
      mana: 100,
      invulnerable: 0,
    }
  }

  const createEnemies = (gameScene: PIXI.Container) => {
    const enemiesContainer = new PIXI.Container()
    gameScene.addChild(enemiesContainer)

    const enemyTypes = [
      { type: "tree", weakness: "fire", color: 0x228b22, health: 1, sprite: "/sprites/enemy1-walk.png" },
      { type: "slime", weakness: "fire", color: 0x9370db, health: 1, sprite: "/sprites/enemy2-walk.png" },
      { type: "golem", weakness: "light", color: 0x696969, health: 2, sprite: "/sprites/enemy3-walk.png" },
      { type: "spirit", weakness: "light", color: 0x4b0082, health: 2, sprite: "/sprites/enemy4-walk.png" },
    ]

    const enemies: any[] = []

    for (let i = 0; i < 6; i++) {
      const enemyData = enemyTypes[i % enemyTypes.length]
      const x = 300 + i * 200

      let enemySprite: PIXI.Sprite

      try {
        // Try to use enemy sprite
        const enemyTexture = PIXI.Texture.from(enemyData.sprite)
        enemySprite = new PIXI.Sprite(enemyTexture)
        enemySprite.width = 32
        enemySprite.height = 32
      } catch (error) {
        // Fallback sprite
        const graphics = new PIXI.Graphics()
        graphics.beginFill(enemyData.color)
        graphics.drawRect(0, 0, 32, 32)
        graphics.beginFill(0xff0000)
        graphics.drawRect(8, 8, 3, 3)
        graphics.drawRect(21, 8, 3, 3)
        graphics.endFill()
        enemySprite = new PIXI.Sprite(appRef.current!.renderer.generateTexture(graphics))
      }

      enemySprite.x = x
      enemySprite.y = 500
      enemySprite.zIndex = 95
      enemiesContainer.addChild(enemySprite)

      // Health bar
      const healthBarBg = new PIXI.Graphics()
      healthBarBg.beginFill(0xff0000)
      healthBarBg.drawRect(0, 0, 32, 4)
      healthBarBg.endFill()
      healthBarBg.x = x
      healthBarBg.y = 490

      const healthBarFg = new PIXI.Graphics()
      healthBarFg.beginFill(0x00ff00)
      healthBarFg.drawRect(0, 0, 32, 4)
      healthBarFg.endFill()
      healthBarFg.x = x
      healthBarFg.y = 490

      enemiesContainer.addChild(healthBarBg)
      enemiesContainer.addChild(healthBarFg)

      enemies.push({
        sprite: enemySprite,
        healthBarBg,
        healthBarFg,
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
      })
    }

    return enemies
  }

  const setupInput = () => {
    const keys = gameObjectsRef.current.keys

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowLeft":
          keys.left = true
          break
        case "ArrowRight":
          keys.right = true
          break
        case "Space":
          keys.space = true
          e.preventDefault()
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowLeft":
          keys.left = false
          break
        case "ArrowRight":
          keys.right = false
          break
        case "Space":
          keys.space = false
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    // Store cleanup function
    gameObjectsRef.current.cleanup = () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }

  const processVoiceCommand = (command: string) => {
    const cmd = command.toLowerCase().trim()
    console.log("Processing voice command:", cmd)

    if (cmd.includes("fuego") || cmd.includes("fire")) {
      castFireball()
    } else if (cmd.includes("escudo") || cmd.includes("shield")) {
      castShield()
    } else if (cmd.includes("luz") || cmd.includes("light")) {
      castLight()
    } else if (cmd.includes("curar") || cmd.includes("heal")) {
      castHeal()
    } else if (cmd.includes("saltar") || cmd.includes("jump")) {
      castSuperJump()
    }
  }

  const castFireball = () => {
    const { player, cooldowns, spells } = gameObjectsRef.current

    if (cooldowns.fireball > 0 || gameState.mana < 20) return

    setGameState((prev) => ({ ...prev, mana: Math.max(0, prev.mana - 20) }))
    cooldowns.fireball = 500

    const direction = player.flipX ? -1 : 1

    let fireballSprite: PIXI.Sprite

    try {
      const fireballTexture = PIXI.Texture.from("/sprites/fireball.png")
      fireballSprite = new PIXI.Sprite(fireballTexture)
      fireballSprite.width = 16
      fireballSprite.height = 8
    } catch (error) {
      const graphics = new PIXI.Graphics()
      graphics.beginFill(0xff4500)
      graphics.drawRect(0, 0, 16, 8)
      graphics.beginFill(0xffd700)
      graphics.drawRect(2, 2, 12, 4)
      graphics.endFill()
      fireballSprite = new PIXI.Sprite(appRef.current!.renderer.generateTexture(graphics))
    }

    fireballSprite.x = player.x + direction * 40
    fireballSprite.y = player.y + 15
    fireballSprite.zIndex = 90
    spells.addChild(fireballSprite)

    const spell = {
      sprite: fireballSprite,
      x: fireballSprite.x,
      y: fireballSprite.y,
      velocityX: direction * 300,
      velocityY: 0,
      type: "fire",
      active: true,
      lifetime: 3000,
    }

    gameObjectsRef.current.activeSpells = gameObjectsRef.current.activeSpells || []
    gameObjectsRef.current.activeSpells.push(spell)

    console.log("Fireball cast!")
  }

  const castLight = () => {
    const { player, cooldowns, spells } = gameObjectsRef.current

    if (cooldowns.light > 0 || gameState.mana < 15) return

    setGameState((prev) => ({ ...prev, mana: Math.max(0, prev.mana - 15) }))
    cooldowns.light = 500

    const direction = player.flipX ? -1 : 1

    let lightSprite: PIXI.Sprite

    try {
      const lightTexture = PIXI.Texture.from("/sprites/light-effect.png")
      lightSprite = new PIXI.Sprite(lightTexture)
      lightSprite.width = 20
      lightSprite.height = 20
    } catch (error) {
      const graphics = new PIXI.Graphics()
      graphics.beginFill(0xffd700)
      graphics.drawCircle(10, 10, 10)
      graphics.beginFill(0xffffff)
      graphics.drawCircle(10, 10, 5)
      graphics.endFill()
      lightSprite = new PIXI.Sprite(appRef.current!.renderer.generateTexture(graphics))
    }

    lightSprite.x = player.x + direction * 40
    lightSprite.y = player.y + 15
    lightSprite.zIndex = 90
    spells.addChild(lightSprite)

    const spell = {
      sprite: lightSprite,
      x: lightSprite.x,
      y: lightSprite.y,
      velocityX: direction * 250,
      velocityY: 0,
      type: "light",
      active: true,
      lifetime: 3000,
    }

    gameObjectsRef.current.activeSpells = gameObjectsRef.current.activeSpells || []
    gameObjectsRef.current.activeSpells.push(spell)

    console.log("Light cast!")
  }

  const castShield = () => {
    const { player, cooldowns } = gameObjectsRef.current

    if (cooldowns.shield > 0 || gameState.mana < 30) return

    setGameState((prev) => ({ ...prev, mana: Math.max(0, prev.mana - 30) }))
    cooldowns.shield = 8000

    // Remove existing shield
    if (gameObjectsRef.current.shield) {
      gameObjectsRef.current.shield.destroy()
    }

    let shieldSprite: PIXI.Graphics

    try {
      shieldSprite = new PIXI.Graphics()
      shieldSprite.lineStyle(3, 0x4169e1, 0.8)
      shieldSprite.drawCircle(0, 0, 30)
      shieldSprite.x = player.x + player.width / 2
      shieldSprite.y = player.y + player.height / 2
      shieldSprite.zIndex = 85
      gameObjectsRef.current.gameScene.addChild(shieldSprite)

      gameObjectsRef.current.shield = {
        sprite: shieldSprite,
        active: true,
        timeLeft: 5000,
      }
    } catch (error) {
      console.warn("Could not create shield sprite")
    }

    console.log("Shield cast!")
  }

  const castHeal = () => {
    const { cooldowns } = gameObjectsRef.current

    if (cooldowns.heal > 0 || gameState.mana < 40 || gameState.healUses <= 0) return

    setGameState((prev) => ({
      ...prev,
      mana: Math.max(0, prev.mana - 40),
      health: Math.min(100, prev.health + 25),
      healUses: prev.healUses - 1,
    }))
    cooldowns.heal = 10000

    console.log("Heal cast!")
  }

  const castSuperJump = () => {
    const { player, cooldowns } = gameObjectsRef.current

    if (cooldowns.superJump > 0 || gameState.mana < 25) return

    setGameState((prev) => ({ ...prev, mana: Math.max(0, prev.mana - 25) }))
    cooldowns.superJump = 3000

    player.velocityY = -450
    console.log("Super jump cast!")
  }

  const gameLoop = () => {
    const deltaTime = appRef.current!.ticker.deltaMS

    updateGame(deltaTime)
    updateCamera()
  }

  const updateGame = (deltaTime: number) => {
    const gameObjects = gameObjectsRef.current

    // Update cooldowns
    Object.keys(gameObjects.cooldowns).forEach((key) => {
      if (gameObjects.cooldowns[key] > 0) {
        gameObjects.cooldowns[key] -= deltaTime
      }
    })

    // Update shield
    if (gameObjects.shield && gameObjects.shield.active) {
      gameObjects.shield.timeLeft -= deltaTime
      if (gameObjects.shield.timeLeft <= 0) {
        gameObjects.shield.sprite.destroy()
        gameObjects.shield = null
      } else {
        gameObjects.shield.sprite.x = gameObjects.player.x + gameObjects.player.width / 2
        gameObjects.shield.sprite.y = gameObjects.player.y + gameObjects.player.height / 2
      }
    }

    // Update player
    updatePlayer(deltaTime)

    // Update enemies
    updateEnemies(deltaTime)

    // Update spells
    updateSpells(deltaTime)

    // Check collisions
    checkCollisions()

    // Regenerate mana
    if (gameState.mana < 100) {
      setGameState((prev) => ({ ...prev, mana: Math.min(100, prev.mana + 0.1) }))
    }

    // Check win/lose conditions
    checkGameConditions()
  }

  const updatePlayer = (deltaTime: number) => {
    const { player, keys, platforms } = gameObjectsRef.current

    // Horizontal movement
    if (keys.left) {
      player.velocityX = -150
      player.flipX = true
      player.sprite.scale.x = -1
    } else if (keys.right) {
      player.velocityX = 150
      player.flipX = false
      player.sprite.scale.x = 1
    } else {
      player.velocityX = 0
    }

    // Jumping
    if (keys.space && player.onGround) {
      player.velocityY = -350
      player.onGround = false
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
    platforms.forEach((platform: any) => {
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
      player.y = 450
      player.velocityX = 0
      player.velocityY = 0
      setGameState((prev) => ({ ...prev, health: Math.max(0, prev.health - 20) }))
    }

    // Update sprite position
    player.sprite.x = player.x
    player.sprite.y = player.y

    // Update invulnerability
    if (player.invulnerable > 0) {
      player.invulnerable -= deltaTime
      player.sprite.alpha = Math.sin(Date.now() / 100) * 0.5 + 0.5
    } else {
      player.sprite.alpha = 1
    }
  }

  const updateEnemies = (deltaTime: number) => {
    const { enemies, platforms } = gameObjectsRef.current

    enemies.forEach((enemy: any) => {
      if (enemy.dying) return

      // Simple AI movement
      enemy.velocityX = enemy.direction * enemy.speed

      // Change direction at platform edges
      const currentPlatform = platforms.find(
        (p: any) => enemy.x >= p.x && enemy.x <= p.x + p.width && enemy.y >= p.y - 50,
      )

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
      platforms.forEach((platform: any) => {
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

      // Update sprite position
      enemy.sprite.x = enemy.x
      enemy.sprite.y = enemy.y
      enemy.sprite.scale.x = enemy.direction === -1 ? -1 : 1

      // Update health bar
      enemy.healthBarBg.x = enemy.x
      enemy.healthBarBg.y = enemy.y - 10
      enemy.healthBarFg.x = enemy.x
      enemy.healthBarFg.y = enemy.y - 10
      enemy.healthBarFg.width = (32 * enemy.health) / enemy.maxHealth
    })
  }

  const updateSpells = (deltaTime: number) => {
    if (!gameObjectsRef.current.activeSpells) return

    gameObjectsRef.current.activeSpells = gameObjectsRef.current.activeSpells.filter((spell: any) => {
      if (!spell.active) return false

      spell.x += spell.velocityX * (deltaTime / 1000)
      spell.y += spell.velocityY * (deltaTime / 1000)
      spell.lifetime -= deltaTime

      // Update sprite position
      spell.sprite.x = spell.x
      spell.sprite.y = spell.y

      // Remove spells that are too old or off screen
      if (spell.lifetime <= 0 || spell.x < -100 || spell.x > 1700 || spell.y < -100 || spell.y > 700) {
        spell.sprite.destroy()
        return false
      }

      return true
    })
  }

  const updateCamera = () => {
    const { gameScene, player, camera } = gameObjectsRef.current

    // Follow player
    camera.x = player.x - 400
    camera.y = player.y - 300

    // Keep camera in bounds
    camera.x = Math.max(0, Math.min(800, camera.x))
    camera.y = Math.max(-200, Math.min(200, camera.y))

    // Apply camera transform
    gameScene.x = -camera.x
    gameScene.y = -camera.y

    // Update parallax backgrounds
    if (gameObjectsRef.current.backgrounds) {
      const { bg1, bg2, bg3 } = gameObjectsRef.current.backgrounds
      bg3.tilePosition.x = camera.x * 0.1
      bg2.tilePosition.x = camera.x * 0.3
      bg1.tilePosition.x = camera.x * 0.5
    }
  }

  const checkCollisions = () => {
    const { player, enemies, activeSpells, shield } = gameObjectsRef.current

    // Player vs enemies
    if (player.invulnerable <= 0 && (!shield || !shield.active)) {
      enemies.forEach((enemy: any) => {
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
    if (activeSpells) {
      activeSpells.forEach((spell: any, spellIndex: number) => {
        enemies.forEach((enemy: any) => {
          if (
            enemy.dying ||
            spell.x + 16 < enemy.x ||
            spell.x > enemy.x + enemy.width ||
            spell.y + 8 < enemy.y ||
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
              enemy.sprite.alpha = 0.5
              setGameState((prev) => ({ ...prev, enemiesDefeated: prev.enemiesDefeated + 1 }))
            }
          }

          // Remove spell
          spell.active = false
          spell.sprite.destroy()
        })
      })
    }
  }

  const checkGameConditions = () => {
    if (gameState.enemiesDefeated >= gameState.totalEnemies && !gameState.gameWon) {
      setGameState((prev) => ({ ...prev, gameWon: true }))
    }

    if (gameState.health <= 0 && !gameState.gameLost) {
      setGameState((prev) => ({ ...prev, gameLost: true }))
    }
  }

  return (
    <div className="relative w-full">
      {/* HUD */}
      <div className="absolute left-0 right-0 top-0 z-10 flex justify-between p-4 text-white">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold">HP:</span>
            <div className="h-4 w-32 rounded bg-gray-800">
              <div className="h-4 rounded bg-red-500 transition-all" style={{ width: `${gameState.health}%` }}></div>
            </div>
            <span className="text-sm">{gameState.health}/100</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">MP:</span>
            <div className="h-4 w-32 rounded bg-gray-800">
              <div className="h-4 rounded bg-blue-500 transition-all" style={{ width: `${gameState.mana}%` }}></div>
            </div>
            <span className="text-sm">{Math.round(gameState.mana)}/100</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold">
            Enemigos: {gameState.totalEnemies - gameState.enemiesDefeated}/{gameState.totalEnemies}
          </div>
          <div className="font-bold">Curaciones: {gameState.healUses}/3</div>
          <div className="text-sm">Último comando: {lastCommand || "..."}</div>
          <div className="text-sm">Micrófono: {isListening ? "🎤 Activo" : "❌ Inactivo"}</div>
        </div>
      </div>

      {/* Game Container */}
      <div
        ref={gameRef}
        className="w-full rounded-lg border-4 border-amber-600 bg-black"
        style={{ aspectRatio: "4/3", height: "600px" }}
      />

      {/* Game Over/Victory */}
      {gameState.gameWon && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="rounded-lg bg-green-600 p-8 text-center text-white">
            <h2 className="mb-4 text-4xl font-bold">¡VICTORIA!</h2>
            <p className="text-xl">¡Has derrotado a todos los enemigos!</p>
          </div>
        </div>
      )}

      {gameState.gameLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="rounded-lg bg-red-600 p-8 text-center text-white">
            <h2 className="mb-4 text-4xl font-bold">GAME OVER</h2>
            <p className="text-xl">Te quedaste sin vida</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 rounded-lg bg-amber-900/50 p-4 text-amber-100">
        <h3 className="mb-2 font-bold">Controles:</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p>← → : Moverse</p>
            <p>Espacio : Saltar</p>
          </div>
          <div>
            <p>"¡Fuego!" : Bola de fuego (20 MP)</p>
            <p>"¡Luz!" : Hechizo de luz (15 MP)</p>
            <p>"¡Escudo!" : Protección (30 MP)</p>
            <p>"¡Curar!" : Recuperar vida (40 MP)</p>
            <p>"¡Saltar!" : Salto potenciado (25 MP)</p>
          </div>
        </div>
        <p className="mt-2 text-xs">
          <strong>Estrategia:</strong> Árboles (verdes) y Slimes (morados) = Fuego | Golems (grises) y Espíritus
          (azules) = Luz
        </p>
      </div>
    </div>
  )
}
