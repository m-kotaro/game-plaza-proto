# Requirements Document

## Introduction

game-plaza-proto プラットフォーム内で外部ゲームを iframe で表示し、postMessage API を用いてプラットフォームと外部ゲーム間でデータをやりとりする仕組みを実装する。本フェーズでは、postMessage のインターフェース定義、iframe のオーバーレイ管理、ゲーム開始トリガー、モックゲーム、および結果通知までをスコープとする。シングルプレイヤーフローのみを対象とし、マルチプレイヤー対戦は将来の別 spec で対応する。

## Glossary

- **Platform**: game-plaza-proto クライアントアプリケーション（Phaser.js ベースのワールド）
- **External_Game**: iframe 内にロードされる外部ゲームページ
- **IframeOverlay**: Phaser キャンバスの上に重ねて表示される iframe 要素とそのコンテナ
- **PostMessageBridge**: Platform と External_Game 間の postMessage 通信を管理するモジュール
- **GameConfig**: 外部ゲームの URL やゲームタイプを定義する設定オブジェクト
- **InteractionZone**: ワールド内でプレイヤーがゲーム開始をトリガーできるエリア
- **MockGame**: 動作確認用のシンプルな HTML ページ（postMessage 通信のダミー実装）
- **ResultNotification**: ゲーム結果をワールド復帰時にプレイヤーに表示する通知 UI

## Requirements

### Requirement 1: postMessage インターフェース定義

**User Story:** As a developer, I want a well-defined postMessage interface between the platform and external games, so that external game developers can implement communication without ambiguity.

#### Acceptance Criteria

1. THE PostMessageBridge SHALL define a `GameStartMessage` type with fields: `type` ("game_start"), `gameType` (string), and `players` (array of objects containing `userName`, `uuid`, `isLocal`)
2. THE PostMessageBridge SHALL define a `GameResultMessage` type with fields: `type` ("game_result"), `winnerId` (string or null for draw), and optional `scores` (Record<string, number>)
3. THE PostMessageBridge SHALL define a `GameCloseMessage` type with fields: `type` ("game_close")
4. WHEN a message is received via postMessage, THE PostMessageBridge SHALL validate the message origin against an allowed origins list before processing
5. WHEN a message with an unknown `type` field is received, THE PostMessageBridge SHALL ignore the message and log a warning
6. WHEN a message fails origin validation, THE PostMessageBridge SHALL discard the message without further processing

### Requirement 2: iframe オーバーレイ表示管理

**User Story:** As a player, I want the external game to appear as a full-screen overlay on top of the game world, so that I can focus on the external game without distractions.

#### Acceptance Criteria

1. WHEN a game start is triggered, THE IframeOverlay SHALL create an iframe element inside the `game-container` div, positioned as a full-screen overlay above the Phaser canvas
2. WHEN the IframeOverlay is displayed, THE IframeOverlay SHALL set the iframe `src` attribute to the URL specified in GameConfig for the requested game type
3. WHEN the IframeOverlay is displayed, THE Platform SHALL pause player input handling for the Phaser world
4. WHEN a game_close or game_result message is received, THE IframeOverlay SHALL remove the iframe element from the DOM
5. WHEN the IframeOverlay is removed, THE Platform SHALL resume player input handling for the Phaser world
6. THE IframeOverlay SHALL include a close button allowing the player to manually dismiss the overlay at any time

### Requirement 3: ゲーム開始トリガー

**User Story:** As a player, I want to start a game by interacting with a specific area in the game world, so that game participation feels natural within the world.

#### Acceptance Criteria

1. THE Platform SHALL render an InteractionZone at a configurable position within the game world with a visual indicator
2. WHEN a player's avatar overlaps with the InteractionZone, THE Platform SHALL display a prompt UI indicating that a game can be started
3. WHEN a player activates the prompt (keyboard key or click), THE Platform SHALL trigger the game start flow by sending a GameStartMessage to the iframe via postMessage
4. THE GameStartMessage SHALL include the local player's userName and sessionId

### Requirement 4: postMessage 通信フロー

**User Story:** As a developer, I want a reliable communication flow between the platform and external games, so that game state is properly synchronized.

#### Acceptance Criteria

1. WHEN the iframe content has loaded (iframe onload event), THE PostMessageBridge SHALL send the GameStartMessage to the iframe's contentWindow using postMessage with the target origin
2. WHEN the External_Game sends a GameResultMessage, THE PostMessageBridge SHALL parse the result and pass it to the Platform for display
3. WHEN the External_Game sends a GameCloseMessage, THE PostMessageBridge SHALL trigger the IframeOverlay removal
4. IF the iframe fails to load within 10 seconds, THEN THE PostMessageBridge SHALL trigger an error state and close the overlay with an error notification

### Requirement 5: ゲーム設定管理

**User Story:** As a developer, I want external game URLs to be configurable, so that new games can be added without code changes.

#### Acceptance Criteria

1. THE GameConfig SHALL store a mapping of game type identifiers to their corresponding URLs
2. THE GameConfig SHALL store a list of allowed origins for postMessage validation
3. WHEN a game type is requested that does not exist in GameConfig, THE Platform SHALL display an error notification and not open the iframe

### Requirement 6: モックゲーム

**User Story:** As a developer, I want a mock game page for testing, so that I can verify the postMessage communication flow without needing a real external game.

#### Acceptance Criteria

1. THE MockGame SHALL be a static HTML file served from `packages/client/public/` directory
2. WHEN the MockGame receives a GameStartMessage via postMessage, THE MockGame SHALL display the received player information
3. WHEN a user clicks a "Finish Game" button in the MockGame, THE MockGame SHALL send a GameResultMessage back to the Platform via postMessage
4. WHEN a user clicks a "Close" button in the MockGame, THE MockGame SHALL send a GameCloseMessage back to the Platform via postMessage

### Requirement 7: 結果通知

**User Story:** As a player, I want to see the game result when returning to the world, so that I know the outcome of the game I just played.

#### Acceptance Criteria

1. WHEN a GameResultMessage is received and the IframeOverlay is closed, THE ResultNotification SHALL display the game result (winner or draw) as a toast-style notification
2. THE ResultNotification SHALL automatically dismiss after 5 seconds
3. THE ResultNotification SHALL not block player input in the game world
