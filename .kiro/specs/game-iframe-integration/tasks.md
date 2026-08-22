# Implementation Plan: Game iframe Integration

## Overview

Phaser.js ワールド上で外部ゲームを iframe オーバーレイで表示し、postMessage で通信する仕組みを TypeScript で実装する。shared パッケージにメッセージ型定義を追加し、client パッケージに iframe 管理モジュール群を新設する。最後にモックゲームと InteractionZone を統合して動作確認可能な状態にする。

## Tasks

- [ ] 1. メッセージ型定義とバリデーション
  - [ ] 1.1 `packages/shared/src/iframe-messages.ts` を作成し、GameStartMessage, GameResultMessage, GameCloseMessage の型定義と型ガード関数を実装する
    - GamePlayer, GameStartMessage, GameResultMessage, GameCloseMessage インターフェース
    - isGameStartMessage, isGameResultMessage, isGameCloseMessage, isIframeMessage 型ガード関数
    - `packages/shared/src/index.ts` からエクスポートを追加
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 1.2 メッセージ型ガードの property test を作成する
    - **Property 4: Message type guard round-trip consistency**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - fast-check を devDependency に追加（`packages/shared`）
    - 任意の有効な IframeMessage に対し、JSON シリアライズ → 型ガード検証が true を返すことを確認

- [ ] 2. GameConfig と PostMessageBridge
  - [ ] 2.1 `packages/client/src/iframe/GameConfig.ts` を作成する
    - GameEntry, GameIframeConfig インターフェース定義
    - DEFAULT_GAME_CONFIG 定数（mock ゲーム設定含む）
    - getGameEntry(gameType) ヘルパー関数
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 2.2 `packages/client/src/iframe/PostMessageBridge.ts` を作成する
    - コンストラクタで allowedOrigins を受け取る
    - attach(iframeWindow, targetOrigin) / detach() メソッド
    - sendGameStart(message) メソッド
    - isAllowedOrigin(origin) による origin 検証
    - handleMessage(event) による受信メッセージのルーティング
    - onGameResult / onGameClose コールバック登録
    - _Requirements: 1.4, 1.5, 1.6, 4.1, 4.2, 4.3_

  - [ ]* 2.3 PostMessageBridge の property test を作成する
    - **Property 1: Origin validation correctness**
    - **Validates: Requirements 1.4, 1.6**
    - fast-check を devDependency に追加（`packages/client`）
    - 任意の origin 文字列と allowedOrigins リストに対し、origin がリスト内にある場合のみメッセージが処理されることを確認

  - [ ]* 2.4 PostMessageBridge の unknown type rejection property test を作成する
    - **Property 2: Unknown message type rejection**
    - **Validates: Requirements 1.5**
    - 任意の unknown type メッセージに対し、コールバックが呼ばれないことを確認

- [ ] 3. IframeOverlayManager
  - [ ] 3.1 `packages/client/src/iframe/IframeOverlayManager.ts` を作成する
    - open(url, targetOrigin): iframe DOM 生成、フルスクリーンオーバーレイ CSS、close ボタン追加
    - close(): iframe 削除、DOM クリーンアップ
    - isOpen(): 状態チェック
    - 10秒ロードタイムアウト処理
    - onInputPause / onInputResume コールバック連携
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.4_

  - [ ]* 3.2 IframeOverlayManager のユニットテストを作成する
    - DOM 生成/削除の確認（happy-dom 使用）
    - close ボタンクリックで close() が呼ばれる確認
    - タイムアウト処理の確認
    - _Requirements: 2.1, 2.4, 2.6, 4.4_

- [ ] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. InteractionZone とゲーム開始フロー
  - [ ] 5.1 `packages/client/src/iframe/InteractionZone.ts` を作成する
    - Phaser.GameObjects.Zone によるオーバーラップ検知
    - 視覚的インジケーター（Rectangle + テキスト）
    - プロンプト表示/非表示
    - _Requirements: 3.1, 3.2_

  - [ ] 5.2 `packages/client/src/iframe/GameIframeManager.ts` を統合管理クラスとして作成する
    - InteractionZone、IframeOverlayManager、PostMessageBridge、ResultNotification を統合
    - ゲーム開始トリガーから結果通知までの全フローをオーケストレーション
    - GameStartMessage の構成（プレイヤー情報の埋め込み）
    - _Requirements: 3.3, 3.4, 4.1, 4.2, 4.3_

  - [ ]* 5.3 GameStartMessage 構成の property test を作成する
    - **Property 3: GameStartMessage construction integrity**
    - **Validates: Requirements 3.4**
    - 任意のプレイヤー情報に対し、構成された GameStartMessage が正しいフィールドを持つことを確認

- [ ] 6. ResultNotification
  - [ ] 6.1 `packages/client/src/iframe/ResultNotification.ts` を作成する
    - DOM ベースのトースト通知 UI
    - show(result): 結果メッセージのフォーマットと表示
    - 5秒後の自動消去（setTimeout）
    - dismiss(): 手動消去
    - player input を妨げないポインターイベント設定
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 6.2 ResultNotification のユニットテストを作成する
    - トースト表示の確認
    - 5秒タイマーの確認（vi.useFakeTimers）
    - _Requirements: 7.1, 7.2_

- [ ] 7. モックゲームと統合
  - [ ] 7.1 `packages/client/public/mock-game.html` を作成する
    - postMessage で GameStartMessage を受信し、プレイヤー情報を表示
    - 「ゲーム終了（勝利）」ボタン → GameResultMessage 送信
    - 「引き分け」ボタン → GameResultMessage (winnerId: null) 送信
    - 「閉じる」ボタン → GameCloseMessage 送信
    - スタイリング（シンプルなデザイン）
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 7.2 GameScene に InteractionZone と GameIframeManager を統合する
    - `packages/client/src/scenes/GameScene.ts` に InteractionZone を追加
    - ゾーンオーバーラップ時のプロンプト + キー入力によるゲーム開始
    - 入力の一時停止/再開を InputHandler と連携
    - `packages/client/src/iframe/index.ts` バレルエクスポートの作成
    - _Requirements: 3.2, 3.3, 2.3, 2.5_

- [ ] 8. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (fast-check, 100+ iterations)
- Unit tests validate specific examples and edge cases (vitest + happy-dom)
- MockGame は手動テストで動作確認する（自動化は integration test 扱い）
- `packages/client/src/iframe/` ディレクトリに全ての iframe 関連モジュールを集約する

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "3.1"] },
    { "id": 3, "tasks": ["3.2", "5.1", "6.1"] },
    { "id": 4, "tasks": ["5.2", "6.2", "7.1"] },
    { "id": 5, "tasks": ["5.3", "7.2"] }
  ]
}
```
