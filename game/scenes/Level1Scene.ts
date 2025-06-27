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

export default class Level1Scene extends Phaser.Scene {
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

  constructor(callbacks: GameCallbacks) {
    super({ key: "Level1Scene" })
    this.callbacks = callbacks
  }

  init() {
    this.callbacks.onLevelChange(1)
  }

  create() {
    // Create parallax background
    this.createParallaxBackground()

    // Create tilemap
    const map = this.make.tilemap({ key: "level1-map" })
    const forestTileset = map.addTilesetImage("forest-tiles", "forest-tiles")

    // Create layers
    const backgroundLayer = map.createLayer("Background", forestTileset)
    this.platforms = map.createLayer("Platforms", forestTileset)
    this.traps = map.createLayer("Traps", forestTileset)
    const decorationLayer = map.createLayer("Decoration", forestTileset)

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

    // Create dark zones
    this.createDarkZones(map)

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
    this.cameras.main.setBackgroundColor("#87CEEB") // Sky blue

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
  }

  private createParallaxBackground() {
    const width = this.scale.width
    const height = this.scale.height

    // Add background layers with parallax effect
    const bg3 = this.add
      .tileSprite(0, 0, width, height, "forest-bg-3")
      .setOrigin(0, 0)
      .setScrollFactor(0, 0)
      .setDepth(-30)

    const bg2 = this.add
      .tileSprite(0, 0, width, height, "forest-bg-2")
      .setOrigin(0, 0)
      .setScrollFactor(0, 0)
      .setDepth(-20)

    const bg1 = this.add
      .tileSprite(0, 0, width, height, "forest-bg-1")
      .setOrigin(0, 0)
      .setScrollFactor(0, 0)
      .setDepth(-10)

    // Update parallax effect on camera move
    this.cameras.main.on("camerascroll", (camera: Phaser.Cameras.Scene2D.Camera) => {
      bg3.tilePositionX = camera.scrollX * 0.1
      bg2.tilePositionX = camera.scrollX * 0.3
      bg1.tilePositionX = camera.scrollX * 0.5
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
        enemyObj.properties?.find((p) => p.name === "type")?.value || "bat",
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
        0.7,
      )
      darkZone.setData("illuminated", false)
      this.darkZones.push(darkZone)
    })
  }

  private handleTrapCollision(player: Player, trap: Phaser.Tilemaps.Tile) {
    if (this.spellManager.isShieldActive()) {
      return // Shield protects from traps
    }

    player.takeDamage(10)
  }

  private handleEnemyCollision(player: Player, enemy: Enemy) {
    if (this.spellManager.isShieldActive()) {
      return // Shield protects from enemies
    }

    player.takeDamage(15)

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
    // Play completion sound
    this.sound.play("level-complete")

    // Transition to level 2
    this.cameras.main.fadeOut(1000, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("Level2Scene")
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
          zone.setAlpha(0.1)
          zone.setData("illuminated", true)
        } else if (zone.getData("illuminated")) {
          zone.setAlpha(0.7)
          zone.setData("illuminated", false)
        }
      }
    }

    // Apply darkness effect if player is in dark zone without light
    if (playerInDarkZone && !this.spellManager.isLightActive()) {
      this.player.applyDarknessPenalty()
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
    }
  }
}
