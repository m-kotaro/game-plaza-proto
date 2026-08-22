import { GameResultMessage } from '@game-plaza/shared';

/**
 * トースト形式の結果通知 UI
 */
export class ResultNotification {
  private containerEl: HTMLElement;
  private currentToast: HTMLElement | null = null;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container element #${containerId} not found`);
    this.containerEl = el;
  }

  /** 結果を表示（5秒後に自動消去） */
  show(result: GameResultMessage): void {
    this.dismiss(); // Clear any existing toast

    const toast = document.createElement('div');
    toast.style.cssText = `
      position: absolute;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999;
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      pointer-events: none;
      animation: fadeIn 0.3s ease;
    `;

    const text = result.winnerId
      ? `🎉 Winner: ${result.winnerId}`
      : '🤝 Draw!';
    toast.textContent = text;

    this.containerEl.appendChild(toast);
    this.currentToast = toast;

    this.dismissTimer = setTimeout(() => this.dismiss(), 5000);
  }

  /** 手動で消去 */
  dismiss(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    if (this.currentToast) {
      this.containerEl.removeChild(this.currentToast);
      this.currentToast = null;
    }
  }
}
