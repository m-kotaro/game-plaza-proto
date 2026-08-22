"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const shared_1 = require("@game-plaza/shared");
const db_1 = require("../db");
const broadcast_1 = require("../broadcast");
const utils_1 = require("../utils");
/**
 * アバターデータのバリデーション
 * bodyColor, headShape, accessory が有効な選択肢に含まれていることを確認する
 */
function isValidAvatarData(avatarData) {
    if (avatarData === null ||
        avatarData === undefined ||
        typeof avatarData !== "object") {
        return false;
    }
    const data = avatarData;
    if (typeof data.bodyColor !== "string" ||
        typeof data.headShape !== "string" ||
        typeof data.accessory !== "string") {
        return false;
    }
    return (shared_1.BODY_COLORS.includes(data.bodyColor) &&
        shared_1.HEAD_SHAPES.includes(data.headShape) &&
        shared_1.ACCESSORIES.includes(data.accessory));
}
/**
 * 移動アクションの処理
 * 位置バリデーション → DynamoDB更新 → 他プレイヤーにブロードキャスト
 */
async function handleMove(connectionId, position) {
    if (!(0, utils_1.isValidPosition)(position))
        return;
    await (0, db_1.updatePlayerPosition)(connectionId, position);
    const player = await (0, db_1.getPlayerByConnectionId)(connectionId);
    if (!player)
        return;
    const allConnections = await (0, db_1.getAllConnections)();
    await (0, broadcast_1.broadcastToOthers)(allConnections, connectionId, {
        type: "player_moved",
        sessionId: player.sessionId,
        position,
    });
}
/**
 * アバターカスタマイズアクションの処理
 * バリデーション → DynamoDB更新 → 他プレイヤーにブロードキャスト
 */
async function handleCustomizeAvatar(connectionId, avatarData) {
    if (!isValidAvatarData(avatarData))
        return;
    await (0, db_1.updatePlayerAvatar)(connectionId, avatarData);
    const player = await (0, db_1.getPlayerByConnectionId)(connectionId);
    if (!player)
        return;
    const allConnections = await (0, db_1.getAllConnections)();
    await (0, broadcast_1.broadcastToOthers)(allConnections, connectionId, {
        type: "avatar_updated",
        sessionId: player.sessionId,
        avatarData,
    });
}
const handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    let body;
    try {
        body = JSON.parse(event.body ?? "");
    }
    catch {
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
            await (0, db_1.updateLastSeen)(connectionId);
            break;
        default:
            // Unknown action - ignore silently
            break;
    }
    return { statusCode: 200, body: "OK" };
};
exports.handler = handler;
//# sourceMappingURL=onMessage.js.map