"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const db_1 = require("../db");
const broadcast_1 = require("../broadcast");
const utils_1 = require("../utils");
const handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    console.log("onConnect:", connectionId);
    const sessionId = (0, utils_1.generateUUID)();
    const avatar = (0, utils_1.generateRandomAvatar)();
    const spawnPosition = (0, utils_1.getRandomSpawnPosition)();
    // DynamoDBにセッション登録
    await (0, db_1.saveConnection)({
        connectionId,
        sessionId,
        avatar,
        position: spawnPosition,
        lastSeen: Date.now(),
    });
    // 既存プレイヤーに新規参加を通知
    const allConnections = await (0, db_1.getAllConnections)();
    const otherConnections = allConnections.filter((c) => c.connectionId !== connectionId);
    await (0, broadcast_1.broadcastToAll)(otherConnections, {
        type: "player_joined",
        sessionId,
        avatar,
        position: spawnPosition,
    });
    // 新規プレイヤーに現在のワールド状態を送信（自分自身を除く）
    const players = await (0, db_1.getAllPlayers)();
    const otherPlayers = players.filter((p) => p.sessionId !== sessionId);
    await (0, broadcast_1.sendToConnection)(connectionId, {
        type: "world_state",
        players: otherPlayers,
    });
    return { statusCode: 200, body: "Connected" };
};
exports.handler = handler;
//# sourceMappingURL=onConnect.js.map