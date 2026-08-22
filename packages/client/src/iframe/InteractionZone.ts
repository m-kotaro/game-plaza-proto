import Phaser from 'phaser';

export interface InteractionZoneConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  gameType: string;
  label: string;
}

/**
 * ワールド内のゲーム開始トリガーエリア
 */
export class InteractionZone {
  private zone: Phaser.GameObjects.Zone;
  private visual: Phaser.GameObjects.Rectangle;
  private labelText: Phaser.GameObjects.Text;
  private promptText: Phaser.GameObjects.Text | null = null;
  private isPlayerInZone = false;
  private config: InteractionZoneConfig;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, config: InteractionZoneConfig) {
    this.scene = scene;
    this.config = config;

    // Visual indicator (semi-transparent rectangle)
    this.visual = scene.add.rectangle(
      config.x, config.y, config.width, config.height, 0xffd700, 0.2
    );
    this.visual.setStrokeStyle(2, 0xffd700, 0.6);
    this.visual.setDepth(0);

    // Label
    this.labelText = scene.add.text(config.x, config.y - config.height / 2 - 16, config.label, {
      fontSize: '12px',
      color: '#ffd700',
      align: 'center',
    });
    this.labelText.setOrigin(0.5);
    this.labelText.setDepth(0);

    // Physics zone for overlap detection
    this.zone = scene.add.zone(config.x, config.y, config.width, config.height);
    scene.physics.add.existing(this.zone, true); // static body
  }

  /** Phaser の Zone オブジェクトを取得（overlap 設定用） */
  getZone(): Phaser.GameObjects.Zone {
    return this.zone;
  }

  /** プレイヤーがゾーン内にいるか */
  setPlayerInZone(inZone: boolean): void {
    if (inZone && !this.isPlayerInZone) {
      this.showPrompt();
    } else if (!inZone && this.isPlayerInZone) {
      this.hidePrompt();
    }
    this.isPlayerInZone = inZone;
  }

  getIsPlayerInZone(): boolean {
    return this.isPlayerInZone;
  }

  getGameType(): string {
    return this.config.gameType;
  }

  private showPrompt(): void {
    if (this.promptText) return;
    this.promptText = this.scene.add.text(
      this.config.x,
      this.config.y + this.config.height / 2 + 16,
      'Press E to play',
      { fontSize: '14px', color: '#ffffff', backgroundColor: '#00000080', padding: { x: 8, y: 4 } }
    );
    this.promptText.setOrigin(0.5);
    this.promptText.setDepth(100);
  }

  private hidePrompt(): void {
    if (this.promptText) {
      this.promptText.destroy();
      this.promptText = null;
    }
  }

  /** ラベルを外部から更新する */
  updateLabel(label: string): void {
    this.labelText.setText(label);
    this.config.label = label;
  }

  destroy(): void {
    this.hidePrompt();
    this.visual.destroy();
    this.labelText.destroy();
    this.zone.destroy();
  }
}
