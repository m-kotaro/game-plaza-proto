import { describe, it, expect } from "vitest";
import { generateUUID, generateRandomAvatar, getRandomSpawnPosition, isValidPosition } from "./utils";
import {
  BODY_COLORS,
  HEAD_SHAPES,
  ACCESSORIES,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from "@game-plaza/shared";

describe("generateUUID", () => {
  it("should return a valid UUID string", () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("should return unique values on each call", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateUUID()));
    expect(ids.size).toBe(100);
  });
});

describe("generateRandomAvatar", () => {
  it("should return an avatar with valid bodyColor", () => {
    const avatar = generateRandomAvatar();
    expect((BODY_COLORS as readonly string[]).includes(avatar.bodyColor)).toBe(true);
  });

  it("should return an avatar with valid headShape", () => {
    const avatar = generateRandomAvatar();
    expect((HEAD_SHAPES as readonly string[]).includes(avatar.headShape)).toBe(true);
  });

  it("should return an avatar with valid accessory", () => {
    const avatar = generateRandomAvatar();
    expect((ACCESSORIES as readonly string[]).includes(avatar.accessory)).toBe(true);
  });
});

describe("getRandomSpawnPosition", () => {
  it("should return a position within world bounds", () => {
    const pos = getRandomSpawnPosition();
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.x).toBeLessThanOrEqual(WORLD_WIDTH);
    expect(pos.y).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeLessThanOrEqual(WORLD_HEIGHT);
  });

  it("should return integer coordinates", () => {
    const pos = getRandomSpawnPosition();
    expect(Number.isInteger(pos.x)).toBe(true);
    expect(Number.isInteger(pos.y)).toBe(true);
  });
});

describe("isValidPosition", () => {
  it("should accept a valid position", () => {
    expect(isValidPosition({ x: 100, y: 200 })).toBe(true);
  });

  it("should accept boundary values (0, 0)", () => {
    expect(isValidPosition({ x: 0, y: 0 })).toBe(true);
  });

  it("should accept boundary values (WORLD_WIDTH, WORLD_HEIGHT)", () => {
    expect(isValidPosition({ x: WORLD_WIDTH, y: WORLD_HEIGHT })).toBe(true);
  });

  it("should reject null", () => {
    expect(isValidPosition(null)).toBe(false);
  });

  it("should reject undefined", () => {
    expect(isValidPosition(undefined)).toBe(false);
  });

  it("should reject non-object values", () => {
    expect(isValidPosition("hello")).toBe(false);
    expect(isValidPosition(42)).toBe(false);
  });

  it("should reject objects missing x or y", () => {
    expect(isValidPosition({ x: 100 })).toBe(false);
    expect(isValidPosition({ y: 200 })).toBe(false);
    expect(isValidPosition({})).toBe(false);
  });

  it("should reject non-numeric x or y", () => {
    expect(isValidPosition({ x: "100", y: 200 })).toBe(false);
    expect(isValidPosition({ x: 100, y: "200" })).toBe(false);
  });

  it("should reject positions outside world bounds", () => {
    expect(isValidPosition({ x: -1, y: 0 })).toBe(false);
    expect(isValidPosition({ x: 0, y: -1 })).toBe(false);
    expect(isValidPosition({ x: WORLD_WIDTH + 1, y: 0 })).toBe(false);
    expect(isValidPosition({ x: 0, y: WORLD_HEIGHT + 1 })).toBe(false);
  });

  it("should reject NaN and Infinity", () => {
    expect(isValidPosition({ x: NaN, y: 0 })).toBe(false);
    expect(isValidPosition({ x: 0, y: NaN })).toBe(false);
    expect(isValidPosition({ x: Infinity, y: 0 })).toBe(false);
    expect(isValidPosition({ x: 0, y: -Infinity })).toBe(false);
  });
});
