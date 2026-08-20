#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { GamePlatformStack } from "../lib/game-platform-stack";

const app = new cdk.App();
const envName = app.node.tryGetContext("env") || "dev";

new GamePlatformStack(app, `GamePlatform-${envName}`, {
  description: `AWS Game Platform - ${envName} environment`,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "ap-northeast-1",
  },
});
