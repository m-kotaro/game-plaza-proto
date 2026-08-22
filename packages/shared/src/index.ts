// @game-plaza/shared - Shared type definitions and utilities

export type {
  Position,
  AvatarData,
  PlayerInfo,
  ConnectionRecord,
  ClientMessage,
  ServerMessage,
  RankingEntry,
} from "./types";

export {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MAX_PLAYERS,
  HEARTBEAT_INTERVAL,
  STALE_THRESHOLD,
  POSITION_SYNC_RATE,
  BODY_COLORS,
  HEAD_SHAPES,
  ACCESSORIES,
} from "./constants";

export type { BodyColor, HeadShape, Accessory } from "./constants";

export {
  serializeClientMessage,
  deserializeClientMessage,
  serializeServerMessage,
  deserializeServerMessage,
} from "./messages";

export type {
  GamePlayer,
  GameStartMessage,
  GameResultMessage,
  GameCloseMessage,
  IframeMessage,
} from "./iframe-messages";

export {
  isGameStartMessage,
  isGameResultMessage,
  isGameCloseMessage,
  isIframeMessage,
} from "./iframe-messages";
