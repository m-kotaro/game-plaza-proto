# OIDC認証セットアップガイド

GitHub ActionsからAWSへ安全に認証するためのOIDC（OpenID Connect）セットアップ手順。  
長期間有効なAWSアクセスキーを使わず、一時的な認証情報で安全にCDKデプロイを実行する。

## 前提条件

- AWS CLIがインストール・設定済みであること
- AWSアカウントに管理者権限でアクセスできること
- GitHubリポジトリ `m-kotaro/game-plaza-proto` のAdmin権限を持つこと

## 1. AWS OIDC プロバイダーの作成

GitHub Actions用のOIDCプロバイダーをAWSに登録する。

```bash
# GitHub OIDCプロバイダーのサムプリント取得（固定値）
# GitHub Actions OIDC thumbprint
THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"

# OIDCプロバイダーの作成
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list "${THUMBPRINT}" \
  --region ap-northeast-1
```

> **注意**: OIDCプロバイダーはAWSアカウントにつき1つだけ作成する（既に存在する場合はスキップ）。  
> 既存のプロバイダーを確認するには:  
> ```bash
> aws iam list-open-id-connect-providers
> ```

作成後、プロバイダーのARNを確認する:

```bash
aws iam list-open-id-connect-providers --query "OpenIDConnectProviderList[?contains(Arn, 'token.actions.githubusercontent.com')].Arn" --output text
```

出力例: `arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com`

## 2. IAMロールの作成

### 2.1 信頼ポリシーの作成

`trust-policy.json` ファイルを作成する。`<ACCOUNT_ID>` は自分のAWSアカウントIDに置き換えること。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:m-kotaro/game-plaza-proto:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

**信頼ポリシーのポイント**:

| 条件 | 説明 |
|------|------|
| `aud: sts.amazonaws.com` | AWS STS宛のトークンのみ許可 |
| `sub: repo:m-kotaro/game-plaza-proto:ref:refs/heads/main` | このリポジトリのmainブランチからのリクエストのみ許可 |

> **セキュリティ**: `sub` 条件によりフォークやブランチからの不正なAssumeRoleを防止する。  
> PRイベント（`pull_request`トリガー）ではsubが異なるため、CIワークフローからは認証不可。

### 2.2 IAMロールの作成

```bash
aws iam create-role \
  --role-name github-actions-deploy \
  --assume-role-policy-document file://trust-policy.json \
  --description "GitHub Actions OIDC role for CDK deployment - game-plaza-proto"
```

### 2.3 Permissions Policyのアタッチ

`permissions-policy.json` ファイルを作成する:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CDKDeployPermissions",
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "iam:*",
        "cloudfront:*",
        "events:*",
        "logs:*",
        "ssm:GetParameter",
        "sts:AssumeRole"
      ],
      "Resource": "*"
    }
  ]
}
```

> **注意**: 個人プロジェクトのためワイルドカード権限を使用している。  
> 本番プロジェクトでは以下を検討すること:
> - リソースARNレベルでの制限
> - `iam:*` を `iam:PassRole` 等の必要最小限に絞る
> - CDKが自動作成するcfn-exec roleへのAssumeRoleのみに限定

ポリシーを作成しロールにアタッチする:

```bash
# インラインポリシーとしてアタッチ
aws iam put-role-policy \
  --role-name github-actions-deploy \
  --policy-name CDKDeployPolicy \
  --policy-document file://permissions-policy.json
