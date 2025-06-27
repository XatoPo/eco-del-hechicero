import * as Phaser from "phaser"
import type Player from "../entities/Player"

export default class SpellManager {
  private scene: Phaser.Scene
  private player: Player
  private fireballs: Phaser.Physics.Arcade.Group
  private shield: Phaser.GameObjects.Sprite | null = null
  private light: Phaser.GameObjects.Sprite | null = null
  private shieldActive = false
  private lightActive = false
  private spellCooldowns: {
    fireball: number
    shield: number
    light: number
    heal: number
    superJump: number
  }

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene
    this.player = player

    // Initialize spell cooldowns
    this.spellCooldowns = {
      fireball: 0,
      shield: 0,
      light: 0,
      heal: 0,
      superJump: 0,
    }

    // Create fireball group
    this.fireballs = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 10,
    })

    // Create animations
    this.createAnimations()

    // Set up collisions
    this.setupCollisions()
  }

  update() {
    // Update cooldowns
    for (const spell in this.spellCooldowns) {
      if (this.spellCooldowns[spell as keyof typeof this.spellCooldowns] > 0) {
        this.spellCooldowns[spell as keyof typeof this.spellCooldowns] -= this.scene.game.loop.delta
      }
    }

    // Update shield position
    if (this.shield && this.shieldActive) {
      this.shield.x = this.player.x
      this.shield.y = this.player.y
    }

    // Update light position
    if (this.light && this.lightActive) {
      this.light.x = this.player.x
      this.light.y = this.player.y - 20
    }
  }

  private createAnimations() {
    // Fireball animation
    this.scene.anims.create({
      key: "fireball",
      frames: this.scene.anims.generateFrameNumbers("fireball", { start: 0, end: 3 }),
      frameRate: 12,
      repeat: -1,
    })

    // Shield animation
    this.scene.anims.create({
      key: "shield",
      frames: this.scene.anims.generateFrameNumbers("shield", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    })

    // Light animation
    this.scene.anims.create({
      key: "light",
      frames: this.scene.anims.generateFrameNumbers("light", { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    })

    // Heal animation
    this.scene.anims.create({
      key: "heal-effect",
      frames: this.scene.anims.generateFrameNumbers("heal", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0,
    })
  }

  private setupCollisions() {
    // Collisions between fireballs and enemies
    const enemies = this.scene.physics.world.colliders
      .getActive()
      .find((collider) => collider.object2.name === "enemies")?.object2 as Phaser.Physics.Arcade.Group

    if (enemies) {
      this.scene.physics.add.collider(this.fireballs, enemies, this.handleFireballEnemyCollision, undefined, this)
    }
  }

  castFireball() {
    let canCast = true
    if (this.spellCooldowns.fireball > 0) {
      canCast = false
    }
    if (!this.player.canUseMana(20)) {
      canCast = false
    }

    if (!canCast) {
      return false
    }

    // Play cast animation
    this.player.playCastAnimation()

    // Create fireball
    const direction = this.player.flipX ? -1 : 1
    const fireball = this.fireballs.get(
      this.player.x + direction * 20,
      this.player.y - 10,
      "fireball",
    ) as Phaser.Physics.Arcade.Sprite

    if (fireball) {
      fireball.setActive(true)
      fireball.setVisible(true)
      fireball.setScale(1.5)

      // Set up physics
      fireball.body.enable = true
      fireball.setVelocityX(direction * 300)
      fireball.setFlipX(direction === -1)

      // Play animation
      fireball.play("fireball")

      // Play sound
      this.scene.sound.play("fireball-cast")

      // Add light effect
      const light = this.scene.add.pointlight(fireball.x, fireball.y, 0xff6600, 30, 0.8)

      // Auto-destroy after time
      this.scene.time.delayedCall(2000, () => {
        if (fireball.active) {
          fireball.destroy()
        }
        if (light) {
          light.destroy()
        }
      })

      // Set cooldown
      this.spellCooldowns.fireball = 500 // 0.5 seconds

      // Consume mana
      this.player.useMana(20)

      return true
    }

    return false
  }

  castShield() {
    // Check cooldown and mana
    if (this.spellCooldowns.shield > 0 || !this.player.canUseMana(30)) {
      return false
    }

    // Play cast animation
    this.player.playCastAnimation()

    // Create shield
    if (this.shield) {
      this.shield.destroy()
    }

    this.shield = this.scene.add.sprite(this.player.x, this.player.y, "shield")
    this.shield.setScale(1.5)
    this.shield.setAlpha(0.7)
    this.shield.play("shield")

    // Play sound
    this.scene.sound.play("shield-cast")

    // Set shield active
    this.shieldActive = true

    // Set duration
    this.scene.time.delayedCall(5000, () => {
      if (this.shield) {
        this.shield.destroy()
        this.shield = null
      }
      this.shieldActive = false
    })

    // Set cooldown
    this.spellCooldowns.shield = 8000 // 8 seconds

    // Consume mana
    this.player.useMana(30)

    return true
  }

  castLight() {
    // Check cooldown and mana
    if (this.spellCooldowns.light > 0 || !this.player.canUseMana(15)) {
      return false
    }

    // Play cast animation
    this.player.playCastAnimation()

    // Create light
    if (this.light) {
      this.light.destroy()
    }

    this.light = this.scene.add.sprite(this.player.x, this.player.y - 20, "light")
    this.light.setScale(2)
    this.light.setAlpha(0.8)
    this.light.play("light")

    // Play sound
    this.scene.sound.play("light-cast")

    // Set light active
    this.lightActive = true

    // Set duration
    this.scene.time.delayedCall(10000, () => {
      if (this.light) {
        this.light.destroy()
        this.light = null
      }
      this.lightActive = false
    })

    // Set cooldown
    this.spellCooldowns.light = 12000 // 12 seconds

    // Consume mana
    this.player.useMana(15)

    return true
  }

  castHeal() {
    // Check cooldown and mana
    if (this.spellCooldowns.heal > 0 || !this.player.canUseMana(40)) {
      return false
    }

    // Play cast animation
    this.player.playCastAnimation()

    // Heal player
    this.player.heal(30)

    // Play sound
    this.scene.sound.play("heal-cast")

    // Create heal effect
    const healEffect = this.scene.add.sprite(this.player.x, this.player.y, "heal")
    healEffect.setScale(1.5)
    healEffect.play("heal-effect")
    healEffect.on("animationcomplete", () => {
      healEffect.destroy()
    })

    // Set cooldown
    this.spellCooldowns.heal = 15000 // 15 seconds

    // Consume mana
    this.player.useMana(40)

    return true
  }

  castSuperJump() {
    // Check cooldown and mana
    if (this.spellCooldowns.superJump > 0 || !this.player.canUseMana(25)) {
      return false
    }

    // Attempt super jump
    if (this.player.superJump()) {
      // Play sound
      this.scene.sound.play("jump", { volume: 1.5 })

      // Create jump effect
      const jumpEffect = this.scene.add.particles("light")
      const emitter = jumpEffect.createEmitter({
        x: this.player.x,
        y: this.player.y + 20,
        speed: { min: 20, max: 40 },
        angle: { min: 80, max: 100 },
        scale: { start: 0.2, end: 0 },
        blendMode: "ADD",
        lifespan: 600,
        quantity: 10,
      })

      // Auto-destroy after animation completes
      this.scene.time.delayedCall(600, () => {
        jumpEffect.destroy()
      })

      // Set cooldown
      this.spellCooldowns.superJump = 3000 // 3 seconds

      // Consume mana
      this.player.useMana(25)

      return true
    }

    return false
  }

  private handleFireballEnemyCollision(fireball: Phaser.Physics.Arcade.Sprite, enemy: any) {
    // Damage enemy
    enemy.takeDamage(20)

    // Create impact effect
    const impact = this.scene.add.particles("light")
    const emitter = impact.createEmitter({
      x: fireball.x,
      y: fireball.y,
      speed: { min: 20, max: 40 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.2, end: 0 },
      blendMode: "ADD",
      lifespan: 300,
      quantity: 10,
    })

    // Play impact sound
    this.scene.sound.play("enemy-hit")

    // Destroy fireball
    fireball.destroy()

    // Auto-destroy particles after animation completes
    this.scene.time.delayedCall(300, () => {
      impact.destroy()
    })
  }

  isShieldActive(): boolean {
    return this.shieldActive
  }

  isLightActive(): boolean {
    return this.lightActive
  }
}
