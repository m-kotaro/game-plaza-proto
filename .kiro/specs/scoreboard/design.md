# Design Document: Scoreboard

## Overview

スコアボード機能は、ゲーム終了時のスコアをDynamoDBに保存し、掲示板エリア（📋ゾーン）でEキーを押すとDOMオーバーレイとしてランキングを表示する。既存のWebSocket通信基盤（onMessage Lambda）に新しいアクション（submit_score, get_rankings）を追加し、クライアント側はBulletinBoardクラスでDOMベースのオーバーレイUIを描画する。

### 設計方針

- 既存アーキテクチャを最大限活用（WebSocket通信、CDKスタック、sharedパッケージの型定義パターン）
- スコア保存は非同期で行い、ゲームプレイへの影響を最小限に抑える
- ランキングデータは全プレイヤーにブロードキャストし、クライアント側でMap に保存。掲示板を開いた時に最新データを表示する
- 表示方式はDOMオーバーレイ（BulletinBoard）を採用。📋ゾーンでEキーを押すとオーバーレイが開く

## Architecture

```mermaid
sequenceDiagram
    participant Client as Client (Phaser.js + DOM)
    participant WS as WebSocket API Gateway
    participant Lambda as onMessage Lambda
    participant DB as DynamoDB (ScoreTable)

    Note over Client: ゲーム終了
    Client->>WS: { action: "submit_score", gameType, score }
    WS->>Lambda: invoke
    Lambda->>DB: PutItem (スコア保存)
    Lambda->>DB: Query (上位10件取得)
    Lambda->>DB: Delete (11件目以降削除)
    Lambda->>WS: broadcast rankings_update
    WS->>Client: { type: "rankings_update", gameType, rankings }
    Note over Client: Map にランキング保存

    Client->>WS: { action: "get_rankings", gameType }
    WS->>Lambda: invoke
    Lambda->>DB: Query (上位10件取得)
    Lambda->>WS: send rankings_update
    WS->>Client: { type: "rankings_update", gameType, rankings }

    Note over Client: プレイヤーが📋ゾーンでEキーを押す
    Note over Client: BulletinBoard.open() → Map内のデータを表示
```

### レイヤー構成

1. **Shared層** (`packages/shared`): メッセージ型定義、バリデーション関数
2. **Server層** (`packages/server`): スコア保存・取得ロジック、ランキングブロードキャスト
3. **Client層** (`packages/client`): BulletinBoard DOMオーバーレイ、ランキング受信・保存、スコア送信
4. **Infrastructure層** (`packages/cdk`): ScoreTable定義、Lambda環境変数設定

## Components and Interfaces

### 1. Shared パッケージ拡張

```typescript
// packages/shared/src/types.ts に追加

/** ランキング1件分のデータ */
export interface RankingEntry {
  playerName: string;
  score: number;
}

/** クライアント → サーバー メッセージ（追加分） */
export type ClientMessage =
  | { action: "init" }
  | { action: "move"; position: Position }
  | { action: "customize_avatar"; avatarData: AvatarData }
  | { action: "heartbeat" }
  | { action: "submit_score"; gameType: string; score: number }
  | { action: "get_rankings"; gameType: string };

/** サーバー → クライアント メッセージ（追加分） */
export type ServerMessage =
  | { type: "world_state"; players: PlayerInfo[] }
  | { type: "player_joined"; sessionId: string; avatar: AvatarData; position: Position }
  | { type: "player_left"; sessionId: string }
  | { type: "player_moved"; sessionId: string; position: Position }
  | { type: "avatar_updated"; sessionId: string; avatarData: AvatarData }
  | { type: "rankings_update"; gameType: string; rankings: RankingEntry[] };
```

### 2. Server - スコアDB操作モジュール

```typescript
// packages/server/src/scoreDb.ts

export interface ScoreRecord {
  gameType: string;       // PK
  sortKey: string;        // SK: "score#timestamp" (スコア降順ソート用にゼロパディング)
  playerName: string;
  score: number;
  timestamp: number;
}

/** スコアを保存する */
export async function saveScore(gameType: string, playerName: string, score: number): Promise<void>;

/** gameType のランキング上位N件を取得する */
export async function getTopScores(gameType: string, limit?: number): Promise<RankingEntry[]>;

/** 上位10件を超えるレコードを削除する */
export async function pruneScores(gameType: string): Promise<void>;
```

### 3. Server - onMessage Lambda ハンドラ拡張

```typescript
// packages/server/src/handlers/onMessage.ts に追加

async function handleSubmitScore(connectionId: string, gameType: unknown, score: unknown): Promise<void>;
async function handleGetRankings(connectionId: string, gameType: unknown): Promise<void>;
```

### 4. Client - BulletinBoard クラス

