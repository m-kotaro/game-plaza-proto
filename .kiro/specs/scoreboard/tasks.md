# Implementation Plan: Scoreboard

## Overview

スコアボード機能を段階的に実装する。Shared層の型定義から始め、Server層のDB操作・ハンドラ、CDKインフラ、最後にClient層の看板UIという順序で実装し、各段階でテストを追加する。

## Tasks

- [ ] 1. Shared パッケージの型定義とバリデーション拡張
  - [ ] 1.1 型定義の追加（RankingEntry, ClientMessage, ServerMessage）
    - `packages/shared/src/types.ts` に RankingEntry インターフェースを追加
    - ClientMessage に submit_score と get_rankings バリアントを追加
    - ServerMessage に rankings_update バリアントを追加
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ] 1.2 メッセージバリデーション関数の更新
    - `packages/shared/src/messages.ts` の isValidClientMessage に submit_score, get_rankings のケースを追加
    - isValidServerMessage に rankings_update のケースを追加
    - submit_score: gameType が非空文字列、score が0以上の数値であることを検証
    - get_rankings: gameType が非空文字列であることを検証
    - rankings_update: gameType が文字列、rankings が RankingEntry 配列であることを検証
    - _Requirements: 1.3, 7.1, 7.2, 7.3_
  - [ ]* 1.3 メッセージのプロパティテスト
    - **Property 1: メッセージシリアライゼーションのラウンドトリップ**
    - **Property 2: 無効メッセージの拒否**
    - fast-check をdevDependencyに追加
    - `packages/shared/src/messages.test.ts` にプロパティテストを追加
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 1.3**

- [ ] 2. Server - スコアDB操作モジュール
  - [ ] 2.1 scoreDb モジュールの実装
    - `packages/server/src/scoreDb.ts` を新規作成
    - saveScore: gameTypeとスコアをDynamoDBに保存（Sort Keyはゼロパディング降順形式）
    - getTopScores: 指定gameTypeの上位N件を取得し RankingEntry[] を返す
    - pruneScores: 上位10件を超えるレコードを削除
    - 環境変数 SCORE_TABLE_NAME からテーブル名を取得
    - _Requirements: 2.1, 3.1, 3.2, 3.3_
  - [ ]* 2.2 ランキングロジックのプロパティテスト
    - **Property 3: ランキングの順序性と上限**
    - `packages/server/src/scoreDb.test.ts` を新規作成
    - DynamoDBクライアントをモックし、ランキングソートと上限10件のロジックを検証
    - **Validates: Requirements 2.1, 2.2, 3.3**

- [ ] 3. Server - onMessage Lambda ハンドラ拡張
  - [ ] 3.1 handleSubmitScore の実装
    - `packages/server/src/handlers/onMessage.ts` に handleSubmitScore 関数を追加
    - gameType/score のバリデーション（非空文字列、0以上の数値）
    - getPlayerByConnectionId でプレイヤー名を取得
    - saveScore → pruneScores → getTopScores → broadcastToAll で rankings_update を送信
    - switch文にcase "submit_score"を追加
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.3_
  - [ ] 3.2 handleGetRankings の実装
    - `packages/server/src/handlers/onMessage.ts` に handleGetRankings 関数を追加
    - gameType のバリデーション
    - getTopScores → sendToConnection で rankings_update を返す
    - switch文にcase "get_rankings"を追加
    - _Requirements: 2.1, 2.2_

- [ ] 4. Checkpoint - サーバーサイド確認
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. CDKインフラ - ScoreTable追加
  - [ ] 5.1 GamePlatformStack に ScoreTable を追加
    - `packages/cdk/src/lib/game-platform-stack.ts` に新しい DynamoDB Table を定義
    - PK: gameType (String), SK: sortKey (String)
    - billingMode: PAY_PER_REQUEST, removalPolicy: DESTROY
    - onMessageFn に ScoreTable の readWriteData 権限を付与
    - onMessageFn の環境変数に SCORE_TABLE_NAME を追加
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 6. Client - 看板表示の実装
  - [ ] 6.1 Signboard クラスの実装
    - `packages/client/src/scenes/Signboard.ts` を新規作成
    - コンストラクタ: Phaser.Scene, SignboardConfig を受け取り、看板テキストオブジェクトを生成
    - updateRankings: ランキングデータを受け取り、看板テキストを "N位: PlayerName Xpts" 形式で更新（上位3件）
    - showPopup / hidePopup: ゲーム説明テキストのポップアップ表示/非表示
    - 看板の表示位置はゲームゾーンの右横（+80px程度オフセット）
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3_
  - [ ]* 6.2 看板フォーマットのプロパティテスト
    - **Property 4: 看板フォーマット文字列**
    - フォーマット関数を独立したユーティリティとして抽出し、テスト可能にする
    - `packages/client/src/scenes/Signboard.test.ts` を新規作成
    - **Validates: Requirements 4.2**
  - [ ] 6.3 GameScene に Signboard を統合
    - `packages/client/src/scenes/GameScene.ts` を修正
    - 各ゲームゾーンの横に Signboard インスタンスを生成
    - updateループ内で近接検出を実装（プレイヤーとSignboardの距離計算）
    - 近接時にshowPopup、離れたらhidePopup を呼び出す
    - _Requirements: 4.1, 5.1, 5.2_
  - [ ]* 6.4 近接検出のプロパティテスト
    - **Property 5: 近接検出の正確性**
    - 近接検出ロジックを独立ユーティリティ関数として抽出
    - `packages/client/src/scenes/Signboard.test.ts` にテスト追加
    - **Validates: Requirements 5.1, 5.2**

- [ ] 7. Client - ランキング受信とスコア送信の統合
  - [ ] 7.1 RankingsHandler の実装
    - `packages/client/src/handlers/RankingsHandler.ts` を新規作成
    - NetworkManager の onMessage で rankings_update を検知し、対応する Signboard を更新
    - requestAllRankings: 全ゲームタイプに対して get_rankings を送信
    - _Requirements: 4.3, 4.4, 2.2_
  - [ ] 7.2 スコア送信の統合
    - `packages/client/src/scenes/GameScene.ts` を修正
    - PostMessageBridge の onGameResult コールバック内で submit_score メッセージを送信
    - GameResultMessage の scores からスコアを抽出して送信
    - _Requirements: 1.1_
  - [ ] 7.3 初回接続時のランキング取得
    - GameScene の init ハンドラ（player_joined 受信後）で requestAllRankings を呼び出す
    - これにより初回接続時に全看板にランキングが表示される
    - _Requirements: 4.4_

- [ ] 8. Final checkpoint - 全体確認
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties（fast-check使用）
- Unit tests validate specific examples and edge cases
- 実装言語: TypeScript（既存プロジェクトと同一）
- テストフレームワーク: vitest（既存プロジェクトと同一）
- PBTライブラリ: fast-check

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1", "5.1"] },
    { "id": 3, "tasks": ["2.2", "3.1", "3.2"] },
    { "id": 4, "tasks": ["6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 6, "tasks": ["7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3"] }
  ]
}
```
