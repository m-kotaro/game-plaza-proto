import { RankingEntry } from '@game-plaza/shared';

export interface BulletinBoardData {
  gameType: string;
  title: string;
  rankings: RankingEntry[];
}

/**
 * 全ゲームのランキングを表示するDOMオーバーレイ掲示板
 */
export class BulletinBoard {
  private containerEl: HTMLElement;
  private overlayEl: HTMLElement | null = null;
  private data: BulletinBoardData[] = [];
  private onCloseCallback: (() => void) | null = null;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container element #${containerId} not found`);
    this.containerEl = el;
  }

  /** ランキングデータを設定する */
  setData(data: BulletinBoardData[]): void {
    this.data = data;
    // If overlay is open, refresh content
    if (this.overlayEl) {
      this.renderContent();
    }
  }

  /** 掲示板を開く */
  open(onClose?: () => void): void {
    if (this.overlayEl) return;
    this.onCloseCallback = onClose || null;

    this.overlayEl = document.createElement('div');
    this.overlayEl.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      overflow-y: auto;
      font-family: sans-serif;
    `;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ 閉じる';
    closeBtn.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 1001;
      background: #333;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
    `;
    closeBtn.addEventListener('click', () => this.close());
    this.overlayEl.appendChild(closeBtn);

    // Title
    const title = document.createElement('h1');
    title.textContent = '📋 ランキング掲示板';
    title.style.cssText = `
      color: #ffd700;
      margin-bottom: 24px;
      font-size: 24px;
    `;
    this.overlayEl.appendChild(title);

    // Content container
    const content = document.createElement('div');
    content.id = 'bulletin-content';
    content.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      width: 100%;
      max-width: 900px;
    `;
    this.overlayEl.appendChild(content);

    this.containerEl.appendChild(this.overlayEl);
    this.renderContent();
  }

  /** 掲示板を閉じる */
  close(): void {
    if (this.overlayEl) {
      this.containerEl.removeChild(this.overlayEl);
      this.overlayEl = null;
    }
    if (this.onCloseCallback) {
      this.onCloseCallback();
      this.onCloseCallback = null;
    }
  }

  isOpen(): boolean {
    return this.overlayEl !== null;
  }

  private renderContent(): void {
    const content = this.overlayEl?.querySelector('#bulletin-content');
    if (!content) return;
    content.innerHTML = '';

    if (this.data.length === 0) {
      content.innerHTML = '<p style="color: #ccc; text-align: center; grid-column: 1/-1;">まだランキングデータがありません</p>';
      return;
    }

    for (const game of this.data) {
      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 8px;
        padding: 16px;
      `;

      const gameTitle = document.createElement('h3');
      gameTitle.textContent = game.title;
      gameTitle.style.cssText = `
        color: #ffd700;
        margin-bottom: 12px;
        font-size: 16px;
      `;
      card.appendChild(gameTitle);

      if (game.rankings.length === 0) {
        const noData = document.createElement('p');
        noData.textContent = 'まだスコアがありません';
        noData.style.cssText = 'color: #888; font-size: 12px;';
        card.appendChild(noData);
      } else {
        const list = document.createElement('ol');
        list.style.cssText = `
          list-style: none;
          padding: 0;
          margin: 0;
        `;
        for (const [i, entry] of game.rankings.entries()) {
          const li = document.createElement('li');
          li.style.cssText = `
            color: ${i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#ccc'};
            font-size: 13px;
            padding: 4px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
          `;
          li.textContent = `${i + 1}位: ${entry.playerName}  ${entry.score}pts`;
          list.appendChild(li);
        }
        card.appendChild(list);
      }

      content.appendChild(card);
    }
  }
}
