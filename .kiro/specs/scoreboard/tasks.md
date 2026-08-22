# Implementation Plan: Scoreboard

## Overview

スコアボード機能を段階的に実装する。Shared層の型定義から始め、Server層のDB操作・ハンドラ、CDKインフラ、最後にClient層のUI表示という順序で実装し、各段階でテストを追加する。

> **NOTE: 実装時にSignboard方式からBulletinBoard方式に変更。看板の常時表示は削除し、掲示板エリア（📋）のEキーでDOMオーバーレイ表示する方式を採用。タスク6.x / 7.1の内容は実装と異なる（BulletinBoardクラスとonMessageリスナーで実装済み）。**

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

- [x] 6. Client - 掲示板（BulletinBoard）表示の実装
  - [x] 6.1 BulletinBoard クラスの実装
    - `packages/client/src/scenes/BulletinBoard.ts` を作成
    - DOMオーバーレイとしてランキング一覧を表示
    - setData: BulletinBoardData[] を受け取りデータ設定
    - open / close: オーバーレイの開閉
    - ゲームタイトルごとにカード形式でランキングを表示
    - _Requirements: 4.2, 4.4_
  - [x] 6.2 BulletinBoardのランキング表示フォーマット
    - "N位: PlayerName Xpts" 形式で表示
    - 1位: 金色、2位: 銀色、3位: 銅色のハイライト
    - _Requirements: 4.4_
  - [x] 6.3 GameScene に BulletinBoard を統合
    - `packages/client/src/scenes/GameScene.ts` を修正
    - 📋ゾーンへの進入検出 + Eキーで BulletinBoard.open() を呼び出す
    - rankings_update 受信時に Map に保存、open 時に setData で渡す
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 6.4 ゲーム説明の表示
    - meta.json からゲーム説明を取得し BulletinBoardData の title に含める
    - _Requirements: 5.1, 5.2_

- [x] 7. Client - ランキング受信とスコア送信の統合
  - [x] 7.1 ランキング受信処理の実装
    - GameScene 内の onMessage リスナーで rankings_update を検知
    - `Map<string, RankingEntry[]>` にランキングデータを保存
    - BulletinBoard.open() 時に Map からデータを取得して setData に渡す
    - _Requirements: 4.3, 4.5, 2.2_
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
