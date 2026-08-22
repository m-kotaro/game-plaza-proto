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

// packages/server/src/handlers/tick.ts
var tick_exports = {};
__export(tick_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(tick_exports);

// packages/shared/dist/constants.js
var STALE_THRESHOLD = 6e4;

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
async function getAllConnections() {
  const result = await docClient.send(
    new import_lib_dynamodb.ScanCommand({
      TableName: TABLE_NAME
    })
  );
  return result.Items ?? [];
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
async function disconnectClient(connectionId) {
  try {
    await apiGwClient.send(
      new import_client_apigatewaymanagementapi.DeleteConnectionCommand({
        ConnectionId: connectionId
      })
    );
  } catch (error) {
    if (error instanceof import_client_apigatewaymanagementapi.GoneException) {
    } else {
      throw error;
    }
  }
}

// packages/server/src/handlers/tick.ts
var handler = async (_event) => {
  console.log("tick: heartbeat check");
  const now = Date.now();
  const allConnections = await getAllConnections();
  const staleConnections = allConnections.filter(
    (conn) => now - conn.lastSeen > STALE_THRESHOLD
  );
  if (staleConnections.length === 0) {
    console.log("tick: no stale connections found");
    return;
  }
  console.log(`tick: found ${staleConnections.length} stale connection(s)`);
  for (const conn of staleConnections) {
    await disconnectClient(conn.connectionId);
    await deleteConnection(conn.connectionId);
  }
  const activeConnections = allConnections.filter(
    (conn) => now - conn.lastSeen <= STALE_THRESHOLD
  );
  for (const stale of staleConnections) {
    await broadcastToAll(activeConnections, {
      type: "player_left",
      sessionId: stale.sessionId
    });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
