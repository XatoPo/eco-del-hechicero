"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { useGameStore } from "@/stores/gameStore"

interface GameCanvasProps {
  onLoaded: () => void
  gameInstanceRef: React.MutableRefObject<any>
}

export default function GameCanvas({ onLoaded, gameInstanceRef }: GameCanvasProps) {
  const gameContainer = useRef<HTMLDivElement>(null)
  const { setHealth, setMana, setCurrentLevel, lastCommand } = useGameStore()
  const gameInitialized = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function loadAndInit() {
      if (gameInitialized.current || cancelled) return
      const Phaser = (await import("phaser")).default
      ;(window as any).Phaser = Phaser
      if (gameContainer.current) {
        initGame(Phaser)
      }
    }

    loadAndInit()

    return () => {
      cancelled = true
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true)
        gameInstanceRef.current = null
      }
    }
  }, [])

  // Efecto para procesar comandos de voz
  useEffect(() => {
    if (gameInitialized.current && lastCommand && gameInstanceRef.current) {
      const scene = gameInstanceRef.current.scene.getScene("MainScene")
      if (scene && scene.processExternalCommand) {
        scene.processExternalCommand(lastCommand)
      }
    }
  }, [lastCommand])

  function initGame(Phaser: typeof import("phaser").default) {
    if (!gameContainer.current || gameInitialized.current) return
    gameInitialized.current = true

    class MainScene extends Phaser.Scene {
      private player: any
      private cursors: any
      private fireballs: any
      private lightSpells: any
      private shield: any
      private enemies: any
      private platforms: any
      private health = 100
      private mana = 100
      private healUses = 3
      private currentLevel = 1
      private lastCommand = ""
      private spellCooldowns = {
        fireball: 0,
        shield: 0,
        light: 0,
        heal: 0,
        superJump: 0,
      }
      private shieldActive = false
      private isInvulnerable = false
      private bgLayers: any = {}
      private gameStatusText: any
      private healCounterText: any
      private enemiesDefeated = 0
      private totalEnemies = 0
      private gameWon = false
      private gameLost = false

      constructor() {
        super({ key: "MainScene" })
      }

      preload() {
        // SPRITES REALES DEL MAGO
        this.load.image("wizard-idle", "/sprites/wizard.png")
        this.load.spritesheet("wizard-walk", "/sprites/wizard-walk.png", { frameWidth: 32, frameHeight: 32 })
        this.load.spritesheet("wizard-jump", "/sprites/wizard-jump.png", { frameWidth: 32, frameHeight: 32 })
        this.load.spritesheet("wizard-attack", "/sprites/wizard-attack.png", { frameWidth: 32, frameHeight: 32 })

        // EFECTOS REALES
        this.load.spritesheet("fireball", "/sprites/fireball.png", { frameWidth: 32, frameHeight: 16 })
        this.load.spritesheet("shield", "/sprites/shield-animated.png", { frameWidth: 48, frameHeight: 48 })
        this.load.spritesheet("light", "/sprites/light-effect.png", { frameWidth: 64, frameHeight: 64 })
        this.load.spritesheet("heal", "/sprites/heal-effect.png", { frameWidth: 48, frameHeight: 48 })

        // ENEMIGOS REALES
        this.load.spritesheet("enemy1-walk", "/sprites/enemy1-walk.png", { frameWidth: 32, frameHeight: 32 })
        this.load.spritesheet("enemy1-death", "/sprites/enemy1-death.png", { frameWidth: 32, frameHeight: 32 })
        this.load.spritesheet("enemy2-walk", "/sprites/enemy2-walk.png", { frameWidth: 32, frameHeight: 32 })
        this.load.spritesheet("enemy2-death", "/sprites/enemy2-death.png", { frameWidth: 32, frameHeight: 32 })
        this.load.spritesheet("enemy3-walk", "/sprites/enemy3-walk.png", { frameWidth: 32, frameHeight: 32 })
        this.load.spritesheet("enemy3-death", "/sprites/enemy3-death.png", { frameWidth: 32, frameHeight: 32 })
        this.load.spritesheet("enemy4-walk", "/sprites/enemy4-walk.png", { frameWidth: 32, frameHeight: 32 })
        this.load.spritesheet("enemy4-death", "/sprites/enemy4-death.png", { frameWidth: 32, frameHeight: 32 })

        // FONDOS Y TILES REALES
        this.load.image("forest-bg-1", "/backgrounds/forest-bg-1.png")
        this.load.image("forest-bg-2", "/backgrounds/forest-bg-2.png")
        this.load.image("forest-bg-3", "/backgrounds/forest-bg-3.png")
        this.load.image("forest-tiles", "/tilesets/forest-tiles.png")
      }

      create() {
        // FONDOS - Crear fondos con gradientes
        const width = this.cameras.main.width
        const height = this.cameras.main.height

        // Fondo con gradiente
        const bgGraphics = this.add.graphics()
        bgGraphics.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x228b22, 0x228b22, 1)
        bgGraphics.fillRect(0, 0, width * 2, height)
        bgGraphics.setDepth(-30)

        // PLATAFORMAS CON TILES REALES
        this.platforms = this.physics.add.staticGroup()

        // Crear suelo base
        const groundY = height - 50
        for (let x = 0; x < width * 3; x += 64) {
          // Hacer el mundo más grande
          const platform = this.platforms.create(x, groundY, "forest-tiles")
          platform.setScale(2, 0.5)
          platform.refreshBody()
        }

        // Plataformas flotantes
        const platformData = [
          { x: 150, y: height - 150, count: 4 },
          { x: 400, y: height - 200, count: 3 },
          { x: 700, y: height - 180, count: 4 },
          { x: 1000, y: height - 220, count: 3 },
          { x: 1300, y: height - 160, count: 4 },
          { x: 1600, y: height - 200, count: 3 },
          { x: 1900, y: height - 180, count: 4 },
        ]

        platformData.forEach((plat) => {
          for (let i = 0; i < plat.count; i++) {
            const platform = this.platforms.create(plat.x + i * 64, plat.y, "forest-tiles")
            platform.setScale(2, 0.5)
            platform.refreshBody()
          }
        })

        // JUGADOR SIN límites restrictivos
        this.player = this.physics.add.sprite(100, groundY - 60, "wizard-idle")
        this.player.setBounce(0)
        this.player.setCollideWorldBounds(false) // QUITAR límites del mundo
        this.player.setScale(1)
        this.player.body.setSize(24, 40)
        this.player.body.setOffset(4, 8)
        this.player.setDepth(100)

        // Colisiones
        this.physics.add.collider(this.player, this.platforms)

        // NUEVO: Colisiones de hechizos con plataformas
        this.physics.add.collider(this.fireballs, this.platforms, this.handleSpellWallCollision, null, this)
        this.physics.add.collider(this.lightSpells, this.platforms, this.handleSpellWallCollision, null, this)

        // Grupos
        this.fireballs = this.physics.add.group()
        this.lightSpells = this.physics.add.group()
        this.enemies = this.physics.add.group()

        // Crear enemigos
        this.createEnemies(width, height, groundY)

        // CONTROLES
        this.cursors = this.input.keyboard.createCursorKeys()

        // Cámara SIN límites restrictivos
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08)
        this.cameras.main.setBounds(0, 0, width * 3, height) // Mundo más grande
        this.cameras.main.setBackgroundColor("#87CEEB")

        // UI
        this.gameStatusText = this.add.text(
          width / 2,
          50,
          `🎯 ENEMIGOS: ${this.totalEnemies - this.enemiesDefeated}/${this.totalEnemies}`,
          {
            font: "bold 20px Arial",
            color: "#ffd700",
            stroke: "#8b4513",
            strokeThickness: 3,
          },
        )
        this.gameStatusText.setOrigin(0.5)
        this.gameStatusText.setScrollFactor(0)
        this.gameStatusText.setDepth(200)

        this.healCounterText = this.add.text(20, 100, `💚 CURACIONES: ${this.healUses}/3`, {
          font: "bold 18px Arial",
          color: "#32cd32",
          stroke: "#8b4513",
          strokeThickness: 3,
        })
        this.healCounterText.setScrollFactor(0)
        this.healCounterText.setDepth(200)

        // Inicializar UI
        setHealth(this.health)
        setMana(this.mana)
        setCurrentLevel(this.currentLevel)
        onLoaded()

        this.createAnimations()
      }

      processExternalCommand(command: string) {
        this.lastCommand = command.toLowerCase().trim()
        console.log("Comando recibido en Phaser:", this.lastCommand)
        this.processCommand()
      }

      private createEnemies(width: number, height: number, groundY: number) {
        this.totalEnemies = 6

        const enemyTypes = [
          { type: "tree", weakness: "fire", sprite: "enemy1-walk", health: 1 },
          { type: "slime", weakness: "fire", sprite: "enemy2-walk", health: 1 },
          { type: "golem", weakness: "light", sprite: "enemy3-walk", health: 2 },
          { type: "spirit", weakness: "light", sprite: "enemy4-walk", health: 2 },
        ]

        const stageWidth = width * 3 // Mundo más grande
        const margin = 100

        for (let i = 0; i < this.totalEnemies; i++) {
          const enemyData = enemyTypes[i % enemyTypes.length]
          const x = margin + Math.random() * (stageWidth - margin * 2)
          const enemy = this.physics.add.sprite(x, groundY - 50, enemyData.sprite)
          enemy.setScale(1)
          enemy.setBounce(0.1)
          enemy.body.setSize(24, 24)
          enemy.body.setOffset(4, 4)
          enemy.setData("type", enemyData.type)
          enemy.setData("weakness", enemyData.weakness)
          enemy.setData("health", enemyData.health)
          enemy.setData("maxHealth", enemyData.health)
          enemy.setData("direction", Math.random() > 0.5 ? 1 : -1)
          enemy.setData("speed", 30 + Math.random() * 30)
          enemy.setDepth(95)
          this.enemies.add(enemy)
        }

        this.physics.add.collider(this.enemies, this.platforms)
        this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this)
        this.physics.add.overlap(this.fireballs, this.enemies, this.handleFireballEnemyCollision, null, this)
        this.physics.add.overlap(this.lightSpells, this.enemies, this.handleLightEnemyCollision, null, this)
      }

      update() {
        if (this.gameWon || this.gameLost) return

        // MOVIMIENTO CON ANIMACIONES MEJORADAS
        const onGround = this.player.body.touching.down || this.player.body.onFloor()

        if (this.cursors.left.isDown) {
          this.player.setVelocityX(-120)
          this.player.setFlipX(true)
          if (onGround) {
            this.player.anims.play("wizard-walk", true)
          }
        } else if (this.cursors.right.isDown) {
          this.player.setVelocityX(120)
          this.player.setFlipX(false)
          if (onGround) {
            this.player.anims.play("wizard-walk", true)
          }
        } else {
          this.player.setVelocityX(0)
          if (onGround) {
            this.player.setTexture("wizard-idle")
            this.player.anims.stop()
          }
        }

        // SALTO CON ANIMACIÓN
        if (this.cursors.space.isDown && onGround) {
          this.player.setVelocityY(-350)
          this.player.anims.play("wizard-jump")
        }

        // Actualizar enemigos
        this.updateEnemies()

        // Actualizar escudo
        if (this.shield && this.shieldActive) {
          this.shield.x = this.player.x
          this.shield.y = this.player.y
        }

        // Cooldowns
        for (const spell in this.spellCooldowns) {
          if (this.spellCooldowns[spell as keyof typeof this.spellCooldowns] > 0) {
            this.spellCooldowns[spell as keyof typeof this.spellCooldowns] -= this.game.loop.delta
          }
        }

        // Verificar condiciones
        this.checkGameConditions()
      }

      private updateEnemies() {
        const stageWidth = this.cameras.main.width * 3 // Mundo más grande

        this.enemies.children.entries.forEach((enemy: any) => {
          if (!enemy.active || enemy.getData("dying")) return

          let direction = enemy.getData("direction")
          const speed = enemy.getData("speed")

          // Límites del escenario expandidos
          if (enemy.x <= 50) {
            direction = 1
            enemy.setData("direction", 1)
            enemy.setX(51)
          } else if (enemy.x >= stageWidth - 50) {
            direction = -1
            enemy.setData("direction", -1)
            enemy.setX(stageWidth - 51)
          }

          enemy.setVelocityX(direction * speed)
          enemy.setFlipX(direction === -1)

          // Reproducir animación de caminar
          const type = enemy.getData("type")
          const walkKey = `${type}-walk`
          if (this.anims.exists(walkKey)) {
            enemy.anims.play(walkKey, true)
          }
        })
      }

      private processCommand() {
        if (!this.lastCommand) return

        const command = this.lastCommand.toLowerCase().trim()
        console.log("Procesando comando:", command)
        this.lastCommand = ""

        if (command.includes("fuego") || command.includes("fire")) {
          this.castFireball()
        } else if (command.includes("escudo") || command.includes("shield")) {
          this.castShield()
        } else if (command.includes("luz") || command.includes("light")) {
          this.castLight()
        } else if (command.includes("curar") || command.includes("heal")) {
          this.castHeal()
        } else if (command.includes("saltar") || command.includes("jump")) {
          this.castSuperJump()
        }
      }

      private castFireball() {
        if (this.spellCooldowns.fireball > 0 || this.mana < 20) {
          console.log("No se puede lanzar fireball - cooldown o mana insuficiente")
          return false
        }

        console.log("¡Lanzando bola de fuego!")
        this.mana = Math.max(0, this.mana - 20)
        setMana(this.mana)

        this.player.anims.play("wizard-attack") // Usar animación real

        const direction = this.player.flipX ? -1 : 1
        const fireball = this.fireballs.create(this.player.x + direction * 25, this.player.y, "fireball")

        fireball.setDisplaySize(32, 16) // Tamaño correcto
        fireball.setVelocityX(direction * 250)
        fireball.setFlipX(direction === -1)
        fireball.anims.play("fireball-anim") // Usar animación real
        fireball.setData("spellType", "fire")
        fireball.setDepth(90)

        this.time.delayedCall(3000, () => {
          if (fireball.active) fireball.destroy()
        })

        this.spellCooldowns.fireball = 500
        return true
      }

      private castLight() {
        if (this.spellCooldowns.light > 0 || this.mana < 15) {
          console.log("No se puede lanzar luz - cooldown o mana insuficiente")
          return false
        }

        console.log("¡Lanzando hechizo de luz!")
        this.mana = Math.max(0, this.mana - 15)
        setMana(this.mana)

        const direction = this.player.flipX ? -1 : 1
        const lightSpell = this.lightSpells.create(this.player.x + direction * 25, this.player.y, "light")

        lightSpell.setVelocityX(direction * 200)
        lightSpell.setFlipX(direction === -1)
        lightSpell.setData("spellType", "light")
        lightSpell.setDepth(90)

        this.time.delayedCall(3000, () => {
          if (lightSpell.active) lightSpell.destroy()
        })

        this.spellCooldowns.light = 500
        return true
      }

      private castShield() {
        if (this.spellCooldowns.shield > 0 || this.mana < 30) {
          console.log("No se puede lanzar escudo - cooldown o mana insuficiente")
          return false
        }

        console.log("¡Activando escudo!")
        this.mana = Math.max(0, this.mana - 30)
        setMana(this.mana)

        if (this.shield) this.shield.destroy()

        this.shield = this.add.sprite(this.player.x, this.player.y, "shield")
        this.shield.setAlpha(0.8)
        this.shield.setDepth(85)

        this.shieldActive = true

        this.time.delayedCall(5000, () => {
          if (this.shield) {
            this.shield.destroy()
            this.shield = null
          }
          this.shieldActive = false
        })

        this.spellCooldowns.shield = 8000
        return true
      }

      private castHeal() {
        if (this.spellCooldowns.heal > 0 || this.mana < 40 || this.healUses <= 0) {
          console.log("No se puede curar - cooldown, mana insuficiente o sin usos")
          return false
        }

        console.log("¡Curando!")
        this.mana = Math.max(0, this.mana - 40)
        this.healUses -= 1
        setMana(this.mana)

        this.healCounterText.setText(`💚 CURACIONES: ${this.healUses}/3`)

        this.health = Math.min(100, this.health + 25)
        setHealth(this.health)

        const healEffect = this.add.sprite(this.player.x, this.player.y, "heal")
        healEffect.setDepth(90)

        this.time.delayedCall(1000, () => {
          healEffect.destroy()
        })

        this.spellCooldowns.heal = 10000
        return true
      }

      private castSuperJump() {
        if (this.spellCooldowns.superJump > 0 || this.mana < 25) {
          console.log("No se puede hacer super salto - cooldown o mana insuficiente")
          return false
        }

        console.log("¡Super salto!")
        this.mana = Math.max(0, this.mana - 25)
        setMana(this.mana)

        this.player.setVelocityY(-450)

        this.spellCooldowns.superJump = 3000
        return true
      }

      private handlePlayerEnemyCollision(player: any, enemy: any) {
        if (this.shieldActive || this.isInvulnerable || enemy.getData("dying")) return

        this.health = Math.max(0, this.health - 15)
        setHealth(this.health)

        player.setTint(0xff0000)

        this.isInvulnerable = true
        this.time.delayedCall(2000, () => {
          player.clearTint()
          this.isInvulnerable = false
        })

        const direction = player.x < enemy.x ? -1 : 1
        player.setVelocityX(direction * 150)
        player.setVelocityY(-150)
      }

      private handleFireballEnemyCollision(fireball: any, enemy: any) {
        if (enemy.getData("dying")) return

        const enemyWeakness = enemy.getData("weakness")
        console.log("Fireball hit enemy with weakness:", enemyWeakness)

        if (enemyWeakness === "fire") {
          this.killEnemy(enemy)
        }

        fireball.destroy()
      }

      private handleLightEnemyCollision(lightSpell: any, enemy: any) {
        if (enemy.getData("dying")) return

        const enemyWeakness = enemy.getData("weakness")
        console.log("Light hit enemy with weakness:", enemyWeakness)

        if (enemyWeakness === "light") {
          this.killEnemy(enemy)
        }

        lightSpell.destroy()
      }

      private killEnemy(enemy: any) {
        console.log("Killing enemy")
        enemy.setData("dying", true)
        enemy.setVelocity(0, 0)
        enemy.setTint(0x666666)

        this.enemiesDefeated++
        this.updateGameStatus()

        this.time.delayedCall(500, () => {
          enemy.destroy()
        })
      }

      private updateGameStatus() {
        const remaining = this.totalEnemies - this.enemiesDefeated
        this.gameStatusText.setText(`🎯 ENEMIGOS: ${remaining}/${this.totalEnemies}`)
      }

      private checkGameConditions() {
        if (this.enemiesDefeated >= this.totalEnemies && !this.gameWon) {
          this.gameWon = true
          this.showVictory()
        }

        if (this.health <= 0 && !this.gameLost) {
          this.gameLost = true
          this.showGameOver()
        }
      }

      private showVictory() {
        console.log("¡Victoria!")
        const victoryText = this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2,
          "🎉 ¡VICTORIA! 🎉\n¡Has derrotado a todos los enemigos!",
          {
            font: "bold 32px Arial",
            color: "#ffd700",
            stroke: "#8b4513",
            strokeThickness: 4,
            align: "center",
          },
        )
        victoryText.setOrigin(0.5)
        victoryText.setScrollFactor(0)
        victoryText.setDepth(300)

        this.tweens.add({
          targets: victoryText,
          alpha: 0.5,
          duration: 500,
          yoyo: true,
          repeat: -1,
        })
      }

      private showGameOver() {
        console.log("Game Over")
        const gameOverText = this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2,
          "💀 GAME OVER 💀\nTe quedaste sin vida",
          {
            font: "bold 32px Arial",
            color: "#ff0000",
            stroke: "#000000",
            strokeThickness: 4,
            align: "center",
          },
        )
        gameOverText.setOrigin(0.5)
        gameOverText.setScrollFactor(0)
        gameOverText.setDepth(300)

        this.tweens.add({
          targets: gameOverText,
          alpha: 0.5,
          duration: 500,
          yoyo: true,
          repeat: -1,
        })
      }

      private handleSpellWallCollision(spell: any, platform: any) {
        console.log("Hechizo impactó en muro")

        // Crear efecto visual de impacto
        const impactEffect = this.add.circle(spell.x, spell.y, 8, 0xffaa00, 0.8)
        impactEffect.setDepth(95)

        // Animación del efecto
        this.tweens.add({
          targets: impactEffect,
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            impactEffect.destroy()
          },
        })

        // Destruir el hechizo
        spell.destroy()
      }

      private createAnimations() {
        // ANIMACIONES DEL MAGO
        this.anims.create({
          key: "wizard-walk",
          frames: this.anims.generateFrameNumbers("wizard-walk", { start: 0, end: 3 }),
          frameRate: 8,
          repeat: -1,
        })

        this.anims.create({
          key: "wizard-jump",
          frames: this.anims.generateFrameNumbers("wizard-jump", { start: 0, end: 4 }),
          frameRate: 10,
          repeat: 0,
        })

        this.anims.create({
          key: "wizard-attack",
          frames: this.anims.generateFrameNumbers("wizard-attack", { start: 0, end: 6 }),
          frameRate: 15,
          repeat: 0,
        })

        // ANIMACIONES DE HECHIZOS
        this.anims.create({
          key: "fireball-anim",
          frames: this.anims.generateFrameNumbers("fireball", { start: 0, end: 4 }),
          frameRate: 12,
          repeat: -1,
        })

        this.anims.create({
          key: "shield-anim",
          frames: this.anims.generateFrameNumbers("shield", { start: 0, end: 2 }),
          frameRate: 8,
          repeat: -1,
        })

        this.anims.create({
          key: "light-anim",
          frames: this.anims.generateFrameNumbers("light", { start: 0, end: 4 }),
          frameRate: 8,
          repeat: -1,
        })

        this.anims.create({
          key: "heal-anim",
          frames: this.anims.generateFrameNumbers("heal", { start: 0, end: 4 }),
          frameRate: 10,
          repeat: 0,
        })

        // ANIMACIONES DE ENEMIGOS
        const enemyTypes = ["tree", "slime", "golem", "spirit"]
        const spriteNumbers = ["enemy1", "enemy2", "enemy3", "enemy4"]

        enemyTypes.forEach((type, index) => {
          const spriteNum = spriteNumbers[index]

          this.anims.create({
            key: `${type}-walk`,
            frames: this.anims.generateFrameNumbers(`${spriteNum}-walk`, { start: 0, end: 3 }),
            frameRate: 6,
            repeat: -1,
          })

          this.anims.create({
            key: `${type}-death`,
            frames: this.anims.generateFrameNumbers(`${spriteNum}-death`, { start: 0, end: 3 }),
            frameRate: 6,
            repeat: 0,
          })
        })
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameContainer.current,
      width: gameContainer.current.clientWidth,
      height: gameContainer.current.clientHeight,
      backgroundColor: "#87CEEB",
      pixelArt: true,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 400 },
          debug: false,
        },
      },
      scene: [MainScene],
    }

    const game = new Phaser.Game(config)
    gameInstanceRef.current = game
  }

  return (
    <div
      ref={gameContainer}
      className="relative aspect-video w-full rounded-lg border-4 border-amber-600 bg-black shadow-lg shadow-amber-500/20"
      style={{ height: "600px" }}
    />
  )
}
