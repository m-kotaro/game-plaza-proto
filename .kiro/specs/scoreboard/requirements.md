# Requirements Document

## Introduction

ゲームプラザ内の各ゲームのハイスコアを保存・ランキング表示するスコアボード機能。ゲーム終了時にスコアをDynamoDBに保存し、掲示板エリアでEキーを押すとランキングをオーバーレイ表示する。

## Glossary

- **ScoreboardSystem**: スコアの保存・取得・ランキング管理を行うサーバーサイドシステム
- **ScoreTable**: DynamoDBのスコア保存テーブル（PK: gameType, SK: score#timestamp）
- **BulletinBoard**: 掲示板エリア（📋ゾーン）でEキーを押すと表示されるDOMオーバーレイ（全ゲームのランキング一覧）
- **RankingEntry**: ランキング1件分のデータ（playerName, score）
- **ClientMessage**: クライアントからサーバーへ送信するWebSocketメッセージ
- **ServerMessage**: サーバーからクライアントへ送信するWebSocketメッセージ
- **OnMessageLambda**: WebSocketメッセージを処理する既存のLambda関数
- **GameType**: ゲーム種別を示す文字列識別子

## Requirements

### Requirement 1: スコア送信

**User Story:** ゲームプレイヤーとして、ゲーム終了時にスコアをサーバーに送信したい。ランキングに自分のスコアを反映させるため。

#### Acceptance Criteria

1. WHEN a game ends and a GameResultMessage is received, THE ScoreboardSystem SHALL accept a submit_score ClientMessage containing gameType and score
2. WHEN a submit_score message is received with a valid gameType and numeric score, THE OnMessageLambda SHALL save the score to the ScoreTable with the player's nickname and current timestamp
3. IF a submit_score message contains an invalid gameType or non-numeric score, THEN THE OnMessageLambda SHALL ignore the message and return a success response without saving
4. WHEN a score is successfully saved, THE ScoreboardSystem SHALL associate the score with the player's session nickname generated at connection time

### Requirement 2: ランキング取得

**User Story:** ゲームプレイヤーとして、各ゲームのランキングを取得したい。自分や他のプレイヤーのスコア順位を確認するため。

#### Acceptance Criteria

1. WHEN a get_rankings ClientMessage is received with a valid gameType, THE OnMessageLambda SHALL query the ScoreTable and return the top 10 scores in descending order
2. WHEN rankings are retrieved, THE ScoreboardSystem SHALL return a rankings_update ServerMessage containing gameType and an array of RankingEntry objects ordered by score descending
3. WHEN a score is successfully saved, THE ScoreboardSystem SHALL broadcast a rankings_update ServerMessage with the updated ranking to all connected players

### Requirement 3: スコアデータの永続化

**User Story:** システム管理者として、スコアデータをDynamoDBに永続化したい。サーバー再起動やプレイヤー切断後もランキングを維持するため。

#### Acceptance Criteria

1. THE ScoreTable SHALL use gameType as the partition key and a composite sort key of score#timestamp for efficient descending-order queries
2. THE ScoreTable SHALL store playerName, score, and timestamp as attributes for each score record
3. WHILE scores are stored, THE ScoreTable SHALL retain only the top 10 records per gameType to limit storage

### Requirement 4: 掲示板表示（ランキング）

**User Story:** ゲームプレイヤーとして、掲示板エリアでEキーを押してランキングを確認したい。各ゲームのハイスコアをオーバーレイで一覧表示するため。

#### Acceptance Criteria

1. EACH game zone SHALL have a bulletin board zone (📋) positioned to the left of the game zone
2. WHEN a player is within the bulletin board zone and presses the E key, THE BulletinBoard overlay SHALL open displaying all game rankings
3. WHEN a rankings_update ServerMessage is received, THE client SHALL store the updated rankings data in a Map for display on demand
4. WHEN the BulletinBoard overlay is opened, THE BulletinBoard SHALL display the current rankings data including game title and top scores in "N位: PlayerName Xpts" format
5. WHEN the client initially connects and receives rankings data, THE client SHALL store it so it is available when the BulletinBoard is opened

### Requirement 5: 掲示板表示（ゲーム説明）

**User Story:** ゲームプレイヤーとして、掲示板でゲームの説明を見たい。ゲーム内容を事前に把握するため。

#### Acceptance Criteria

1. THE BulletinBoard overlay SHALL display the game description (from meta.json) as a header or subtitle for each game's ranking card
2. THE game description SHALL be fetched from the meta.json configured in game-config.json for each game type

### Requirement 6: インフラストラクチャ（CDK）

**User Story:** 開発者として、スコアテーブルをCDKで定義したい。既存のGamePlatformStackに統合してインフラを一元管理するため。

#### Acceptance Criteria

1. THE GamePlatformStack SHALL define a new DynamoDB table for scores with PAY_PER_REQUEST billing mode
2. THE GamePlatformStack SHALL grant the OnMessageLambda read and write permissions to the ScoreTable
3. THE GamePlatformStack SHALL pass the ScoreTable name as an environment variable to the OnMessageLambda

### Requirement 7: メッセージ型定義

**User Story:** 開発者として、スコア関連のメッセージ型をsharedパッケージに定義したい。クライアントとサーバー間の型安全性を確保するため。

#### Acceptance Criteria

1. THE ClientMessage type SHALL include a submit_score variant with gameType (string) and score (number) fields
2. THE ClientMessage type SHALL include a get_rankings variant with gameType (string) field
3. THE ServerMessage type SHALL include a rankings_update variant with gameType (string) and rankings (Array of RankingEntry) fields
4. THE RankingEntry type SHALL contain playerName (string) and score (number) fields
