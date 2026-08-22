# Implementation Plan: CI/CD Pipeline

## Overview

GitHub Actionsを用いたCI/CDパイプラインを構築する。CIワークフロー（PRテスト・ビルド検証）、CDワークフロー（dev/prod段階的デプロイ）、CDK app.tsの環境分離対応、OIDC認証セットアップ手順のドキュメント作成を行う。

## Tasks

- [x] 1. CDK app.tsの環境分離対応
  - [x] 1.1 `packages/cdk/src/bin/app.ts`を修正し、contextパラメータ`env`でスタック名を切り替える
    - `app.node.tryGetContext("env")` でdev/prodを取得（デフォルト: "dev"）
    - スタック名を `GamePlatform-${envName}` に変更
    - descriptionに環境名を含める
    - `env`プロパティに`CDK_DEFAULT_ACCOUNT`と`CDK_DEFAULT_REGION`（デフォルトap-northeast-1）を設定
    - _Requirements: 5.1_

  - [ ]* 1.2 CDK環境分離のスナップショットテストを作成
    - `packages/cdk`配下にテストファイルを作成
    - dev/prodそれぞれのcontextでスタックを生成し、スタック名が正しく設定されることを検証
    - _Requirements: 5.1_

- [x] 2. CIワークフローの作成
  - [x] 2.1 `.github/workflows/ci.yml`を作成し、PRテスト・ビルド検証を設定
    - トリガー: `pull_request` targeting `main` branch
    - `ubuntu-latest` ランナーを使用
    - `actions/setup-node@v4` でNode.js 20を指定、`cache: 'npm'`でキャッシュ有効化
    - `npm ci` で依存関係インストール
    - `npm run build` でビルド実行
    - `npm run test` でテスト実行
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.2, 5.4, 6.1, 6.4_

- [x] 3. CDワークフローの作成
  - [x] 3.1 `.github/workflows/cd.yml`を作成し、dev環境への自動デプロイジョブを設定
    - トリガー: `push` to `main` branch
    - permissions: `id-token: write`, `contents: read`
    - `environment: dev` を設定
    - `ubuntu-latest` ランナーを使用
    - `actions/setup-node@v4` でNode.js 20を指定、`cache: 'npm'`でキャッシュ有効化
    - `npm ci` で依存関係インストール
    - `npm run build` で環境変数 `VITE_WEBSOCKET_URL: ${{ vars.VITE_WEBSOCKET_URL }}` を指定してビルド
    - `aws-actions/configure-aws-credentials@v4` でOIDC認証（`role-to-assume: ${{ secrets.AWS_ROLE_ARN }}`、region: ap-northeast-1）
    - `npx cdk deploy --require-approval never -c env=dev` を `working-directory: packages/cdk` で実行
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 5.3, 5.5, 6.2, 6.3, 6.5_

  - [x] 3.2 同ファイルにprod環境デプロイジョブを追加
    - `needs: deploy-dev` で依存関係を設定
    - `environment: prod` でGitHub Environmentsの手動承認を利用
    - dev環境ジョブと同様のステップ構成（checkout, setup-node, npm ci, build, aws credentials, cdk deploy）
    - `npm run build` で環境変数 `VITE_WEBSOCKET_URL: ${{ vars.VITE_WEBSOCKET_URL }}` を指定（prod用）
    - `npx cdk deploy --require-approval never -c env=prod` を実行
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 6.2, 6.3, 6.5_

- [x] 4. チェックポイント - ワークフロー構文検証
  - actionlintまたはYAML構文の目視確認により、CI/CDワークフローファイルに構文エラーがないことを確認する。すべてのテストが通ることを確認し、問題があればユーザーに質問する。

- [x] 5. OIDC認証セットアップ手順ドキュメントの作成
  - [x] 5.1 `.kiro/specs/cicd-pipeline/oidc-setup-guide.md`を作成し、OIDC認証の手動セットアップ手順を記述
    - AWSコンソールまたはCLIでのGitHub OIDCプロバイダー作成手順
    - IAMロール（`github-actions-deploy`）の作成手順と信頼ポリシーの内容
    - 信頼ポリシーでリポジトリ（`m-kotaro/game-plaza-proto`）とmainブランチのみに制限する条件
    - CDKデプロイに必要なPermissions Policyの内容
    - GitHub リポジトリのEnvironments設定手順（dev/prod）
    - 各Environmentに設定するSecrets（`AWS_ROLE_ARN`）とVariables（`VITE_WEBSOCKET_URL`）の説明
    - prod環境のRequired reviewers保護ルール設定手順
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. 最終チェックポイント - 全体の整合性確認
  - CI/CDワークフローとCDK app.tsの環境分離が正しく連携することを確認する。すべてのテストが通ることを確認し、問題があればユーザーに質問する。

## Notes

- タスク `*` マーク付きはオプションであり、MVPではスキップ可能
- OIDC IAMロールやGitHub Environmentsの実際のAWSリソース作成・GitHubリポジトリ設定はこのタスクに含まない（手順ドキュメントのみ）
- CDKスナップショットテストは既存のVitestセットアップを活用する
- Property-Based Testingは本機能（IaCワークフロー設定）には適用しない
- GitHub-hosted runnersを使用し、self-hosted runnersのセットアップは不要

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1"] },
    { "id": 2, "tasks": ["3.2", "5.1"] },
    { "id": 3, "tasks": [] }
  ]
}
```
