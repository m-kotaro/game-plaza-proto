# Requirements Document

## Introduction

AWSを基盤とした2Dマルチプレイヤー交流空間の要件定義。どうぶつの森のようにプレイヤーが1つの共有ワールドに集まり、アバターを操作して交流できるWebアプリケーションを構築する。ゲームコンテンツは後続フェーズで追加する前提で、まずは「集まれる場」としての基盤を作る。コスト最優先の個人プロジェクトとして設計する。

## Glossary

- **Shared_World**: すべてのプレイヤーが同時に存在する1つの2D共有空間
- **Avatar**: プレイヤーを表現する2Dキャラクター。ワールド内で移動操作が可能
- **Session**: プレイヤーがワールドに参加してから離脱するまでの一連の接続期間
- **Player**: ワールドに参加しているユーザー。ログイン不要のゲスト形式で参加する
- **Game_Server**: AWSインフラ上でワールドの状態管理と同期を担当するバックエンドシステム
- **Web_Client**: ブラウザ上で動作するフロントエンドアプリケーション
- **Position_Sync**: 各プレイヤーのアバター位置情報を他プレイヤーに伝達する仕組み

## Requirements

### Requirement 1: ワールド参加

**User Story:** プレイヤーとして、ブラウザからすぐに共有ワールドに参加したい。ログインなしで手軽に入れるようにしたい。

#### Acceptance Criteria

1. WHEN Player が Web_Client の URL にアクセスした場合, THE Web_Client SHALL Shared_World を表示し、認証なしで Player の参加を許可する
2. WHEN Player が Shared_World に参加した場合, THE Game_Server SHALL Player に一意の Session 識別子を割り当てる
3. WHEN Player が Shared_World に参加した場合, THE Game_Server SHALL Player にランダムな外見の Avatar を生成する

### Requirement 2: アバター移動

**User Story:** プレイヤーとして、2Dワールド内で自分のアバターを自由に移動させたい。他のプレイヤーと空間を共有していることを感じたい。

#### Acceptance Criteria

1. WHEN Player が移動入力を行った場合, THE Web_Client SHALL ローカル画面上の Avatar 位置を更新する
2. WHEN Player が Avatar を移動させた場合, THE Web_Client SHALL 更新された位置情報を Game_Server に送信する
3. WHEN Game_Server が Player から位置更新を受信した場合, THE Game_Server SHALL 500ms 以内に更新された位置情報を他の全接続 Player にブロードキャストする
4. THE Web_Client SHALL Shared_World 内のすべての接続中 Player の Avatar を最新の既知位置に描画する

### Requirement 3: プレイヤー同期

**User Story:** プレイヤーとして、他のプレイヤーがワールドに入ったり出たりしたことをリアルタイムに把握したい。

#### Acceptance Criteria

1. WHEN 新しい Player が Shared_World に参加した場合, THE Game_Server SHALL 既存のすべての Player に新しい Player の Avatar と位置を通知する
2. WHEN Player が Shared_World に参加した場合, THE Game_Server SHALL 参加した Player に現在接続中のすべての Player とその Avatar 位置のリストを送信する
3. WHEN Player の Session が終了した場合, THE Game_Server SHALL その Player の Avatar を Shared_World から削除し、残りのすべての Player に通知する
4. IF Game_Server が Player から 60 秒間通信を受信しなかった場合, THEN THE Game_Server SHALL その Player の Session を終了する

### Requirement 4: アバターカスタマイズ

**User Story:** プレイヤーとして、自分のアバターをある程度カスタマイズして個性を出したい。

#### Acceptance Criteria

1. WHEN Player が Shared_World に参加した場合, THE Web_Client SHALL あらかじめ定義された選択肢から Avatar の外見をカスタマイズすることを Player に許可する
2. THE Game_Server SHALL Player の Session 期間中、Avatar の外見データを保持する
3. WHEN Player が Avatar の外見を変更した場合, THE Game_Server SHALL 更新された外見を接続中のすべての Player にブロードキャストする

### Requirement 5: セッション管理

**User Story:** プレイヤーとして、ブラウザを閉じたりネットワークが切れたりしても、システムが適切にリソースを解放してほしい。

#### Acceptance Criteria

1. WHEN Player が Web_Client を閉じるか、ネットワーク接続を失った場合, THE Game_Server SHALL 切断を検知し Session を終了する
2. WHEN Session が終了した場合, THE Game_Server SHALL その Player に関連するすべてのリソースを解放する
3. THE Game_Server SHALL Session の有効期間を超えて Player のデータを永続化しない

### Requirement 6: AWSインフラとコスト最適化

**User Story:** 開発者として、個人プロジェクトのコストを最小限に抑えつつ、50人同時接続を支えられるインフラを構築したい。

#### Acceptance Criteria

1. THE Game_Server SHALL 小規模ワークロードに適したコスト効率の良い AWS サービスを使用してデプロイされる
2. WHILE Shared_World に Player が接続していない場合, THE Game_Server SHALL コスト削減のためリソース消費を最小化する
3. THE Game_Server SHALL 単一の Shared_World インスタンスで最大 50 の同時 Player 接続をサポートする
4. THE Web_Client SHALL コスト効率の良い配信方法で静的アセットとして提供される

### Requirement 7: Web クライアント描画

**User Story:** プレイヤーとして、ブラウザ上で2Dワールドをスムーズに表示し、アバターが動いている様子を確認したい。

#### Acceptance Criteria

1. THE Web_Client SHALL Shared_World をブラウザ上に 2D マップとして描画する
2. THE Web_Client SHALL モダンブラウザ上ですべての Avatar の動きを最低 30 フレーム毎秒で描画する
3. THE Web_Client SHALL Chrome、Firefox、Safari の最新バージョンで動作する
4. WHEN Player が Avatar を移動させた場合, THE Web_Client SHALL ローカル画面上にスムーズな移動アニメーションを表示する
