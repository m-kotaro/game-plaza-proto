import { WebSocketServer, WebSocket } from 'ws';
import {
  ConnectionRecord, ServerMessage, Position, AvatarData,
  STALE_THRESHOLD, BODY_COLORS, HEAD_SHAPES, ACCESSORIES,
} from '@game-plaza/shared';
import { generateUUID, generateRandomAvatar, getRandomSpawnPosition, isValidPosition } from './utils';

const PORT = 3001;

// In-memory state (replaces DynamoDB)
const connections = new Map<WebSocket, ConnectionRecord>();

const wss = new WebSocketServer({ port: PORT });

function broadcast(data: ServerMessage, exclude?: WebSocket): void {
  const message = JSON.stringify(data);
  for (const [ws] of connections) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

function sendTo(ws: WebSocket, data: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on('connection', (ws) => {
  const connectionId = generateUUID();
  const sessionId = generateUUID();
  const avatar = generateRandomAvatar();
  const position = getRandomSpawnPosition();

  const record: ConnectionRecord = {
    connectionId,
    sessionId,
    playerName: `Player_${sessionId.slice(0, 6)}`,
    avatar,
    position,
    lastSeen: Date.now(),
  };

  connections.set(ws, record);
  console.log(`[connect] ${sessionId} (${connections.size} players)`);

  // Send world_state to new player
  const players = Array.from(connections.values())
    .filter(r => r.sessionId !== sessionId)
    .map(r => ({ sessionId: r.sessionId, avatar: r.avatar, position: r.position }));
  sendTo(ws, { type: 'world_state', players });

  // Also send the new player their own session info
  sendTo(ws, { type: 'player_joined', sessionId, avatar, position });

  // Notify others
  broadcast({ type: 'player_joined', sessionId, avatar, position }, ws);

  ws.on('message', (data) => {
    const record = connections.get(ws);
    if (!record) return;
    record.lastSeen = Date.now();

    try {
      const msg = JSON.parse(data.toString());

      switch (msg.action) {
        case 'init':
          // Update player name if provided
          if (typeof msg.playerName === 'string' && msg.playerName.length > 0) {
            record.playerName = msg.playerName;
          }
          // Re-send world_state and player_joined (for compatibility with AWS deployment)
          const initPlayers = Array.from(connections.values())
            .filter(r => r.sessionId !== record.sessionId)
            .map(r => ({ sessionId: r.sessionId, avatar: r.avatar, position: r.position }));
          sendTo(ws, { type: 'world_state', players: initPlayers });
          sendTo(ws, { type: 'player_joined', sessionId: record.sessionId, avatar: record.avatar, position: record.position });
          break;

        case 'move':
          if (!isValidPosition(msg.position)) break;
          record.position = msg.position as Position;
          broadcast({ type: 'player_moved', sessionId: record.sessionId, position: record.position }, ws);
          break;

        case 'customize_avatar':
          if (!msg.avatarData) break;
          const { bodyColor, headShape, accessory } = msg.avatarData;
          if (!(BODY_COLORS as readonly string[]).includes(bodyColor)) break;
          if (!(HEAD_SHAPES as readonly string[]).includes(headShape)) break;
          if (!(ACCESSORIES as readonly string[]).includes(accessory)) break;
          record.avatar = msg.avatarData as AvatarData;
          broadcast({ type: 'avatar_updated', sessionId: record.sessionId, avatarData: record.avatar }, ws);
          break;

        case 'heartbeat':
          // lastSeen already updated above
          break;

        default:
          break;
      }
    } catch {
      // Invalid JSON, ignore
    }
  });

  ws.on('close', () => {
    const record = connections.get(ws);
    if (record) {
      console.log(`[disconnect] ${record.sessionId} (${connections.size - 1} players)`);
      connections.delete(ws);
      broadcast({ type: 'player_left', sessionId: record.sessionId });
    }
  });
});

// Heartbeat check every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [ws, record] of connections) {
    if (now - record.lastSeen > STALE_THRESHOLD) {
      console.log(`[timeout] ${record.sessionId}`);
      ws.close();
      connections.delete(ws);
      broadcast({ type: 'player_left', sessionId: record.sessionId });
    }
  }
}, 30_000);

console.log(`🎮 Local WebSocket server running on ws://localhost:${PORT}`);
