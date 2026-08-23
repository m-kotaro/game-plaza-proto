import Phaser from 'phaser';
import { GameScene } from './scenes';

/**
 * BootScene - 初期シーン。名前入力とキャラクター選択を表示してからGameSceneに遷移する
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Load Tiny Dungeon tileset for character selection preview
    this.load.spritesheet('tiny-dungeon', '/assets/kenney_tiny-dungeon/Tilemap/tilemap_packed.png', {
      frameWidth: 16,
      frameHeight: 16,
      margin: 0,
      spacing: 0,
    });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#2d572c');

    // Show name input and character selection overlay
    this.showNameInput();
  }

  private showNameInput(): void {
    const container = document.getElementById('game-container');
    if (!container) return;

    // All 20 character frame indices matching AvatarManager
    const CHARACTER_FRAMES = [
      84, 85, 86, 87, 88,
      96, 97, 98, 99, 100,
      108, 109, 110, 111, 112,
      120, 121, 122, 123, 124,
    ];

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
      overflow-y: auto;
    `;

    // Build character grid HTML
    const characterCells = CHARACTER_FRAMES.map((_, i) => `
      <div class="char-cell" data-index="${i}"
        style="width: 40px; height: 40px; border: 2px solid #555; border-radius: 6px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        background: #1a1a2e; transition: border-color 0.15s, transform 0.15s;">
        <canvas width="32" height="32" data-char-index="${i}"></canvas>
      </div>
    `).join('');

    overlay.innerHTML = `
      <h1 style="color: #ffd700; margin-bottom: 20px; font-size: 28px;">Game Plaza</h1>
      <p style="color: #ccc; margin-bottom: 12px;">名前を入力してください</p>
      <input type="text" id="player-name-input" maxlength="12" placeholder="プレイヤー名"
        style="padding: 12px 20px; font-size: 18px; border: 2px solid #ffd700; border-radius: 8px;
        background: #1a1a2e; color: white; text-align: center; width: 240px; outline: none;" />
      <p style="color: #ccc; margin-top: 20px; margin-bottom: 12px;">キャラクターを選択</p>
      <div id="character-grid" style="display: grid; grid-template-columns: repeat(5, 40px);
        gap: 8px; margin-bottom: 20px;">
        ${characterCells}
      </div>
      <button id="start-button"
        style="padding: 12px 32px; font-size: 16px; background: #2ecc71;
        color: white; border: none; border-radius: 8px; cursor: pointer;">
        ゲーム開始
      </button>
    `;

    container.appendChild(overlay);

    // Draw character sprites onto the canvases using the loaded spritesheet
    const texture = this.textures.get('tiny-dungeon');
    const sourceImage = texture.getSourceImage() as HTMLImageElement;
    const framesPerRow = Math.floor(sourceImage.width / 16);

    CHARACTER_FRAMES.forEach((frame, i) => {
      const canvas = overlay.querySelector(`canvas[data-char-index="${i}"]`) as HTMLCanvasElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const srcX = (frame % framesPerRow) * 16;
      const srcY = Math.floor(frame / framesPerRow) * 16;

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sourceImage, srcX, srcY, 16, 16, 0, 0, 32, 32);
    });

    // Character selection logic
    let selectedIndex = 0;
    const cells = overlay.querySelectorAll('.char-cell') as NodeListOf<HTMLElement>;

    const selectCharacter = (index: number) => {
      selectedIndex = index;
      cells.forEach((cell, i) => {
        if (i === index) {
          cell.style.borderColor = '#ffd700';
          cell.style.transform = 'scale(1.15)';
        } else {
          cell.style.borderColor = '#555';
          cell.style.transform = 'scale(1)';
        }
      });
    };

    // Default selection
    selectCharacter(0);

    cells.forEach((cell, i) => {
      cell.addEventListener('click', () => selectCharacter(i));
    });

    const input = document.getElementById('player-name-input') as HTMLInputElement;
    const button = document.getElementById('start-button') as HTMLButtonElement;

    // Focus input
    setTimeout(() => input.focus(), 100);

    const startGame = () => {
      const name = input.value.trim() || 'ゲスト';
      overlay.remove();
      // Store name and character index globally for GameScene to use
      (window as unknown as Record<string, string>).__playerName = name;
      (window as unknown as Record<string, number>).__characterIndex = selectedIndex;
      this.scene.start('GameScene');
    };

    button.addEventListener('click', startGame);
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener('keydown', keyHandler, true);
        startGame();
      }
    };
    document.addEventListener('keydown', keyHandler, true);
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
