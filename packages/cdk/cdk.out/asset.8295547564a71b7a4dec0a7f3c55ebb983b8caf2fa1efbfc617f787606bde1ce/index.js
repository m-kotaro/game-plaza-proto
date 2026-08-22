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

// packages/server/src/handlers/onDisconnect.ts
var onDisconnect_exports = {};
__export(onDisconnect_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(onDisconnect_exports);

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

// packages/server/src/handlers/onDisconnect.ts
var handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log("onDisconnect:", connectionId);
  const player = await getPlayerByConnectionId(connectionId);
  if (!player) {
    return { statusCode: 200, body: "Disconnected" };
  }
  await deleteConnection(connectionId);
  const remainingConnections = await getAllConnections();
  await broadcastToAll(remainingConnections, {
    type: "player_left",
    sessionId: player.sessionId
  });
  return { statusCode: 200, body: "Disconnected" };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
