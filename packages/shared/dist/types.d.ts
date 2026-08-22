/**
 * ワールド座標
 */
export interface Position {
    x: number;
    y: number;
}
/**
 * アバター外見データ
 */
export interface AvatarData {
    bodyColor: string;
    headShape: string;
    accessory: string;
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
    connectionId: string;
    sessionId: string;
    avatar: AvatarData;
    position: Position;
    lastSeen: number;
}
/**
 * クライアント → サーバー メッセージ
 */
export type ClientMessage = {
    action: "init";
} | {
    action: "move";
    position: Position;
} | {
    action: "customize_avatar";
    avatarData: AvatarData;
} | {
    action: "heartbeat";
};
/**
 * サーバー → クライアント メッセージ
 */
export type ServerMessage = {
    type: "world_state";
    players: PlayerInfo[];
} | {
    type: "player_joined";
    sessionId: string;
    avatar: AvatarData;
    position: Position;
} | {
    type: "player_left";
    sessionId: string;
} | {
    type: "player_moved";
    sessionId: string;
    position: Position;
} | {
    type: "avatar_updated";
    sessionId: string;
    avatarData: AvatarData;
};
//# sourceMappingURL=types.d.ts.map