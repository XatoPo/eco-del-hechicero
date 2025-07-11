// Cambia la importación de Phaser para asegurarnos de que esté disponible
import * as Phaser from "phaser"
import Player from "../entities/Player"
import Enemy from "../entities/Enemy"
import SpellManager from "../managers/SpellManager"

interface GameCallbacks {
  onHealthChange: (health: number) => void
  onManaChange: (mana: number) => void
  onLevelChange: (level: number) => void
}

export default class Level2Scene extends Phaser.Scene {
  private player!: Player
  private enemies!: Phaser.Physics.Arcade.Group
  private platforms!: Phaser.Tilemaps.TilemapLayer
  private traps!: Phaser.Tilemaps.TilemapLayer
  private checkpoints!: Phaser.Physics.Arcade.StaticGroup
  private exit!: Phaser.GameObjects.Zone
  private spellManager!: SpellManager
  private darkZones!: Phaser.GameObjects.Rectangle[]
  private callbacks: GameCallbacks
  private lastCommand = ""
  private commandSubscription: any
  private runesPuzzle!: {
    runes: Phaser.GameObjects.Sprite[]
    activated: boolean[]
    complete: boolean
  }
  private backgroundMusic!: Phaser.Sound.BaseSound

  constructor(callbacks: GameCallbacks) {
    super({ key: "Level2Scene" })
    this.callbacks = callbacks
  }

  init() {
    this.callbacks.onLevelChange(2)
  }

  create() {
    // Create parallax background
    this.createParallaxBackground()

    // Create tilemap
    const map = this.make.tilemap({ key: "level2-map" })
    const cryptTileset = map.addTilesetImage("crypt-tiles", "crypt-tiles")

    // Create layers
    const backgroundLayer = map.createLayer("Background", cryptTileset)
    this.platforms = map.createLayer("Platforms", cryptTileset)
    this.traps = map.createLayer("Traps", cryptTileset)
    const decorationLayer = map.createLayer("Decoration", cryptTileset)

    // Set collisions
    this.platforms.setCollisionByProperty({ collides: true })
    this.traps.setCollisionByProperty({ isTrap: true })

    // Create player
    const spawnPoint = map.findObject("Objects", (obj) => obj.name === "Spawn") as any
    this.player = new Player(
      this,
      spawnPoint.x,
      spawnPoint.y,
      (health: number) => this.callbacks.onHealthChange(health),
      (mana: number) => this.callbacks.onManaChange(mana),
    )

    // Create spell manager
    this.spellManager = new SpellManager(this, this.player)

    // Create enemies
    this.createEnemies(map)

    // Create checkpoints
    this.createCheckpoints(map)

    // Create exit
    const exitPoint = map.findObject("Objects", (obj) => obj.name === "Exit") as any
    this.exit = this.add.zone(exitPoint.x, exitPoint.y, 32, 64)
    this.physics.world.enable(this.exit)

    // Create dark zones (more prevalent in the crypt)
    this.createDarkZones(map)

    // Create runes puzzle
    this.createRunesPuzzle(map)

    // Set up collisions
    this.physics.add.collider(this.player, this.platforms)
    this.physics.add.collider(this.enemies, this.platforms)
    this.physics.add.collider(this.player, this.traps, this.handleTrapCollision, undefined, this)
    this.physics.add.collider(this.player, this.enemies, this.handleEnemyCollision, undefined, this)
    this.physics.add.overlap(this.player, this.checkpoints, this.handleCheckpoint, undefined, this)
    this.physics.add.overlap(this.player, this.exit, this.handleExit, undefined, this)

    // Set up camera
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)
    this.cameras.main.setBackgroundColor("#000000") // Dark background for crypt

    // Start background music
    this.backgroundMusic = this.sound.add("level2-music", { loop: true, volume: 0.2 })
    this.backgroundMusic.play()

