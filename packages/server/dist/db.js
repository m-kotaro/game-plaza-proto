"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveConnection = saveConnection;
exports.deleteConnection = deleteConnection;
exports.getPlayerByConnectionId = getPlayerByConnectionId;
exports.getAllConnections = getAllConnections;
exports.getAllPlayers = getAllPlayers;
exports.updatePlayerPosition = updatePlayerPosition;
exports.updatePlayerAvatar = updatePlayerAvatar;
exports.updateLastSeen = updateLastSeen;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;
/**
 * 新規接続レコードを保存する
 */
async function saveConnection(record) {
    await docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: TABLE_NAME,
        Item: record,
    }));
}
/**
 * 接続レコードを削除する
 */
async function deleteConnection(connectionId) {
    await docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: TABLE_NAME,
        Key: { connectionId },
    }));
}
/**
 * connectionId からプレイヤー情報を取得する
 */
async function getPlayerByConnectionId(connectionId) {
    const result = await docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: TABLE_NAME,
        Key: { connectionId },
    }));
    return result.Item ?? null;
}
/**
 * 全接続レコードを取得する
 */
async function getAllConnections() {
    const result = await docClient.send(new lib_dynamodb_1.ScanCommand({
        TableName: TABLE_NAME,
    }));
    return result.Items ?? [];
}
/**
 * 全プレイヤー情報を取得する（PlayerInfo形式）
 */
async function getAllPlayers() {
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
async function updatePlayerPosition(connectionId, position) {
    await docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: TABLE_NAME,
        Key: { connectionId },
        UpdateExpression: "SET #pos = :position",
        ExpressionAttributeNames: { "#pos": "position" },
        ExpressionAttributeValues: { ":position": position },
    }));
}
/**
 * プレイヤーのアバターを更新する
 */
async function updatePlayerAvatar(connectionId, avatar) {
    await docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: TABLE_NAME,
        Key: { connectionId },
        UpdateExpression: "SET avatar = :avatar",
        ExpressionAttributeValues: { ":avatar": avatar },
    }));
}
/**
 * lastSeen を現在時刻に更新する
 */
async function updateLastSeen(connectionId) {
    await docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: TABLE_NAME,
        Key: { connectionId },
        UpdateExpression: "SET lastSeen = :now",
        ExpressionAttributeValues: { ":now": Date.now() },
    }));
}
//# sourceMappingURL=db.js.map