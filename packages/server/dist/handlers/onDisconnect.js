"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const db_1 = require("../db");
const broadcast_1 = require("../broadcast");
const handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    console.log("onDisconnect:", connectionId);
    const player = await (0, db_1.getPlayerByConnectionId)(connectionId);
    if (!player) {
        // Player not found (already disconnected or never registered)
        return { statusCode: 200, body: "Disconnected" };
    }
    // セッション削除
    await (0, db_1.deleteConnection)(connectionId);
    // 他プレイヤーに離脱通知
    const remainingConnections = await (0, db_1.getAllConnections)();
    await (0, broadcast_1.broadcastToAll)(remainingConnections, {
        type: "player_left",
        sessionId: player.sessionId,
    });
    return { statusCode: 200, body: "Disconnected" };
};
exports.handler = handler;
//# sourceMappingURL=onDisconnect.js.map