import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT, ServerMessage, GameStartMessage, RankingEntry } from '@game-plaza/shared';
import { NetworkManager } from '../network';
import { AvatarManager } from '../managers';
import { InputHandler, AvatarManagerLike } from '../input';
import { MessageHandler } from '../handlers';
import { WEBSOCKET_URL } from '../config';
import {
  InteractionZone,
  IframeOverlayManager,
  PostMessageBridge,
  ResultNotification,
  DEFAULT_GAME_CONFIG,
  getGameEntry,
  fetchAllGameMeta,
} from '../iframe';
import { BulletinBoard, BulletinBoardData } from './BulletinBoard';

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
  private lastGameType: string | null = null;
  private gameTitles: Map<string, string> = new Map();

  // iframe integration
  private interactionZones: InteractionZone[] = [];
  private gameZoneData = (() => {
    const positions = [
      { x: 300, y: 200 },
      { x: 700, y: 200 },
      { x: 1100, y: 200 },
      { x: 300, y: 600 },
      { x: 700, y: 600 },
      { x: 1100, y: 600 },
    ];

    // mock はデバッグ用なのでゾーン一覧から除外する
    const gameTypes = Object.keys(DEFAULT_GAME_CONFIG.games).filter(k => k !== 'mock');

    return gameTypes.slice(0, positions.length).map((gameType, i) => ({
      x: positions[i].x,
      y: positions[i].y,
      width: 120,
      height: 120,
      gameType,
      label: gameType,
    }));
  })();
  private iframeOverlay!: IframeOverlayManager;
  private postMessageBridge!: PostMessageBridge;
  private resultNotification!: ResultNotification;
  private inputEnabled = true;
  private eKey!: Phaser.Input.Keyboard.Key;
  private bulletinBoard!: BulletinBoard;
  private bulletinZones: InteractionZone[] = [];
  private allRankings: Map<string, RankingEntry[]> = new Map();

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

        // Request rankings for all game types on initial connection
        const gameTypes = this.gameZoneData.map(z => z.gameType);
        for (const gameType of gameTypes) {
          this.networkManager.send({ action: 'get_rankings', gameType });
        }
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

    // === iframe integration setup ===

    // Interaction zones
    this.interactionZones = this.gameZoneData.map(zone =>
      new InteractionZone(this, {
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
        gameType: zone.gameType,
        label: zone.label,
      })
    );

    // PostMessage bridge
    this.postMessageBridge = new PostMessageBridge({
      allowedOrigins: DEFAULT_GAME_CONFIG.allowedOrigins,
    });

    // Iframe overlay
    this.iframeOverlay = new IframeOverlayManager(
      'game-container',
      this.postMessageBridge,
      {
        onInputPause: () => { this.inputEnabled = false; },
        onInputResume: () => { this.inputEnabled = true; },
      },
      DEFAULT_GAME_CONFIG.loadTimeoutMs,
    );

    // Result notification
    this.resultNotification = new ResultNotification('game-container');

    // === Bulletin Board setup (one per game, positioned to the left of each game zone) ===
    this.bulletinZones = this.gameZoneData.map(zone =>
      new InteractionZone(this, {
        x: zone.x - 100,
        y: zone.y,
        width: 60,
        height: 60,
        gameType: `bulletin_${zone.gameType}`,
        label: '📋',
      })
    );
    this.bulletinBoard = new BulletinBoard('game-container');

    // Store rankings data for bulletin board
    this.networkManager.onMessage((message: ServerMessage) => {
      if (message.type === 'rankings_update') {
        this.allRankings.set(message.gameType, message.rankings);
      }
    });

    // Fetch metadata from external games asynchronously
    fetchAllGameMeta(DEFAULT_GAME_CONFIG.games).then((metaMap) => {
      for (let i = 0; i < this.gameZoneData.length; i++) {
        const gameType = this.gameZoneData[i].gameType;
        const meta = metaMap[gameType];
        if (!meta) continue;

        this.gameTitles.set(gameType, meta.title);

        const zone = this.interactionZones[i];
        if (zone) {
          zone.updateLabel(meta.title);
        }
      }
    });

    // PostMessage callbacks
    this.postMessageBridge.onGameResult((result) => {
      this.iframeOverlay.close();

      // Submit score if available
      if (result.scores && this.localSessionId) {
        const scoreValues = Object.values(result.scores);
        const score = scoreValues.length > 0 ? scoreValues[0] : 0;
        if (this.lastGameType && score > 0) {
          this.networkManager.send({
            action: 'submit_score',
            gameType: this.lastGameType,
            score,
          });
        }
      }
    });

    this.postMessageBridge.onGameClose(() => {
      this.iframeOverlay.close();
    });

    // E key for interaction
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  update(time: number, delta: number): void {
    // Update input (movement + position sync) only when input is enabled
    if (this.inputEnabled) {
      this.inputHandler.update(time, delta);
    }

    // Update avatar interpolation for remote players
    this.avatarManager.update();

    // Interaction zone overlap detection (manual bounds check for Container-based avatar)
    if (this.localSessionId && this.inputEnabled) {
      const pos = this.avatarManager.getLocalPosition();
      if (pos) {
        for (let i = 0; i < this.interactionZones.length; i++) {
          const zone = this.interactionZones[i];
          const cfg = this.gameZoneData[i];
          const inZone =
            pos.x >= cfg.x - cfg.width / 2 &&
            pos.x <= cfg.x + cfg.width / 2 &&
            pos.y >= cfg.y - cfg.height / 2 &&
            pos.y <= cfg.y + cfg.height / 2;

          zone.setPlayerInZone(inZone);

          if (inZone && Phaser.Input.Keyboard.JustDown(this.eKey) && !this.bulletinBoard.isOpen()) {
            this.startGame(zone.getGameType());
            break;
          }
        }

        // Bulletin board zone checks
        for (let i = 0; i < this.bulletinZones.length; i++) {
          const bZone = this.bulletinZones[i];
          const bCfg = { x: this.gameZoneData[i].x - 100, y: this.gameZoneData[i].y, width: 60, height: 60 };
          const inBZone =
            pos.x >= bCfg.x - bCfg.width / 2 &&
            pos.x <= bCfg.x + bCfg.width / 2 &&
            pos.y >= bCfg.y - bCfg.height / 2 &&
            pos.y <= bCfg.y + bCfg.height / 2;

          bZone.setPlayerInZone(inBZone);

          if (inBZone && Phaser.Input.Keyboard.JustDown(this.eKey) && !this.bulletinBoard.isOpen()) {
            this.openBulletinBoard(this.gameZoneData[i].gameType);
            break;
          }
        }

      }
    }
  }

  /**
   * ゲーム開始フロー: iframe を開き GameStartMessage を送信する
   */
  private startGame(gameType: string): void {
    this.lastGameType = gameType;
    const entry = getGameEntry(DEFAULT_GAME_CONFIG, gameType);
    if (!entry) {
      console.warn(`[GameScene] Unknown game type: ${gameType}`);
      return;
    }

    // Open iframe overlay
    this.iframeOverlay.open(entry.url, entry.origin);

    // Send GameStartMessage after a short delay to allow iframe to load
    setTimeout(() => {
      const message: GameStartMessage = {
        type: 'game_start',
        gameType,
        players: [{
          userName: 'Player',
          uuid: this.localSessionId!,
          isLocal: true,
        }],
      };
      this.postMessageBridge.sendGameStart(message);
    }, 500);
  }

  /**
   * 掲示板を開く: 指定ゲームのランキングをDOMオーバーレイで表示する
   */
  private openBulletinBoard(gameType: string): void {
    const title = this.gameTitles.get(gameType) || gameType;

    const data: BulletinBoardData[] = [{
      gameType,
      title,
      rankings: this.allRankings.get(gameType) || [],
    }];

    this.bulletinBoard.setData(data);
    this.bulletinBoard.open(() => {
      this.inputEnabled = true;
    });
    this.inputEnabled = false;
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