```

### 2.4 ロールARNの確認

```bash
aws iam get-role --role-name github-actions-deploy --query "Role.Arn" --output text
```

出力例: `arn:aws:iam::123456789012:role/github-actions-deploy`

このARNを次のステップでGitHub Secretsに設定する。

## 3. GitHub Environments の設定

リポジトリの Settings > Environments から設定する。

### 3.1 dev 環境の作成

1. GitHub リポジトリ `m-kotaro/game-plaza-proto` を開く
2. **Settings** > **Environments** に移動
3. **New environment** をクリック
4. 環境名に `dev` を入力し **Configure environment** をクリック
5. Protection rules はデフォルトのまま（設定不要）

### 3.2 prod 環境の作成

1. **Settings** > **Environments** に移動
2. **New environment** をクリック
3. 環境名に `prod` を入力し **Configure environment** をクリック
4. Protection rulesを設定する（次セクション参照）

## 4. prod環境の保護ルール設定

prod環境にデプロイする前に手動承認を要求する設定を行う。

### 4.1 Required reviewers の設定

1. prod環境の設定画面で **Deployment protection rules** セクションを開く
2. **Required reviewers** にチェックを入れる
3. 承認者として自分のGitHubアカウントを追加する
4. **Save protection rules** をクリック

### 4.2 Wait timer の設定（オプション）

デプロイ前の待機時間が必要な場合:

1. **Wait timer** にチェックを入れる
2. 待機時間（分単位）を設定する（通常は `0` でOK）

> **動作**: CDワークフローの `deploy-prod` ジョブが `environment: prod` を指定しているため、  
> ジョブ実行時にGitHubがRequired reviewersに承認リクエストを送信する。  
> 承認されるまでジョブは待機状態になる。72時間以内に承認されない場合は自動キャンセルされる。

## 5. Secrets と Variables の設定

各環境に以下の値を設定する。

### 5.1 Secrets の設定

| 環境 | Secret名 | 値 | 説明 |
|------|----------|-----|------|
| `dev` | `AWS_ROLE_ARN` | `arn:aws:iam::<ACCOUNT_ID>:role/github-actions-deploy` | OIDC認証で引き受けるIAMロールのARN |
| `prod` | `AWS_ROLE_ARN` | `arn:aws:iam::<ACCOUNT_ID>:role/github-actions-deploy` | 同上（同一アカウントなら同じ値） |

**設定手順**:

1. **Settings** > **Environments** > 対象環境を選択
2. **Environment secrets** セクションの **Add secret** をクリック
3. Name: `AWS_ROLE_ARN`
4. Value: 手順2.4で確認したロールARNを貼り付け
5. **Add secret** をクリック

> **注意**: dev/prodで異なるAWSアカウントを使用する場合は、各アカウントにOIDCプロバイダーとIAMロールを作成し、それぞれのARNを設定する。

### 5.2 Variables の設定

| 環境 | Variable名 | 値の例 | 説明 |
|------|-----------|--------|------|
| `dev` | `VITE_WEBSOCKET_URL` | `wss://xxx.execute-api.ap-northeast-1.amazonaws.com/prod` | dev環境のWebSocket API エンドポイント |
| `prod` | `VITE_WEBSOCKET_URL` | `wss://yyy.execute-api.ap-northeast-1.amazonaws.com/prod` | prod環境のWebSocket API エンドポイント |

**設定手順**:

1. **Settings** > **Environments** > 対象環境を選択
2. **Environment variables** セクションの **Add variable** をクリック
3. Name: `VITE_WEBSOCKET_URL`
4. Value: 対象環境のWebSocket APIエンドポイントURL（CDKデプロイ後に出力されるURLを設定）
5. **Add variable** をクリック

> **注意**: `VITE_WEBSOCKET_URL` はViteのビルド時に静的に埋め込まれる環境変数。  
> CDKで初回デプロイ後にAPI GatewayのエンドポイントURLが生成されるため、初回は仮の値を設定し、  
> デプロイ後に実際のURLで更新する。

## 6. セットアップの検証

すべての設定完了後、以下の手順で動作を確認する。

### 6.1 OIDC認証の確認

1. mainブランチに軽微な変更をpushする
2. GitHub Actions の CD ワークフローが起動することを確認
3. `configure-aws-credentials` ステップが成功することを確認
4. IAMロールのAssumeRoleが正常に行われたことをログで確認

### 6.2 dev環境デプロイの確認

1. CDワークフローの `deploy-dev` ジョブが正常完了することを確認
2. AWSコンソールでCloudFormation スタック `GamePlatform-dev` が作成/更新されていることを確認

### 6.3 prod環境の承認フローの確認

1. `deploy-dev` 成功後、`deploy-prod` ジョブが「Waiting for approval」状態になることを確認
2. 承認リクエストが届くことを確認
3. 承認後、prod環境へのデプロイが実行されることを確認

## トラブルシューティング

### OIDC認証が失敗する場合

```
Error: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

- 信頼ポリシーの `sub` 条件が正しいか確認（リポジトリ名、ブランチ名）
- OIDCプロバイダーの `client-id-list` に `sts.amazonaws.com` が含まれているか確認
- IAMロールのARNがGitHub SecretのAWS_ROLE_ARNと一致しているか確認

### CDKデプロイが権限エラーになる場合

```
User: arn:aws:sts::123456789012:assumed-role/github-actions-deploy/... is not authorized to perform: ...
```

- Permissions Policyに必要なアクションが含まれているか確認
- CDKのbootstrap（`cdk bootstrap`）が対象アカウント・リージョンで実行済みか確認

### CDK Bootstrapの実行

初回デプロイ前に、CDK Bootstrapが必要:

```bash
# ローカル環境から実行（AWS認証済みの状態で）
cd packages/cdk
npx cdk bootstrap aws://<ACCOUNT_ID>/ap-northeast-1
```
