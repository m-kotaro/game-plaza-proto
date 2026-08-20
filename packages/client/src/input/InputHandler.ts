import Phaser from "phaser";
import {
  Position,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  POSITION_SYNC_RATE,
} from "@game-plaza/shared";
import { NetworkManager } from "../network";

/**
 * AvatarManager が提供すべき最小インターフェース
 * InputHandler はローカルプレイヤーの位置を取得・更新するために使用する
 */
export interface AvatarManagerLike {
  getLocalPlayerPosition(): Position | null;
  setLocalPlayerPosition(position: Position): void;
}

/**
 * キーボード入力によるアバター移動を管理するクラス
 *
 * - 矢印キー/WASD で移動
 * - delta-time ベースの移動（フレームレート非依存）
 * - ローカル画面上の即時反映（クライアントサイド予測）
 * - POSITION_SYNC_RATE (100ms) でのスロットリング送信
 * - ワールド境界内にクランプ
 */
export class InputHandler {
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  } | null = null;
  private networkManager: NetworkManager;
  private avatarManager: AvatarManagerLike;
  private moveSpeed = 200; // pixels per second
  private lastSyncTime = 0;
  private lastSentPosition: Position | null = null;

  constructor(
    scene: Phaser.Scene,
    networkManager: NetworkManager,
    avatarManager: AvatarManagerLike,
  ) {
    this.scene = scene;
    this.networkManager = networkManager;
    this.avatarManager = avatarManager;
  }

  /**
   * キーボード入力のセットアップ
   * 矢印キーと WASD キーの両方を登録する
   */
  setup(): void {
    if (!this.scene.input.keyboard) {
      return;
    }

    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasd = {
      W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  /**
   * 毎フレーム呼び出される更新処理
   * 入力を処理し、必要に応じてサーバーに位置を同期する
   */
  update(time: number, delta: number): void {
    this.processMovement(delta);
    this.syncPosition(time);
  }

  /**
   * 入力に基づいて移動量を計算し、ローカルアバターの位置を更新する
   * delta-time ベースで一定速度を実現
   */
  private processMovement(delta: number): void {
    const currentPosition = this.avatarManager.getLocalPlayerPosition();
    if (!currentPosition) {
      return;
    }

    let dx = 0;
    let dy = 0;

    // 矢印キーの入力チェック
    if (this.cursors) {
      if (this.cursors.left.isDown) dx -= 1;
      if (this.cursors.right.isDown) dx += 1;
      if (this.cursors.up.isDown) dy -= 1;
      if (this.cursors.down.isDown) dy += 1;
    }

    // WASD キーの入力チェック
    if (this.wasd) {
      if (this.wasd.A.isDown) dx -= 1;
      if (this.wasd.D.isDown) dx += 1;
      if (this.wasd.W.isDown) dy -= 1;
      if (this.wasd.S.isDown) dy += 1;
    }

    // 入力がなければ何もしない
    if (dx === 0 && dy === 0) {
      return;
    }

    // 斜め移動を正規化して速度を一定にする
    const length = Math.sqrt(dx * dx + dy * dy);
    dx /= length;
    dy /= length;

    // delta-time ベースの移動計算 (delta は ms 単位)
    const distance = this.moveSpeed * (delta / 1000);
    const newX = currentPosition.x + dx * distance;
    const newY = currentPosition.y + dy * distance;

    // ワールド境界内にクランプ
    const clampedPosition = this.clampPosition(newX, newY);

    // ローカルアバターを即時更新（クライアントサイド予測）
    this.avatarManager.setLocalPlayerPosition(clampedPosition);
  }

  /**
   * スロットリングされた位置同期をサーバーに送信する
   * POSITION_SYNC_RATE (100ms) 間隔で、かつ位置が変更された場合のみ送信
   */
  private syncPosition(time: number): void {
    if (time - this.lastSyncTime < POSITION_SYNC_RATE) {
      return;
    }

    const currentPosition = this.avatarManager.getLocalPlayerPosition();
    if (!currentPosition) {
      return;
    }

    // 位置が変わっていなければ送信しない
    if (
      this.lastSentPosition &&
      this.lastSentPosition.x === currentPosition.x &&
      this.lastSentPosition.y === currentPosition.y
    ) {
      return;
    }

    this.lastSyncTime = time;
    this.lastSentPosition = { x: currentPosition.x, y: currentPosition.y };

    this.networkManager.send({
      action: "move",
      position: this.lastSentPosition,
    });
  }

  /**
   * 座標をワールド境界内にクランプする
   */
  private clampPosition(x: number, y: number): Position {
    return {
      x: Math.max(0, Math.min(WORLD_WIDTH, x)),
      y: Math.max(0, Math.min(WORLD_HEIGHT, y)),
    };
  }
}
