import type {
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
} from "aws-lambda";
import {
  getPlayerByConnectionId,
  deleteConnection,
  getAllConnections,
} from "../db";
import { broadcastToAll } from "../broadcast";

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;
  console.log("onDisconnect:", connectionId);

  const player = await getPlayerByConnectionId(connectionId);

  if (!player) {
    // Player not found (already disconnected or never registered)
    return { statusCode: 200, body: "Disconnected" };
  }

  // セッション削除
  await deleteConnection(connectionId);

  // 他プレイヤーに離脱通知
  const remainingConnections = await getAllConnections();
  await broadcastToAll(remainingConnections, {
    type: "player_left",
    sessionId: player.sessionId,
  });

  return { statusCode: 200, body: "Disconnected" };
};
