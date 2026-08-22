"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/server/src/handlers/onMessage.ts
var onMessage_exports = {};
__export(onMessage_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(onMessage_exports);

// packages/shared/dist/constants.js
var WORLD_WIDTH = 1600;
var WORLD_HEIGHT = 1200;
var BODY_COLORS = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
  "pink",
  "cyan"
];
var HEAD_SHAPES = [
  "round",
  "square",
  "triangle",
  "oval",
  "diamond"
];
var ACCESSORIES = [
  "none",
  "hat",
  "glasses",
  "ribbon",
  "crown",
  "headband"
];

// packages/server/src/db.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var client = new import_client_dynamodb.DynamoDBClient({});
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(client);
var TABLE_NAME = process.env.TABLE_NAME;
async function deleteConnection(connectionId) {
  await docClient.send(
    new import_lib_dynamodb.DeleteCommand({
      TableName: TABLE_NAME,
      Key: { connectionId }
    })
  );
}
async function getPlayerByConnectionId(connectionId) {
  const result = await docClient.send(
    new import_lib_dynamodb.GetCommand({
      TableName: TABLE_NAME,
      Key: { connectionId }
    })
  );
  return result.Item ?? null;
}
async function getAllConnections() {
  const result = await docClient.send(
    new import_lib_dynamodb.ScanCommand({
      TableName: TABLE_NAME
    })
  );
  return result.Items ?? [];
}
async function updatePlayerPosition(connectionId, position) {
  await docClient.send(
    new import_lib_dynamodb.UpdateCommand({
      TableName: TABLE_NAME,
      Key: { connectionId },
      UpdateExpression: "SET #pos = :position",
      ExpressionAttributeNames: { "#pos": "position" },
      ExpressionAttributeValues: { ":position": position }
    })
  );
}
async function updatePlayerAvatar(connectionId, avatar) {
  await docClient.send(
    new import_lib_dynamodb.UpdateCommand({
      TableName: TABLE_NAME,
      Key: { connectionId },
      UpdateExpression: "SET avatar = :avatar",
      ExpressionAttributeValues: { ":avatar": avatar }
    })
  );
}
async function updateLastSeen(connectionId) {
  await docClient.send(
    new import_lib_dynamodb.UpdateCommand({
      TableName: TABLE_NAME,
      Key: { connectionId },
      UpdateExpression: "SET lastSeen = :now",
      ExpressionAttributeValues: { ":now": Date.now() }
    })
  );
}

// packages/server/src/broadcast.ts
var import_client_apigatewaymanagementapi = require("@aws-sdk/client-apigatewaymanagementapi");
var endpoint = process.env.WEBSOCKET_ENDPOINT;
var apiGwClient = new import_client_apigatewaymanagementapi.ApiGatewayManagementApiClient({
  endpoint
});
async function sendToConnection(connectionId, data) {
  try {
    await apiGwClient.send(
      new import_client_apigatewaymanagementapi.PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(data)
      })
    );
  } catch (error) {
    if (error instanceof import_client_apigatewaymanagementapi.GoneException) {
      await deleteConnection(connectionId);
    } else {
      throw error;
    }
  }
}
async function broadcastToOthers(connections, senderConnectionId, data) {
  const others = connections.filter(
    (conn) => conn.connectionId !== senderConnectionId
  );
  await Promise.allSettled(
    others.map((conn) => sendToConnection(conn.connectionId, data))
  );
}

// packages/server/src/utils.ts
function isValidPosition(position) {
  if (position === null || position === void 0 || typeof position !== "object") {
    return false;
  }
  const pos = position;
  if (typeof pos.x !== "number" || typeof pos.y !== "number") {
    return false;
  }
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
    return false;
  }
  return pos.x >= 0 && pos.x <= WORLD_WIDTH && pos.y >= 0 && pos.y <= WORLD_HEIGHT;
}

// packages/server/src/handlers/onMessage.ts
function isValidAvatarData(avatarData) {
  if (avatarData === null || avatarData === void 0 || typeof avatarData !== "object") {
    return false;
  }
  const data = avatarData;
  if (typeof data.bodyColor !== "string" || typeof data.headShape !== "string" || typeof data.accessory !== "string") {
    return false;
  }
  return BODY_COLORS.includes(data.bodyColor) && HEAD_SHAPES.includes(data.headShape) && ACCESSORIES.includes(data.accessory);
}
async function handleMove(connectionId, position) {
  if (!isValidPosition(position)) return;
  await updatePlayerPosition(connectionId, position);
  const player = await getPlayerByConnectionId(connectionId);
  if (!player) return;
  const allConnections = await getAllConnections();
  await broadcastToOthers(allConnections, connectionId, {
    type: "player_moved",
    sessionId: player.sessionId,
    position
  });
}
async function handleCustomizeAvatar(connectionId, avatarData) {
  if (!isValidAvatarData(avatarData)) return;
  await updatePlayerAvatar(connectionId, avatarData);
  const player = await getPlayerByConnectionId(connectionId);
  if (!player) return;
  const allConnections = await getAllConnections();
  await broadcastToOthers(allConnections, connectionId, {
    type: "avatar_updated",
    sessionId: player.sessionId,
    avatarData
  });
}
var handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  let body;
  try {
    body = JSON.parse(event.body ?? "");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }
  switch (body.action) {
    case "move":
      await handleMove(connectionId, body.position);
      break;
    case "customize_avatar":
      await handleCustomizeAvatar(connectionId, body.avatarData);
      break;
    case "heartbeat":
      await updateLastSeen(connectionId);
      break;
    default:
      break;
  }
  return { statusCode: 200, body: "OK" };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
