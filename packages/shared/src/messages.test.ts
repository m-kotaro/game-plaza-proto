import { describe, it, expect } from "vitest";
import {
  serializeClientMessage,
  deserializeClientMessage,
  serializeServerMessage,
  deserializeServerMessage,
} from "./messages";
import type { ClientMessage, ServerMessage } from "./types";

describe("serializeClientMessage / deserializeClientMessage", () => {
  it("should round-trip a move message", () => {
    const msg: ClientMessage = { action: "move", position: { x: 100, y: 200 } };
    const serialized = serializeClientMessage(msg);
    const deserialized = deserializeClientMessage(serialized);
    expect(deserialized).toEqual(msg);
  });

  it("should round-trip a customize_avatar message", () => {
    const msg: ClientMessage = {
      action: "customize_avatar",
      avatarData: { bodyColor: "red", headShape: "round", accessory: "hat" },
    };
    const serialized = serializeClientMessage(msg);
    const deserialized = deserializeClientMessage(serialized);
    expect(deserialized).toEqual(msg);
  });

  it("should round-trip a heartbeat message", () => {
    const msg: ClientMessage = { action: "heartbeat" };
    const serialized = serializeClientMessage(msg);
    const deserialized = deserializeClientMessage(serialized);
    expect(deserialized).toEqual(msg);
  });

  it("should return null for invalid JSON", () => {
    expect(deserializeClientMessage("not json")).toBeNull();
  });

  it("should return null for invalid action", () => {
    expect(deserializeClientMessage('{"action":"invalid"}')).toBeNull();
  });

  it("should return null for move with missing position", () => {
    expect(deserializeClientMessage('{"action":"move"}')).toBeNull();
  });
});

describe("serializeServerMessage / deserializeServerMessage", () => {
  it("should round-trip a world_state message", () => {
    const msg: ServerMessage = {
      type: "world_state",
      players: [
        {
          sessionId: "abc",
          avatar: { bodyColor: "blue", headShape: "square", accessory: "none" },
          position: { x: 50, y: 75 },
        },
      ],
    };
    const serialized = serializeServerMessage(msg);
    const deserialized = deserializeServerMessage(serialized);
    expect(deserialized).toEqual(msg);
  });

  it("should round-trip a player_joined message", () => {
    const msg: ServerMessage = {
      type: "player_joined",
      sessionId: "xyz",
      avatar: { bodyColor: "green", headShape: "triangle", accessory: "glasses" },
      position: { x: 800, y: 600 },
    };
    const serialized = serializeServerMessage(msg);
    const deserialized = deserializeServerMessage(serialized);
    expect(deserialized).toEqual(msg);
  });

  it("should round-trip a player_left message", () => {
    const msg: ServerMessage = { type: "player_left", sessionId: "abc" };
    const serialized = serializeServerMessage(msg);
    const deserialized = deserializeServerMessage(serialized);
    expect(deserialized).toEqual(msg);
  });

  it("should round-trip a player_moved message", () => {
    const msg: ServerMessage = {
      type: "player_moved",
      sessionId: "abc",
      position: { x: 300, y: 400 },
    };
    const serialized = serializeServerMessage(msg);
    const deserialized = deserializeServerMessage(serialized);
    expect(deserialized).toEqual(msg);
  });

  it("should round-trip an avatar_updated message", () => {
    const msg: ServerMessage = {
      type: "avatar_updated",
      sessionId: "abc",
      avatarData: { bodyColor: "pink", headShape: "oval", accessory: "crown" },
    };
    const serialized = serializeServerMessage(msg);
    const deserialized = deserializeServerMessage(serialized);
    expect(deserialized).toEqual(msg);
  });

  it("should return null for invalid JSON", () => {
    expect(deserializeServerMessage("broken")).toBeNull();
  });

  it("should return null for unknown type", () => {
    expect(deserializeServerMessage('{"type":"unknown"}')).toBeNull();
  });

  it("should return null for world_state with invalid players", () => {
    expect(
      deserializeServerMessage('{"type":"world_state","players":"not_array"}')
    ).toBeNull();
  });
});
