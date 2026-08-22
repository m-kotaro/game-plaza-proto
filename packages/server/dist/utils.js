"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUUID = generateUUID;
exports.generateRandomAvatar = generateRandomAvatar;
exports.getRandomSpawnPosition = getRandomSpawnPosition;
exports.isValidPosition = isValidPosition;
const crypto_1 = require("crypto");
const shared_1 = require("@game-plaza/shared");
/**
 * セッション識別子を生成する
 */
function generateUUID() {
    return (0, crypto_1.randomUUID)();
}
/**
 * 有効な選択肢からランダムなアバターを生成する
 */
function generateRandomAvatar() {
    const bodyColor = shared_1.BODY_COLORS[Math.floor(Math.random() * shared_1.BODY_COLORS.length)];
    const headShape = shared_1.HEAD_SHAPES[Math.floor(Math.random() * shared_1.HEAD_SHAPES.length)];
    const accessory = shared_1.ACCESSORIES[Math.floor(Math.random() * shared_1.ACCESSORIES.length)];
    return { bodyColor, headShape, accessory };
}
/**
 * ワールド内のランダムな出現位置を生成する
 */
function getRandomSpawnPosition() {
    const x = Math.floor(Math.random() * (shared_1.WORLD_WIDTH + 1));
    const y = Math.floor(Math.random() * (shared_1.WORLD_HEIGHT + 1));
    return { x, y };
}
/**
 * 位置のバリデーション
 * position が有効な Position オブジェクトであることを検証する
 */
function isValidPosition(position) {
    if (position === null || position === undefined || typeof position !== "object") {
        return false;
    }
    const pos = position;
    if (typeof pos.x !== "number" || typeof pos.y !== "number") {
        return false;
    }
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
        return false;
    }
    return pos.x >= 0 && pos.x <= shared_1.WORLD_WIDTH && pos.y >= 0 && pos.y <= shared_1.WORLD_HEIGHT;
}
//# sourceMappingURL=utils.js.map