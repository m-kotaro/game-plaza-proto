import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT, ServerMessage } from '@game-plaza/shared';
import { NetworkManager } from '../network';
import { AvatarManager } from '../managers';
import { InputHandler, AvatarManagerLike } from '../input';
import { MessageHandler } from '../handlers';
import { WEBSOCKET_URL } from '../config';

/**
 * AvatarManager と InputHandler の AvatarManagerLike インターフェースを橋渡しするアダプター
 */
class AvatarManagerAdapter implements AvatarManagerLike {
  constructor(private avatarManager: AvatarManager) {}

  getLocalPlayerPosition() {
    return this.avatarManager.getLocalPosition();
  }

  setLocalPlayerPosition(position: { x: number; y: number }) {
    this.avatarManager.moveLocalAvatar(position);
  }
}

/**
 * メインゲームシーン
 * 2Dマップの描画、WebSocket接続、アバター管理、入力処理を統合する
 */
export class GameScene extends Phaser.Scene {
  private networkManager!: NetworkManager;
  private avatarManager!: AvatarManager;
  private inputHandler!: InputHandler;
  private messageHandler!: MessageHandler;
  private localSessionId: string | null = null;

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

    // Initialize managers
    this.avatarManager = new AvatarManager(this);
    this.networkManager = new NetworkManager(WEBSOCKET_URL);

    // Register the local session detection handler FIRST.
    // This MUST fire before MessageHandler's handler so that localSessionId is set
    // on both GameScene and MessageHandler before MessageHandler processes the same
    // message. Otherwise MessageHandler would see localSessionId === null and
    // incorrectly add ourselves as a remote avatar — creating a ghost trail
    // (a stationary duplicate stuck at the spawn position).
    //
    // Note: this.messageHandler is assigned below before connect() is called,
    // so it is guaranteed to exist when this handler actually fires.
    this.networkManager.onMessage((message: ServerMessage) => {
      if (message.type === 'player_joined' && this.localSessionId === null) {
        this.localSessionId = message.sessionId;
        this.messageHandler.setLocalSessionId(message.sessionId);
        this.avatarManager.createLocalAvatar(message.sessionId, message.avatar, message.position);
      }
    });

    // Setup message handler (routes server messages to avatar manager).
    // Its onMessage handler is registered second, so by the time it processes the
    // first player_joined, localSessionId is already set and it correctly skips
    // adding ourselves as a remote avatar.
    this.messageHandler = new MessageHandler(this.networkManager, this.avatarManager);

    // Setup input handler with adapter bridging the interface
    const adapter = new AvatarManagerAdapter(this.avatarManager);
    this.inputHandler = new InputHandler(this, this.networkManager, adapter);
    this.inputHandler.setup();

    // Connect to WebSocket server
    this.networkManager.connect();

    // Show connection status (fixed on screen)
    const statusText = this.add.text(10, 10, 'Connecting...', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 4 },
    });
    statusText.setScrollFactor(0);
    statusText.setDepth(100);

    // Update status text based on connection state
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        const state = this.networkManager.getState();
        if (state === 'connected') {
          statusText.setText('Connected');
        } else if (state === 'connecting') {
          statusText.setText('Connecting...');
        } else {
          statusText.setText('Disconnected');
        }
      },
    });
  }

  update(time: number, delta: number): void {
    // Update input (movement + position sync)
    this.inputHandler.update(time, delta);

    // Update avatar interpolation for remote players
    this.avatarManager.update();
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
      0x4a7c59,
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
