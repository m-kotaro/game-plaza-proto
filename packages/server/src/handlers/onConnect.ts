import type { APIGatewayProxyResultV2, APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import { saveConnection, getAllConnections, getAllPlayers } from "../db";
import { broadcastToAll, sendToConnection } from "../broadcast";
import { generateUUID, generateRandomAvatar, getRandomSpawnPosition } from "../utils";

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;
  console.log("onConnect:", connectionId);

  const sessionId = generateUUID();
  const avatar = generateRandomAvatar();
  const spawnPosition = getRandomSpawnPosition();

  // DynamoDBにセッション登録
  await saveConnection({
    connectionId,
    sessionId,
    avatar,
    position: spawnPosition,
    lastSeen: Date.now(),
  });

  // 既存プレイヤーに新規参加を通知
  const allConnections = await getAllConnections();
  const otherConnections = allConnections.filter(
    (c) => c.connectionId !== connectionId
  );
  await broadcastToAll(otherConnections, {
    type: "player_joined",
    sessionId,
    avatar,
    position: spawnPosition,
  });

  // 新規プレイヤーに現在のワールド状態を送信（自分自身を除く）
  const players = await getAllPlayers();
  const otherPlayers = players.filter((p) => p.sessionId !== sessionId);
  await sendToConnection(connectionId, {
    type: "world_state",
    players: otherPlayers,
  });

  return { statusCode: 200, body: "Connected" };
};
