import type { ServerMessage, ConnectionRecord } from "@game-plaza/shared";
/**
 * 特定の接続にメッセージを送信する。
 * 接続が既に切断されている場合（GoneException 410）は、DynamoDBからレコードを削除する。
 */
export declare function sendToConnection(connectionId: string, data: ServerMessage): Promise<void>;
/**
 * 全接続にメッセージをブロードキャストする。
 * 各接続への送信は並列で実行し、GoneExceptionが発生した接続はクリーンアップする。
 */
export declare function broadcastToAll(connections: ConnectionRecord[], data: ServerMessage): Promise<void>;
/**
 * 送信者以外の全接続にメッセージをブロードキャストする。
 */
export declare function broadcastToOthers(connections: ConnectionRecord[], senderConnectionId: string, data: ServerMessage): Promise<void>;
/**
 * クライアントの接続を強制切断する。
 */
export declare function disconnectClient(connectionId: string): Promise<void>;
//# sourceMappingURL=broadcast.d.ts.map