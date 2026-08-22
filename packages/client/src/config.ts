/**
 * クライアント設定
 * WebSocket URLはビルド時にVITE_WEBSOCKET_URL環境変数から注入される。
 * ローカル開発時はデフォルト値 ws://localhost:3001 が使用される。
 */

declare const __WEBSOCKET_URL__: string;

export const WEBSOCKET_URL: string = __WEBSOCKET_URL__;
