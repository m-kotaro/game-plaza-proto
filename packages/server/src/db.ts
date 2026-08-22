import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type {
  ConnectionRecord,
  PlayerInfo,
  Position,
  AvatarData,
} from "@game-plaza/shared";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

/**
 * 新規接続レコードを保存する
 */
export async function saveConnection(record: ConnectionRecord): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: record,
    })
  );
}

/**
 * 接続レコードを削除する
 */
export async function deleteConnection(connectionId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { connectionId },
    })
  );
}

/**
 * connectionId からプレイヤー情報を取得する
 */
export async function getPlayerByConnectionId(
  connectionId: string
): Promise<ConnectionRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { connectionId },
    })
  );
  return (result.Item as ConnectionRecord) ?? null;
}

/**
 * 全接続レコードを取得する
 */
export async function getAllConnections(): Promise<ConnectionRecord[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
    })
  );
  return (result.Items as ConnectionRecord[]) ?? [];
}

/**
 * 全プレイヤー情報を取得する（PlayerInfo形式）
 */
export async function getAllPlayers(): Promise<PlayerInfo[]> {
  const connections = await getAllConnections();
  return connections.map((conn) => ({
    sessionId: conn.sessionId,
    avatar: conn.avatar,
    position: conn.position,
  }));
}

/**
 * プレイヤーの位置を更新する
 */
export async function updatePlayerPosition(
  connectionId: string,
  position: Position
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { connectionId },
      UpdateExpression: "SET #pos = :position",
      ExpressionAttributeNames: { "#pos": "position" },
      ExpressionAttributeValues: { ":position": position },
    })
  );
}

/**
 * プレイヤーのアバターを更新する
 */
export async function updatePlayerAvatar(
  connectionId: string,
  avatar: AvatarData
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { connectionId },
      UpdateExpression: "SET avatar = :avatar",
      ExpressionAttributeValues: { ":avatar": avatar },
    })
  );
}

/**
 * lastSeen を現在時刻に更新する
 */
export async function updateLastSeen(connectionId: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { connectionId },
      UpdateExpression: "SET lastSeen = :now",
      ExpressionAttributeValues: { ":now": Date.now() },
    })
  );
}

/**
 * プレイヤー名を更新する
 */
export async function updatePlayerName(
  connectionId: string,
  playerName: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { connectionId },
      UpdateExpression: "SET playerName = :name",
      ExpressionAttributeValues: { ":name": playerName },
    })
  );
}
