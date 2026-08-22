"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const shared_1 = require("@game-plaza/shared");
const db_1 = require("../db");
const broadcast_1 = require("../broadcast");
const handler = async (_event) => {
    console.log("tick: heartbeat check");
    const now = Date.now();
    const allConnections = await (0, db_1.getAllConnections)();
    const staleConnections = allConnections.filter((conn) => now - conn.lastSeen > shared_1.STALE_THRESHOLD);
    if (staleConnections.length === 0) {
        console.log("tick: no stale connections found");
        return;
    }
    console.log(`tick: found ${staleConnections.length} stale connection(s)`);
    // タイムアウトした接続を切断・削除
    for (const conn of staleConnections) {
        await (0, broadcast_1.disconnectClient)(conn.connectionId);
        await (0, db_1.deleteConnection)(conn.connectionId);
    }
    // 残りのアクティブな接続に対して離脱を通知
    const activeConnections = allConnections.filter((conn) => now - conn.lastSeen <= shared_1.STALE_THRESHOLD);
    for (const stale of staleConnections) {
        await (0, broadcast_1.broadcastToAll)(activeConnections, {
            type: "player_left",
            sessionId: stale.sessionId,
        });
    }
};
exports.handler = handler;
//# sourceMappingURL=tick.js.map