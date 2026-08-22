import type { ConnectionRecord, PlayerInfo, Position, AvatarData } from "@game-plaza/shared";
/**
 * 新規接続レコードを保存する
 */
export declare function saveConnection(record: ConnectionRecord): Promise<void>;
/**
 * 接続レコードを削除する
 */
export declare function deleteConnection(connectionId: string): Promise<void>;
/**
 * connectionId からプレイヤー情報を取得する
 */
export declare function getPlayerByConnectionId(connectionId: string): Promise<ConnectionRecord | null>;
/**
 * 全接続レコードを取得する
 */
export declare function getAllConnections(): Promise<ConnectionRecord[]>;
/**
 * 全プレイヤー情報を取得する（PlayerInfo形式）
 */
export declare function getAllPlayers(): Promise<PlayerInfo[]>;
/**
 * プレイヤーの位置を更新する
 */
export declare function updatePlayerPosition(connectionId: string, position: Position): Promise<void>;
/**
 * プレイヤーのアバターを更新する
 */
export declare function updatePlayerAvatar(connectionId: string, avatar: AvatarData): Promise<void>;
/**
 * lastSeen を現在時刻に更新する
 */
export declare function updateLastSeen(connectionId: string): Promise<void>;
//# sourceMappingURL=db.d.ts.map