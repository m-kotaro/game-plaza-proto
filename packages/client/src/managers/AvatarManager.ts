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
 * Internal representation of an avatar sprite and its associated data.
 * Uses an Image backed by a generated texture instead of Graphics
 * to avoid ghost trail rendering artifacts.
 */
interface AvatarSprite {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  textureKey: string;
  nameText?: Phaser.GameObjects.Text;
  targetPosition: Position;
  avatarData: AvatarData;
}

/**
 * AvatarManager manages all avatar sprites in the scene.
 * Handles creation, rendering, movement interpolation, and lifecycle management.
 *
 * Avatar rendering uses a RenderTexture approach: the avatar is drawn once onto
 * a temporary Graphics object, a texture is generated from it, and an Image is
 * created from that texture. This avoids Phaser's known issue where Graphics
 * objects leave ghost trails when moved inside a Container.
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

    this.scene.textures.remove(sprite.textureKey);
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
   * Update avatar appearance (regenerate texture and update image)
   */
  updateAvatarAppearance(sessionId: string, avatarData: AvatarData): void {
    const sprite = this.avatars.get(sessionId);
    if (!sprite) {
      return;
    }

    sprite.avatarData = { ...avatarData };

    // Remove old texture and generate a new one
    this.scene.textures.remove(sprite.textureKey);
    this.generateAvatarTexture(sprite.textureKey, avatarData);
    sprite.body.setTexture(sprite.textureKey);
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
   * Create an avatar sprite with container, image body, and name text.
   * Uses generateTexture to pre-render the avatar as a static image,
   * avoiding ghost trail issues with Graphics objects in containers.
   */
  private createAvatarSprite(avatar: AvatarData, position: Position): AvatarSprite {
    const container = this.scene.add.container(position.x, position.y);
    const textureKey = `avatar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Draw avatar to a temporary graphics and generate a texture from it
    this.generateAvatarTexture(textureKey, avatar);

    // Create image from generated texture
    const body = this.scene.add.image(0, 0, textureKey);
    container.add(body);

    // Set the container depth so avatars appear above the background
    container.setDepth(1);

    return {
      container,
      body,
      textureKey,
      targetPosition: { ...position },
      avatarData: { ...avatar },
    };
  }

  /**
   * Generate a texture for an avatar by drawing it onto a temporary Graphics object.
   * The avatar is drawn centered in a 64x64 area (offset by 32,32) so that all
   * coordinates are positive and captured correctly by generateTexture.
   */
  private generateAvatarTexture(textureKey: string, avatarData: AvatarData): void {
    const size = 64;
    const cx = size / 2; // center x offset
    const cy = size / 2; // center y offset

    const graphics = new Phaser.GameObjects.Graphics(this.scene);

    const bodyColor = BODY_COLOR_MAP[avatarData.bodyColor] ?? 0x888888;
    const headShape = HEAD_SHAPE_MAP[avatarData.headShape] ?? 'circle';

    // Body: filled circle at center
    graphics.fillStyle(bodyColor, 1);
    graphics.fillCircle(cx, cy, 16);

    // Body outline
    graphics.lineStyle(2, 0x000000, 0.3);
    graphics.strokeCircle(cx, cy, 16);

    // Head shape indicator on top of body
    const headColor = Phaser.Display.Color.IntegerToColor(bodyColor).brighten(30).color;
    graphics.fillStyle(headColor, 1);

    switch (headShape) {
      case 'circle':
        graphics.fillCircle(cx, cy - 12, 8);
        break;
      case 'square':
        graphics.fillRect(cx - 6, cy - 20, 12, 12);
        break;
      case 'triangle':
        graphics.fillTriangle(cx, cy - 22, cx - 7, cy - 10, cx + 7, cy - 10);
        break;
      case 'oval':
        graphics.fillEllipse(cx, cy - 14, 14, 10);
        break;
      case 'diamond':
        graphics.fillTriangle(cx, cy - 22, cx - 6, cy - 14, cx, cy - 6);
        graphics.fillTriangle(cx, cy - 6, cx + 6, cy - 14, cx, cy - 22);
        break;
      default:
        graphics.fillCircle(cx, cy - 12, 8);
        break;
    }

    // Accessories (offset by cx, cy)
    this.drawAccessoryOffset(graphics, avatarData.accessory, cx, cy);

    graphics.generateTexture(textureKey, size, size);
    graphics.destroy();
  }

  /**
   * Draw accessory on top of the avatar with center offset.
   * All coordinates are relative to (cx, cy) which is the center of the texture.
   */
  private drawAccessoryOffset(
    graphics: Phaser.GameObjects.Graphics,
    accessory: string,
    cx: number,
    cy: number,
  ): void {
    switch (accessory) {
      case 'hat':
        graphics.fillStyle(0x333333, 1);
        graphics.fillRect(cx - 8, cy - 26, 16, 6);
        graphics.fillRect(cx - 5, cy - 32, 10, 6);
        break;
      case 'glasses':
        graphics.lineStyle(2, 0x333333, 1);
        graphics.strokeCircle(cx - 5, cy - 12, 4);
        graphics.strokeCircle(cx + 5, cy - 12, 4);
        graphics.lineBetween(cx - 1, cy - 12, cx + 1, cy - 12);
        break;
      case 'ribbon':
        graphics.fillStyle(0xff69b4, 1);
        graphics.fillTriangle(cx - 8, cy - 20, cx - 2, cy - 16, cx - 2, cy - 24);
        graphics.fillTriangle(cx + 2, cy - 16, cx + 8, cy - 20, cx + 2, cy - 24);
        break;
      case 'crown':
        graphics.fillStyle(0xffd700, 1);
        graphics.fillRect(cx - 7, cy - 26, 14, 5);
        graphics.fillTriangle(cx - 7, cy - 26, cx - 4, cy - 32, cx - 1, cy - 26);
        graphics.fillTriangle(cx - 1, cy - 26, cx + 2, cy - 32, cx + 5, cy - 26);
        graphics.fillTriangle(cx + 3, cy - 26, cx + 6, cy - 32, cx + 9, cy - 26);
        break;
      case 'headband':
        graphics.lineStyle(3, 0xff4444, 1);
        graphics.beginPath();
        graphics.arc(cx, cy - 14, 12, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
        graphics.strokePath();
        break;
      case 'none':
      default:
        // No accessory
        break;
    }
  }
}
