# Implementation Plan: AWS Game Platform

## Overview

AWSサーバーレスアーキテクチャを基盤とした2Dマルチプレイヤー交流空間の実装計画。AWS CDK (TypeScript) でインフラを構築し、Phaser.js + TypeScript でWebクライアントを、Lambda (Node.js/TypeScript) でバックエンドを実装する。

## Tasks

- [x] 1. プロジェクト構造とコアインターフェース定義
  - [x] 1.1 モノレポプロジェクト構造の作成
    - ルートに `package.json`（workspaces設定）を作成
    - `packages/cdk/` - CDKインフラ定義
    - `packages/server/` - Lambda関数群
    - `packages/client/` - Phaser.js Webクライアント
    - `packages/shared/` - 共有型定義
    - 各パッケージに `tsconfig.json` を設定
    - _Requirements: 6.1, 6.4_

  - [x] 1.2 共有型定義の実装 (`packages/shared/`)
    - `Position`, `AvatarData`, `PlayerInfo`, `ConnectionRecord` インターフェース定義
    - `ClientMessage`, `ServerMessage` のユニオン型定義
    - ワールド定数（`WORLD_WIDTH`, `WORLD_HEIGHT`, `MAX_PLAYERS` 等）の定義
    - アバター選択肢の定数定義（`BODY_COLORS`, `HEAD_SHAPES`, `ACCESSORIES`）
    - メッセージのシリアライズ/デシリアライズユーティリティ関数
    - _Requirements: 1.3, 2.2, 4.1_

  - [ ]* 1.3 共有型・ユーティリティのプロパティテスト
    - **Property 3: メッセージシリアライズのラウンドトリップ**
    - ClientMessage/ServerMessage をシリアライズ→デシリアライズして元と一致することを検証
    - fast-check で任意の有効なメッセージを生成
    - **Validates: Requirements 2.2**

- [x] 2. AWS CDK インフラ定義
  - [x] 2.1 CDKプロジェクトのセットアップ (`packages/cdk/`)
    - CDK アプリケーションのエントリーポイント作成
    - 単一スタックで全リソースを管理する `GamePlatformStack` を定義
    - _Requirements: 6.1_

  - [x] 2.2 DynamoDB テーブル定義
    - Connections テーブル（PK: `connectionId`）を L2 コンストラクトで定義
    - On-Demand キャパシティモードを設定
    - _Requirements: 6.1, 6.2_

  - [x] 2.3 Lambda 関数定義
    - `onConnect`, `onDisconnect`, `onMessage`, `tick` の4関数を `NodejsFunction` で定義
    - DynamoDB テーブルへの読み書き権限を付与
    - API Gateway WebSocket の管理API呼び出し権限を付与
    - 環境変数にテーブル名とWebSocket API エンドポイントを設定
    - _Requirements: 6.1, 6.2_

  - [x] 2.4 API Gateway WebSocket API 定義
    - L1 コンストラクト (`CfnApi`, `CfnRoute`, `CfnIntegration`, `CfnDeployment`, `CfnStage`) で WebSocket API を定義
    - `$connect`, `$disconnect`, `$default` ルートをそれぞれの Lambda に統合
    - _Requirements: 6.1_

  - [x] 2.5 S3 + CloudFront 静的アセット配信定義
    - S3 バケットを L2 コンストラクトで作成（パブリックアクセスブロック有効）
    - CloudFront Distribution を L2 で作成し、S3 をオリジンに設定
    - _Requirements: 6.4_

  - [x] 2.6 EventBridge ハートビートルール定義
    - 1分間隔で `tick` Lambda を起動する EventBridge Rule を定義
    - _Requirements: 3.4, 6.2_

