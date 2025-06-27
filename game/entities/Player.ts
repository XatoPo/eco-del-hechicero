import * as Phaser from "phaser"

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys
  private health = 100
  private mana = 100
  private isJumping = false
  private isDamaged = false
  private respawnPoint: { x: number; y: number }
  private updateHealthCallback: (health: number) => void
  private updateManaCallback: (mana: number) => void
  private manaRegenTimer = 0
  private canDoubleJump = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    updateHealthCallback: (health: number) => void,
    updateManaCallback: (mana: number) => void,
  ) {
    super(scene, x, y, "wizard")

    this.updateHealthCallback = updateHealthCallback
    this.updateManaCallback = updateManaCallback

    scene.add.existing(this)
    scene.physics.add.existing(this)

    // Set up physics body
    this.setCollideWorldBounds(true)
    this.setBounce(0.1)
    this.setSize(20, 40) // Adjust hitbox
    this.setOffset(6, 8)

    // Set up animations
    this.createAnimations()

    // Set up controls
    this.cursors = scene.input.keyboard.createCursorKeys()

    // Set initial respawn point
    this.respawnPoint = { x, y }

    // Initialize UI
    this.updateHealthCallback(this.health)
    this.updateManaCallback(this.mana)
  }

  update() {
    // Handle movement
    this.handleMovement()

    // Handle mana regeneration
    this.handleManaRegen()

    // Check for death
    if (this.health <= 0) {
      this.die()
    }
  }

  private createAnimations() {
    // Idle animation
    this.anims.create({
      key: "wizard-idle",
      frames: this.anims.generateFrameNumbers("wizard", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    })

    // Walk animation
    this.anims.create({
      key: "wizard-walk",
      frames: this.anims.generateFrameNumbers("wizard", { start: 4, end: 9 }),
      frameRate: 10,
      repeat: -1,
    })

    // Jump animation
    this.anims.create({
      key: "wizard-jump",
      frames: this.anims.generateFrameNumbers("wizard", { start: 10, end: 12 }),
      frameRate: 8,
      repeat: 0,
    })

    // Cast animation
    this.anims.create({
      key: "wizard-cast",
      frames: this.anims.generateFrameNumbers("wizard", { start: 13, end: 16 }),
      frameRate: 12,
      repeat: 0,
    })

    // Hurt animation
    this.anims.create({
      key: "wizard-hurt",
      frames: this.anims.generateFrameNumbers("wizard", { start: 17, end: 18 }),
      frameRate: 5,
      repeat: 0,
    })
  }

  private handleMovement() {
    // Left/right movement
    if (this.cursors.left.isDown) {
      this.setVelocityX(-160)
      this.flipX = true
      if (this.body.onFloor() && !this.anims.isPlaying) {
        this.play("wizard-walk", true)
      }
    } else if (this.cursors.right.isDown) {
      this.setVelocityX(160)
      this.flipX = false
      if (this.body.onFloor() && !this.anims.isPlaying) {
        this.play("wizard-walk", true)
      }
    } else {
      this.setVelocityX(0)
      if (this.body.onFloor() && !this.anims.isPlaying) {
        this.play("wizard-idle", true)
      }
    }

    // Jumping
    if (this.cursors.space.isDown && this.body.onFloor() && !this.isJumping) {
      this.setVelocityY(-400)
      this.isJumping = true
      this.canDoubleJump = true
      this.play("wizard-jump")
      this.scene.sound.play("jump")
    }

    // Reset jump state when landing
    if (this.body.onFloor()) {
      if (this.isJumping) {
        this.isJumping = false
      }
    }

    // Double jump with spell
    if (this.cursors.space.isDown && !this.body.onFloor() && this.canDoubleJump) {
      // Double jump is handled by the spell manager
    }
  }

  private handleManaRegen() {
    // Regenerate mana over time
    this.manaRegenTimer += this.scene.game.loop.delta

    if (this.manaRegenTimer >= 1000) {
      // Every second
      this.manaRegenTimer = 0
      if (this.mana < 100) {
        this.mana = Math.min(100, this.mana + 2)
        this.updateManaCallback(this.mana)
      }
    }
  }

  takeDamage(amount: number) {
    if (this.isDamaged) return // Invulnerability frames

    this.health = Math.max(0, this.health - amount)
    this.updateHealthCallback(this.health)

    // Play hurt animation and sound
    this.play("wizard-hurt")
    this.scene.sound.play("hurt")

    // Flash effect
    this.setTint(0xff0000)

    // Set invulnerability frames
    this.isDamaged = true
    this.scene.time.delayedCall(1000, () => {
      this.clearTint()
      this.isDamaged = false
    })
  }

  heal(amount: number) {
    this.health = Math.min(100, this.health + amount)
    this.updateHealthCallback(this.health)

    // Healing effect
    const healEffect = this.scene.add.sprite(this.x, this.y, "heal")
    healEffect.play("heal-effect")
    healEffect.on("animationcomplete", () => {
      healEffect.destroy()
    })
  }

  useMana(amount: number): boolean {
    if (this.mana >= amount) {
      this.mana -= amount
      this.updateManaCallback(this.mana)
      return true
    }
    return false
  }

  restoreMana(amount: number) {
    this.mana = Math.min(100, this.mana + amount)
    this.updateManaCallback(this.mana)
  }

  setRespawnPoint(x: number, y: number) {
    this.respawnPoint = { x, y }
  }

  die() {
    // Play death animation
    this.play("wizard-hurt")
    this.setTint(0xff0000)

    // Disable controls temporarily
    this.setVelocity(0, 0)
    this.setImmovable(true)

    // Fade out
    this.scene.cameras.main.fadeOut(500)

    // Respawn after delay
    this.scene.time.delayedCall(1000, () => {
      // Reset position to respawn point
      this.setPosition(this.respawnPoint.x, this.respawnPoint.y)

      // Reset health and mana
      this.health = 100
      this.mana = 100
      this.updateHealthCallback(this.health)
      this.updateManaCallback(this.mana)

      // Reset state
      this.clearTint()
      this.setImmovable(false)

      // Fade back in
      this.scene.cameras.main.fadeIn(500)
    })
  }

  playCastAnimation() {
    this.play("wizard-cast")

    // Return to idle after cast completes
    this.once("animationcomplete", () => {
      if (this.body.onFloor()) {
        this.play("wizard-idle")
      }
    })
  }

  superJump() {
    if (this.canDoubleJump) {
      this.setVelocityY(-500) // Higher than normal jump
      this.canDoubleJump = false
      this.play("wizard-jump")
      this.scene.sound.play("jump")
      return true
    }
    return false
  }

  applyDarknessPenalty() {
    // In dark zones without light, movement is slower
    if (this.body.velocity.x > 0) {
      this.setVelocityX(80) // Half speed
    } else if (this.body.velocity.x < 0) {
      this.setVelocityX(-80) // Half speed
    }
  }
}
