import * as Phaser from "phaser"

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  private moveDirection = 1 // 1 for right, -1 for left
  private moveSpeed = 50
  private health: number
  private enemyType: string
  private isAttacking = false
  private detectionRange = 150

  constructor(scene: Phaser.Scene, x: number, y: number, type = "bat") {
    super(scene, x, y, type)

    this.enemyType = type

    scene.add.existing(this)
    scene.physics.add.existing(this)

    // Set up physics body
    this.setBounce(0.2)

    // Set properties based on enemy type
    switch (type) {
      case "bat":
        this.health = 30
        this.moveSpeed = 60
        this.setSize(24, 20)
        this.setOffset(4, 6)
        break
      case "ghost":
        this.health = 50
        this.moveSpeed = 40
        this.setSize(24, 30)
        this.setOffset(4, 9)
        // Ghosts can pass through platforms
        this.body.checkCollision.down = false
        break
      case "boss":
        this.health = 200
        this.moveSpeed = 30
        this.setSize(40, 40)
        this.setOffset(12, 8)
        this.detectionRange = 250
        break
    }

    // Create animations
    this.createAnimations()

    // Start idle animation
    this.play(`${type}-idle`)

    // Set up movement pattern
    this.setupMovement()
  }

  private createAnimations() {
    const type = this.enemyType

    // Idle animation
    this.anims.create({
      key: `${type}-idle`,
      frames: this.anims.generateFrameNumbers(type, { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    })

    // Move animation
    this.anims.create({
      key: `${type}-move`,
      frames: this.anims.generateFrameNumbers(type, { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1,
    })

    // Attack animation
    this.anims.create({
      key: `${type}-attack`,
      frames: this.anims.generateFrameNumbers(type, { start: 8, end: 11 }),
      frameRate: 12,
      repeat: 0,
    })

    // Hurt animation
    this.anims.create({
      key: `${type}-hurt`,
      frames: this.anims.generateFrameNumbers(type, { start: 12, end: 13 }),
      frameRate: 5,
      repeat: 0,
    })
  }

  private setupMovement() {
    // Different movement patterns based on enemy type
    switch (this.enemyType) {
      case "bat":
        // Bats move horizontally and change direction on collision
        this.setVelocityX(this.moveSpeed * this.moveDirection)
        break
      case "ghost":
        // Ghosts float and follow player when in range
        this.setGravity(0, -800) // Counteract world gravity
        break
      case "boss":
        // Boss has more complex movement pattern
        this.setVelocityX(this.moveSpeed * this.moveDirection)
        break
    }

    // Check for collisions to change direction
    this.scene.time.addEvent({
      delay: 100,
      callback: this.checkDirection,
      callbackScope: this,
      loop: true,
    })

    // For flying enemies, add vertical movement
    if (this.enemyType === "bat" || this.enemyType === "ghost") {
      this.scene.tweens.add({
        targets: this,
        y: this.y + 20,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      })
    }
  }

  private checkDirection() {
    // Get player reference
    const player = this.scene.children.getByName("player") as Phaser.Physics.Arcade.Sprite
    if (!player) return

    // Calculate distance to player
    const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y)

    if (distanceToPlayer < this.detectionRange) {
      // Player detected, move towards player
      this.moveTowardsPlayer(player)
    } else {
      // Regular patrol movement
      this.patrol()
    }
  }

  private moveTowardsPlayer(player: Phaser.Physics.Arcade.Sprite) {
    // Move towards player
    const direction = player.x < this.x ? -1 : 1

    // Flip sprite based on direction
    this.flipX = direction === -1

    // Set velocity based on enemy type
    switch (this.enemyType) {
      case "bat":
        this.setVelocityX(this.moveSpeed * 1.5 * direction)
        this.play("bat-move", true)
        break
      case "ghost":
        // Ghosts move towards player in both X and Y
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y)
        this.setVelocityX(Math.cos(angle) * this.moveSpeed)
        this.setVelocityY(Math.sin(angle) * this.moveSpeed)
        this.play("ghost-move", true)
        break
      case "boss":
        this.setVelocityX(this.moveSpeed * direction)
        this.play("boss-move", true)

        // Boss can attack when close enough
        if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 80 && !this.isAttacking) {
          this.attack()
        }
        break
    }
  }

  private patrol() {
    // Regular patrol movement
    switch (this.enemyType) {
      case "bat":
        // Check for obstacles or edges
        const rayStart = new Phaser.Geom.Point(this.x + this.moveDirection * 20, this.y + 10)
        const rayEnd = new Phaser.Geom.Point(rayStart.x, rayStart.y + 30)

        const bodies = this.scene.physics.world.bodies.getArray()
        const hit = bodies.some((body) => {
          if (body === this.body) return false
          return Phaser.Geom.Intersects.LineToRectangle(
            new Phaser.Geom.Line(rayStart.x, rayStart.y, rayEnd.x, rayEnd.y),
            body.getBounds(),
          )
        })

        if (!hit || this.body.blocked.left || this.body.blocked.right) {
          // Change direction
          this.moveDirection *= -1
          this.setVelocityX(this.moveSpeed * this.moveDirection)
          this.flipX = this.moveDirection === -1
        }

        this.play("bat-move", true)
        break
      case "ghost":
        // Ghosts float around randomly when not chasing
        if (Math.random() < 0.02) {
          this.setVelocityX((Math.random() - 0.5) * this.moveSpeed * 2)
          this.setVelocityY((Math.random() - 0.5) * this.moveSpeed * 2)
          this.flipX = this.body.velocity.x < 0
        }
        this.play("ghost-idle", true)
        break
      case "boss":
        // Boss patrols back and forth
        if (this.body.blocked.left) {
          this.moveDirection = 1
          this.flipX = false
        } else if (this.body.blocked.right) {
          this.moveDirection = -1
          this.flipX = true
        }

        this.setVelocityX(this.moveSpeed * this.moveDirection)
        this.play("boss-idle", true)
        break
    }
  }

  takeDamage(damage: number) {
    this.health -= damage

    // Play hurt animation and sound
    this.play(`${this.enemyType}-hurt`)
    this.scene.sound.play("enemy-hit")

    // Flash effect
    this.setTint(0xff0000)
    this.scene.time.delayedCall(200, () => {
      this.clearTint()
    })

    // Check for death
    if (this.health <= 0) {
      this.die()
    } else {
      // Return to normal animation after hurt
      this.once("animationcomplete", () => {
        this.play(`${this.enemyType}-idle`)
      })
    }
  }

  private die() {
    // Create death effect
    const particles = this.scene.add.particles("light")

    const emitter = particles.createEmitter({
      x: this.x,
      y: this.y,
      speed: { min: 20, max: 40 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.2, end: 0 },
      blendMode: "ADD",
      lifespan: 800,
      quantity: 15,
    })

    // Play death sound
    this.scene.sound.play("enemy-hit", { volume: 1.5 })

    // Remove enemy
    this.destroy()

    // Auto-destroy particles after animation completes
    this.scene.time.delayedCall(800, () => {
      particles.destroy()
    })
  }

  private attack() {
    this.isAttacking = true

    // Stop movement during attack
    this.setVelocity(0, 0)

    // Play attack animation
    this.play(`${this.enemyType}-attack`)

    // Create attack effect based on enemy type
    switch (this.enemyType) {
      case "ghost":
        // Ghost creates a spectral projectile
        const projectile = this.scene.physics.add.sprite(this.x, this.y, "ghost-projectile")
        projectile.setScale(0.5)
        projectile.setAlpha(0.7)

        // Get player reference
        const player = this.scene.children.getByName("player") as Phaser.Physics.Arcade.Sprite
        if (player) {
          // Launch towards player
          const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y)
          const speed = 200
          projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)

          // Add collision with player
          this.scene.physics.add.overlap(projectile, player, () => {
            // Damage player
            ;(player as any).takeDamage(10)

            // Destroy projectile
            projectile.destroy()
          })

          // Auto-destroy after time
          this.scene.time.delayedCall(2000, () => {
            if (projectile.active) {
              projectile.destroy()
            }
          })
        }
        break
      case "boss":
        // Boss creates a shockwave
        const shockwave = this.scene.add.sprite(this.x, this.y, "shockwave")
        shockwave.setScale(0.5)
        shockwave.setAlpha(0.8)

        // Grow and fade out
        this.scene.tweens.add({
          targets: shockwave,
          scale: 2,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            shockwave.destroy()
          },
        })

        // Damage player if in range
        const playerBoss = this.scene.children.getByName("player") as any
        if (playerBoss && Phaser.Math.Distance.Between(this.x, this.y, playerBoss.x, playerBoss.y) < 100) {
          playerBoss.takeDamage(20)
        }
        break
    }

    // Reset attack state after delay
    this.scene.time.delayedCall(1500, () => {
      this.isAttacking = false
    })
  }
}