- [x] 3. チェックポイント - CDKインフラ定義の確認
  - `cdk synth` でCloudFormationテンプレート生成を確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Lambda関数 コアロジック実装
  - [x] 4.1 DynamoDB操作ユーティリティの実装 (`packages/server/src/db.ts`)
    - `saveConnection`, `deleteConnection`, `getPlayerByConnectionId`, `getAllConnections`, `getAllPlayers`, `updatePlayerPosition`, `updatePlayerAvatar`, `updateLastSeen` 関数を実装
    - AWS SDK v3 DynamoDB Document Client を使用
    - _Requirements: 1.2, 5.2, 5.3_

  - [x] 4.2 ブロードキャスト・通信ユーティリティの実装 (`packages/server/src/broadcast.ts`)
    - `sendToConnection`, `broadcastToAll`, `broadcastToOthers`, `disconnectClient` 関数を実装
    - API Gateway Management API を使用
    - GoneException (410) のハンドリング（stale接続のクリーンアップ）
    - _Requirements: 2.3, 3.1, 3.3_

  - [x] 4.3 セッション・アバター生成ロジックの実装 (`packages/server/src/utils.ts`)
    - `generateUUID` でセッション識別子を生成
    - `generateRandomAvatar` で有効な選択肢からランダムなアバターを生成
    - `getRandomSpawnPosition` でワールド内のランダムな出現位置を生成
    - `isValidPosition` で位置のバリデーション
    - _Requirements: 1.2, 1.3, 2.2_

  - [ ]* 4.4 セッション・アバター生成のプロパティテスト
    - **Property 1: セッション識別子の一意性**
    - 複数回 `generateUUID` を呼び出した結果がすべて互いに異なることを検証
    - **Property 2: アバター生成の有効性**
    - `generateRandomAvatar` の結果が常に有効な選択肢セットに含まれることを検証
    - **Validates: Requirements 1.2, 1.3**

  - [x] 4.5 onConnect Lambda ハンドラ実装
    - 新規接続時にセッション登録、ワールド状態送信、既存プレイヤーへの通知
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2_

  - [ ]* 4.6 onConnect のプロパティテスト
    - **Property 5: ワールド状態の完全性**
    - 新規参加者に送信される world_state が、その時点のアクティブプレイヤー全員を含みかつ余分なプレイヤーを含まないことを検証
    - **Validates: Requirements 3.2**

  - [x] 4.7 onDisconnect Lambda ハンドラ実装
    - 切断時にセッション削除、残りプレイヤーへの離脱通知
    - _Requirements: 3.3, 5.1, 5.2_

  - [x] 4.8 onMessage Lambda ハンドラ実装
    - `move`, `customize_avatar`, `heartbeat` アクションのルーティングと処理
    - 位置バリデーション、DynamoDB更新、ブロードキャスト
    - _Requirements: 2.2, 2.3, 4.2, 4.3_

  - [ ]* 4.9 onMessage のプロパティテスト
    - **Property 4: 位置ブロードキャストのデータ整合性**
    - handleMove が受信した position をそのまま他プレイヤーにブロードキャストすることを検証
    - **Property 8: アバターカスタマイズのラウンドトリップ**
    - handleCustomizeAvatar が受信した avatarData をそのまま他プレイヤーにブロードキャストすることを検証
    - **Validates: Requirements 2.3, 3.1, 4.2, 4.3**

  - [x] 4.10 tick Lambda ハンドラ実装
    - 全接続の lastSeen を確認し、60秒超のセッションをタイムアウト処理
    - 切断処理と離脱通知のブロードキャスト
    - _Requirements: 3.4, 5.1, 5.2_

  - [ ]* 4.11 tick Lambda のプロパティテスト
    - **Property 7: タイムアウト判定の正確性**
    - lastSeen から60秒超の接続のみがタイムアウト判定されることを検証
    - **Property 6: セッション終了時のクリーンアップ完全性**
    - タイムアウトされた接続がテーブルから削除され、全接続に通知されることを検証
    - **Validates: Requirements 3.3, 3.4, 5.1, 5.2, 5.3**

