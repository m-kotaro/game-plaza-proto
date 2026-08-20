import Phaser from 'phaser';
import { GameScene } from './scenes';

/**
 * BootScene - 初期シーン。ロード画面を表示してからGameSceneに遷移する
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#2d572c');

    this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        'Game Plaza\nConnecting...',
        {
          fontSize: '32px',
          color: '#ffffff',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    // Transition to GameScene after a brief loading display
    this.time.delayedCall(1000, () => {
      this.scene.start('GameScene');
    });
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#2d572c',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: {
    target: 60,
    min: 30,
  },
  scene: [BootScene, GameScene],
};

new Phaser.Game(config);
