"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToConnection = sendToConnection;
exports.broadcastToAll = broadcastToAll;
exports.broadcastToOthers = broadcastToOthers;
exports.disconnectClient = disconnectClient;
const client_apigatewaymanagementapi_1 = require("@aws-sdk/client-apigatewaymanagementapi");
const db_1 = require("./db");
const endpoint = process.env.WEBSOCKET_ENDPOINT;
const apiGwClient = new client_apigatewaymanagementapi_1.ApiGatewayManagementApiClient({
    endpoint,
});
/**
 * 特定の接続にメッセージを送信する。
 * 接続が既に切断されている場合（GoneException 410）は、DynamoDBからレコードを削除する。
 */
async function sendToConnection(connectionId, data) {
    try {
        await apiGwClient.send(new client_apigatewaymanagementapi_1.PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: JSON.stringify(data),
        }));
    }
    catch (error) {
        if (error instanceof client_apigatewaymanagementapi_1.GoneException) {
            // stale接続をクリーンアップ
            await (0, db_1.deleteConnection)(connectionId);
        }
        else {
            throw error;
        }
    }
}
/**
 * 全接続にメッセージをブロードキャストする。
 * 各接続への送信は並列で実行し、GoneExceptionが発生した接続はクリーンアップする。
 */
async function broadcastToAll(connections, data) {
    await Promise.allSettled(connections.map((conn) => sendToConnection(conn.connectionId, data)));
}
/**
 * 送信者以外の全接続にメッセージをブロードキャストする。
 */
async function broadcastToOthers(connections, senderConnectionId, data) {
    const others = connections.filter((conn) => conn.connectionId !== senderConnectionId);
    await Promise.allSettled(others.map((conn) => sendToConnection(conn.connectionId, data)));
}
/**
 * クライアントの接続を強制切断する。
 */
async function disconnectClient(connectionId) {
    try {
        await apiGwClient.send(new client_apigatewaymanagementapi_1.DeleteConnectionCommand({
            ConnectionId: connectionId,
        }));
    }
    catch (error) {
        if (error instanceof client_apigatewaymanagementapi_1.GoneException) {
            // 既に切断されている場合は無視
        }
        else {
            throw error;
        }
    }
}
//# sourceMappingURL=broadcast.js.map