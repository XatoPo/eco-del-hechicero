import * as Phaser from "phaser"

interface GameCallbacks {
  onHealthChange: (health: number) => void
  onManaChange: (mana: number) => void
  onLevelChange: (level: number) => void
  onGameLoaded: () => void
}

export default class BootScene extends Phaser.Scene {
  private callbacks: GameCallbacks

  constructor(callbacks: GameCallbacks) {
    super({ key: "BootScene" })
    this.callbacks = callbacks
  }

  preload() {
    // Display loading progress
    const progressBar = this.add.graphics()
    const progressBox = this.add.graphics()
    progressBox.fillStyle(0x222222, 0.8)
    progressBox.fillRect(this.cameras.main.width / 2 - 160, this.cameras.main.height / 2 - 25, 320, 50)

    const loadingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 50, "Cargando...", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#ffffff",
    })
    loadingText.setOrigin(0.5, 0.5)

    // Update progress bar as assets load
    this.load.on("progress", (value: number) => {
      progressBar.clear()
      progressBar.fillStyle(0x9c59ff, 1)
      progressBar.fillRect(this.cameras.main.width / 2 - 150, this.cameras.main.height / 2 - 15, 300 * value, 30)
    })

    // Load assets
    this.loadAssets()

    this.load.on("complete", () => {
      progressBar.destroy()
      progressBox.destroy()
      loadingText.destroy()
      this.callbacks.onGameLoaded()
      this.scene.start("Level1Scene")
    })
  }

  private loadAssets() {
    // Load spritesheets
    this.load.spritesheet("wizard", "/sprites/wizard.png", {
      frameWidth: 32,
      frameHeight: 48,
    })
    this.load.spritesheet("bat", "/sprites/bat.png", {
      frameWidth: 32,
      frameHeight: 32,
    })
    this.load.spritesheet("ghost", "/sprites/ghost.png", {
      frameWidth: 32,
      frameHeight: 48,
    })
    this.load.spritesheet("fireball", "/sprites/fireball.png", {
      frameWidth: 32,
      frameHeight: 16,
    })
    this.load.spritesheet("shield", "/sprites/shield.png", {
      frameWidth: 48,
      frameHeight: 48,
    })
    this.load.spritesheet("light", "/sprites/light.png", {
      frameWidth: 64,
      frameHeight: 64,
    })
    this.load.spritesheet("heal", "/sprites/heal.png", {
      frameWidth: 48,
      frameHeight: 48,
    })

    // Load tilesets
    this.load.image("forest-tiles", "/tilesets/forest-tiles.png")
    this.load.image("crypt-tiles", "/tilesets/crypt-tiles.png")

    // Load backgrounds
    this.load.image("forest-bg-1", "/backgrounds/forest-bg-1.png")
    this.load.image("forest-bg-2", "/backgrounds/forest-bg-2.png")
    this.load.image("forest-bg-3", "/backgrounds/forest-bg-3.png")
    this.load.image("crypt-bg-1", "/backgrounds/crypt-bg-1.png")
    this.load.image("crypt-bg-2", "/backgrounds/crypt-bg-2.png")

    // Load tilemaps
    this.load.tilemapTiledJSON("level1-map", "/maps/level1.json")
    this.load.tilemapTiledJSON("level2-map", "/maps/level2.json")

    // Load sounds
    this.load.audio("jump", "/sounds/jump.mp3")
    this.load.audio("fireball-cast", "/sounds/fireball.mp3")
    this.load.audio("shield-cast", "/sounds/shield.mp3")
    this.load.audio("light-cast", "/sounds/light.mp3")
    this.load.audio("heal-cast", "/sounds/heal.mp3")
    this.load.audio("hurt", "/sounds/hurt.mp3")
    this.load.audio("enemy-hit", "/sounds/enemy-hit.mp3")
    this.load.audio("background-music", "/sounds/background-music.mp3")
    this.load.audio("level-complete", "/sounds/level-complete.mp3")
  }
}
