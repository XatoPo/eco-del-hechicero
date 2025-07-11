"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition"
import HUD from "./HUD"

interface Player {
  x: number
  y: number
  width: number
  height: number
  velocityX: number
  velocityY: number
  onGround: boolean
  flipX: boolean
  invulnerable: number
  animation: string
  animFrame: number
  animTimer: number
}

interface Enemy {
  x: number
  y: number
  width: number
  height: number
  velocityX: number
  velocityY: number
  onGround: boolean
  type: string
  weakness: string
  health: number
  maxHealth: number
  direction: number
  speed: number
  dying: boolean
  color: string
  animation: string
  animFrame: number
  animTimer: number
  aiTimer: number
  targetX: number
  patrolLeft: number
  patrolRight: number
  isBoss?: boolean
}

interface Spell {
  x: number
  y: number
  width: number
  height: number
  velocityX: number
  velocityY: number
  type: string
  active: boolean
  lifetime: number
  animFrame: number
  animTimer: number
}

interface Platform {
  x: number
  y: number
  width: number
  height: number
}

// Enhanced color palette with mystical theme
const COLORS = {
  // Level 1: Forest Theme
  FOREST_SKY_TOP: "#2C1810",
  FOREST_SKY_BOTTOM: "#1A0F08",
  FOREST_GROUND: "#3D2914",
  FOREST_PLATFORM: "#5D4037",
  FOREST_PLATFORM_EDGE: "#8D6E63",

  // Level 2: Crypt Theme
  CRYPT_SKY_TOP: "#0A0A0A",
  CRYPT_SKY_BOTTOM: "#1A0A1A",
  CRYPT_GROUND: "#2A1A2A",
  CRYPT_PLATFORM: "#4A2A4A",
  CRYPT_PLATFORM_EDGE: "#6A4A6A",

  // Enhanced Wizard Design
  WIZARD_ROBE_MAIN: "#4A148C",
  WIZARD_ROBE_SHADOW: "#2E0854",
  WIZARD_ROBE_HIGHLIGHT: "#6A1B9A",
  WIZARD_HAT_MAIN: "#6A1B9A",
  WIZARD_HAT_SHADOW: "#4A148C",
  WIZARD_HAT_STAR: "#FFD700",
  WIZARD_SKIN: "#FFCC80",
  WIZARD_SKIN_SHADOW: "#FFB74D",
  WIZARD_BEARD: "#FFFFFF",
  WIZARD_BEARD_SHADOW: "#E0E0E0",
  WIZARD_STAFF_WOOD: "#8D6E63",
  WIZARD_STAFF_SHADOW: "#5D4037",
  WIZARD_STAFF_ORB: "#00BCD4",
  WIZARD_STAFF_ORB_GLOW: "#4DD0E1",
  WIZARD_EYES: "#1976D2",
  WIZARD_BELT: "#FFB300",

  // Enemies
  TREE_TRUNK: "#2E2E2E",
  TREE_LEAVES: "#1B5E20",
  TREE_EYES: "#FF0000",
  SLIME_BODY: "#4A148C",
  SLIME_SHINE: "#7B1FA2",
  SLIME_TEETH: "#FFFFFF",
  GOLEM_BODY: "#263238",
  GOLEM_EYES: "#FF3D00",
  GOLEM_CRACKS: "#FF5722",
  SPIRIT_BODY: "#0D47A1",
  SPIRIT_GLOW: "#1976D2",
  SPIRIT_EYES: "#00BCD4",
  WRAITH_BODY: "#1A0A1A",
  WRAITH_GLOW: "#8E24AA",
  WRAITH_EYES: "#E91E63",
  SKELETON_BONES: "#F5F5F5",
  SKELETON_EYES: "#FF1744",
  SKELETON_JOINTS: "#BDBDBD",

  // Spells
  FIRE_CORE: "#FF3D00",
  FIRE_OUTER: "#FF8F00",
  LIGHT_CORE: "#FFEB3B",
  LIGHT_OUTER: "#FFF59D",
  SHIELD: "#00BCD4",

  // UI Enhanced
  UI_BG: "#0D0D0D",
  UI_BORDER: "#FFB300",
  UI_TEXT: "#FFF8E1",
  HEALTH_BAR: "#F44336",
  MANA_BAR: "#2196F3",
  DAMAGE_FLASH: "#FF1744",
  HEAL_EFFECT: "#4CAF50",
}

const SPELL_COSTS = {
  fire: 15,
  light: 20,
  shield: 25,
  heal: 30,
  superJump: 5,
}

interface SimpleGameProps {
  onBackToStart?: () => void
}

