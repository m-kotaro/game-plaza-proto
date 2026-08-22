import Phaser from 'phaser';
import { GameScene } from './scenes';

/**
 * BootScene - 初期シーン。名前入力ダイアログを表示してからGameSceneに遷移する
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#2d572c');

    // Show name input overlay
    this.showNameInput();
  }

  private showNameInput(): void {
    const container = document.getElementById('game-container');
    if (!container) return;

    const overlay = document.createElement('div');
    overlay.id = 'name-input-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
    `;

    overlay.innerHTML = `
      <h1 style="color: #ffd700; margin-bottom: 24px; font-size: 28px;">Game Plaza</h1>
      <p style="color: #ccc; margin-bottom: 16px;">名前を入力してください</p>
      <input type="text" id="player-name-input" maxlength="12" placeholder="プレイヤー名"
        style="padding: 12px 20px; font-size: 18px; border: 2px solid #ffd700; border-radius: 8px;
        background: #1a1a2e; color: white; text-align: center; width: 240px; outline: none;" />
      <button id="start-button"
        style="margin-top: 16px; padding: 12px 32px; font-size: 16px; background: #2ecc71;
        color: white; border: none; border-radius: 8px; cursor: pointer;">
        ゲーム開始
      </button>
    `;

    container.appendChild(overlay);

    const input = document.getElementById('player-name-input') as HTMLInputElement;
    const button = document.getElementById('start-button') as HTMLButtonElement;

    // Focus input
    setTimeout(() => input.focus(), 100);

    const startGame = () => {
      const name = input.value.trim() || 'ゲスト';
      overlay.remove();
      // Store name globally for GameScene to use
      (window as unknown as Record<string, string>).__playerName = name;
      this.scene.start('GameScene');
    };

    button.addEventListener('click', startGame);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') startGame();
    });
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#2d572c',
  pixelArt: true,
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
