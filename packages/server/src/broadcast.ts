import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  DeleteConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import type { ServerMessage, ConnectionRecord } from "@game-plaza/shared";
import { deleteConnection } from "./db";

const endpoint = process.env.WEBSOCKET_ENDPOINT!;

const apiGwClient = new ApiGatewayManagementApiClient({
  endpoint,
});

/**
 * 特定の接続にメッセージを送信する。
 * 接続が既に切断されている場合（GoneException 410）は、DynamoDBからレコードを削除する。
 */
export async function sendToConnection(
  connectionId: string,
  data: ServerMessage
): Promise<void> {
  try {
    await apiGwClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(data),
      })
    );
  } catch (error: unknown) {
    if (error instanceof GoneException) {
      // stale接続をクリーンアップ
      await deleteConnection(connectionId);
    } else {
      throw error;
    }
  }
}

/**
 * 全接続にメッセージをブロードキャストする。
 * 各接続への送信は並列で実行し、GoneExceptionが発生した接続はクリーンアップする。
 */
export async function broadcastToAll(
  connections: ConnectionRecord[],
  data: ServerMessage
): Promise<void> {
  await Promise.allSettled(
    connections.map((conn) => sendToConnection(conn.connectionId, data))
  );
}

/**
 * 送信者以外の全接続にメッセージをブロードキャストする。
 */
export async function broadcastToOthers(
  connections: ConnectionRecord[],
  senderConnectionId: string,
  data: ServerMessage
): Promise<void> {
  const others = connections.filter(
    (conn) => conn.connectionId !== senderConnectionId
  );
  await Promise.allSettled(
    others.map((conn) => sendToConnection(conn.connectionId, data))
  );
}

/**
 * クライアントの接続を強制切断する。
 */
export async function disconnectClient(connectionId: string): Promise<void> {
  try {
    await apiGwClient.send(
      new DeleteConnectionCommand({
        ConnectionId: connectionId,
      })
    );
  } catch (error: unknown) {
    if (error instanceof GoneException) {
      // 既に切断されている場合は無視
    } else {
      throw error;
    }
  }
}
