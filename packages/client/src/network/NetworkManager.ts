import {
  ClientMessage,
  ServerMessage,
  HEARTBEAT_INTERVAL,
  serializeClientMessage,
  deserializeServerMessage,
} from "@game-plaza/shared";

export type ConnectionState = "disconnected" | "connecting" | "connected";
export type ServerMessageHandler = (message: ServerMessage) => void;

/**
 * WebSocket接続・切断・再接続を管理するクラス
 * - 指数バックオフによる再接続（最大5回）
 * - ハートビート送信（30秒間隔）
 * - メッセージの送受信とイベントディスパッチ
 */
export class NetworkManager {
  private ws: WebSocket | null = null;
  private url: string;
  private state: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: ServerMessageHandler[] = [];

  constructor(url: string) {
    this.url = url;
  }

  /**
   * WebSocket接続を開始する
   */
  connect(): void {
    if (this.state === "connecting" || this.state === "connected") {
      return;
    }

    this.state = "connecting";
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => this.handleOpen();
    this.ws.onclose = () => this.handleClose();
    this.ws.onmessage = (event: MessageEvent) => this.handleMessage(event);
    this.ws.onerror = (event: Event) => this.handleError(event);
  }

  /**
   * WebSocket接続を明示的に切断する（再接続は行わない）
   */
  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // 再接続を防止
    this.stopHeartbeat();
    this.clearReconnectTimeout();

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }

    this.state = "disconnected";
  }

  /**
   * サーバーにメッセージを送信する
   * 接続中でない場合は送信しない
   */
  send(message: ClientMessage): void {
    if (this.state !== "connected" || !this.ws) {
      return;
    }

    this.ws.send(serializeClientMessage(message));
  }

  /**
   * サーバーからのメッセージを受信するハンドラを登録する
   */
  onMessage(handler: ServerMessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * 現在の接続状態を取得する
   */
  getState(): ConnectionState {
    return this.state;
  }

  private handleOpen(): void {
    this.state = "connected";
    this.reconnectAttempts = 0;
    this.startHeartbeat();
  }

  private handleClose(): void {
    this.state = "disconnected";
    this.ws = null;
    this.stopHeartbeat();
    this.attemptReconnect();
  }

  private handleMessage(event: MessageEvent): void {
    const data = typeof event.data === "string" ? event.data : "";
    const message = deserializeServerMessage(data);

    if (!message) {
      console.warn("[NetworkManager] Invalid server message received:", data);
      return;
    }

    for (const handler of this.messageHandlers) {
      handler(message);
    }
  }

  private handleError(_event: Event): void {
    console.error("[NetworkManager] WebSocket error occurred");
    // onclose will be triggered after onerror, so reconnect logic is handled there
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(
        "[NetworkManager] Max reconnect attempts reached. Giving up.",
      );
      return;
    }

    const delay = this.getReconnectDelay();
    this.reconnectAttempts++;

    console.log(
      `[NetworkManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.send({ action: "heartbeat" });
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * 指数バックオフによる再接続遅延を計算する
   * delay = min(1000 * 2^attempt, 30000)
   */
  private getReconnectDelay(): number {
    const delay = 1000 * Math.pow(2, this.reconnectAttempts);
    return Math.min(delay, 30000);
  }
}
