// Cambia la importación de Phaser para asegurarnos de que esté disponible
import * as Phaser from "phaser"

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene", active: true })
  }

  create() {
    // This scene is for UI elements that should persist across level changes
    // Currently, we're handling the UI in React, so this scene is minimal
    // Add any persistent UI elements here if needed
  }
}
