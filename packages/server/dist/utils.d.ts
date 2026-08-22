import { AvatarData, Position } from "@game-plaza/shared";
/**
 * セッション識別子を生成する
 */
export declare function generateUUID(): string;
/**
 * 有効な選択肢からランダムなアバターを生成する
 */
export declare function generateRandomAvatar(): AvatarData;
/**
 * ワールド内のランダムな出現位置を生成する
 */
export declare function getRandomSpawnPosition(): Position;
/**
 * 位置のバリデーション
 * position が有効な Position オブジェクトであることを検証する
 */
export declare function isValidPosition(position: unknown): position is Position;
//# sourceMappingURL=utils.d.ts.map