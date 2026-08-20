import Phaser from 'phaser';
import { AvatarData, Position, PlayerInfo } from '@game-plaza/shared';

/**
 * Map body color names to hex color values for rendering
 */
const BODY_COLOR_MAP: Record<string, number> = {
  red: 0xe74c3c,
  blue: 0x3498db,
  green: 0x2ecc71,
  yellow: 0xf1c40f,
  purple: 0x9b59b6,
  orange: 0xe67e22,
  pink: 0xe91e63,
  cyan: 0x00bcd4,
};

/**
 * Map head shape names to shape identifiers for rendering
 */
const HEAD_SHAPE_MAP: Record<string, string> = {
  round: 'circle',
  square: 'square',
  triangle: 'triangle',
  oval: 'oval',
  diamond: 'diamond',
};

/**
 * Internal representation of an avatar sprite and its associated data
 */
interface AvatarSprite {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Graphics;
  nameText?: Phaser.GameObjects.Text;
  targetPosition: Position;
  avatarData: AvatarData;
}

/**
 * AvatarManager manages all avatar sprites in the scene.
 * Handles creation, rendering, movement interpolation, and lifecycle management.
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
   * Update avatar appearance (redraw the body graphics)
   */
  updateAvatarAppearance(sessionId: string, avatarData: AvatarData): void {
    const sprite = this.avatars.get(sessionId);
    if (!sprite) {
      return;
    }

    sprite.avatarData = { ...avatarData };
    sprite.body.clear();
    this.drawAvatarBody(sprite.body, avatarData);
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
  }

  /**
   * Create an avatar sprite with container, body graphics, and name text
   */
  private createAvatarSprite(avatar: AvatarData, position: Position): AvatarSprite {
    const container = this.scene.add.container(position.x, position.y);

    // Create body graphics (drawn at local coordinates within the container)
    const body = this.scene.add.graphics();
    this.drawAvatarBody(body, avatar);
    container.add(body);

    // Set the container depth so avatars appear above the background
    container.setDepth(1);

    return {
      container,
      body,
      targetPosition: { ...position },
      avatarData: { ...avatar },
    };
  }

  /**
   * Draw the avatar body onto the given graphics object.
   * Renders a colored circle (~32px diameter) with a head shape indicator on top.
   */
  private drawAvatarBody(graphics: Phaser.GameObjects.Graphics, avatarData: AvatarData): void {
    const bodyColor = BODY_COLOR_MAP[avatarData.bodyColor] ?? 0x888888;
    const headShape = HEAD_SHAPE_MAP[avatarData.headShape] ?? 'circle';

    // Body: filled circle, 16px radius (32px diameter)
    graphics.fillStyle(bodyColor, 1);
    graphics.fillCircle(0, 0, 16);

    // Body outline
    graphics.lineStyle(2, 0x000000, 0.3);
    graphics.strokeCircle(0, 0, 16);

    // Head shape indicator on top of the body
    const headColor = Phaser.Display.Color.IntegerToColor(bodyColor).brighten(30).color;
    graphics.fillStyle(headColor, 1);

    switch (headShape) {
      case 'circle':
        graphics.fillCircle(0, -12, 8);
        break;
      case 'square':
        graphics.fillRect(-6, -20, 12, 12);
        break;
      case 'triangle':
        graphics.fillTriangle(0, -22, -7, -10, 7, -10);
        break;
      case 'oval':
        graphics.fillEllipse(0, -14, 14, 10);
        break;
      case 'diamond':
        graphics.fillTriangle(0, -22, -6, -14, 0, -6);
        graphics.fillTriangle(0, -6, 6, -14, 0, -22);
        break;
      default:
        graphics.fillCircle(0, -12, 8);
        break;
    }

    // Accessory rendering
    this.drawAccessory(graphics, avatarData.accessory);
  }

  /**
   * Draw accessory on top of the avatar
   */
  private drawAccessory(graphics: Phaser.GameObjects.Graphics, accessory: string): void {
    switch (accessory) {
      case 'hat':
        graphics.fillStyle(0x333333, 1);
        graphics.fillRect(-8, -26, 16, 6);
        graphics.fillRect(-5, -32, 10, 6);
        break;
      case 'glasses':
        graphics.lineStyle(2, 0x333333, 1);
        graphics.strokeCircle(-5, -12, 4);
        graphics.strokeCircle(5, -12, 4);
        graphics.lineBetween(-1, -12, 1, -12);
        break;
      case 'ribbon':
        graphics.fillStyle(0xff69b4, 1);
        graphics.fillTriangle(-8, -20, -2, -16, -2, -24);
        graphics.fillTriangle(2, -16, 8, -20, 2, -24);
        break;
      case 'crown':
        graphics.fillStyle(0xffd700, 1);
        graphics.fillRect(-7, -26, 14, 5);
        graphics.fillTriangle(-7, -26, -4, -32, -1, -26);
        graphics.fillTriangle(-1, -26, 2, -32, 5, -26);
        graphics.fillTriangle(3, -26, 6, -32, 9, -26);
        break;
      case 'headband':
        graphics.lineStyle(3, 0xff4444, 1);
        graphics.beginPath();
        graphics.arc(0, -14, 12, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
        graphics.strokePath();
        break;
      case 'none':
      default:
        // No accessory
        break;
    }
  }
}
