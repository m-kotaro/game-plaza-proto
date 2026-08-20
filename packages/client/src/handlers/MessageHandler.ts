import { ServerMessage } from '@game-plaza/shared';
import { NetworkManager } from '../network';
import { AvatarManager } from '../managers';

/**
 * サーバーメッセージを受信し、適切なマネージャに処理を委譲するクラス
 */
export class MessageHandler {
  private networkManager: NetworkManager;
  private avatarManager: AvatarManager;
  private localSessionId: string | null = null;

  constructor(networkManager: NetworkManager, avatarManager: AvatarManager) {
    this.networkManager = networkManager;
    this.avatarManager = avatarManager;

    // Register message handler
    this.networkManager.onMessage((message) => this.handleMessage(message));
  }

  setLocalSessionId(sessionId: string): void {
    this.localSessionId = sessionId;
  }

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'world_state':
        this.handleWorldState(message);
        break;
      case 'player_joined':
        this.handlePlayerJoined(message);
        break;
      case 'player_left':
        this.handlePlayerLeft(message);
        break;
      case 'player_moved':
        this.handlePlayerMoved(message);
        break;
      case 'avatar_updated':
        this.handleAvatarUpdated(message);
        break;
    }
  }

  private handleWorldState(message: Extract<ServerMessage, { type: 'world_state' }>): void {
    // Initialize all existing players in the world
    this.avatarManager.initWorldState(message.players);
  }

  private handlePlayerJoined(message: Extract<ServerMessage, { type: 'player_joined' }>): void {
    // Don't add ourselves (we're already added as local avatar)
    if (message.sessionId === this.localSessionId) return;
    this.avatarManager.addRemoteAvatar(message.sessionId, message.avatar, message.position);
  }

  private handlePlayerLeft(message: Extract<ServerMessage, { type: 'player_left' }>): void {
    this.avatarManager.removeAvatar(message.sessionId);
  }

  private handlePlayerMoved(message: Extract<ServerMessage, { type: 'player_moved' }>): void {
    // Don't update our own position from server (client-side prediction)
    if (message.sessionId === this.localSessionId) return;
    this.avatarManager.updateAvatarPosition(message.sessionId, message.position);
  }

  private handleAvatarUpdated(message: Extract<ServerMessage, { type: 'avatar_updated' }>): void {
    this.avatarManager.updateAvatarAppearance(message.sessionId, message.avatarData);
  }
}
