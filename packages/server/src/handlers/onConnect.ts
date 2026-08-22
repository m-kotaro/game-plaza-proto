import type { APIGatewayProxyResultV2, APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import { saveConnection } from "../db";
import { generateUUID, generateRandomAvatar, getRandomSpawnPosition } from "../utils";

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;
  console.log("onConnect:", connectionId);

  const sessionId = generateUUID();
  const avatar = generateRandomAvatar();
  const spawnPosition = getRandomSpawnPosition();

  // Only register in DynamoDB - don't send messages (connection not ready yet)
  await saveConnection({
    connectionId,
    sessionId,
    playerName: `Player_${sessionId.slice(0, 6)}`,
    avatar,
    position: spawnPosition,
    lastSeen: Date.now(),
  });

  return { statusCode: 200, body: "Connected" };
};
