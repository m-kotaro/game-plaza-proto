"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const utils_1 = require("./utils");
const shared_1 = require("@game-plaza/shared");
(0, vitest_1.describe)("generateUUID", () => {
    (0, vitest_1.it)("should return a valid UUID string", () => {
        const uuid = (0, utils_1.generateUUID)();
        (0, vitest_1.expect)(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
    (0, vitest_1.it)("should return unique values on each call", () => {
        const ids = new Set(Array.from({ length: 100 }, () => (0, utils_1.generateUUID)()));
        (0, vitest_1.expect)(ids.size).toBe(100);
    });
});
(0, vitest_1.describe)("generateRandomAvatar", () => {
    (0, vitest_1.it)("should return an avatar with valid bodyColor", () => {
        const avatar = (0, utils_1.generateRandomAvatar)();
        (0, vitest_1.expect)(shared_1.BODY_COLORS.includes(avatar.bodyColor)).toBe(true);
    });
    (0, vitest_1.it)("should return an avatar with valid headShape", () => {
        const avatar = (0, utils_1.generateRandomAvatar)();
        (0, vitest_1.expect)(shared_1.HEAD_SHAPES.includes(avatar.headShape)).toBe(true);
    });
    (0, vitest_1.it)("should return an avatar with valid accessory", () => {
        const avatar = (0, utils_1.generateRandomAvatar)();
        (0, vitest_1.expect)(shared_1.ACCESSORIES.includes(avatar.accessory)).toBe(true);
    });
});
(0, vitest_1.describe)("getRandomSpawnPosition", () => {
    (0, vitest_1.it)("should return a position within world bounds", () => {
        const pos = (0, utils_1.getRandomSpawnPosition)();
        (0, vitest_1.expect)(pos.x).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(pos.x).toBeLessThanOrEqual(shared_1.WORLD_WIDTH);
        (0, vitest_1.expect)(pos.y).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(pos.y).toBeLessThanOrEqual(shared_1.WORLD_HEIGHT);
    });
    (0, vitest_1.it)("should return integer coordinates", () => {
        const pos = (0, utils_1.getRandomSpawnPosition)();
        (0, vitest_1.expect)(Number.isInteger(pos.x)).toBe(true);
        (0, vitest_1.expect)(Number.isInteger(pos.y)).toBe(true);
    });
});
(0, vitest_1.describe)("isValidPosition", () => {
    (0, vitest_1.it)("should accept a valid position", () => {
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: 100, y: 200 })).toBe(true);
    });
    (0, vitest_1.it)("should accept boundary values (0, 0)", () => {
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: 0, y: 0 })).toBe(true);
    });
    (0, vitest_1.it)("should accept boundary values (WORLD_WIDTH, WORLD_HEIGHT)", () => {
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: shared_1.WORLD_WIDTH, y: shared_1.WORLD_HEIGHT })).toBe(true);
    });
    (0, vitest_1.it)("should reject null", () => {
        (0, vitest_1.expect)((0, utils_1.isValidPosition)(null)).toBe(false);
    });
    (0, vitest_1.it)("should reject undefined", () => {
        (0, vitest_1.expect)((0, utils_1.isValidPosition)(undefined)).toBe(false);
    });
    (0, vitest_1.it)("should reject non-object values", () => {
        (0, vitest_1.expect)((0, utils_1.isValidPosition)("hello")).toBe(false);
        (0, vitest_1.expect)((0, utils_1.isValidPosition)(42)).toBe(false);
    });
    (0, vitest_1.it)("should reject objects missing x or y", () => {
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: 100 })).toBe(false);
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ y: 200 })).toBe(false);
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({})).toBe(false);
    });
    (0, vitest_1.it)("should reject non-numeric x or y", () => {
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: "100", y: 200 })).toBe(false);
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: 100, y: "200" })).toBe(false);
    });
    (0, vitest_1.it)("should reject positions outside world bounds", () => {
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: -1, y: 0 })).toBe(false);
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: 0, y: -1 })).toBe(false);
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: shared_1.WORLD_WIDTH + 1, y: 0 })).toBe(false);
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: 0, y: shared_1.WORLD_HEIGHT + 1 })).toBe(false);
    });
    (0, vitest_1.it)("should reject NaN and Infinity", () => {
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: NaN, y: 0 })).toBe(false);
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: 0, y: NaN })).toBe(false);
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: Infinity, y: 0 })).toBe(false);
        (0, vitest_1.expect)((0, utils_1.isValidPosition)({ x: 0, y: -Infinity })).toBe(false);
    });
});
//# sourceMappingURL=utils.test.js.map