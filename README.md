# Game Plaza Proto

2Dマルチプレイヤーソーシャルスペース。Phaser.jsで描画されたワールド内でアバターを操作し、各種ミニゲームをプレイしてスコアを競う。

## アーキテクチャ概要

- **フロントエンド**: Phaser.js（2Dワールド）+ Vite
- **バックエンド**: AWS Lambda + API Gateway（WebSocket）
- **データストア**: DynamoDB（プレイヤーセッション、スコア）
- **ホスティング**: CloudFront + S3
- **IaC**: AWS CDK（TypeScript）
- **CI/CD**: GitHub Actions + OIDC認証

## クイックスタート

```bash
# 依存インストール
npm ci

# ローカル開発サーバー起動（client + server）
npm run dev
```

クライアント（Vite dev server）とローカルWebSocketサーバーが同時に起動します。

## プロジェクト構成

```
packages/
├── shared/    # クライアント・サーバー共通の型定義、バリデーション
├── server/    # Lambda ハンドラ（WebSocket onConnect/onMessage/onDisconnect）
├── client/    # Phaser.js フロントエンド（Vite）
└── cdk/       # AWS CDK インフラ定義
```

npm workspaces でモノレポ管理。ビルド順序: shared → server / client / cdk

## ゲーム設定（game-config.json）

`packages/client/game-config.json` で利用可能なゲームを定義:

```json
{
  "games": {
    "janken": {
      "url": "https://example.com/game/",
      "origin": "https://example.com",
      "metaUrl": "https://example.com/game/meta.json"
    }
  },
  "allowedOrigins": ["https://example.com"],
  "loadTimeoutMs": 10000
}
```

各ゲームは iframe で読み込まれ、postMessage でスコアを送信します。

## 新しいゲームの追加

1. ゲーム側に `meta.json` を用意する（タイトル、説明、スコア設定）
2. `packages/client/game-config.json` の `games` にエントリ追加
3. 外部オリジンの場合は `allowedOrigins` にも追加
4. ワールドマップ上のゲームゾーン配置を更新

## デプロイ

### dev環境

`develop` ブランチにpushすると自動デプロイ:

```bash
git push origin develop
```

### prod環境

`main` ブランチにpushすると手動承認後にデプロイ:

```bash
git push origin main
# → GitHub Environment "prod" の承認者がApprove後にデプロイ実行
```

### 手動デプロイ

```bash
cd packages/cdk
npx cdk deploy -c env=dev   # dev環境
npx cdk deploy -c env=prod  # prod環境
```

## カスタムドメイン設定（prod環境）

prod環境では以下のカスタムドメインが設定されます:
- フロントエンド: `https://game-plaza-proto.m-kotaro.net`
- WebSocket: `wss://ws.game-plaza-proto.m-kotaro.net`

### 初回セットアップ手順

1. **prodスタックをデプロイ**
   ```bash
   cd packages/cdk
   npx cdk deploy -c env=prod
   ```
   証明書のDNS検証が完了するまでデプロイは待機状態になります。

2. **NSレコードを確認**
   デプロイ出力（またはCloudFormationコンソール）から `HostedZoneNameServers` の値を確認:
   ```
   GamePlatform-prod.HostedZoneNameServers = ns-xxx.awsdns-xx.com,ns-xxx.awsdns-xx.net,...
   ```

3. **親ホストゾーンにNSレコードを追加（手動）**
   別アカウントの `m-kotaro.net` ホストゾーンに以下を追加:
   - レコード名: `game-plaza-proto.m-kotaro.net`
   - タイプ: NS
   - 値: 手順2で確認した4つのネームサーバー

4. **証明書検証の完了を待つ**
   NSレコード追加後、ACM証明書のDNS検証が自動的に完了します（通常数分〜30分）。
   デプロイが完了すれば設定完了です。

### dev環境

dev環境ではカスタムドメインは使用しません。デフォルトのCloudFrontドメインとAPI Gatewayエンドポイントを使用します。
