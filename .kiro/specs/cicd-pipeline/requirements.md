# Requirements Document

## Introduction

GitHub Actionsを利用したCI/CDパイプラインの構築。モノレポ構成のプロジェクト（packages/shared, packages/server, packages/client, packages/cdk）に対して、PR時のテスト・ビルド検証（CI）と、mainブランチマージ時のdev/prod環境への段階的デプロイ（CD）を実現する。AWS認証にはGitHub OIDCを採用し、シークレットキー管理を不要にする。個人プロジェクトのためコスト最優先の設計とする。

## Glossary

- **CI_Workflow**: PRイベント時にテスト実行とビルド検証を行うGitHub Actionsワークフロー
- **CD_Workflow**: mainブランチへのマージ時にdev環境への自動デプロイと、手動承認を経たprod環境へのデプロイを行うGitHub Actionsワークフロー
- **OIDC_Provider**: GitHub ActionsがAWSへ一時的な認証情報を取得するためのOpenID Connect IDプロバイダー
- **IAM_Role**: GitHub OIDCプロバイダーを信頼するAWS IAMロール。デプロイに必要な権限を持つ
- **CDK_Stack**: AWS CDKで定義されたインフラストラクチャスタック（packages/cdk/に定義済み）
- **Dev_Environment**: 開発用のAWS環境。mainマージ時に自動デプロイされる
- **Prod_Environment**: 本番用のAWS環境。手動承認後にデプロイされる
- **Monorepo**: packages/shared, packages/server, packages/client, packages/cdk で構成されるnpm workspacesベースのリポジトリ構成

## Requirements

### Requirement 1: CIワークフローによるPR検証

**User Story:** 開発者として、PRを作成した際にテストとビルドが自動で実行されることで、品質を担保したコードのみがmainブランチにマージされるようにしたい。

#### Acceptance Criteria

1. WHEN a Pull Request is opened or updated targeting the main branch, THE CI_Workflow SHALL execute all Vitest tests across the Monorepo using `npm run test`
2. WHEN a Pull Request is opened or updated targeting the main branch, THE CI_Workflow SHALL execute the build process for all packages using `npm run build`
3. IF any test fails during CI execution, THEN THE CI_Workflow SHALL report the failure status to the Pull Request and block the merge
4. IF the build process fails during CI execution, THEN THE CI_Workflow SHALL report the failure status to the Pull Request and block the merge
5. WHEN the CI_Workflow executes, THE CI_Workflow SHALL install dependencies using `npm ci` to ensure reproducible builds

### Requirement 2: CDワークフローによるdev環境への自動デプロイ

**User Story:** 開発者として、mainブランチにマージされたコードが自動的にdev環境にデプロイされることで、手動デプロイの手間を省き迅速にフィードバックを得たい。

#### Acceptance Criteria

1. WHEN a commit is pushed to the main branch, THE CD_Workflow SHALL automatically deploy the CDK_Stack to the Dev_Environment
2. WHEN deploying to the Dev_Environment, THE CD_Workflow SHALL build the client package with the VITE_WEBSOCKET_URL environment variable set to the dev environment endpoint
3. WHEN deploying to the Dev_Environment, THE CD_Workflow SHALL execute `cdk deploy` with the dev environment context parameters
4. IF the deployment to Dev_Environment fails, THEN THE CD_Workflow SHALL report the failure and halt the pipeline without proceeding to Prod_Environment

### Requirement 3: CDワークフローによるprod環境への手動承認デプロイ

**User Story:** 開発者として、dev環境で動作確認したコードを手動承認を経てprod環境にデプロイすることで、意図しない本番リリースを防止したい。

#### Acceptance Criteria

1. WHEN the Dev_Environment deployment completes successfully, THE CD_Workflow SHALL wait for manual approval before proceeding to Prod_Environment deployment
2. WHEN manual approval is granted, THE CD_Workflow SHALL deploy the CDK_Stack to the Prod_Environment
3. WHEN deploying to the Prod_Environment, THE CD_Workflow SHALL build the client package with the VITE_WEBSOCKET_URL environment variable set to the prod environment endpoint
4. WHEN deploying to the Prod_Environment, THE CD_Workflow SHALL execute `cdk deploy` with the prod environment context parameters
5. IF manual approval is not granted within 72 hours, THEN THE CD_Workflow SHALL cancel the pending Prod_Environment deployment

### Requirement 4: GitHub OIDCによるAWS認証

**User Story:** 開発者として、長期間有効なAWSシークレットキーを管理せずにGitHub ActionsからAWSへ安全に認証できることで、セキュリティリスクを低減したい。

#### Acceptance Criteria

1. THE CD_Workflow SHALL authenticate to AWS using the OIDC_Provider and IAM_Role without storing AWS access keys as GitHub secrets
2. WHEN the CD_Workflow requests AWS credentials, THE OIDC_Provider SHALL issue temporary credentials scoped to the IAM_Role
3. THE IAM_Role SHALL restrict trust to the specific GitHub repository and the main branch only
4. THE IAM_Role SHALL grant the minimum permissions required for CDK deployment operations

### Requirement 5: 環境分離とコスト最適化

**User Story:** 開発者として、dev環境とprod環境が独立して管理され、個人プロジェクトとしてコストを最小限に抑えた構成であることで、安心して開発を続けたい。

#### Acceptance Criteria

1. THE CD_Workflow SHALL deploy dev and prod as separate CDK_Stack instances with distinct resource names
2. THE CI_Workflow SHALL use GitHub-hosted runners to minimize infrastructure maintenance cost
3. THE CD_Workflow SHALL use GitHub-hosted runners to minimize infrastructure maintenance cost
4. WHEN configuring the CI_Workflow, THE CI_Workflow SHALL cache npm dependencies to reduce execution time and GitHub Actions usage minutes
5. THE CD_Workflow SHALL avoid parallel deployments to prevent unnecessary resource provisioning conflicts

### Requirement 6: ワークフローの信頼性と可観測性

**User Story:** 開発者として、パイプラインの実行状況と結果を容易に把握できることで、問題発生時に迅速に対処したい。

#### Acceptance Criteria

1. WHEN the CI_Workflow completes, THE CI_Workflow SHALL display test results summary in the GitHub Actions log
2. WHEN the CD_Workflow deploys to any environment, THE CD_Workflow SHALL output the deployed stack outputs in the GitHub Actions log
3. IF the CD_Workflow fails at any step, THEN THE CD_Workflow SHALL clearly indicate the failure point and relevant error messages in the GitHub Actions log
4. THE CI_Workflow SHALL specify Node.js version 18 or higher to match the project engine requirements
5. THE CD_Workflow SHALL specify Node.js version 18 or higher to match the project engine requirements
