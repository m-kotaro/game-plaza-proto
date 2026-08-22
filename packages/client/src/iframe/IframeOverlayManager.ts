import { PostMessageBridge } from './PostMessageBridge';

export interface IframeOverlayCallbacks {
  onInputPause: () => void;
  onInputResume: () => void;
}

/**
 * iframe DOM 要素の作成・表示・削除を管理するクラス
 */
export class IframeOverlayManager {
  private containerEl: HTMLElement;
  private overlayEl: HTMLElement | null = null;
  private iframeEl: HTMLIFrameElement | null = null;
  private bridge: PostMessageBridge;
  private callbacks: IframeOverlayCallbacks;
  private loadTimeout: ReturnType<typeof setTimeout> | null = null;
  private loadTimeoutMs: number;

  constructor(
    containerId: string,
    bridge: PostMessageBridge,
    callbacks: IframeOverlayCallbacks,
    loadTimeoutMs: number = 10000
  ) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container element #${containerId} not found`);
    this.containerEl = el;
    this.bridge = bridge;
    this.callbacks = callbacks;
    this.loadTimeoutMs = loadTimeoutMs;
  }

  /** ゲームを開く: iframe を作成しオーバーレイ表示 */
  open(url: string, targetOrigin: string): void {
    if (this.overlayEl) return; // Already open

    // Create overlay
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'iframe-overlay';
    this.overlayEl.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
    `;

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 1001;
      background: #333;
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      font-size: 18px;
      cursor: pointer;
    `;
    closeBtn.addEventListener('click', () => this.close());
    this.overlayEl.appendChild(closeBtn);

    // Create iframe
    this.iframeEl = document.createElement('iframe');
    this.iframeEl.style.cssText = `
      width: 90%;
      height: 90%;
      border: none;
      border-radius: 8px;
    `;
    this.iframeEl.src = url;

    // On load, attach bridge
    this.iframeEl.addEventListener('load', () => {
      this.clearLoadTimeout();
      if (this.iframeEl?.contentWindow) {
        this.bridge.attach(this.iframeEl.contentWindow, targetOrigin);
      }
    });

    this.overlayEl.appendChild(this.iframeEl);
    this.containerEl.appendChild(this.overlayEl);

    // Pause input
    this.callbacks.onInputPause();

    // Start load timeout
    this.startLoadTimeout();
  }

  /** オーバーレイを閉じて DOM をクリーンアップ */
  close(): void {
    this.clearLoadTimeout();
    this.bridge.detach();

    if (this.overlayEl) {
      this.containerEl.removeChild(this.overlayEl);
      this.overlayEl = null;
      this.iframeEl = null;
    }

    // Resume input
    this.callbacks.onInputResume();
  }

  /** iframe がオープン中かどうか */
  isOpen(): boolean {
    return this.overlayEl !== null;
  }

  private startLoadTimeout(): void {
    this.loadTimeout = setTimeout(() => {
      console.warn('[IframeOverlayManager] Load timeout');
      this.close();
    }, this.loadTimeoutMs);
  }

  private clearLoadTimeout(): void {
    if (this.loadTimeout !== null) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
  }
}
