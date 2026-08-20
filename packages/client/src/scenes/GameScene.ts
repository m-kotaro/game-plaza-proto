import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT } from '@game-plaza/shared';

/**
 * メインゲームシーン
 * 2Dマップの描画、カメラ追従、30fps以上のレンダリングを担当
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Set world bounds for physics
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Draw the 2D world background
    this.createWorldBackground();

    // Setup camera bounds to match the world
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    // Camera follow will be set when the player avatar is created (via AvatarManager)
  }

  /**
   * ワールド背景の描画
   * 草色の背景 + グリッド線 + ワールド境界線
   */
  private createWorldBackground(): void {
    // Grass-colored background
    const bg = this.add.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      WORLD_WIDTH,
      WORLD_HEIGHT,
      0x4a7c59
    );
    bg.setDepth(-10);

    // Grid lines for visual reference
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x5a8c69, 0.3);
    const gridSize = 100;
    for (let x = 0; x <= WORLD_WIDTH; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(WORLD_WIDTH, y);
    }
    graphics.strokePath();
    graphics.setDepth(-9);

    // World boundary visual
    const border = this.add.graphics();
    border.lineStyle(3, 0xffffff, 0.5);
    border.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    border.setDepth(-8);
  }
}