    // Subscribe to voice commands from the store
    this.setupCommandListener()
  }

  update() {
    this.player.update()
    this.spellManager.update()

    // Check if player is in dark zone
    this.checkDarkZones()

    // Process voice commands
    this.processCommand()

    // Apply continuous damage in trap areas
    this.checkContinuousDamageAreas()
  }

  private createParallaxBackground() {
    const width = this.scale.width
    const height = this.scale.height

    // Add background layers with parallax effect
    const bg2 = this.add
      .tileSprite(0, 0, width, height, "crypt-bg-2")
      .setOrigin(0, 0)
      .setScrollFactor(0, 0)
      .setDepth(-20)

    const bg1 = this.add
      .tileSprite(0, 0, width, height, "crypt-bg-1")
      .setOrigin(0, 0)
      .setScrollFactor(0, 0)
      .setDepth(-10)

    // Update parallax effect on camera move
    this.cameras.main.on("camerascroll", (camera: Phaser.Cameras.Scene2D.Camera) => {
      bg2.tilePositionX = camera.scrollX * 0.2
      bg1.tilePositionX = camera.scrollX * 0.4
    })
  }

  private createEnemies(map: Phaser.Tilemaps.Tilemap) {
    this.enemies = this.physics.add.group()

    const enemyObjects = map.getObjectLayer("Enemies").objects
    enemyObjects.forEach((enemyObj) => {
      const enemy = new Enemy(
        this,
        enemyObj.x as number,
        enemyObj.y as number,
        enemyObj.properties?.find((p) => p.name === "type")?.value || "ghost",
      )
      this.enemies.add(enemy)
    })
  }

  private createCheckpoints(map: Phaser.Tilemaps.Tilemap) {
    this.checkpoints = this.physics.add.staticGroup()

    const checkpointObjects = map.getObjectLayer("Checkpoints").objects
    checkpointObjects.forEach((checkpoint) => {
      const checkpointSprite = this.checkpoints.create(checkpoint.x as number, checkpoint.y as number, "checkpoint")
      checkpointSprite.setData("activated", false)
    })
  }

  private createDarkZones(map: Phaser.Tilemaps.Tilemap) {
    this.darkZones = []

    const darkZoneObjects = map.getObjectLayer("DarkZones").objects
    darkZoneObjects.forEach((zone) => {
      const darkZone = this.add.rectangle(
        (zone.x as number) + (zone.width as number) / 2,
        (zone.y as number) + (zone.height as number) / 2,
        zone.width as number,
        zone.height as number,
        0x000000,
        0.9, // Darker than level 1
      )
      darkZone.setData("illuminated", false)
      this.darkZones.push(darkZone)
    })
  }

  private createRunesPuzzle(map: Phaser.Tilemaps.Tilemap) {
    const runeObjects = map.getObjectLayer("Runes").objects

    this.runesPuzzle = {
      runes: [],
      activated: [false, false, false],
      complete: false,
    }

    runeObjects.forEach((rune, index) => {
      const runeSprite = this.add.sprite(rune.x as number, rune.y as number, "rune")
      runeSprite.setData("index", index)
      runeSprite.setData("name", ["una", "dua", "tria"][index])
      runeSprite.setTint(0x444444) // Dim until activated

      this.runesPuzzle.runes.push(runeSprite)
    })
  }

  private handleTrapCollision(player: Player, trap: Phaser.Tilemaps.Tile) {
    if (this.spellManager.isShieldActive()) {
      return // Shield protects from traps
    }

    player.takeDamage(15) // More damage in level 2
  }

  private handleEnemyCollision(player: Player, enemy: Enemy) {
    if (this.spellManager.isShieldActive()) {
      return // Shield protects from enemies
    }

    player.takeDamage(20) // More damage in level 2

    // Knockback effect
    const direction = player.x < enemy.x ? -1 : 1
    player.setVelocityX(direction * 200)
    player.setVelocityY(-200)
  }

  private handleCheckpoint(player: Player, checkpoint: Phaser.Physics.Arcade.Sprite) {
    if (!checkpoint.getData("activated")) {
      checkpoint.setData("activated", true)
      checkpoint.setTint(0xffff00) // Yellow tint to indicate activation
      player.setRespawnPoint(checkpoint.x, checkpoint.y)

      // Heal player at checkpoint
      player.heal(30)
      player.restoreMana(50)
    }
  }

  private handleExit() {
    // Only allow exit if runes puzzle is complete
    if (!this.runesPuzzle.complete) {
      // Show hint text
      const hintText = this.add.text(this.player.x, this.player.y - 50, "¡Activa las tres runas primero!", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff",
      })
      hintText.setOrigin(0.5)

      // Fade out hint text
      this.tweens.add({
        targets: hintText,
        alpha: 0,
        y: this.player.y - 80,
        duration: 2000,
        onComplete: () => {
          hintText.destroy()
        },
      })

      return
    }

    // Stop background music
    if (this.backgroundMusic) {
      this.backgroundMusic.stop()
    }

    // Play completion sound
    this.sound.play("level-complete")

    // Show victory screen
    this.cameras.main.fadeOut(1000, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Create victory screen
      const rect = this.add.rectangle(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
      )
      rect.setScrollFactor(0)

      const victoryText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 50, "¡Victoria!", {
        fontFamily: "Arial",
        fontSize: "48px",
        color: "#ffffff",
      })
      victoryText.setOrigin(0.5)
      victoryText.setScrollFactor(0)

      const subText = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 + 20,
        "Has completado Eco del Hechicero",
        { fontFamily: "Arial", fontSize: "24px", color: "#ffffff" },
      )
      subText.setOrigin(0.5)
      subText.setScrollFactor(0)

      // Fade in victory screen
      this.cameras.main.fadeIn(1000)
    })
  }

  private checkDarkZones() {
    // Check if player is in a dark zone
    let playerInDarkZone = false

    for (const zone of this.darkZones) {
      if (Phaser.Geom.Rectangle.Contains(zone.getBounds(), this.player.x, this.player.y)) {
        playerInDarkZone = true

        // If light spell is active, illuminate the zone
        if (this.spellManager.isLightActive()) {
          zone.setAlpha(0.2)
          zone.setData("illuminated", true)
        } else if (zone.getData("illuminated")) {
          zone.setAlpha(0.9)
          zone.setData("illuminated", false)
        }
      }
    }

    // Apply darkness effect if player is in dark zone without light
    if (playerInDarkZone && !this.spellManager.isLightActive()) {
      this.player.applyDarknessPenalty()
    }
  }

  private checkContinuousDamageAreas() {
    // Apply continuous damage in certain areas (poison, etc.)
    const damageAreas = this.traps
      .getTilesWithinWorldXY(this.player.x - 16, this.player.y - 24, 32, 48)
      .filter((tile) => tile.properties.continuousDamage)

    if (damageAreas.length > 0 && !this.spellManager.isShieldActive()) {
      // Apply damage every second
      if (this.time.now % 1000 < 20) {
        this.player.takeDamage(5)
      }
    }
  }

  private setupCommandListener() {
    // Subscribe to command changes from the store
    if (typeof window !== "undefined") {
      this.commandSubscription = (window as any).commandCallback = (command: string) => {
        this.lastCommand = command
      }
    }
  }

  private processCommand() {
    if (!this.lastCommand) return

    const command = this.lastCommand.toLowerCase()
    this.lastCommand = "" // Reset command after processing

    switch (command) {
      case "fuego":
        this.spellManager.castFireball()
        break
      case "escudo":
        this.spellManager.castShield()
        break
      case "luz":
        this.spellManager.castLight()
        break
      case "curar":
        this.spellManager.castHeal()
        break
      case "saltar":
        this.spellManager.castSuperJump()
        break
      case "una":
      case "dua":
      case "tria":
        this.activateRune(command)
        break
    }
  }

  private activateRune(runeName: string) {
    // Find the rune with matching name
    const runeIndex = ["una", "dua", "tria"].indexOf(runeName)

    if (runeIndex >= 0 && !this.runesPuzzle.activated[runeIndex]) {
      // Activate the rune
      this.runesPuzzle.activated[runeIndex] = true
      this.runesPuzzle.runes[runeIndex].setTint(0xffff00) // Yellow glow

      // Play activation sound
      this.sound.play("rune-activate")

      // Create activation effect
      this.createRuneActivationEffect(this.runesPuzzle.runes[runeIndex])

      // Check if all runes are activated
      if (this.runesPuzzle.activated.every((active) => active)) {
        this.runesPuzzle.complete = true

        // Create effect for puzzle completion
        this.createPuzzleCompletionEffect()
      }
    }
  }

  private createRuneActivationEffect(rune: Phaser.GameObjects.Sprite) {
    // Create particles for rune activation
    const particles = this.add.particles("light")

    const emitter = particles.createEmitter({
      x: rune.x,
      y: rune.y,
      speed: { min: 20, max: 40 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.2, end: 0 },
      blendMode: "ADD",
      lifespan: 1000,
      quantity: 20,
    })

    // Auto-destroy after animation completes
    this.time.delayedCall(1000, () => {
      particles.destroy()
    })
  }

  private createPuzzleCompletionEffect() {
    // Create a beam of light to the exit
    const exitPoint = this.exit.getCenter()

    // Create line from each rune to exit
    this.runesPuzzle.runes.forEach((rune) => {
      const line = new Phaser.Geom.Line(rune.x, rune.y, exitPoint.x, exitPoint.y)

      const graphics = this.add.graphics()
      graphics.lineStyle(3, 0xffff00, 1)
      graphics.strokeLineShape(line)

      // Fade in effect
      graphics.alpha = 0
      this.tweens.add({
        targets: graphics,
        alpha: 1,
        duration: 1000,
        ease: "Power2",
      })
    })

    // Create particles at exit
    const particles = this.add.particles("light")

    const emitter = particles.createEmitter({
      x: exitPoint.x,
      y: exitPoint.y,
      speed: { min: 30, max: 60 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      blendMode: "ADD",
      lifespan: 2000,
      quantity: 5,
      frequency: 100,
    })

    // Show hint text
    const hintText = this.add.text(exitPoint.x, exitPoint.y - 50, "¡El sello se ha roto!", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
    })
    hintText.setOrigin(0.5)

    // Fade out hint text after a while
    this.tweens.add({
      targets: hintText,
      alpha: 0,
      y: exitPoint.y - 80,
      delay: 3000,
      duration: 1000,
      onComplete: () => {
        hintText.destroy()
      },
    })
  }
}