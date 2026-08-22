import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { RankingEntry } from "@game-plaza/shared";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const SCORE_TABLE_NAME = process.env.SCORE_TABLE_NAME!;
const MAX_SCORES = 10;
const MAX_SCORE_VALUE = 999999999; // For zero-padding inversion

/**
 * Sort Key を生成する（降順クエリ用）
 * スコアを反転してゼロパディングし、timestampを付加
 * 例: score=85 → "999999914#1700000000000"
 */
function createSortKey(score: number, timestamp: number): string {
  const invertedScore = String(MAX_SCORE_VALUE - score).padStart(10, "0");
  return `${invertedScore}#${timestamp}`;
}

/**
 * スコアを保存する
 */
export async function saveScore(
  gameType: string,
  playerName: string,
  score: number
): Promise<void> {
  const timestamp = Date.now();
  const sortKey = createSortKey(score, timestamp);

  await docClient.send(
    new PutCommand({
      TableName: SCORE_TABLE_NAME,
      Item: {
        gameType,
        sortKey,
        playerName,
        score,
        timestamp,
      },
    })
  );
}

/**
 * 指定 gameType のランキング上位N件を取得する
 */
export async function getTopScores(
  gameType: string,
  limit: number = MAX_SCORES
): Promise<RankingEntry[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: SCORE_TABLE_NAME,
      KeyConditionExpression: "gameType = :gt",
      ExpressionAttributeValues: { ":gt": gameType },
      ScanIndexForward: true, // Sort key is inverted, so ascending = highest score first
      Limit: limit,
    })
  );

  return (result.Items || []).map((item) => ({
    playerName: item.playerName as string,
    score: item.score as number,
  }));
}

/**
 * 上位10件を超えるレコードを削除する
 */
export async function pruneScores(gameType: string): Promise<void> {
  // Get all scores for this gameType
  const result = await docClient.send(
    new QueryCommand({
      TableName: SCORE_TABLE_NAME,
      KeyConditionExpression: "gameType = :gt",
      ExpressionAttributeValues: { ":gt": gameType },
      ScanIndexForward: true,
    })
  );

  const items = result.Items || [];
  if (items.length <= MAX_SCORES) return;

  // Delete items beyond the top 10
  const toDelete = items.slice(MAX_SCORES);
  for (const item of toDelete) {
    await docClient.send(
      new DeleteCommand({
        TableName: SCORE_TABLE_NAME,
        Key: {
          gameType: item.gameType,
          sortKey: item.sortKey,
        },
      })
    );
  }
}
