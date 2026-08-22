"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamePlatformStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const apigwv2 = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const targets = __importStar(require("aws-cdk-lib/aws-events-targets"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const route53Targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const path = __importStar(require("path"));
class GamePlatformStack extends cdk.Stack {
    /** Connections table storing player session state */
    connectionsTable;
    /** S3 bucket for static client assets */
    assetsBucket;
    /** CloudFront distribution for content delivery */
    distribution;
    /** Lambda function handlers (task 2.3) */
    onConnectFn;
    onDisconnectFn;
    onMessageFn;
    tickFn;
    /** API Gateway WebSocket API (task 2.4) */
    webSocketApi;
    webSocketStage;
    /** EventBridge rule triggering tick Lambda every minute */
    heartbeatRule;
    /** Whether this stack is deployed to prod environment */
    isProd;
    /** Route 53 subdomain hosted zone (prod only) */
    hostedZone;
    /** ACM certificate for custom domain (prod only) */
    certificate;
    constructor(scope, id, props) {
        super(scope, id, props);
        const isProd = props.envName === "prod";
        this.isProd = isProd;
        // Custom domain resources (prod only)
        if (isProd) {
            // Route 53 subdomain hosted zone
            this.hostedZone = new route53.HostedZone(this, "SubdomainHostedZone", {
                zoneName: "game-plaza-proto.m-kotaro.net",
            });
            // ACM certificate (us-east-1 for CloudFront compatibility)
            // DnsValidatedCertificate is deprecated but required for cross-region cert creation
            this.certificate = new acm.DnsValidatedCertificate(this, "Certificate", {
                domainName: "game-plaza-proto.m-kotaro.net",
                subjectAlternativeNames: ["*.game-plaza-proto.m-kotaro.net"],
                hostedZone: this.hostedZone,
                region: "us-east-1",
            });
            // Output NS records for manual parent zone delegation
            new cdk.CfnOutput(this, "HostedZoneNameServers", {
                value: cdk.Fn.join(",", this.hostedZone.hostedZoneNameServers),
                description: "NSレコード値。親ホストゾーン(m-kotaro.net)に手動追加が必要",
            });
        }
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
        this.onConnectFn = new aws_lambda_nodejs_1.NodejsFunction(this, "OnConnectFunction", {
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(handlersPath, "onConnect.ts"),
            handler: "handler",
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
        });
        // Lambda: onDisconnect - handles WebSocket disconnections (task 2.3)
        this.onDisconnectFn = new aws_lambda_nodejs_1.NodejsFunction(this, "OnDisconnectFunction", {
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(handlersPath, "onDisconnect.ts"),
            handler: "handler",
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
        });
        // Lambda: onMessage - handles incoming WebSocket messages (task 2.3)
        this.onMessageFn = new aws_lambda_nodejs_1.NodejsFunction(this, "OnMessageFunction", {
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(handlersPath, "onMessage.ts"),
            handler: "handler",
            environment: lambdaEnvironment,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
        });
        // Lambda: tick - EventBridge heartbeat check (task 2.3)
        this.tickFn = new aws_lambda_nodejs_1.NodejsFunction(this, "TickFunction", {
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
        const connectIntegration = new apigwv2.CfnIntegration(this, "ConnectIntegration", {
            apiId: this.webSocketApi.ref,
            integrationType: "AWS_PROXY",
            integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${this.onConnectFn.functionArn}/invocations`,
        });
        const disconnectIntegration = new apigwv2.CfnIntegration(this, "DisconnectIntegration", {
            apiId: this.webSocketApi.ref,
            integrationType: "AWS_PROXY",
            integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${this.onDisconnectFn.functionArn}/invocations`,
        });
        const defaultIntegration = new apigwv2.CfnIntegration(this, "DefaultIntegration", {
            apiId: this.webSocketApi.ref,
            integrationType: "AWS_PROXY",
            integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${this.onMessageFn.functionArn}/invocations`,
        });
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
        // Output the WebSocket URL (use custom domain in prod)
        const webSocketClientUrl = isProd
            ? "wss://ws.game-plaza-proto.m-kotaro.net"
            : webSocketUrl;
        new cdk.CfnOutput(this, "WebSocketApiUrl", {
            value: webSocketClientUrl,
            description: "WebSocket API URL for client connections",
        });
        // WebSocket custom domain (prod only)
        if (isProd && this.hostedZone && this.certificate) {
            // API Gateway needs a regional certificate (same region as the API)
            // The us-east-1 certificate is for CloudFront only
            const apiGwCertificate = new acm.Certificate(this, "ApiGwCertificate", {
                domainName: "ws.game-plaza-proto.m-kotaro.net",
                validation: acm.CertificateValidation.fromDns(this.hostedZone),
            });
            const wsDomainName = new apigwv2.CfnDomainName(this, "WsDomainName", {
                domainName: "ws.game-plaza-proto.m-kotaro.net",
                domainNameConfigurations: [
                    {
                        certificateArn: apiGwCertificate.certificateArn,
                        endpointType: "REGIONAL",
                    },
                ],
            });
            new apigwv2.CfnApiMapping(this, "WsApiMapping", {
                apiId: this.webSocketApi.ref,
                domainName: wsDomainName.ref,
                stage: this.webSocketStage.ref,
            });
            // WebSocket A record
            new route53.ARecord(this, "WebSocketARecord", {
                zone: this.hostedZone,
                recordName: "ws.game-plaza-proto.m-kotaro.net",
                target: route53.RecordTarget.fromAlias(new route53Targets.ApiGatewayv2DomainProperties(wsDomainName.attrRegionalDomainName, wsDomainName.attrRegionalHostedZoneId)),
            });
        }
        // EventBridge rule: invoke tick Lambda every 1 minute (task 2.6)
        this.heartbeatRule = new events.Rule(this, "HeartbeatRule", {
            schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
            description: "Triggers tick Lambda every minute for heartbeat/stale connection cleanup",
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
                origin: origins.S3BucketOrigin.withOriginAccessControl(this.assetsBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            defaultRootObject: "index.html",
            // Custom domain (prod only)
            ...(isProd &&
                this.certificate && {
                domainNames: ["game-plaza-proto.m-kotaro.net"],
                certificate: this.certificate,
            }),
        });
        // CloudFront A record (prod only)
        if (isProd && this.hostedZone) {
            new route53.ARecord(this, "CloudFrontARecord", {
                zone: this.hostedZone,
                recordName: "game-plaza-proto.m-kotaro.net",
                target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(this.distribution)),
            });
        }
        // Prod custom domain outputs
        if (isProd && this.hostedZone) {
            new cdk.CfnOutput(this, "CustomDomainFrontend", {
                value: "https://game-plaza-proto.m-kotaro.net",
                description: "フロントエンドカスタムドメインURL",
            });
            new cdk.CfnOutput(this, "CustomDomainWebSocket", {
                value: "wss://ws.game-plaza-proto.m-kotaro.net",
                description: "WebSocketカスタムドメインURL",
            });
        }
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
exports.GamePlatformStack = GamePlatformStack;
//# sourceMappingURL=game-platform-stack.js.map