- [x] 5. チェックポイント - サーバーロジック確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Web クライアント基盤実装
  - [x] 6.1 Vite + Phaser.js プロジェクトセットアップ (`packages/client/`)
    - Vite プロジェクト作成（TypeScript テンプレート）
    - Phaser.js 3 の依存関係を追加
    - 基本的なHTMLテンプレートとエントリーポイント作成
    - _Requirements: 7.1, 7.3_

  - [x] 6.2 NetworkManager の実装
    - WebSocket 接続・切断・再接続管理
    - 指数バックオフによる再接続ロジック（最大5回）
    - メッセージの送受信とイベントディスパッチ
    - ハートビート送信（30秒間隔）
    - _Requirements: 1.1, 2.2, 5.1_

  - [x] 6.3 GameScene（メインシーン）の実装
    - Phaser.Scene を継承したゲームシーン作成
    - 2Dマップ（1600x1200）の描画
    - カメラ設定（プレイヤー追従）
    - 30fps 以上のレンダリング設定
    - _Requirements: 7.1, 7.2_

  - [x] 6.4 AvatarManager の実装
    - アバタースプライトの生成・描画・更新
    - 他プレイヤーのアバター管理（参加/離脱/移動の反映）
    - アバターカスタマイズUIとデータ送信
    - スムーズな移動アニメーション（補間処理）
    - _Requirements: 1.3, 4.1, 4.3, 7.4_

  - [x] 6.5 InputHandler の実装
    - キーボード入力（矢印キー/WASD）でアバター移動
    - 位置更新のスロットリング（100ms間隔）
    - ローカル画面上の即時反映（クライアントサイド予測）
    - サーバーへの位置情報送信
    - _Requirements: 2.1, 2.2, 7.4_

  - [x] 6.6 クライアントのサーバーメッセージ受信処理
    - `world_state`: 全プレイヤーの初期描画
    - `player_joined`: 新規プレイヤーのアバター追加
    - `player_left`: 離脱プレイヤーのアバター削除
    - `player_moved`: 他プレイヤーの位置更新
    - `avatar_updated`: 他プレイヤーのアバター外見更新
    - _Requirements: 2.4, 3.1, 3.2, 3.3, 4.3_

- [x] 7. チェックポイント - クライアント基盤確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. 統合とワイヤリング
  - [x] 8.1 CDK スタックと Lambda 関数の接続
    - Lambda 関数のソースパスを `packages/server/` に設定
    - 環境変数の参照解決（テーブル名、WebSocket URL）
    - CDK でのビルド設定（esbuild バンドル）
    - _Requirements: 6.1_

  - [x] 8.2 クライアントビルドと S3 デプロイ設定
    - Vite ビルド出力を S3 にデプロイする CDK の `BucketDeployment` を設定
    - WebSocket API の URL をクライアントビルド時の環境変数として注入
    - _Requirements: 6.4_

  - [ ]* 8.3 統合テストの作成
    - WebSocket 接続→メッセージ送受信→切断のライフサイクルテスト
    - DynamoDB モックを使用した CRUD 操作テスト
    - 複数接続へのブロードキャスト配信テスト
    - _Requirements: 1.1, 2.3, 3.1, 3.3, 5.1_

- [x] 9. 最終チェックポイント - 全テスト実行確認
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- タスクに `*` マークがついているものはオプションであり、MVPを速く完成させるためにスキップ可能
- 各タスクは要件トレーサビリティのため具体的な要件番号を参照
- チェックポイントでインクリメンタルな検証を実施
- プロパティテストは設計書の Correctness Properties に対応し、普遍的な正確性を検証
- 単体テストは具体的なエッジケースとエラー条件を検証
- インフラ（CDK）はコード生成と同等に扱い、`cdk synth` で検証可能

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "6.1"] },
    { "id": 2, "tasks": ["1.3", "2.2", "2.3", "2.5", "2.6"] },
    { "id": 3, "tasks": ["2.4", "4.1", "4.3"] },
    { "id": 4, "tasks": ["4.2", "4.4", "4.5"] },
    { "id": 5, "tasks": ["4.6", "4.7", "4.8", "6.2"] },
    { "id": 6, "tasks": ["4.9", "4.10", "6.3", "6.4", "6.5"] },
    { "id": 7, "tasks": ["4.11", "6.6"] },
    { "id": 8, "tasks": ["8.1", "8.2"] },
    { "id": 9, "tasks": ["8.3"] }
  ]
}
```
