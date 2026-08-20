import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerMessage } from '@game-plaza/shared';
import { MessageHandler } from './MessageHandler';
import { NetworkManager } from '../network';
import { AvatarManager } from '../managers';

// NetworkManager のモック
function createMockNetworkManager() {
  const handlers: Array<(message: ServerMessage) => void> = [];
  return {
    onMessage: vi.fn((handler: (message: ServerMessage) => void) => {
      handlers.push(handler);
    }),
    // テスト用: メッセージを配信するヘルパー
    _dispatch(message: ServerMessage) {
      for (const handler of handlers) {
        handler(message);
      }
    },
  } as unknown as NetworkManager & { _dispatch: (msg: ServerMessage) => void };
}

// AvatarManager のモック
function createMockAvatarManager() {
  return {
    initWorldState: vi.fn(),
    addRemoteAvatar: vi.fn(),
    removeAvatar: vi.fn(),
    updateAvatarPosition: vi.fn(),
    updateAvatarAppearance: vi.fn(),
  } as unknown as AvatarManager & {
    initWorldState: ReturnType<typeof vi.fn>;
    addRemoteAvatar: ReturnType<typeof vi.fn>;
    removeAvatar: ReturnType<typeof vi.fn>;
    updateAvatarPosition: ReturnType<typeof vi.fn>;
    updateAvatarAppearance: ReturnType<typeof vi.fn>;
  };
}

describe('MessageHandler', () => {
  let networkManager: ReturnType<typeof createMockNetworkManager>;
  let avatarManager: ReturnType<typeof createMockAvatarManager>;
  let messageHandler: MessageHandler;

  beforeEach(() => {
    networkManager = createMockNetworkManager();
    avatarManager = createMockAvatarManager();
    messageHandler = new MessageHandler(
      networkManager as unknown as NetworkManager,
      avatarManager as unknown as AvatarManager,
    );
  });

  describe('world_state', () => {
    it('should call initWorldState with players', () => {
      const players = [
        { sessionId: 'p1', avatar: { bodyColor: 'red', headShape: 'round', accessory: 'hat' }, position: { x: 10, y: 20 } },
        { sessionId: 'p2', avatar: { bodyColor: 'blue', headShape: 'square', accessory: 'none' }, position: { x: 30, y: 40 } },
      ];

      networkManager._dispatch({ type: 'world_state', players });

      expect(avatarManager.initWorldState).toHaveBeenCalledWith(players);
    });
  });

  describe('player_joined', () => {
    it('should add remote avatar for other players', () => {
      const avatar = { bodyColor: 'green', headShape: 'round', accessory: 'glasses' };
      const position = { x: 100, y: 200 };

      networkManager._dispatch({ type: 'player_joined', sessionId: 'other-player', avatar, position });

      expect(avatarManager.addRemoteAvatar).toHaveBeenCalledWith('other-player', avatar, position);
    });

    it('should not add avatar for local player', () => {
      messageHandler.setLocalSessionId('local-player');

      const avatar = { bodyColor: 'green', headShape: 'round', accessory: 'glasses' };
      const position = { x: 100, y: 200 };

      networkManager._dispatch({ type: 'player_joined', sessionId: 'local-player', avatar, position });

      expect(avatarManager.addRemoteAvatar).not.toHaveBeenCalled();
    });
  });

  describe('player_left', () => {
    it('should remove avatar for the leaving player', () => {
      networkManager._dispatch({ type: 'player_left', sessionId: 'leaving-player' });

      expect(avatarManager.removeAvatar).toHaveBeenCalledWith('leaving-player');
    });
  });

  describe('player_moved', () => {
    it('should update avatar position for other players', () => {
      const position = { x: 500, y: 600 };

      networkManager._dispatch({ type: 'player_moved', sessionId: 'other-player', position });

      expect(avatarManager.updateAvatarPosition).toHaveBeenCalledWith('other-player', position);
    });

    it('should not update position for local player (client-side prediction)', () => {
      messageHandler.setLocalSessionId('local-player');

      const position = { x: 500, y: 600 };

      networkManager._dispatch({ type: 'player_moved', sessionId: 'local-player', position });

      expect(avatarManager.updateAvatarPosition).not.toHaveBeenCalled();
    });
  });

  describe('avatar_updated', () => {
    it('should update avatar appearance for the specified player', () => {
      const avatarData = { bodyColor: 'purple', headShape: 'triangle', accessory: 'crown' };

      networkManager._dispatch({ type: 'avatar_updated', sessionId: 'some-player', avatarData });

      expect(avatarManager.updateAvatarAppearance).toHaveBeenCalledWith('some-player', avatarData);
    });
  });

  describe('setLocalSessionId', () => {
    it('should filter local player from player_joined and player_moved', () => {
      messageHandler.setLocalSessionId('me');

      // player_joined for local player should be ignored
      networkManager._dispatch({
        type: 'player_joined',
        sessionId: 'me',
        avatar: { bodyColor: 'red', headShape: 'round', accessory: 'none' },
        position: { x: 0, y: 0 },
      });
      expect(avatarManager.addRemoteAvatar).not.toHaveBeenCalled();

      // player_moved for local player should be ignored
      networkManager._dispatch({ type: 'player_moved', sessionId: 'me', position: { x: 10, y: 10 } });
      expect(avatarManager.updateAvatarPosition).not.toHaveBeenCalled();

      // player_joined for other player should work
      networkManager._dispatch({
        type: 'player_joined',
        sessionId: 'other',
        avatar: { bodyColor: 'blue', headShape: 'square', accessory: 'hat' },
        position: { x: 50, y: 50 },
      });
      expect(avatarManager.addRemoteAvatar).toHaveBeenCalledWith(
        'other',
        { bodyColor: 'blue', headShape: 'square', accessory: 'hat' },
        { x: 50, y: 50 },
      );
    });
  });
});
