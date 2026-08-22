import Phaser from 'phaser';
import { AvatarData, Position, PlayerInfo } from '@game-plaza/shared';

/**
 * All 20 character frame indices from Kenney Tiny Dungeon tileset.
 * Row 7: 84-88, Row 8: 96-100, Row 9: 108-112, Row 10: 120-124
 */
const CHARACTER_FRAMES = [
  84, 85, 86, 87, 88,     // row 7
  96, 97, 98, 99, 100,    // row 8
  108, 109, 110, 111, 112, // row 9
  120, 121, 122, 123, 124, // row 10
];

/**
 * Internal representation of an avatar sprite and its associated data.
 * Uses a frame from the Tiny Dungeon spritesheet.
 */
interface AvatarSprite {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  nameText?: Phaser.GameObjects.Text;
  targetPosition: Position;
  avatarData: AvatarData;
}

/**
 * AvatarManager manages all avatar sprites in the scene.
 * Handles creation, rendering, movement interpolation, and lifecycle management.
 *
 * Avatar rendering uses frames from the Kenney Tiny Dungeon spritesheet.
 * Each body color maps to a different character frame.
 */
export class AvatarManager {
  private scene: Phaser.Scene;
  private avatars: Map<string, AvatarSprite> = new Map(); // sessionId -> AvatarSprite
  private localSessionId: string | null = null;
  private lerpSpeed = 0.15; // Interpolation speed for smooth movement

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create a local player avatar (camera follows this one)
   */
  createLocalAvatar(sessionId: string, avatar: AvatarData, position: Position): void {
    this.localSessionId = sessionId;
    const sprite = this.createAvatarSprite(avatar, position);
    this.avatars.set(sessionId, sprite);

    // Camera follows local avatar
    this.scene.cameras.main.startFollow(sprite.container, true, 0.1, 0.1);
  }

  /**
   * Create/add a remote player avatar
   */
  addRemoteAvatar(sessionId: string, avatar: AvatarData, position: Position): void {
    // Don't duplicate if already exists
    if (this.avatars.has(sessionId)) {
      return;
    }

    const sprite = this.createAvatarSprite(avatar, position);
    this.avatars.set(sessionId, sprite);
  }

  /**
   * Remove a player's avatar and clean up resources
   */
  removeAvatar(sessionId: string): void {
    const sprite = this.avatars.get(sessionId);
    if (!sprite) {
      return;
    }

    sprite.container.destroy();
    this.avatars.delete(sessionId);
  }

  /**
   * Update a remote player's target position (for interpolation)
   */
  updateAvatarPosition(sessionId: string, position: Position): void {
    const sprite = this.avatars.get(sessionId);
    if (!sprite) {
      return;
    }

    sprite.targetPosition = { ...position };
  }

  /**
   * Update avatar appearance (change the character frame)
   */
  updateAvatarAppearance(sessionId: string, avatarData: AvatarData): void {
    const sprite = this.avatars.get(sessionId);
    if (!sprite) return;
    sprite.avatarData = { ...avatarData };
    sprite.body.setFrame(this.getCharacterFrame(avatarData));
  }

  /**
   * Move local avatar directly (called by InputHandler)
   * Updates both the container position and target position immediately.
   */
  moveLocalAvatar(position: Position): void {
    if (!this.localSessionId) {
      return;
    }

    const sprite = this.avatars.get(this.localSessionId);
    if (!sprite) {
      return;
    }

    sprite.container.setPosition(position.x, position.y);
    sprite.targetPosition = { ...position };
  }

  /**
   * Get local avatar position
   */
  getLocalPosition(): Position | null {
    if (!this.localSessionId) {
      return null;
    }

    const sprite = this.avatars.get(this.localSessionId);
    if (!sprite) {
      return null;
    }

    return { x: sprite.container.x, y: sprite.container.y };
  }

  /**
   * Initialize world state (multiple players at once)
   * Used when receiving world_state message from server.
   */
  initWorldState(players: PlayerInfo[]): void {
    for (const player of players) {
      // Skip if this is the local player (already created) or already exists
      if (player.sessionId === this.localSessionId || this.avatars.has(player.sessionId)) {
        continue;
      }

      this.addRemoteAvatar(player.sessionId, player.avatar, player.position);
    }
  }

  /**
   * Called every frame for smooth interpolation of remote avatars
   * and bounce animation for the local player.
   */
  update(): void {
    for (const [sessionId, sprite] of this.avatars) {
      // Skip local avatar - it moves directly via moveLocalAvatar
      if (sessionId === this.localSessionId) {
        continue;
      }

      // Lerp towards target position
      const currentX = sprite.container.x;
      const currentY = sprite.container.y;
      const targetX = sprite.targetPosition.x;
      const targetY = sprite.targetPosition.y;

      const dx = targetX - currentX;
      const dy = targetY - currentY;

      // Only interpolate if there's a meaningful distance to cover
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        sprite.container.setPosition(
          currentX + dx * this.lerpSpeed,
          currentY + dy * this.lerpSpeed,
        );
      } else {
        // Snap to target when close enough
        sprite.container.setPosition(targetX, targetY);
      }
    }

    // Bounce animation for local player
    if (this.localSessionId) {
      const localSprite = this.avatars.get(this.localSessionId);
      if (localSprite) {
        localSprite.body.setY(Math.sin(Date.now() / 150) * 1.5);
      }
    }
  }

  /**
   * Create an avatar sprite using a frame from the Tiny Dungeon spritesheet.
   */
  private createAvatarSprite(avatar: AvatarData, position: Position): AvatarSprite {
    const container = this.scene.add.container(position.x, position.y);

    const frame = this.getCharacterFrame(avatar);
    const body = this.scene.add.image(0, 0, 'tiny-dungeon', frame);
    body.setScale(2);
    container.add(body);

    container.setDepth(1);

    return {
      container,
      body,
      targetPosition: { ...position },
      avatarData: { ...avatar },
    };
  }

  /**
   * Map avatar characterIndex to a character frame index from the Tiny Dungeon tileset.
   */
  private getCharacterFrame(avatar: AvatarData): number {
    const index = avatar.characterIndex ?? 0;
    return CHARACTER_FRAMES[index % CHARACTER_FRAMES.length];
  }
}
