import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import * as path from "path";

export class GamePlatformStack extends cdk.Stack {
  /** Connections table storing player session state */
  public readonly connectionsTable: dynamodb.Table;

  /** S3 bucket for static client assets */
  public readonly assetsBucket: s3.Bucket;

  /** CloudFront distribution for content delivery */
  public readonly distribution: cloudfront.Distribution;

  /** Lambda function handlers (task 2.3) */
  public readonly onConnectFn: NodejsFunction;
  public readonly onDisconnectFn: NodejsFunction;
  public readonly onMessageFn: NodejsFunction;
  public readonly tickFn: NodejsFunction;

  /** API Gateway WebSocket API (task 2.4) */
  public readonly webSocketApi: apigwv2.CfnApi;
  public readonly webSocketStage: apigwv2.CfnStage;

  /** EventBridge rule triggering tick Lambda every minute */
  public readonly heartbeatRule: events.Rule;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Connections table (task 2.2)
    this.connectionsTable = new dynamodb.Table(this, "ConnectionsTable", {
      partitionKey: {
        name: "connectionId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Shared environment variables for all Lambda functions
    const lambdaEnvironment = {
      TABLE_NAME: this.connectionsTable.tableName,
      // WEBSOCKET_ENDPOINT is set after API Gateway creation below
      WEBSOCKET_ENDPOINT: "placeholder",
    };

    // Path to the server package handlers
    const handlersPath = path.join(__dirname, "../../../server/src/handlers");

    // Lambda: onConnect - handles new WebSocket connections (task 2.3)
    this.onConnectFn = new NodejsFunction(this, "OnConnectFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(handlersPath, "onConnect.ts"),
      handler: "handler",
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // Lambda: onDisconnect - handles WebSocket disconnections (task 2.3)
    this.onDisconnectFn = new NodejsFunction(this, "OnDisconnectFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(handlersPath, "onDisconnect.ts"),
      handler: "handler",
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // Lambda: onMessage - handles incoming WebSocket messages (task 2.3)
    this.onMessageFn = new NodejsFunction(this, "OnMessageFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(handlersPath, "onMessage.ts"),
      handler: "handler",
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // Lambda: tick - EventBridge heartbeat check (task 2.3)
    this.tickFn = new NodejsFunction(this, "TickFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(handlersPath, "tick.ts"),
      handler: "handler",
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
    });

    // Grant DynamoDB read/write permissions to all Lambda functions
    this.connectionsTable.grantReadWriteData(this.onConnectFn);
    this.connectionsTable.grantReadWriteData(this.onDisconnectFn);
    this.connectionsTable.grantReadWriteData(this.onMessageFn);
    this.connectionsTable.grantReadWriteData(this.tickFn);

    // API Gateway WebSocket API (task 2.4)
    this.webSocketApi = new apigwv2.CfnApi(this, "WebSocketApi", {
      name: "GamePlatformWebSocketApi",
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.action",
    });

    // Lambda integrations for each route
    const connectIntegration = new apigwv2.CfnIntegration(
      this,
      "ConnectIntegration",
      {
        apiId: this.webSocketApi.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${this.onConnectFn.functionArn}/invocations`,
      }
    );

    const disconnectIntegration = new apigwv2.CfnIntegration(
      this,
      "DisconnectIntegration",
      {
        apiId: this.webSocketApi.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${this.onDisconnectFn.functionArn}/invocations`,
      }
    );

    const defaultIntegration = new apigwv2.CfnIntegration(
      this,
      "DefaultIntegration",
      {
        apiId: this.webSocketApi.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${this.onMessageFn.functionArn}/invocations`,
      }
    );

    // Routes: $connect, $disconnect, $default
    const connectRoute = new apigwv2.CfnRoute(this, "ConnectRoute", {
      apiId: this.webSocketApi.ref,
      routeKey: "$connect",
      authorizationType: "NONE",
      target: `integrations/${connectIntegration.ref}`,
    });

    const disconnectRoute = new apigwv2.CfnRoute(this, "DisconnectRoute", {
      apiId: this.webSocketApi.ref,
      routeKey: "$disconnect",
      authorizationType: "NONE",
      target: `integrations/${disconnectIntegration.ref}`,
    });

    const defaultRoute = new apigwv2.CfnRoute(this, "DefaultRoute", {
      apiId: this.webSocketApi.ref,
      routeKey: "$default",
      authorizationType: "NONE",
      target: `integrations/${defaultIntegration.ref}`,
    });

    // Deployment (depends on all routes being created)
    const deployment = new apigwv2.CfnDeployment(this, "WebSocketDeployment", {
      apiId: this.webSocketApi.ref,
    });
    deployment.addDependency(connectRoute);
    deployment.addDependency(disconnectRoute);
    deployment.addDependency(defaultRoute);

    // Stage
    this.webSocketStage = new apigwv2.CfnStage(this, "WebSocketStage", {
      apiId: this.webSocketApi.ref,
      stageName: "prod",
      deploymentId: deployment.ref,
    });

    // Lambda invoke permissions for API Gateway
    this.onConnectFn.addPermission("ApiGwInvokeConnect", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.ref}/*/$connect`,
    });

    this.onDisconnectFn.addPermission("ApiGwInvokeDisconnect", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.ref}/*/$disconnect`,
    });

    this.onMessageFn.addPermission("ApiGwInvokeDefault", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.ref}/*/$default`,
    });

    // WebSocket endpoint URL
    const webSocketUrl = `wss://${this.webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/prod`;

    // Update Lambda environment variables with the actual WebSocket endpoint
    // This uses the HTTPS endpoint format for API Gateway Management API
    const webSocketEndpoint = `https://${this.webSocketApi.ref}.execute-api.${this.region}.amazonaws.com/prod`;
    this.onConnectFn.addEnvironment("WEBSOCKET_ENDPOINT", webSocketEndpoint);
    this.onDisconnectFn.addEnvironment("WEBSOCKET_ENDPOINT", webSocketEndpoint);
    this.onMessageFn.addEnvironment("WEBSOCKET_ENDPOINT", webSocketEndpoint);
    this.tickFn.addEnvironment("WEBSOCKET_ENDPOINT", webSocketEndpoint);

    // Grant API Gateway WebSocket management API permissions
    // Scoped to the specific WebSocket API for least-privilege access
    const apiGatewayManagePolicy = new iam.PolicyStatement({
      actions: ["execute-api:ManageConnections"],
      resources: [
        `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.ref}/prod/POST/@connections/*`,
        `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.ref}/prod/DELETE/@connections/*`,
      ],
    });

    this.onConnectFn.addToRolePolicy(apiGatewayManagePolicy);
    this.onDisconnectFn.addToRolePolicy(apiGatewayManagePolicy);
    this.onMessageFn.addToRolePolicy(apiGatewayManagePolicy);
    this.tickFn.addToRolePolicy(apiGatewayManagePolicy);

    // Output the WebSocket URL
    new cdk.CfnOutput(this, "WebSocketApiUrl", {
      value: webSocketUrl,
      description: "WebSocket API URL for client connections",
    });

    // EventBridge rule: invoke tick Lambda every 1 minute (task 2.6)
    this.heartbeatRule = new events.Rule(this, "HeartbeatRule", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      description:
        "Triggers tick Lambda every minute for heartbeat/stale connection cleanup",
    });

    this.heartbeatRule.addTarget(new targets.LambdaFunction(this.tickFn));

    // S3 bucket for static assets (task 2.5)
    this.assetsBucket = new s3.Bucket(this, "AssetsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront distribution (task 2.5)
    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin:
          origins.S3BucketOrigin.withOriginAccessControl(this.assetsBucket),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
    });

    // Output the CloudFront domain name
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName,
      description: "CloudFront distribution domain name for the web client",
    });

    // S3 BucketDeployment: deploy Vite build output to S3 (task 8.2)
    // NOTE: Build client first (`npm run build -w @game-plaza/client`) before `cdk deploy`.
    // The VITE_WEBSOCKET_URL env var must be set at client build time.
    new s3deploy.BucketDeployment(this, "DeployWebClient", {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, "../../../client/dist")),
      ],
      destinationBucket: this.assetsBucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
    });
  }
}
