/**
 * ワールド座標
 */
export interface Position {
  x: number; // 0 ~ WORLD_WIDTH
  y: number; // 0 ~ WORLD_HEIGHT
}

/**
 * アバター外見データ
 */
export interface AvatarData {
  bodyColor: string; // 体の色 (事前定義の選択肢から)
  headShape: string; // 頭の形
  accessory: string; // アクセサリー (帽子、メガネなど)
}

/**
 * プレイヤー情報（クライアント向け）
 */
export interface PlayerInfo {
  sessionId: string;
  avatar: AvatarData;
  position: Position;
}

/**
 * DynamoDB接続レコード
 */
export interface ConnectionRecord {
  connectionId: string; // PK
  sessionId: string;
  playerName: string;
  avatar: AvatarData;
  position: Position;
  lastSeen: number; // Unix timestamp (ms)
}

/**
 * ランキング1件分のデータ
 */
export interface RankingEntry {
  playerName: string;
  score: number;
}

/**
 * クライアント → サーバー メッセージ
 */
export type ClientMessage =
  | { action: "init"; playerName: string }
  | { action: "move"; position: Position }
  | { action: "customize_avatar"; avatarData: AvatarData }
  | { action: "heartbeat" }
  | { action: "submit_score"; gameType: string; score: number }
  | { action: "get_rankings"; gameType: string };

/**
 * サーバー → クライアント メッセージ
 */
export type ServerMessage =
  | { type: "world_state"; players: PlayerInfo[] }
  | { type: "player_joined"; sessionId: string; avatar: AvatarData; position: Position }
  | { type: "player_left"; sessionId: string }
  | { type: "player_moved"; sessionId: string; position: Position }
  | { type: "avatar_updated"; sessionId: string; avatarData: AvatarData }
  | { type: "rankings_update"; gameType: string; rankings: RankingEntry[] };
