import type { ScheduledEvent } from "aws-lambda";
import { STALE_THRESHOLD } from "@game-plaza/shared";
import { getAllConnections, deleteConnection } from "../db";
import { disconnectClient, broadcastToAll } from "../broadcast";

export const handler = async (_event: ScheduledEvent): Promise<void> => {
  console.log("tick: heartbeat check");

  const now = Date.now();

  const allConnections = await getAllConnections();
  const staleConnections = allConnections.filter(
    (conn) => now - conn.lastSeen > STALE_THRESHOLD
  );

  if (staleConnections.length === 0) {
    console.log("tick: no stale connections found");
    return;
  }

  console.log(`tick: found ${staleConnections.length} stale connection(s)`);

  // タイムアウトした接続を切断・削除
  for (const conn of staleConnections) {
    await disconnectClient(conn.connectionId);
    await deleteConnection(conn.connectionId);
  }

  // 残りのアクティブな接続に対して離脱を通知
  const activeConnections = allConnections.filter(
    (conn) => now - conn.lastSeen <= STALE_THRESHOLD
  );

  for (const stale of staleConnections) {
    await broadcastToAll(activeConnections, {
      type: "player_left",
      sessionId: stale.sessionId,
    });
  }
};
