import type {
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
} from "aws-lambda";
import type { Position, AvatarData } from "@game-plaza/shared";
import { BODY_COLORS, HEAD_SHAPES, ACCESSORIES } from "@game-plaza/shared";
import {
  updateLastSeen,
  updatePlayerPosition,
  updatePlayerAvatar,
  getPlayerByConnectionId,
  getAllConnections,
} from "../db";
import { broadcastToOthers, sendToConnection } from "../broadcast";
import { isValidPosition } from "../utils";

/**
 * アバターデータのバリデーション
 * bodyColor, headShape, accessory が有効な選択肢に含まれていることを確認する
 */
function isValidAvatarData(avatarData: unknown): avatarData is AvatarData {
  if (
    avatarData === null ||
    avatarData === undefined ||
    typeof avatarData !== "object"
  ) {
    return false;
  }

  const data = avatarData as Record<string, unknown>;

  if (
    typeof data.bodyColor !== "string" ||
    typeof data.headShape !== "string" ||
    typeof data.accessory !== "string"
  ) {
    return false;
  }

  return (
    (BODY_COLORS as readonly string[]).includes(data.bodyColor) &&
    (HEAD_SHAPES as readonly string[]).includes(data.headShape) &&
    (ACCESSORIES as readonly string[]).includes(data.accessory)
  );
}

/**
 * init アクションの処理
 * 接続確立後にクライアントから送信される初期化リクエスト
 * - ワールド状態（他プレイヤー一覧）を送信
 * - 自身のセッション情報を送信
 * - 他プレイヤーに新規参加を通知
 */
async function handleInit(connectionId: string): Promise<void> {
  const player = await getPlayerByConnectionId(connectionId);
  if (!player) return;

  const allConnections = await getAllConnections();

  // Send world_state (all other players) to the newly connected player
  const otherPlayers = allConnections
    .filter((c) => c.connectionId !== connectionId)
    .map((c) => ({ sessionId: c.sessionId, avatar: c.avatar, position: c.position }));

  await sendToConnection(connectionId, { type: "world_state", players: otherPlayers });

  // Send player_joined to the client itself (so it knows its own session info)
  await sendToConnection(connectionId, {
    type: "player_joined",
    sessionId: player.sessionId,
    avatar: player.avatar,
    position: player.position,
  });

  // Notify all other players about the new player
  await broadcastToOthers(allConnections, connectionId, {
    type: "player_joined",
    sessionId: player.sessionId,
    avatar: player.avatar,
    position: player.position,
  });
}

/**
 * 移動アクションの処理
 * 位置バリデーション → DynamoDB更新 → 他プレイヤーにブロードキャスト
 */
async function handleMove(
  connectionId: string,
  position: unknown
): Promise<void> {
  if (!isValidPosition(position)) return;

  await updatePlayerPosition(connectionId, position);

  const player = await getPlayerByConnectionId(connectionId);
  if (!player) return;

  const allConnections = await getAllConnections();
  await broadcastToOthers(allConnections, connectionId, {
    type: "player_moved",
    sessionId: player.sessionId,
    position,
  });
}

/**
 * アバターカスタマイズアクションの処理
 * バリデーション → DynamoDB更新 → 他プレイヤーにブロードキャスト
 */
async function handleCustomizeAvatar(
  connectionId: string,
  avatarData: unknown
): Promise<void> {
  if (!isValidAvatarData(avatarData)) return;

  await updatePlayerAvatar(connectionId, avatarData);

  const player = await getPlayerByConnectionId(connectionId);
  if (!player) return;

  const allConnections = await getAllConnections();
  await broadcastToOthers(allConnections, connectionId, {
    type: "avatar_updated",
    sessionId: player.sessionId,
    avatarData,
  });
}

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  const connectionId = event.requestContext.connectionId;

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body ?? "");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  switch (body.action) {
    case "init":
      await handleInit(connectionId);
      break;
    case "move":
      await handleMove(connectionId, body.position);
      break;
    case "customize_avatar":
      await handleCustomizeAvatar(connectionId, body.avatarData);
      break;
    case "heartbeat":
      await updateLastSeen(connectionId);
      break;
    default:
      // Unknown action - ignore silently
      break;
  }

  return { statusCode: 200, body: "OK" };
};
