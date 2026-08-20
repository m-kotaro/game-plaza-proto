# game-plaza-proto

## カスタムドメイン設定（prod環境）

### 概要

prod環境では以下のカスタムドメインが設定されます：
- フロントエンド: `https://game-plaza-proto.m-kotaro.net`
- WebSocket: `wss://ws.game-plaza-proto.m-kotaro.net`

### 初回セットアップ手順

1. **prodスタックをデプロイ**
   ```bash
   cd packages/cdk
   npx cdk deploy -c env=prod
   ```
   ※証明書のDNS検証が完了するまでデプロイは待機状態になります。

2. **NSレコードを確認**
   デプロイ出力（またはCloudFormationコンソール）から `HostedZoneNameServers` の値を確認します。
   ```
   GamePlatform-prod.HostedZoneNameServers = ns-xxx.awsdns-xx.com,ns-xxx.awsdns-xx.net,...
   ```

3. **親ホストゾーンにNSレコードを追加（手動）**
   別アカウントの `m-kotaro.net` ホストゾーンに以下を追加：
   - レコード名: `game-plaza-proto.m-kotaro.net`
   - タイプ: NS
   - 値: 手順2で確認した4つのネームサーバー

4. **証明書検証の完了を待つ**
   NSレコード追加後、ACM証明書のDNS検証が自動的に完了します（通常数分〜30分）。
   デプロイが完了すれば設定完了です。

### dev環境
dev環境ではカスタムドメインは使用しません。デフォルトのCloudFrontドメインとAPI Gatewayエンドポイントを使用します。