export default function SimpleGame({ onBackToStart }: SimpleGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  // Audio refs for background music
  const level1MusicRef = useRef<HTMLAudioElement | null>(null)
  const level2MusicRef = useRef<HTMLAudioElement | null>(null)
  const currentMusicRef = useRef<HTMLAudioElement | null>(null)

  const {
    lastCommand,
    isListening,
    startListening,
    stopListening,
    commandCount,
    transcript,
    isSupported,
    hasPermission,
  } = useVoiceRecognition()

  // SIMPLIFIED: Game state with clear defeat/victory tracking
  const [gameState, setGameState] = useState({
    health: 100,
    mana: 100,
    maxMana: 100,
    healUses: 3,
    enemiesDefeated: 0,
    totalEnemies: 6,
    currentLevel: 1,
    maxLevel: 2,
    score: 0,
    timeElapsed: 0,
    spellsCast: 0,
    levelCompleted: false,
    showLevelTransition: false,
    isPaused: false,
    gameInitialized: false,
    // CRITICAL: Single source of truth for game status
    gameStatus: "playing" as "playing" | "defeated" | "victory",
    defeatReason: null as "health" | "mana" | null,
  })

  // Game objects refs
  const playerRef = useRef<Player>({
    x: 100,
    y: 350,
    width: 24,
    height: 32,
    velocityX: 0,
    velocityY: 0,
    onGround: false,
    flipX: false,
    invulnerable: 0,
    animation: "idle",
    animFrame: 0,
    animTimer: 0,
  })

  const enemiesRef = useRef<Enemy[]>([])
  const spellsRef = useRef<Spell[]>([])
  const platformsRef = useRef<Platform[]>([])
  const keysRef = useRef<Record<string, boolean>>({})
  const cooldownsRef = useRef({
    fireball: 0,
    shield: 0,
    light: 0,
    heal: 0,
    superJump: 0,
  })
  const shieldRef = useRef({ active: false, timeLeft: 0 })
  const cameraRef = useRef({ x: 0, y: 0 })
  const processedCommandsRef = useRef<Set<string>>(new Set())
  const buttonCooldownRef = useRef<Record<string, number>>({})

  // Audio context for sound effects
  const audioContextRef = useRef<AudioContext | null>(null)

  // ENHANCED: Responsive canvas dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1200, height: 700 })

  useEffect(() => {
    const updateCanvasSize = () => {
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight

      let width, height

      if (screenWidth < 640) {
        // Mobile
        width = Math.min(screenWidth - 32, 900)
        height = Math.round(width * 0.6)
      } else if (screenWidth < 1024) {
        // Tablet
        width = Math.min(screenWidth - 64, 1000)
        height = Math.round(width * 0.6)
      } else if (screenWidth < 1440) {
        // Desktop small
        width = 1100
        height = 660
      } else {
        // Desktop large
        width = 1200
        height = 700
      }

      setCanvasDimensions({ width, height })
    }

    updateCanvasSize()
    window.addEventListener("resize", updateCanvasSize)
    return () => window.removeEventListener("resize", updateCanvasSize)
  }, [])

  // Initialize audio context
  useEffect(() => {
    const initAudio = () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (error) {
        console.log("Audio not supported")
      }
    }
    initAudio()

    return () => {
      // Cleanup audio on unmount
      if (currentMusicRef.current) {
        currentMusicRef.current.pause()
        currentMusicRef.current = null
      }
    }
  }, [])

  // Handle background music changes based on level
  useEffect(() => {
    const playLevelMusic = async () => {
      try {
        // Stop current music
        if (currentMusicRef.current) {
          currentMusicRef.current.pause()
          currentMusicRef.current.currentTime = 0
        }

        // Select appropriate music for level
        const newMusic = gameState.currentLevel === 1 ? level1MusicRef.current : level2MusicRef.current

        if (newMusic && !gameState.isPaused && !gameState.gameWon && !gameState.gameLost) {
          currentMusicRef.current = newMusic
          await newMusic.play()
        }
      } catch (error) {
        console.log("Could not play background music:", error)
      }
    }

    if (gameState.gameInitialized) {
      playLevelMusic()
    }
  }, [gameState.currentLevel, gameState.gameInitialized, gameState.isPaused, gameState.gameWon, gameState.gameLost])

  // Handle music pause/resume
  useEffect(() => {
    if (currentMusicRef.current) {
      if (gameState.isPaused || gameState.gameWon || gameState.gameLost) {
        currentMusicRef.current.pause()
      } else {
        currentMusicRef.current.play().catch(console.log)
      }
    }
  }, [gameState.isPaused, gameState.gameWon, gameState.gameLost])

  // Play sound effect
  const playSound = useCallback(
    (frequency: number, duration: number, type: "sine" | "square" | "sawtooth" = "sine") => {
      if (!audioContextRef.current) return

      try {
        const oscillator = audioContextRef.current.createOscillator()
        const gainNode = audioContextRef.current.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContextRef.current.destination)

        oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
        oscillator.type = type

        gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration)

        oscillator.start(audioContextRef.current.currentTime)
        oscillator.stop(audioContextRef.current.currentTime + duration)
      } catch (error) {
        console.log("Sound playback failed")
      }
    },
    [],
  )

  // CRITICAL: Immediate defeat detection function
  const checkDefeatConditions = useCallback(() => {
    // Only check if game is still playing
    if (gameState.gameStatus !== "playing" || !gameState.gameInitialized) {
      return
    }

    console.log("🔍 Checking defeat conditions - Health:", gameState.health, "Mana:", gameState.mana)

    // IMMEDIATE: Health defeat check
    if (gameState.health <= 0) {
      console.log("💀 DEFEAT BY HEALTH DETECTED!")
      setGameState((prev) => ({
        ...prev,
        gameStatus: "defeated",
        defeatReason: "health",
      }))
      return true
    }

    // FIXED: Mana defeat check - only when mana reaches exactly 0
    if (gameState.mana <= 0) {
      console.log("⚡ DEFEAT BY MANA DETECTED! Mana:", gameState.mana)
      setGameState((prev) => ({
        ...prev,
        gameStatus: "defeated",
        defeatReason: "mana",
      }))
      return true
    }

    return false
  }, [gameState.health, gameState.mana, gameState.gameStatus, gameState.gameInitialized])

  // FIXED: Process command with cooldown and sound effects
  const processCommand = useCallback(
    (command: string, commandId?: string) => {
      if (gameState.isPaused || gameState.gameStatus !== "playing") {
        return false
      }

      // FIXED: Button cooldown to prevent multiple casts
      const now = Date.now()
      if (buttonCooldownRef.current[command] && now - buttonCooldownRef.current[command] < 500) {
        console.log("🚫 Comando en cooldown:", command)
        return false
      }

      if (commandId && processedCommandsRef.current.has(commandId)) {
        return false
      }

      if (commandId) {
        processedCommandsRef.current.add(commandId)
        setTimeout(() => {
          processedCommandsRef.current.delete(commandId)
        }, 2000)
      }

      // Set button cooldown
      buttonCooldownRef.current[command] = now

      const player = playerRef.current
      const cooldowns = cooldownsRef.current
      const shield = shieldRef.current

      switch (command.toLowerCase()) {
        case "fuego":
          if (cooldowns.fireball <= 0 && gameState.mana >= SPELL_COSTS.fire) {
            playSound(220, 0.3, "sawtooth") // Fire sound
            setGameState((prev) => ({ ...prev, mana: prev.mana - SPELL_COSTS.fire, spellsCast: prev.spellsCast + 1 }))
            cooldowns.fireball = 400
            player.animation = "cast"
            player.animFrame = 0

            const direction = player.flipX ? -1 : 1
            spellsRef.current.push({
              x: player.x + direction * 30,
              y: player.y + 8,
              width: 16,
              height: 8,
              velocityX: direction * 320,
              velocityY: 0,
              type: "fire",
              active: true,
              lifetime: 2500,
              animFrame: 0,
              animTimer: 0,
            })
            return true
          }
          return false

        case "luz":
          if (cooldowns.light <= 0 && gameState.mana >= SPELL_COSTS.light) {
            playSound(440, 0.4, "sine") // Light sound
            setGameState((prev) => ({ ...prev, mana: prev.mana - SPELL_COSTS.light, spellsCast: prev.spellsCast + 1 }))
            cooldowns.light = 500
            player.animation = "cast"
            player.animFrame = 0

            const direction = player.flipX ? -1 : 1
            spellsRef.current.push({
              x: player.x + direction * 30,
              y: player.y + 8,
              width: 20,
              height: 20,
              velocityX: direction * 280,
              velocityY: 0,
              type: "light",
              active: true,
              lifetime: 3000,
              animFrame: 0,
              animTimer: 0,
            })
            return true
          }
          return false

        case "escudo":
          if (cooldowns.shield <= 0 && gameState.mana >= SPELL_COSTS.shield) {
            playSound(330, 0.5, "square") // Shield sound
            setGameState((prev) => ({ ...prev, mana: prev.mana - SPELL_COSTS.shield, spellsCast: prev.spellsCast + 1 }))
            cooldowns.shield = 4000
            shield.active = true
            shield.timeLeft = 4000
            player.animation = "cast"
            player.animFrame = 0
            return true
          }
          return false

        case "curar":
          if (cooldowns.heal <= 0 && gameState.mana >= SPELL_COSTS.heal && gameState.healUses > 0) {
            playSound(523, 0.6, "sine") // Heal sound
            setGameState((prev) => ({
              ...prev,
              mana: prev.mana - SPELL_COSTS.heal,
              health: Math.min(100, prev.health + 35),
              healUses: prev.healUses - 1,
              spellsCast: prev.spellsCast + 1,
            }))
            cooldowns.heal = 5000
            player.animation = "cast"
            player.animFrame = 0
            return true
          }
          return false

        case "saltar":
          if (cooldowns.superJump <= 0 && gameState.mana >= SPELL_COSTS.superJump) {
            playSound(660, 0.2, "square") // Jump sound
            setGameState((prev) => ({
              ...prev,
              mana: prev.mana - SPELL_COSTS.superJump,
              spellsCast: prev.spellsCast + 1,
            }))
            cooldowns.superJump = 1500
            player.velocityY = -420
            player.animation = "jump"
            player.animFrame = 0
            return true
          }
          return false

        case "atrás":
        case "atras":
        case "izquierda":
          keysRef.current["ArrowLeft"] = true
          setTimeout(() => {
            keysRef.current["ArrowLeft"] = false
          }, 300)
          return true

        case "adelante":
        case "derecha":
          keysRef.current["ArrowRight"] = true
          setTimeout(() => {
            keysRef.current["ArrowRight"] = false
          }, 300)
          return true

        default:
          return false
      }
    },
    [gameState.mana, gameState.healUses, gameState.isPaused, gameState.gameStatus, playSound],
  )

  // Create level-specific platforms
  const createPlatformsForLevel = (level: number) => {
    platformsRef.current = []

    if (level === 1) {
      platformsRef.current = [
        { x: -50, y: 470, width: 200, height: 30 },
        { x: 150, y: 470, width: 150, height: 30 },
        { x: 300, y: 470, width: 150, height: 30 },
        { x: 450, y: 470, width: 150, height: 30 },
        { x: 600, y: 470, width: 150, height: 30 },
        { x: 750, y: 470, width: 150, height: 30 },
        { x: 900, y: 470, width: 150, height: 30 },
        { x: 180, y: 420, width: 80, height: 16 },
        { x: 350, y: 380, width: 100, height: 16 },
        { x: 520, y: 340, width: 90, height: 16 },
        { x: 700, y: 380, width: 85, height: 16 },
        { x: 850, y: 350, width: 95, height: 16 },
        { x: 250, y: 300, width: 70, height: 16 },
        { x: 450, y: 260, width: 80, height: 16 },
        { x: 650, y: 280, width: 75, height: 16 },
        { x: -70, y: 0, width: 20, height: 550 },
        { x: 1050, y: 0, width: 20, height: 550 },
        { x: -50, y: 0, width: 1120, height: 16 },
      ]
    } else if (level === 2) {
      platformsRef.current = [
        { x: -50, y: 470, width: 200, height: 30 },
        { x: 150, y: 470, width: 150, height: 30 },
        { x: 300, y: 470, width: 150, height: 30 },
        { x: 450, y: 470, width: 150, height: 30 },
        { x: 600, y: 470, width: 150, height: 30 },
        { x: 750, y: 470, width: 150, height: 30 },
        { x: 900, y: 470, width: 150, height: 30 },
        { x: 200, y: 400, width: 120, height: 20 },
        { x: 400, y: 360, width: 100, height: 20 },
        { x: 600, y: 320, width: 110, height: 20 },
        { x: 800, y: 360, width: 100, height: 20 },
        { x: 150, y: 280, width: 140, height: 20 },
        { x: 350, y: 240, width: 120, height: 20 },
        { x: 550, y: 200, width: 130, height: 20 },
        { x: 750, y: 240, width: 120, height: 20 },
        { x: 100, y: 350, width: 30, height: 120 },
        { x: 300, y: 320, width: 30, height: 150 },
        { x: 500, y: 280, width: 30, height: 190 },
        { x: 700, y: 320, width: 30, height: 150 },
        { x: 900, y: 350, width: 30, height: 120 },
        { x: -70, y: 0, width: 20, height: 550 },
        { x: 1050, y: 0, width: 20, height: 550 },
        { x: -50, y: 0, width: 1120, height: 16 },
      ]
    }
  }

  // Initialize game
  useEffect(() => {
    createPlatformsForLevel(gameState.currentLevel)
    createEnemiesForLevel(gameState.currentLevel)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameState.isPaused && gameState.gameStatus === "playing") {
        keysRef.current[e.code] = true
      }
      if (e.code === "Space") e.preventDefault()
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    lastTimeRef.current = performance.now()
    gameLoop()

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      stopListening()
    }
  }, [stopListening, gameState.currentLevel])

  const createEnemiesForLevel = (level: number) => {
    enemiesRef.current = []

    const levelConfigs = [
      {
        enemies: [
          { type: "tree", weakness: "fire", color: COLORS.TREE_TRUNK, health: 2, name: "Árbol Siniestro" },
          { type: "slime", weakness: "fire", color: COLORS.SLIME_BODY, health: 1, name: "Slime Venenoso" },
          { type: "spirit", weakness: "light", color: COLORS.SPIRIT_BODY, health: 2, name: "Espíritu del Bosque" },
          { type: "tree", weakness: "fire", color: COLORS.TREE_TRUNK, health: 2, name: "Árbol Siniestro" },
          { type: "slime", weakness: "fire", color: COLORS.SLIME_BODY, health: 1, name: "Slime Venenoso" },
          { type: "spirit", weakness: "light", color: COLORS.SPIRIT_BODY, health: 2, name: "Espíritu del Bosque" },
        ],
        spacing: 140,
        speed: 30,
        aiLevel: 1,
      },
      {
        enemies: [
          { type: "skeleton", weakness: "light", color: COLORS.SKELETON_BONES, health: 3, name: "Esqueleto Guerrero" },
          { type: "wraith", weakness: "light", color: COLORS.WRAITH_BODY, health: 4, name: "Espectro Siniestro" },
          { type: "golem", weakness: "light", color: COLORS.GOLEM_BODY, health: 4, name: "Gólem de Piedra" },
          { type: "skeleton", weakness: "light", color: COLORS.SKELETON_BONES, health: 3, name: "Esqueleto Guerrero" },
          { type: "wraith", weakness: "light", color: COLORS.WRAITH_BODY, health: 4, name: "Espectro Siniestro" },
          { type: "golem", weakness: "light", color: COLORS.GOLEM_BODY, health: 4, name: "Gólem de Piedra" },
          { type: "skeleton", weakness: "light", color: COLORS.SKELETON_BONES, health: 3, name: "Esqueleto Guerrero" },
          {
            type: "wraith",
            weakness: "light",
            color: COLORS.WRAITH_BODY,
            health: 5,
            name: "Jefe Espectro",
            isBoss: true,
          },
        ],
        spacing: 120,
        speed: 50,
        aiLevel: 2,
      },
    ]

    const config = levelConfigs[level - 1]
    if (!config) return

    let totalManaCost = 0
    config.enemies.forEach((enemyData) => {
      const spellCost = enemyData.weakness === "fire" ? SPELL_COSTS.fire : SPELL_COSTS.light
      totalManaCost += enemyData.health * spellCost
    })

    const bonusMana = 50 * level
    const finalMana = totalManaCost + bonusMana

    config.enemies.forEach((enemyData, i) => {
      const baseX = 200 + i * config.spacing
      const patrolRange = 60

      enemiesRef.current.push({
        x: baseX,
        y: 430,
        width: 24,
        height: 24,
        velocityX: 0,
        velocityY: 0,
        onGround: false,
        type: enemyData.type,
        weakness: enemyData.weakness,
        health: enemyData.health,
        maxHealth: enemyData.health,
        direction: Math.random() > 0.5 ? 1 : -1,
        speed: config.speed + Math.random() * 20,
        dying: false,
        color: enemyData.color,
        animation: "walk",
        animFrame: 0,
        animTimer: 0,
        aiTimer: 0,
        targetX: baseX,
        patrolLeft: Math.max(50, baseX - patrolRange),
        patrolRight: Math.min(950, baseX + patrolRange),
        isBoss: enemyData.isBoss || false,
      })
    })

    setGameState((prev) => ({
      ...prev,
      totalEnemies: config.enemies.length,
      mana: finalMana,
      maxMana: finalMana,
      enemiesDefeated: 0,
      levelCompleted: false,
      gameInitialized: true,
    }))
  }

  // Process voice commands
  useEffect(() => {
    if (lastCommand && !gameState.isPaused && gameState.gameStatus === "playing") {
      const [command, timestamp] = lastCommand.split("_")
      const commandId = lastCommand
      processCommand(command, commandId)
    }
  }, [lastCommand, gameState.isPaused, gameState.gameStatus, processCommand])

  // CRITICAL: Check defeat conditions after every state change
  useEffect(() => {
    if (gameState.gameInitialized && gameState.gameStatus === "playing") {
      checkDefeatConditions()
    }
  }, [gameState.health, gameState.mana, gameState.gameInitialized, gameState.gameStatus, checkDefeatConditions])

  // FIXED: Update function with proper pause handling
  const update = useCallback(
    (deltaTime: number) => {
      // CRITICAL: Complete stop when paused or game over
      if (gameState.isPaused || gameState.gameStatus !== "playing") {
        return
      }

      const player = playerRef.current
      const enemies = enemiesRef.current
      const spells = spellsRef.current
      const platforms = platformsRef.current
      const keys = keysRef.current
      const cooldowns = cooldownsRef.current
      const shield = shieldRef.current
      const camera = cameraRef.current

      setGameState((prev) => ({ ...prev, timeElapsed: prev.timeElapsed + deltaTime / 1000 }))

      Object.keys(cooldowns).forEach((key) => {
        if (cooldowns[key as keyof typeof cooldowns] > 0) {
          cooldowns[key as keyof typeof cooldowns] -= deltaTime
        }
      })

      if (shield.active) {
        shield.timeLeft -= deltaTime
        if (shield.timeLeft <= 0) {
          shield.active = false
        }
      }

      player.animTimer += deltaTime
      if (player.animTimer > 150) {
        player.animTimer = 0
        player.animFrame = (player.animFrame + 1) % 4
        if (player.animation === "cast" && player.animFrame === 0) {
          player.animation = player.onGround ? "idle" : "jump"
        }
      }

      if (keys["ArrowLeft"]) {
        player.velocityX = -140
        player.flipX = true
        if (player.onGround && player.animation !== "cast") {
          player.animation = "walk"
        }
      } else if (keys["ArrowRight"]) {
        player.velocityX = 140
        player.flipX = false
        if (player.onGround && player.animation !== "cast") {
          player.animation = "walk"
        }
      } else {
        player.velocityX = 0
        if (player.onGround && player.animation !== "cast") {
          player.animation = "idle"
        }
      }

      if (keys["Space"] && player.onGround) {
        player.velocityY = -340
        player.onGround = false
        player.animation = "jump"
        player.animFrame = 0
      }

      if (!player.onGround) {
        player.velocityY += 750 * (deltaTime / 1000)
      }

      player.x += player.velocityX * (deltaTime / 1000)
      player.y += player.velocityY * (deltaTime / 1000)

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

      player.x = Math.max(0, Math.min(1000 - player.width, player.x))

      // CRITICAL: Fall damage and immediate health check
      if (player.y > 550) {
        player.x = 100
        player.y = 430
        player.velocityX = 0
        player.velocityY = 0
        const fallDamage = 20 + gameState.currentLevel * 5
        console.log("💥 Fall damage:", fallDamage)
        setGameState((prev) => {
          const newHealth = Math.max(0, prev.health - fallDamage)

          console.log("❤️ Health after fall:", newHealth)
          return { ...prev, health: newHealth }
        })
      }

      enemies.forEach((enemy) => {
        if (enemy.dying) return

        enemy.animTimer += deltaTime
        if (enemy.animTimer > 200) {
          enemy.animTimer = 0
          enemy.animFrame = (enemy.animFrame + 1) % 4
        }

        enemy.aiTimer += deltaTime
        if (enemy.aiTimer > 1500 + Math.random() * 1000) {
          enemy.aiTimer = 0

          const playerDistance = Math.abs(enemy.x - player.x)
          if (playerDistance < 200 && gameState.currentLevel >= 2) {
            enemy.targetX = player.x + (Math.random() - 0.5) * 60
          } else {
            enemy.targetX = enemy.patrolLeft + Math.random() * (enemy.patrolRight - enemy.patrolLeft)
          }
        }

        const distanceToTarget = Math.abs(enemy.x - enemy.targetX)
        if (distanceToTarget > 20) {
          enemy.direction = enemy.x < enemy.targetX ? 1 : -1
        }

        if (enemy.x <= enemy.patrolLeft) {
          enemy.direction = 1
          enemy.targetX = enemy.patrolLeft + (enemy.patrolRight - enemy.patrolLeft) / 2
        } else if (enemy.x >= enemy.patrolRight) {
          enemy.direction = -1
          enemy.targetX = enemy.patrolLeft + (enemy.patrolRight - enemy.patrolLeft) / 2
        }

        enemy.velocityX = enemy.direction * enemy.speed

        if (!enemy.onGround) {
          enemy.velocityY += 750 * (deltaTime / 1000)
        }

        enemy.x += enemy.velocityX * (deltaTime / 1000)
        enemy.y += enemy.velocityY * (deltaTime / 1000)

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

        if (enemy.y > 550) {
          enemy.y = 430
          enemy.velocityY = 0
        }
      })

      // Update spells with wall collision
      spells.forEach((spell, index) => {
        if (!spell.active) return

        spell.lifetime -= deltaTime
        if (spell.lifetime <= 0) {
          spell.active = false
          return
        }

        spell.animTimer += deltaTime
        if (spell.animTimer > 100) {
          spell.animTimer = 0
          spell.animFrame = (spell.animFrame + 1) % 4
        }

        const oldX = spell.x
        const oldY = spell.y
        spell.x += spell.velocityX * (deltaTime / 1000)
        spell.y += spell.velocityY * (deltaTime / 1000)

        if (spell.x < -50 || spell.x > 1050) {
          spell.active = false
          return
        }

        // Check wall collision
        let hitWall = false
        platforms.forEach((platform) => {
          if (
            spell.x < platform.x + platform.width &&
            spell.x + spell.width > platform.x &&
            spell.y < platform.y + platform.height &&
            spell.y + spell.height > platform.y
          ) {
            hitWall = true
          }
        })

        if (hitWall) {
          playSound(150, 0.1, "square") // Wall hit sound
          spell.active = false
          return
        }

        enemies.forEach((enemy) => {
          if (
            enemy.dying ||
            spell.x + spell.width < enemy.x ||
            spell.x > enemy.x + enemy.width ||
            spell.y + spell.height < enemy.y ||
            spell.y > enemy.y + enemy.height
          )
            return

          const isEffective =
            (spell.type === "fire" && enemy.weakness === "fire") ||
            (spell.type === "light" && enemy.weakness === "light")

          if (isEffective) {
            enemy.health -= 1
            playSound(300, 0.2, "sawtooth") // Enemy hit sound
          }

          spell.active = false

          if (enemy.health <= 0) {
            enemy.dying = true
            playSound(180, 0.4, "square") // Enemy death sound
            setGameState((prev) => {
              const newDefeated = prev.enemiesDefeated + 1
              return {
                ...prev,
                enemiesDefeated: newDefeated,
                score: prev.score + (enemy.isBoss ? 500 : 100),
              }
            })
          }
        })
      })

      spellsRef.current = spells.filter((spell) => spell.active)
      enemiesRef.current = enemies.filter((enemy) => !enemy.dying)

      // CRITICAL: Player damage with immediate health update
      if (player.invulnerable <= 0) {
        enemies.forEach((enemy) => {
          if (
            enemy.dying ||
            player.x + player.width < enemy.x ||
            player.x > enemy.x + enemy.width ||
            player.y + player.height < enemy.y ||
            player.y > enemy.y + enemy.height
          )
            return

          if (!shield.active) {
            const damage = enemy.isBoss ? 25 : 15
            console.log("💥 Enemy damage:", damage)
            playSound(100, 0.3, "sawtooth") // Player damage sound
            setGameState((prev) => {
              const newHealth = Math.max(0, prev.health - damage)
              console.log("❤️ Health after enemy damage:", newHealth)
              return { ...prev, health: newHealth }
            })
            player.invulnerable = 3000
          }
        })
      } else {
        player.invulnerable -= deltaTime
      }

      // Check victory condition
      const currentEnemiesDefeated = gameState.totalEnemies - enemiesRef.current.length
      if (currentEnemiesDefeated >= gameState.totalEnemies && !gameState.levelCompleted) {
        setGameState((prev) => ({
          ...prev,
          levelCompleted: true,
          showLevelTransition: true,
          enemiesDefeated: currentEnemiesDefeated,
        }))

        setTimeout(() => {
          if (gameState.currentLevel >= gameState.maxLevel) {
            // VICTORY!
            console.log("🎉 VICTORY ACHIEVED!")
            setGameState((prev) => ({
              ...prev,
              gameStatus: "victory",
              showLevelTransition: false,
            }))
          } else {
            const nextLevel = gameState.currentLevel + 1
            setGameState((prev) => ({
              ...prev,
              currentLevel: nextLevel,
              showLevelTransition: false,
              levelCompleted: false,
            }))

            player.x = 100
            player.y = 430
            player.velocityX = 0
            player.velocityY = 0

            createPlatformsForLevel(nextLevel)
            createEnemiesForLevel(nextLevel)
          }
        }, 3000)
      }

      const targetCameraX = player.x - canvasDimensions.width / 2
      camera.x = Math.max(0, Math.min(1000 - canvasDimensions.width, targetCameraX))
    },
    [gameState, canvasDimensions.width, playSound],
  )

  // Enhanced render function
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const camera = cameraRef.current

    ctx.save()
    ctx.translate(-camera.x, -camera.y)

    const gradient = ctx.createLinearGradient(0, 0, 0, canvasDimensions.height)
    if (gameState.currentLevel === 1) {
      gradient.addColorStop(0, COLORS.FOREST_SKY_TOP)
      gradient.addColorStop(0.6, COLORS.FOREST_SKY_BOTTOM)
      gradient.addColorStop(1, COLORS.FOREST_GROUND)
    } else {
      gradient.addColorStop(0, COLORS.CRYPT_SKY_TOP)
      gradient.addColorStop(0.6, COLORS.CRYPT_SKY_BOTTOM)
      gradient.addColorStop(1, COLORS.CRYPT_GROUND)
    }

    ctx.fillStyle = gradient
    ctx.fillRect(camera.x, camera.y, canvasDimensions.width, canvasDimensions.height)

    platformsRef.current.forEach((platform) => {
      if (gameState.currentLevel === 1) {
        ctx.fillStyle = COLORS.FOREST_PLATFORM
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height)
        ctx.fillStyle = COLORS.FOREST_PLATFORM_EDGE
        ctx.fillRect(platform.x, platform.y, platform.width, 4)
      } else {
        ctx.fillStyle = COLORS.CRYPT_PLATFORM
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height)
        ctx.fillStyle = COLORS.CRYPT_PLATFORM_EDGE
        ctx.fillRect(platform.x, platform.y, platform.width, 4)
        for (let i = 0; i < platform.width; i += 20) {
          ctx.strokeStyle = COLORS.CRYPT_PLATFORM_EDGE
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(platform.x + i, platform.y)
          ctx.lineTo(platform.x + i, platform.y + platform.height)
          ctx.stroke()
        }
      }
    })

    enemiesRef.current.forEach((enemy) => {
      ctx.save()

      // Boss glow effect
      if (enemy.isBoss) {
        ctx.shadowColor = "#8E24AA"
        ctx.shadowBlur = 15
      }

      switch (enemy.type) {
        case "tree":
          ctx.fillStyle = COLORS.TREE_TRUNK
          ctx.fillRect(enemy.x + 6, enemy.y + 8, 12, 16)
          ctx.fillRect(enemy.x + 2, enemy.y + 12, 4, 8)
          ctx.fillRect(enemy.x + 18, enemy.y + 12, 4, 8)
          ctx.fillStyle = COLORS.TREE_LEAVES
          ctx.beginPath()
          ctx.arc(enemy.x + 12, enemy.y + 6, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = COLORS.TREE_EYES
          ctx.fillRect(enemy.x + 8, enemy.y + 10, 2, 2)
          ctx.fillRect(enemy.x + 14, enemy.y + 10, 2, 2)
          break

        case "slime":
          ctx.fillStyle = COLORS.SLIME_BODY
          ctx.beginPath()
          ctx.ellipse(enemy.x + 12, enemy.y + 16, 12, 8, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = COLORS.SLIME_SHINE
          ctx.beginPath()
          ctx.ellipse(enemy.x + 8, enemy.y + 12, 4, 3, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = COLORS.SLIME_TEETH
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(enemy.x + 6 + i * 4, enemy.y + 14, 2, 3)
          }
          break

        case "spirit":
          ctx.globalAlpha = 0.8
          ctx.fillStyle = COLORS.SPIRIT_BODY
          ctx.beginPath()
          ctx.arc(enemy.x + 12, enemy.y + 12, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = COLORS.SPIRIT_GLOW
          ctx.beginPath()
          ctx.arc(enemy.x + 12, enemy.y + 12, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
          ctx.fillStyle = COLORS.SPIRIT_EYES
          ctx.fillRect(enemy.x + 8, enemy.y + 8, 2, 2)
          ctx.fillRect(enemy.x + 14, enemy.y + 8, 2, 2)
          break

        case "skeleton":
          ctx.fillStyle = COLORS.SKELETON_BONES
          ctx.fillRect(enemy.x + 8, enemy.y + 6, 8, 12)
          ctx.fillRect(enemy.x + 6, enemy.y + 18, 12, 6)
          ctx.fillRect(enemy.x + 4, enemy.y + 8, 4, 2)
          ctx.fillRect(enemy.x + 16, enemy.y + 8, 4, 2)
          ctx.beginPath()
          ctx.arc(enemy.x + 12, enemy.y + 4, 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = COLORS.SKELETON_EYES
          ctx.fillRect(enemy.x + 10, enemy.y + 2, 1, 2)
          ctx.fillRect(enemy.x + 14, enemy.y + 2, 1, 2)
          break

        case "wraith":
          ctx.globalAlpha = 0.7
          ctx.fillStyle = COLORS.WRAITH_BODY
          ctx.beginPath()
          ctx.arc(enemy.x + 12, enemy.y + 12, 12, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = COLORS.WRAITH_GLOW
          ctx.beginPath()
          ctx.arc(enemy.x + 12, enemy.y + 12, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
          ctx.fillStyle = COLORS.WRAITH_EYES
          ctx.fillRect(enemy.x + 8, enemy.y + 8, 3, 3)
          ctx.fillRect(enemy.x + 13, enemy.y + 8, 3, 3)
          break

        case "golem":
          ctx.fillStyle = COLORS.GOLEM_BODY
          ctx.fillRect(enemy.x + 4, enemy.y + 4, 16, 20)
          ctx.fillStyle = COLORS.GOLEM_CRACKS
          ctx.fillRect(enemy.x + 8, enemy.y + 8, 1, 8)
          ctx.fillRect(enemy.x + 12, enemy.y + 12, 1, 6)
          ctx.fillRect(enemy.x + 15, enemy.y + 10, 1, 4)
          ctx.fillStyle = COLORS.GOLEM_EYES
          ctx.fillRect(enemy.x + 8, enemy.y + 8, 2, 2)
          ctx.fillRect(enemy.x + 14, enemy.y + 8, 2, 2)
          break
      }

      const barWidth = enemy.width
      const barHeight = 4
      const healthPercent = enemy.health / enemy.maxHealth

      ctx.fillStyle = "#333"
      ctx.fillRect(enemy.x, enemy.y - 10, barWidth, barHeight)

      ctx.fillStyle = healthPercent > 0.6 ? "#4ECDC4" : healthPercent > 0.3 ? "#FFD93D" : "#FF6B6B"
      ctx.fillRect(enemy.x, enemy.y - 10, barWidth * healthPercent, barHeight)

      ctx.strokeStyle = "#FFF"
      ctx.lineWidth = 1
      ctx.strokeRect(enemy.x, enemy.y - 10, barWidth, barHeight)

      ctx.fillStyle = "#FFF"
      ctx.font = "8px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`${enemy.health}/${enemy.maxHealth}`, enemy.x + barWidth / 2, enemy.y - 12)

      // Boss indicator
      if (enemy.isBoss) {
        ctx.fillStyle = "#FFD700"
        ctx.font = "10px Arial"
        ctx.fillText("👑 JEFE", enemy.x + barWidth / 2, enemy.y - 20)
      }

      ctx.restore()
    })

    spellsRef.current.forEach((spell) => {
      ctx.save()

      if (spell.type === "fire") {
        ctx.shadowColor = COLORS.FIRE_CORE
        ctx.shadowBlur = 10
        ctx.fillStyle = COLORS.FIRE_OUTER
        ctx.beginPath()
        ctx.arc(spell.x + spell.width / 2, spell.y + spell.height / 2, spell.width / 2 + 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = COLORS.FIRE_CORE
        ctx.beginPath()
        ctx.arc(spell.x + spell.width / 2, spell.y + spell.height / 2, spell.width / 2 - 2, 0, Math.PI * 2)
        ctx.fill()
      } else if (spell.type === "light") {
        ctx.shadowColor = COLORS.LIGHT_CORE
        ctx.shadowBlur = 15
        ctx.fillStyle = COLORS.LIGHT_OUTER
        ctx.beginPath()
        ctx.arc(spell.x + spell.width / 2, spell.y + spell.height / 2, spell.width / 2 + 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = COLORS.LIGHT_CORE
        ctx.beginPath()
        ctx.arc(spell.x + spell.width / 2, spell.y + spell.height / 2, spell.width / 2 - 1, 0, Math.PI * 2)
        ctx.fill()

        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 + spell.animFrame * 0.1
          const rayLength = 8
          const startX = spell.x + spell.width / 2 + Math.cos(angle) * (spell.width / 2)
          const startY = spell.y + spell.height / 2 + Math.sin(angle) * (spell.height / 2)
          const endX = startX + Math.cos(angle) * rayLength
          const endY = startY + Math.sin(angle) * rayLength

          ctx.strokeStyle = COLORS.LIGHT_OUTER
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.lineTo(endX, endY)
          ctx.stroke()
        }
      }

      ctx.restore()
    })

    // Enhanced wizard rendering
    const player = playerRef.current
    ctx.save()

    if (player.invulnerable > 0) {
      ctx.globalAlpha = Math.sin(player.invulnerable * 0.01) * 0.5 + 0.5
    }

    if (shieldRef.current.active) {
      ctx.strokeStyle = COLORS.SHIELD
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2 + 8, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.fillStyle = COLORS.WIZARD_ROBE_SHADOW
    ctx.fillRect(player.x + 7, player.y + 13, 10, 15)

    ctx.fillStyle = COLORS.WIZARD_ROBE_MAIN
    ctx.fillRect(player.x + 6, player.y + 12, 12, 16)

    ctx.fillStyle = COLORS.WIZARD_ROBE_HIGHLIGHT
    ctx.fillRect(player.x + 6, player.y + 12, 3, 16)

    ctx.fillStyle = COLORS.WIZARD_HAT_SHADOW
    ctx.beginPath()
    ctx.moveTo(player.x + 13, player.y + 3)
    ctx.lineTo(player.x + 9, player.y + 13)
    ctx.lineTo(player.x + 17, player.y + 13)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = COLORS.WIZARD_HAT_MAIN
    ctx.beginPath()
    ctx.moveTo(player.x + 12, player.y + 2)
    ctx.lineTo(player.x + 8, player.y + 12)
    ctx.lineTo(player.x + 16, player.y + 12)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = COLORS.WIZARD_HAT_STAR
    ctx.beginPath()
    ctx.arc(player.x + 10, player.y + 8, 1.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = COLORS.WIZARD_SKIN_SHADOW
    ctx.beginPath()
    ctx.arc(player.x + 13, player.y + 15, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = COLORS.WIZARD_SKIN
    ctx.beginPath()
    ctx.arc(player.x + 12, player.y + 14, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = COLORS.WIZARD_EYES
    ctx.fillRect(player.x + 10, player.y + 12, 1, 1)
    ctx.fillRect(player.x + 13, player.y + 12, 1, 1)

    ctx.fillStyle = COLORS.WIZARD_BEARD_SHADOW
    ctx.fillRect(player.x + 11, player.y + 17, 4, 6)

    ctx.fillStyle = COLORS.WIZARD_BEARD
    ctx.fillRect(player.x + 10, player.y + 16, 4, 6)

    ctx.fillStyle = COLORS.WIZARD_BELT
    ctx.fillRect(player.x + 6, player.y + 20, 12, 2)

    ctx.fillStyle = COLORS.WIZARD_STAFF_SHADOW
    const staffX = player.flipX ? player.x + 3 : player.x + 21
    ctx.fillRect(staffX, player.y + 9, 2, 16)

    ctx.fillStyle = COLORS.WIZARD_STAFF_WOOD
    const staffMainX = player.flipX ? player.x + 2 : player.x + 20
    ctx.fillRect(staffMainX, player.y + 8, 2, 16)

    const orbGlow = player.animation === "cast" ? 2 : 0
    if (orbGlow > 0) {
      ctx.shadowColor = COLORS.WIZARD_STAFF_ORB_GLOW
      ctx.shadowBlur = 8
    }

    ctx.fillStyle = player.animation === "cast" ? COLORS.WIZARD_STAFF_ORB_GLOW : COLORS.WIZARD_STAFF_ORB
    ctx.beginPath()
    ctx.arc(staffMainX + 1, player.y + 6, 3 + orbGlow, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0

    ctx.restore()
    ctx.restore()
  }, [canvasDimensions, gameState.currentLevel])

  const gameLoop = useCallback(() => {
    const currentTime = performance.now()
    const deltaTime = currentTime - lastTimeRef.current
    lastTimeRef.current = currentTime

    update(deltaTime)
    render()

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [update, render])

  // FIXED: Test spell with proper cooldown
  const testSpell = (spellType: string) => {
    const now = Date.now()
    if (buttonCooldownRef.current[spellType] && now - buttonCooldownRef.current[spellType] < 800) {
      console.log("🚫 Botón en cooldown:", spellType)
      return
    }

    console.log("🧪 Probando hechizo:", spellType)
    processCommand(spellType)
  }

  // FIXED: Proper pause toggle that doesn't restart game
  const togglePause = () => {
    console.log("⏸️ Cambiando estado de pausa de", gameState.isPaused, "a", !gameState.isPaused)
    setGameState((prev) => ({ ...prev, isPaused: !prev.isPaused }))
  }

  // FIXED: Reload page instead of callback
  const handleBackToStart = () => {
    console.log("🏠 Recargando página...")
    window.location.reload()
  }

  const getLevelName = (level: number) => {
    const names = ["Bosque de los Susurros", "Cripta de la Voz Dormida"]
    return names[level - 1] || `Nivel ${level}`
  }

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, 
          #0D0D0D 0%, 
          #1A0F08 25%, 
          #2C1810 50%, 
          #1A0F08 75%, 
          #0D0D0D 100%)`,
      }}
    >
      {/* Mystical background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-purple-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-green-400 rounded-full animate-ping"></div>
      </div>

      {/* Main container */}
      <div className="relative z-10 flex flex-col items-center gap-4 sm:gap-6 p-2 sm:p-4 lg:p-6">
        {/* Enhanced Header with control buttons OUTSIDE canvas */}
        {gameState.gameStatus === "playing" && (
          <div
            className="w-full max-w-7xl flex flex-col sm:flex-row justify-between items-center mb-2 sm:mb-4 px-3 sm:px-6 py-3 sm:py-4 rounded-xl border-2 shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${COLORS.UI_BG}E6 0%, #1A0F08E6 50%, ${COLORS.UI_BG}E6 100%)`,
              borderColor: COLORS.UI_BORDER,
              boxShadow: `0 0 30px ${COLORS.UI_BORDER}40, inset 0 0 20px ${COLORS.UI_BG}80`,
            }}
          >
            <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-amber-400 rounded-full animate-pulse"></div>
                <h1
                  className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-wider"
                  style={{
                    color: COLORS.UI_BORDER,
                    textShadow: `0 0 20px ${COLORS.UI_BORDER}, 0 0 40px ${COLORS.UI_BORDER}80`,
                  }}
                >
                  ⚡ ECO DEL HECHICERO ⚡
                </h1>
              </div>
            </div>

            {/* Control buttons 
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-amber-400 font-mono text-xs sm:text-sm">
                {getLevelName(gameState.currentLevel)} ({gameState.currentLevel}/{gameState.maxLevel})
              </div>

              <div className="flex gap-2">
                <button
                  onClick={togglePause}
                  className="px-2 py-1 bg-blue-600/90 hover:bg-blue-700 text-white border border-blue-500 rounded backdrop-blur-sm shadow-lg text-xs sm:text-sm"
                  style={{
                    boxShadow: `0 0 15px ${COLORS.UI_BORDER}40`,
                  }}
                >
                  {gameState.isPaused ? "▶️" : "⏸️"}
                  <span className="hidden sm:inline ml-1">{gameState.isPaused ? "Reanudar" : "Pausa"}</span>
                </button>
                <button
                  onClick={handleBackToStart}
                  className="px-2 py-1 bg-amber-600/90 hover:bg-amber-700 text-white border border-amber-500 rounded backdrop-blur-sm shadow-lg text-xs sm:text-sm"
                  style={{
                    boxShadow: `0 0 15px ${COLORS.UI_BORDER}40`,
                  }}
                >
                  🏠<span className="hidden sm:inline ml-1">Inicio</span>
                </button>
              </div>
            </div>
            */}
          </div>
        )}

        {/* Game Canvas Container with enhanced styling */}
        {gameState.gameStatus === "playing" && (
          <div
            className="relative rounded-2xl border-4 shadow-2xl overflow-hidden"
            style={{
              borderColor: COLORS.UI_BORDER,
              boxShadow: `0 0 50px ${COLORS.UI_BORDER}60, inset 0 0 30px ${COLORS.UI_BG}40`,
              background: `linear-gradient(135deg, ${COLORS.UI_BG} 0%, #1A0F08 100%)`,
            }}
          >
            {/* Game Canvas */}
            <canvas
              ref={canvasRef}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              className="block bg-black"
              style={{
                imageRendering: "pixelated",
                zIndex: 10,
                width: "100%",
                height: "auto",
                maxWidth: `${canvasDimensions.width}px`,
                maxHeight: `${canvasDimensions.height}px`,
              }}
            />

            {/* HUD Overlay - Health, Mana, and Voice Commands */}
            <div className="absolute top-0 left-0 right-0 z-20">
              <HUD
                health={gameState.health}
                mana={gameState.mana}
                maxMana={gameState.maxMana}
                lastCommand={lastCommand.split("_")[0] || ""}
                level={gameState.currentLevel}
                enemiesDefeated={gameState.enemiesDefeated}
                totalEnemies={gameState.totalEnemies}
                healUses={gameState.healUses}
                transcript={transcript}
                isListening={isListening}
                commandCount={commandCount}
              />
            </div>

            {/* Level transition overlay */}
            {gameState.showLevelTransition && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                style={{
                  zIndex: 50,
                  background: `linear-gradient(135deg, ${COLORS.UI_BG}F0 0%, #1A0F08F0 50%, ${COLORS.UI_BG}F0 100%)`,
                }}
              >
                <div
                  className="text-center text-white p-6 rounded-xl border-2"
                  style={{ borderColor: COLORS.UI_BORDER }}
                >
                  <h2
                    className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4"
                    style={{
                      color: COLORS.UI_BORDER,
                      textShadow: `0 0 20px ${COLORS.UI_BORDER}`,
                    }}
                  >
                    ✨ ¡Nivel {gameState.currentLevel} Completado! ✨
                  </h2>
                  {gameState.currentLevel < gameState.maxLevel && (
                    <p className="text-lg sm:text-xl" style={{ color: COLORS.UI_TEXT }}>
                      Preparándote para el Nivel {gameState.currentLevel + 1}...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Pause overlay */}
            {gameState.isPaused && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-2xl"
                style={{
                  zIndex: 50,
                  background: `linear-gradient(135deg, ${COLORS.UI_BG}E0 0%, #1A0F08E0 50%, ${COLORS.UI_BG}E0 100%)`,
                }}
              >
                <h2
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white"
                  style={{
                    textShadow: `0 0 30px ${COLORS.UI_BORDER}`,
                  }}
                >
                  ⏸️ PAUSADO
                </h2>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Instructions Panel */}
        {gameState.gameStatus === "playing" && (
          <div
            className="w-full max-w-7xl rounded-xl p-3 sm:p-4 lg:p-6 border-2 font-mono shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${COLORS.UI_BG}E6 0%, #1A0F08E6 50%, ${COLORS.UI_BG}E6 100%)`,
              borderColor: COLORS.UI_BORDER,
              color: COLORS.UI_TEXT,
              boxShadow: `0 0 30px ${COLORS.UI_BORDER}40, inset 0 0 20px ${COLORS.UI_BG}80`,
            }}
          >
            <h3
              className="mb-3 font-bold text-base sm:text-lg lg:text-xl"
              style={{
                color: COLORS.UI_BORDER,
                textShadow: `0 0 10px ${COLORS.UI_BORDER}80`,
              }}
            >
              🎮 CONTROLES MEJORADOS - {getLevelName(gameState.currentLevel)}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs sm:text-sm mb-4">
              <div className="space-y-2">
                <p className="font-bold mb-2 text-amber-400">⌨️ TECLADO:</p>
                <p>⬅️ ➡️ : MOVERSE</p>
                <p>🚀 ESPACIO : SALTAR</p>
              </div>
              <div className="space-y-1">
                <p className="font-bold mb-2 text-amber-400">🎤 COMANDOS DE VOZ MEJORADOS:</p>
                <p>🔥 "FUEGO" / "LLAMA" / "BOLA DE FUEGO" ({SPELL_COSTS.fire} MP)</p>
                <p>💡 "LUZ" / "BRILLO" / "DESTELLO" ({SPELL_COSTS.light} MP)</p>
                <p>🛡️ "ESCUDO" / "PROTECCIÓN" / "DEFENSA" ({SPELL_COSTS.shield} MP)</p>
                <p>💚 "CURAR" / "SANAR" / "VIDA" ({SPELL_COSTS.heal} MP)</p>
                <p>🚀 "SALTAR" / "SUPER SALTO" ({SPELL_COSTS.superJump} MP)</p>
                <p>⬅️ "ATRÁS" / "IZQUIERDA"</p>
                <p>➡️ "ADELANTE" / "DERECHA"</p>
              </div>
            </div>

            <div className="border-t pt-3 mb-3" style={{ borderColor: COLORS.UI_BORDER }}>
              <p className="mb-2 text-xs sm:text-sm font-bold text-amber-400">🧪 BOTONES DE PRUEBA (CON COOLDOWN):</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 sm:gap-2">
                {[
                  { cmd: "fuego", icon: "🔥", color: "#FF3D00" },
                  { cmd: "luz", icon: "💡", color: "#FFEB3B" },
                  { cmd: "escudo", icon: "🛡️", color: "#00BCD4" },
                  { cmd: "curar", icon: "💚", color: "#4CAF50" },
                  { cmd: "saltar", icon: "🚀", color: "#2196F3" },
                  { cmd: "atrás", icon: "⬅️", color: "#FFB300" },
                  { cmd: "adelante", icon: "➡️", color: "#FFB300" },
                ].map(({ cmd, icon, color }) => (
                  <button
                    key={cmd}
                    onClick={() => testSpell(cmd)}
                    className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-bold rounded border hover:opacity-80 transition-all duration-200 transform hover:scale-105 shadow-lg"
                    style={{
                      backgroundColor: color,
                      borderColor: COLORS.UI_BORDER,
                      color: "#0D0D0D",
                      boxShadow: `0 0 10px ${color}40`,
                    }}
                  >
                    {icon} <span className="hidden sm:inline">{cmd.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs sm:text-sm space-y-3">
              <div>
                <p className="mb-2 font-bold text-amber-400">BESTIARIO - NIVEL {gameState.currentLevel}:</p>
                {gameState.currentLevel === 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <p>🌳 Árbol Siniestro: Débil al FUEGO</p>
                    <p>🟣 Slime Venenoso: Débil al FUEGO</p>
                    <p>👻 Espíritu del Bosque: Débil a la LUZ</p>
                  </div>
                )}
                {gameState.currentLevel === 2 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <p>💀 Esqueleto Guerrero: Débil a la LUZ</p>
                    <p>🌫️ Espectro Siniestro: Débil a la LUZ</p>
                    <p>🗿 Gólem de Piedra: Débil a la LUZ</p>
                    <p>👑 Jefe Espectro: Débil a la LUZ (5 HP)</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3 rounded bg-green-600/20 border border-green-500/30">
                  <p className="font-bold text-green-400">✅ SISTEMA CORREGIDO:</p>
                  <p>• Derrota por HP = 0 detectada</p>
                  <p>• Derrota por maná insuficiente</p>
                  <p>• Victoria al completar Nivel 2</p>
                </div>

                <div className="p-3 rounded bg-blue-600/20 border border-blue-500/30">
                  <p className="font-bold text-blue-400">🔊 SONIDOS IMPLEMENTADOS:</p>
                  <p>• Efectos para cada hechizo</p>
                  <p>• Sonidos de impacto y muerte</p>
                  <p>• Audio de daño al jugador</p>
                </div>

                <div className="p-3 rounded bg-purple-600/20 border border-purple-500/30">
                  <p className="font-bold text-purple-400">🎤 VOZ MEJORADA:</p>
                  <p>• Análisis de oraciones completas</p>
                  <p>• Sistema de confianza avanzado</p>
                  <p>• Múltiples palabras clave</p>
                </div>
              </div>

              <div className="p-3 rounded bg-amber-600/20 border border-amber-500/30">
                <p className="font-bold text-amber-400">🎯 NIVEL 2 MEJORADO:</p>
                <p>• Enemigos más fuertes (3-5 HP)</p>
                <p>• Velocidad aumentada 67%</p>
                <p>• Jefe final con 5 HP</p>
                <p>• IA más agresiva</p>
                <p>• Victoria completa implementada</p>
              </div>
            </div>
          </div>
        )}

        {/* CRITICAL: Defeat screen overlay - FIXED */}
        {gameState.gameStatus === "defeated" && (
          <div
            className="fixed inset-0 flex flex-col items-center justify-center z-50"
            style={{
              background: `linear-gradient(135deg, ${COLORS.UI_BG}F8 0%, #8B0000F8 30%, #1A0F08F8 70%, ${COLORS.UI_BG}F8 100%)`,
            }}
          >
            <div
              className="text-center text-white p-8 rounded-xl border-2 max-w-2xl mx-4"
              style={{ borderColor: "#FF4444" }}
            >
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-red-400 animate-pulse">
                💀 DERROTADO 💀
              </h2>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-4 text-red-300">
                  {gameState.defeatReason === "health" ? "⚔️ Caíste en Batalla" : "⚡ Sin Energía Mágica"}
                </h3>
                <p className="text-lg mb-4" style={{ color: COLORS.UI_TEXT }}>
                  {gameState.defeatReason === "health"
                    ? "Tu salud llegó a cero. Los enemigos han prevalecido sobre ti."
                    : "Te quedaste sin maná suficiente para derrotar a los enemigos restantes."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="bg-black/30 p-4 rounded border border-red-500/30">
                  <h4 className="font-bold text-red-300 mb-2">📊 Estadísticas Finales</h4>
                  <p>⏱️ Tiempo: {Math.floor(gameState.timeElapsed)}s</p>
                  <p>🎯 Nivel Alcanzado: {gameState.currentLevel}</p>
                  <p>👹 Enemigos Derrotados: {gameState.enemiesDefeated}</p>
                  <p>✨ Hechizos Lanzados: {gameState.spellsCast}</p>
                  <p>🏆 Puntuación: {gameState.score}</p>
                </div>

                <div className="bg-black/30 p-4 rounded border border-yellow-500/30">
                  <h4 className="font-bold text-yellow-300 mb-2">💡 Consejos</h4>
                  {gameState.defeatReason === "health" ? (
                    <div className="text-xs space-y-1">
                      <p>• Usa "ESCUDO" para protegerte</p>
                      <p>• Mantén distancia de enemigos</p>
                      <p>• Usa "CURAR" cuando tengas poca vida</p>
                      <p>• Salta para evitar ataques</p>
                    </div>
                  ) : (
                    <div className="text-xs space-y-1">
                      <p>• Usa hechizos eficientes contra debilidades</p>
                      <p>• FUEGO vs enemigos del bosque</p>
                      <p>• LUZ vs enemigos espectrales</p>
                      <p>• Planifica tu maná cuidadosamente</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg border-2 border-red-500 transition-all duration-200 transform hover:scale-105"
                >
                  🔄 Reintentar
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg border-2 border-gray-500 transition-all duration-200 transform hover:scale-105"
                >
                  🏠 Menú Principal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CRITICAL: Victory screen overlay - FIXED */}
        {gameState.gameStatus === "victory" && (
          <div
            className="fixed inset-0 flex flex-col items-center justify-center z-50"
            style={{
              background: `linear-gradient(135deg, ${COLORS.UI_BG}F8 0%, #FFD700F8 20%, #00FF00F8 40%, #FFD700F8 60%, ${COLORS.UI_BG}F8 100%)`,
            }}
          >
            <div
              className="text-center text-white p-8 rounded-xl border-2 max-w-3xl mx-4"
              style={{ borderColor: "#FFD700" }}
            >
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-yellow-400 animate-bounce">
                🎉 ¡GANASTE! 🎉
              </h2>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-4 text-green-300">⚡ ¡Maestro Hechicero Supremo! ⚡</h3>
                <p className="text-lg mb-4" style={{ color: COLORS.UI_TEXT }}>
                  Has completado todos los niveles y dominado el arte de la magia vocal. ¡La oscuridad ha sido vencida
                  por tu poder!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
                <div className="bg-black/30 p-4 rounded border border-green-500/30">
                  <h4 className="font-bold text-green-300 mb-2">📊 Estadísticas Finales</h4>
                  <p>⏱️ Tiempo Total: {Math.floor(gameState.timeElapsed)}s</p>
                  <p>🎯 Niveles Completados: {gameState.currentLevel}</p>
                  <p>👹 Enemigos Derrotados: {gameState.enemiesDefeated}</p>
                  <p>✨ Hechizos Lanzados: {gameState.spellsCast}</p>
                </div>

                <div className="bg-black/30 p-4 rounded border border-yellow-500/30">
                  <h4 className="font-bold text-yellow-300 mb-2">🏆 Puntuación</h4>
                  <p>🎯 Puntos Base: {gameState.score}</p>
                  <p>❤️ Bonus Salud: +{gameState.health * 10}</p>
                  <p>⚡ Bonus Maná: +{gameState.mana * 5}</p>
                  <p className="font-bold text-yellow-400 text-lg">
                    🏆 Total: {gameState.score + gameState.health * 10 + gameState.mana * 5}
                  </p>
                </div>

                <div className="bg-black/30 p-4 rounded border border-purple-500/30">
                  <h4 className="font-bold text-purple-300 mb-2">🎖️ Clasificación</h4>
                  {(() => {
                    const efficiency =
                      gameState.spellsCast > 0 ? (gameState.enemiesDefeated / gameState.spellsCast) * 100 : 0
                    const timeBonus = gameState.timeElapsed < 300

                    if (efficiency >= 80 && timeBonus) {
                      return <p className="text-yellow-400 font-bold">🌟 Maestro Supremo</p>
                    } else if (efficiency >= 60) {
                      return <p className="text-green-400 font-bold">⚡ Maestro Hechicero</p>
                    } else if (efficiency >= 40) {
                      return <p className="text-blue-400 font-bold">🔮 Hechicero Experto</p>
                    } else if (efficiency >= 20) {
                      return <p className="text-purple-400 font-bold">✨ Hechicero Competente</p>
                    } else {
                      return <p className="text-gray-400">🎓 Aprendiz</p>
                    }
                  })()}
                  <p className="text-xs mt-2">
                    Eficiencia:{" "}
                    {gameState.spellsCast > 0
                      ? Math.round((gameState.enemiesDefeated / gameState.spellsCast) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-600/20 to-green-600/20 rounded-lg border border-yellow-500/30">
                <h4 className="font-bold text-yellow-300 mb-2">🎊 ¡Logros Desbloqueados!</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p>🏆 Completar Todos los Niveles</p>
                  <p>⚔️ Derrotar Todos los Enemigos</p>
                  {gameState.health > 50 && <p>❤️ Superviviente (50+ HP)</p>}
                  {gameState.mana > 30 && <p>⚡ Conservador de Maná (30+ MP)</p>}
                  {gameState.timeElapsed < 300 && <p>⚡ Velocista (&lt;5 min)</p>}
                  {gameState.spellsCast < 50 && <p>🎯 Eficiente (&lt;50 hechizos)</p>}
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg border-2 border-green-500 transition-all duration-200 transform hover:scale-105"
                >
                  🔄 Jugar de Nuevo
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg border-2 border-yellow-500 transition-all duration-200 transform hover:scale-105"
                >
                  🏠 Menú Principal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
