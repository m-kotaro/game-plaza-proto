import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
export interface GamePlatformStackProps extends cdk.StackProps {
    envName: string;
}
export declare class GamePlatformStack extends cdk.Stack {
    /** Connections table storing player session state */
    readonly connectionsTable: dynamodb.Table;
    /** S3 bucket for static client assets */
    readonly assetsBucket: s3.Bucket;
    /** CloudFront distribution for content delivery */
    readonly distribution: cloudfront.Distribution;
    /** Lambda function handlers (task 2.3) */
    readonly onConnectFn: NodejsFunction;
    readonly onDisconnectFn: NodejsFunction;
    readonly onMessageFn: NodejsFunction;
    readonly tickFn: NodejsFunction;
    /** API Gateway WebSocket API (task 2.4) */
    readonly webSocketApi: apigwv2.CfnApi;
    readonly webSocketStage: apigwv2.CfnStage;
    /** EventBridge rule triggering tick Lambda every minute */
    readonly heartbeatRule: events.Rule;
    /** Whether this stack is deployed to prod environment */
    readonly isProd: boolean;
    /** Route 53 subdomain hosted zone (prod only) */
    readonly hostedZone: route53.HostedZone | undefined;
    /** ACM certificate for custom domain (prod only) */
    readonly certificate: acm.ICertificate | undefined;
    constructor(scope: Construct, id: string, props: GamePlatformStackProps);
}
//# sourceMappingURL=game-platform-stack.d.ts.map