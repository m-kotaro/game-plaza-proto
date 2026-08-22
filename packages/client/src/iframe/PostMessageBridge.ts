import {
  GameStartMessage,
  GameResultMessage,
  isGameResultMessage,
  isGameCloseMessage,
} from '@game-plaza/shared';

export interface PostMessageBridgeConfig {
  allowedOrigins: string[];
}

/**
 * iframe との postMessage 通信を管理するクラス。
 * origin 検証、メッセージ送受信、コールバック管理を行う。
 */
export class PostMessageBridge {
  private config: PostMessageBridgeConfig;
  private iframeWindow: Window | null = null;
  private targetOrigin: string = '';
  private onResultCallback: ((result: GameResultMessage) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private messageListener: ((event: MessageEvent) => void) | null = null;

  constructor(config: PostMessageBridgeConfig) {
    this.config = config;
  }

  /** iframe ウィンドウを設定し、message イベントリスナーを登録 */
  attach(iframeWindow: Window, targetOrigin: string): void {
    this.iframeWindow = iframeWindow;
    this.targetOrigin = targetOrigin;

    this.messageListener = (event: MessageEvent) => this.handleMessage(event);
    window.addEventListener('message', this.messageListener);
  }

  /** message イベントリスナーを解除し、参照をクリア */
  detach(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    this.iframeWindow = null;
    this.targetOrigin = '';
    // Keep callbacks — they're set once and reused across multiple game sessions
  }

  /** GameStartMessage を iframe に送信 */
  sendGameStart(message: GameStartMessage): void {
    if (!this.iframeWindow) {
      console.warn('[PostMessageBridge] Cannot send: no iframe attached');
      return;
    }
    this.iframeWindow.postMessage(message, this.targetOrigin);
  }

  /** 結果受信コールバックを設定 */
  onGameResult(callback: (result: GameResultMessage) => void): void {
    this.onResultCallback = callback;
  }

  /** クローズ受信コールバックを設定 */
  onGameClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  /** origin を検証する */
  private isAllowedOrigin(origin: string): boolean {
    return this.config.allowedOrigins.includes(origin);
  }

  /** 受信メッセージを検証・ルーティングする */
  private handleMessage(event: MessageEvent): void {
    // Origin validation
    if (!this.isAllowedOrigin(event.origin)) {
      return;
    }

    const data = event.data;

    if (isGameResultMessage(data)) {
      this.onResultCallback?.(data);
    } else if (isGameCloseMessage(data)) {
      this.onCloseCallback?.();
    } else {
      console.warn('[PostMessageBridge] Unknown message type received:', data);
    }
  }
}
