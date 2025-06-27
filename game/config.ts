// Cambia la importación de Phaser para asegurarnos de que esté disponible
import * as Phaser from "phaser"
import BootScene from "./scenes/BootScene"
import Level1Scene from "./scenes/Level1Scene"
import Level2Scene from "./scenes/Level2Scene"
import UIScene from "./scenes/UIScene"

interface GameCallbacks {
  onHealthChange: (health: number) => void
  onManaChange: (mana: number) => void
  onLevelChange: (level: number) => void
  onGameLoaded: () => void
}

export function initPhaser(parent: HTMLElement, callbacks: GameCallbacks): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    backgroundColor: "#000",
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 1000 },
        debug: false,
      },
    },
    scene: [new BootScene(callbacks), new Level1Scene(callbacks), new Level2Scene(callbacks), new UIScene()],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  }

  return new Phaser.Game(config)
}
