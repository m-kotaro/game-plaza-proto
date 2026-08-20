# Requirements Document

## Introduction

game-plaza-protoプロジェクトにカスタムドメイン（`game-plaza-proto.m-kotaro.net`）を設定する。フロントエンド配信（CloudFront）とWebSocket API（API Gateway）にそれぞれカスタムドメインを割り当て、Route 53ホストゾーンとACM証明書をCDKで管理する。カスタムドメインはprod環境のみに適用し、dev環境ではデフォルトドメインを使用する。

## Glossary

- **GamePlatformStack**: 既存のCDKスタック。DynamoDB、Lambda、API Gateway WebSocket、CloudFront、S3を含むメインスタック
- **SubdomainHostedZone**: `game-plaza-proto.m-kotaro.net` のRoute 53ホストゾーン
- **ACM_Certificate**: AWS Certificate Managerで発行するSSL/TLS証明書（DNS検証）
- **CloudFront_Distribution**: 既存のCloudFrontディストリビューション（フロントエンド配信用）
- **WebSocket_API**: 既存のAPI Gateway WebSocket API
- **ParentHostedZone**: 親ドメイン `m-kotaro.net` のホストゾーン（別AWSアカウントで管理）

## Requirements

### Requirement 1: サブドメインホストゾーンの作成

**User Story:** As a システム管理者, I want サブドメインのRoute 53ホストゾーンをCDKで管理する, so that ドメインのDNSレコードをインフラコードとして管理できる。

#### Acceptance Criteria

1. WHEN `env=prod` contextでCDKデプロイを実行した場合, THE GamePlatformStack SHALL `game-plaza-proto.m-kotaro.net` のRoute 53ホストゾーンを作成する
2. WHEN `env=dev` contextでCDKデプロイを実行した場合, THE GamePlatformStack SHALL カスタムドメイン関連リソースを作成しない
3. WHEN ホストゾーンが作成された場合, THE GamePlatformStack SHALL NSレコードの値をCfnOutputとして出力する

### Requirement 2: ACM証明書の発行

**User Story:** As a システム管理者, I want ACM証明書をCDKで自動発行する, so that HTTPS/WSSでの安全な通信を実現できる。

#### Acceptance Criteria

1. WHEN `env=prod` contextでCDKデプロイを実行した場合, THE GamePlatformStack SHALL `game-plaza-proto.m-kotaro.net` と `*.game-plaza-proto.m-kotaro.net` をカバーするACM証明書を発行する
2. WHEN ACM証明書を発行する場合, THE GamePlatformStack SHALL DNS検証を使用し、SubdomainHostedZoneに検証レコードを自動作成する

### Requirement 3: CloudFrontカスタムドメイン設定

**User Story:** As a ユーザー, I want `game-plaza-proto.m-kotaro.net` でフロントエンドにアクセスする, so that 覚えやすいドメインでゲームを利用できる。

#### Acceptance Criteria

1. WHEN `env=prod` contextでCDKデプロイを実行した場合, THE CloudFront_Distribution SHALL `game-plaza-proto.m-kotaro.net` を代替ドメイン名（CNAME）として設定する
2. WHEN `env=prod` contextでCDKデプロイを実行した場合, THE CloudFront_Distribution SHALL ACM_Certificateを使用してHTTPS通信を提供する
3. WHEN `env=prod` contextでCDKデプロイを実行した場合, THE GamePlatformStack SHALL `game-plaza-proto.m-kotaro.net` のAレコード（ALIAS）をCloudFrontディストリビューションに向けて作成する

### Requirement 4: WebSocketカスタムドメイン設定

**User Story:** As a ユーザー, I want `ws.game-plaza-proto.m-kotaro.net` でWebSocket接続する, so that 統一されたドメイン体系でリアルタイム通信を利用できる。

#### Acceptance Criteria

1. WHEN `env=prod` contextでCDKデプロイを実行した場合, THE WebSocket_API SHALL `ws.game-plaza-proto.m-kotaro.net` をカスタムドメインとして設定する
2. WHEN `env=prod` contextでCDKデプロイを実行した場合, THE WebSocket_API SHALL ACM_Certificateを使用してWSS通信を提供する
3. WHEN `env=prod` contextでCDKデプロイを実行した場合, THE GamePlatformStack SHALL `ws.game-plaza-proto.m-kotaro.net` のAレコード（ALIAS）をAPI Gatewayカスタムドメインに向けて作成する

### Requirement 5: 親ホストゾーンへのNS委譲手順

**User Story:** As a システム管理者, I want CDKデプロイ後にNSレコード設定手順を確認できる, so that 別アカウントの親ホストゾーンへの委譲設定を正確に実施できる。

#### Acceptance Criteria

1. WHEN CDKデプロイが完了した場合, THE GamePlatformStack SHALL サブドメインホストゾーンのNSレコード値をスタック出力に含める
2. WHEN CDKデプロイが完了した場合, THE GamePlatformStack SHALL 親ホストゾーンへのNSレコード追加手順をREADMEに記載する