```typescript
// packages/client/src/scenes/BulletinBoard.ts

export interface BulletinBoardData {
  gameType: string;
  title: string;
  rankings: RankingEntry[];
}

/**
 * 全ゲームのランキングを表示するDOMオーバーレイ掲示板
 * 📋ゾーンでEキーを押すとオーバーレイが開き、閉じるボタンまたはEscで閉じる
 */
export class BulletinBoard {
  constructor(containerId: string);

  /** ランキングデータを設定する */
  setData(data: BulletinBoardData[]): void;

  /** 掲示板を開く */
  open(onClose?: () => void): void;

  /** 掲示板を閉じる */
  close(): void;

  /** 掲示板が開いているか */
  isOpen(): boolean;
}
```

### 5. Client - ランキング受信

ランキング受信はGameScene内のonMessageリスナーで直接処理する。rankings_updateメッセージを受信すると`Map<string, RankingEntry[]>`に保存し、BulletinBoardを開く際にMapからデータを取得して表示する。

```typescript
// GameScene内でのランキング受信処理（概念）
private rankingsMap = new Map<string, RankingEntry[]>();

// onMessageリスナー内
case "rankings_update":
  this.rankingsMap.set(message.gameType, message.rankings);
  break;

// 📋ゾーンでEキーが押された時
this.bulletinBoard.setData(this.buildBulletinBoardData());
this.bulletinBoard.open();
```

## Data Models

### ScoreTable (DynamoDB)

| Attribute | Type | Description |
|-----------|------|-------------|
| gameType (PK) | String | ゲーム種別識別子 |
| sortKey (SK) | String | `{paddedScore}#{timestamp}` 形式（降順クエリ用） |
| playerName | String | プレイヤーのニックネーム |
| score | Number | スコア値 |
| timestamp | Number | Unix timestamp (ms) |

**Sort Key設計:**
- スコアを降順で取得するため、`(MAX_SCORE - score)` をゼロパディングした文字列をSort Keyのプレフィックスに使用
- 例: スコア85 → `"0000000915#1700000000000"` (MAX_SCORE=1000として)
- これにより `ScanIndexForward: true` でも高スコア順に取得可能

**保持件数制限:**
- 各gameTypeにつき上位10件のみ保持
- 新スコア保存時に11件目以降を自動削除（prune処理）

### メッセージフォーマット

**ClientMessage - submit_score:**
```json
{ "action": "submit_score", "gameType": "breakout", "score": 150 }
```

**ClientMessage - get_rankings:**
```json
{ "action": "get_rankings", "gameType": "breakout" }
```

**ServerMessage - rankings_update:**
```json
{
  "type": "rankings_update",
  "gameType": "breakout",
  "rankings": [
    { "playerName": "Player_ABC", "score": 200 },
    { "playerName": "Player_XYZ", "score": 150 },
    { "playerName": "Player_123", "score": 100 }
  ]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: メッセージシリアライゼーションのラウンドトリップ

*For any* valid submit_score, get_rankings, or rankings_update message, serializing then deserializing SHALL produce an equivalent message object.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 2: 無効メッセージの拒否

*For any* submit_score message with a non-string gameType, empty gameType, non-numeric score, or negative score, the validation function SHALL return false.

**Validates: Requirements 1.3**

### Property 3: ランキングの順序性と上限

*For any* set of score records for a given gameType, the returned rankings SHALL be sorted in descending order by score and limited to at most 10 entries.

**Validates: Requirements 2.1, 2.2, 3.3**

## Error Handling

| シナリオ | 対応 |
|---------|------|
| submit_score の gameType が不正 | メッセージを無視し、statusCode 200 を返す |
| submit_score の score が非数値/負数 | メッセージを無視し、statusCode 200 を返す |
| get_rankings の gameType が不正 | メッセージを無視し、statusCode 200 を返す |
| DynamoDB書き込み失敗 | エラーログ出力、statusCode 500 を返す |
| DynamoDB読み取り失敗 | エラーログ出力、空のランキングを返す |
| ブロードキャスト時にGoneException | 既存のbroadcast.tsの仕組みで自動クリーンアップ |
| rankings_update受信時にMapへ保存失敗 | エラーログ出力、次回受信時に再試行 |

## Testing Strategy

### Property-Based Testing

property-based testingライブラリ: **fast-check**（既存プロジェクトがTypeScript + vitestを使用しているため）

各プロパティテストは最低100イテレーション実行する。

テスト対象:
- メッセージのシリアライゼーション/デシリアライゼーション（Property 1）
- メッセージバリデーション（Property 2）
- ランキングソート・上限ロジック（Property 3）

### Unit Testing

- onMessage Lambda のハンドラ分岐テスト
- ScoreDb モジュールの個別関数テスト（DynamoDB モック使用）
- BulletinBoard クラスの表示ロジックテスト

### Integration Testing

- submit_score → DynamoDB保存 → rankings_update ブロードキャストの一連フロー
- CDKスナップショットテスト（ScoreTable定義、Lambda環境変数）
