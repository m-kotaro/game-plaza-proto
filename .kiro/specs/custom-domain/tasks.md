# Implementation Plan: Custom Domain

## Overview

既存のGamePlatformStackにカスタムドメイン機能を追加する。CDK contextの`env=prod`時のみRoute 53ホストゾーン、ACM証明書、CloudFront/API Gatewayカスタムドメイン、DNSレコードを作成する。実装はTypeScript（CDK）で行う。

## Tasks

- [x] 1. スタックProps拡張と環境分岐の導入
  - [x] 1.1 GamePlatformStackPropsインターフェースを定義し、envNameを追加する
    - `GamePlatformStackProps extends cdk.StackProps` に `envName: string` を追加
    - `app.ts` から `envName` を props 経由で渡すように変更
    - スタック内で `const isProd = props.envName === "prod"` の分岐を追加
    - _Requirements: 1.1, 1.2_

- [x] 2. Route 53ホストゾーンとACM証明書の作成
  - [x] 2.1 サブドメインホストゾーンとACM証明書リソースを追加する
    - `isProd`条件下で`route53.HostedZone`を作成（zoneName: `game-plaza-proto.m-kotaro.net`）
    - `acm.DnsValidatedCertificate`で証明書を発行（domainName + SANs、region: us-east-1）
    - NSレコード値をCfnOutputに出力する
    - _Requirements: 1.1, 1.3, 2.1, 2.2_

- [x] 3. CloudFrontカスタムドメイン設定
  - [x] 3.1 既存のCloudFront Distributionにカスタムドメインと証明書を設定する
    - `isProd`時に`domainNames`と`certificate`をDistributionプロパティに追加
    - Route 53にAレコード（ALIAS → CloudFront）を作成
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. API Gateway WebSocketカスタムドメイン設定
  - [x] 4.1 WebSocket APIにカスタムドメインとAPIマッピングを設定する
    - `CfnDomainName`で`ws.game-plaza-proto.m-kotaro.net`を作成
    - `CfnApiMapping`でWebSocket APIとステージをマッピング
    - Route 53にAレコード（ALIAS → API Gateway Domain）を作成
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. CfnOutput追加とWebSocket URLの条件分岐
  - [x] 5.1 カスタムドメインURLの出力とクライアント向けWebSocket URLの条件分岐を追加する
    - prod時のフロントエンドURL、WebSocket URLをCfnOutputに追加
    - 既存のWebSocketApiUrl出力をprod時にカスタムドメインURLに切り替える
    - _Requirements: 5.1_

- [x] 6. Checkpoint - ビルド確認
  - `npx tsc --noEmit` でコンパイルエラーがないことを確認。問題があればユーザーに質問。

- [ ] 7. CDK Assertionテストの追加
  - [ ]* 7.1 prod環境でカスタムドメインリソースが作成されることをテストする
    - `env=prod`でスタックをsynth
    - HostedZone、Certificate、DomainName、ARecordリソースの存在を検証
    - _Requirements: 1.1, 2.1, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

  - [ ]* 7.2 dev環境でカスタムドメインリソースが作成されないことをテストする
    - `env=dev`でスタックをsynth
    - HostedZone、Certificate、DomainNameリソースが存在しないことを検証
    - _Requirements: 1.2_

- [x] 8. ドキュメント作成
  - [x] 8.1 READMEにカスタムドメイン設定手順を追記する
    - デプロイ手順（`cdk deploy -c env=prod`）
    - NSレコード出力の確認方法
    - 親ホストゾーン（m-kotaro.net）へのNSレコード手動追加手順
    - 証明書検証完了の待ち方
    - _Requirements: 5.2_

- [x] 9. Final checkpoint - 全テスト通過確認
  - 全テストが通過することを確認。問題があればユーザーに質問。

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- CDKはTypeScriptで実装（既存プロジェクトに合わせる）
- `DnsValidatedCertificate`はdeprecatedだがcross-region証明書作成に必要
- 初回デプロイ時は証明書検証でブロックされるため、NSレコードの手動設定が必要
- dev環境は既存のデフォルトドメインをそのまま使用し変更なし

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "4.1"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["7.1", "7.2", "8.1"] }
  ]
}
```
