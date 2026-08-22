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

// packages/server/src/handlers/onConnect.ts
var onConnect_exports = {};
__export(onConnect_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(onConnect_exports);

// packages/server/src/db.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var client = new import_client_dynamodb.DynamoDBClient({});
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(client);
var TABLE_NAME = process.env.TABLE_NAME;
async function saveConnection(record) {
  await docClient.send(
    new import_lib_dynamodb.PutCommand({
      TableName: TABLE_NAME,
      Item: record
    })
  );
}
async function deleteConnection(connectionId) {
  await docClient.send(
    new import_lib_dynamodb.DeleteCommand({
      TableName: TABLE_NAME,
      Key: { connectionId }
    })
  );
}
async function getAllConnections() {
  const result = await docClient.send(
    new import_lib_dynamodb.ScanCommand({
      TableName: TABLE_NAME
    })
  );
  return result.Items ?? [];
}
async function getAllPlayers() {
  const connections = await getAllConnections();
  return connections.map((conn) => ({
    sessionId: conn.sessionId,
    avatar: conn.avatar,
    position: conn.position
  }));
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
async function broadcastToAll(connections, data) {
  await Promise.allSettled(
    connections.map((conn) => sendToConnection(conn.connectionId, data))
  );
}

// packages/server/src/utils.ts
var import_crypto = require("crypto");

// packages/shared/src/constants.ts
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

// packages/server/src/utils.ts
function generateUUID() {
  return (0, import_crypto.randomUUID)();
}
function generateRandomAvatar() {
  const bodyColor = BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)];
  const headShape = HEAD_SHAPES[Math.floor(Math.random() * HEAD_SHAPES.length)];
  const accessory = ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)];
  return { bodyColor, headShape, accessory };
}
function getRandomSpawnPosition() {
  const x = Math.floor(Math.random() * (WORLD_WIDTH + 1));
  const y = Math.floor(Math.random() * (WORLD_HEIGHT + 1));
  return { x, y };
}

// packages/server/src/handlers/onConnect.ts
var handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log("onConnect:", connectionId);
  const sessionId = generateUUID();
  const avatar = generateRandomAvatar();
  const spawnPosition = getRandomSpawnPosition();
  await saveConnection({
    connectionId,
    sessionId,
    avatar,
    position: spawnPosition,
    lastSeen: Date.now()
  });
  const allConnections = await getAllConnections();
  const otherConnections = allConnections.filter(
    (c) => c.connectionId !== connectionId
  );
  await broadcastToAll(otherConnections, {
    type: "player_joined",
    sessionId,
    avatar,
    position: spawnPosition
  });
  const players = await getAllPlayers();
  const otherPlayers = players.filter((p) => p.sessionId !== sessionId);
  await sendToConnection(connectionId, {
    type: "world_state",
    players: otherPlayers
  });
  return { statusCode: 200, body: "Connected" };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
