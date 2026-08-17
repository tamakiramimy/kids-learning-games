import Phaser from 'phaser'
import { BootScene } from '../scenes/BootScene'
import { AdventureMapScene } from '../scenes/AdventureMapScene'
import { MathGardenScene } from '../scenes/MathGardenScene'
import { ForestCompareScene } from '../scenes/ForestCompareScene'
import { SoundHarborScene } from '../scenes/SoundHarborScene'
import { RewardScene } from '../scenes/RewardScene'
import { CompanionScene } from '../scenes/CompanionScene'
import { LearningHubScene } from '../scenes/LearningHubScene'
import { LearningQuestScene } from '../scenes/LearningQuestScene'
import { RelaxationHubScene } from '../scenes/RelaxationHubScene'
import { ThunderFlightScene } from '../scenes/ThunderFlightScene'
import { TinyRaceScene } from '../scenes/TinyRaceScene'
import { RainbowBlocksScene } from '../scenes/RainbowBlocksScene'

export function createPhaserConfig(parent: string | HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#FFF8E1',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    scene: [BootScene, AdventureMapScene, MathGardenScene, ForestCompareScene, SoundHarborScene, RewardScene, CompanionScene, LearningHubScene, LearningQuestScene, RelaxationHubScene, ThunderFlightScene, RainbowBlocksScene, TinyRaceScene],
    input: {
      gamepad: true,
      keyboard: true,
      mouse: true,
      touch: true,
      activePointers: 2,
      windowEvents: true,
    },
    render: {
      pixelArt: false,
      antialias: true,
    },
  }
}