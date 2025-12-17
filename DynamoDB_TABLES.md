# DynamoDB テーブル設計

このアプリケーションで必要な3つのDynamoDBテーブルの設計です。

## 1. Users テーブル

```bash
aws dynamodb create-table \
  --table-name career-board-users \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --global-secondary-indexes \
    '[{
      "IndexName": "EmailIndex",
      "KeySchema": [{"AttributeName":"email","KeyType":"HASH"}],
      "Projection": {"ProjectionType":"ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits":5,"WriteCapacityUnits":5}
    }]' \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region ap-northeast-1
```

**属性:**
- `userId` (String, PK): USER#{ulid}
- `email` (String, GSI-PK): メールアドレス（小文字）
- `passwordHash` (String): パスワードハッシュ
- `salt` (String): ソルト
- `role` (String): user | admin
- `createdAt` (Number): 作成日時（UNIX timestamp）

## 2. Jobs テーブル

```bash
aws dynamodb create-table \
  --table-name career-board-jobs \
  --attribute-definitions \
    AttributeName=jobId,AttributeType=S \
  --key-schema \
    AttributeName=jobId,KeyType=HASH \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region ap-northeast-1
```

**属性:**
- `jobId` (String, PK): JOB#{ulid}
- `title` (String): 求人タイトル
- `company` (String): 会社名
- `location` (String, optional): 勤務地
- `salaryMin` (Number, optional): 給与下限
- `salaryMax` (Number, optional): 給与上限
- `deadline` (Number, optional): 締切（UNIX timestamp）
- `description` (String, optional): 説明
- `createdBy` (String, optional): 作成者のuserId
- `createdAt` (Number): 作成日時（UNIX timestamp）

## 3. Applications テーブル

```bash
aws dynamodb create-table \
  --table-name career-board-applications \
  --attribute-definitions \
    AttributeName=applicationId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
    AttributeName=jobId,AttributeType=S \
  --key-schema \
    AttributeName=applicationId,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "UserIdIndex",
        "KeySchema": [{"AttributeName":"userId","KeyType":"HASH"}],
        "Projection": {"ProjectionType":"ALL"},
        "ProvisionedThroughput": {"ReadCapacityUnits":5,"WriteCapacityUnits":5}
      },
      {
        "IndexName": "JobIdIndex",
        "KeySchema": [{"AttributeName":"jobId","KeyType":"HASH"}],
        "Projection": {"ProjectionType":"ALL"},
        "ProvisionedThroughput": {"ReadCapacityUnits":5,"WriteCapacityUnits":5}
      }
    ]' \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region ap-northeast-1
```

**属性:**
- `applicationId` (String, PK): APP#{ulid}
- `userId` (String, GSI1-PK): USER#{ulid}
- `jobId` (String, GSI2-PK): JOB#{ulid}
- `fullName` (String): 氏名
- `phone` (String): 電話番号
- `coverLetter` (String, optional): 志望動機
- `resumeUrl` (String, optional): 履歴書のS3署名付きURL
- `resumeKey` (String, optional): 履歴書のS3キー
- `createdAt` (Number): 作成日時（UNIX timestamp）

## 環境変数

`.env`ファイルに以下を設定：

```bash
# AWS共通設定
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# DynamoDBテーブル名（カスタマイズ可能）
DYNAMODB_USERS_TABLE=career-board-users
DYNAMODB_JOBS_TABLE=career-board-jobs
DYNAMODB_APPLICATIONS_TABLE=career-board-applications

# S3バケット（ファイルアップロード用）
AWS_S3_BUCKET=your-bucket-name
```

## Vercelデプロイ時

Vercel DashboardでAWS認証情報を設定し、DynamoDBテーブルへのアクセス権限を付与してください。

**必要なIAMポリシー:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-northeast-1:*:table/career-board-users",
        "arn:aws:dynamodb:ap-northeast-1:*:table/career-board-users/index/*",
        "arn:aws:dynamodb:ap-northeast-1:*:table/career-board-jobs",
        "arn:aws:dynamodb:ap-northeast-1:*:table/career-board-applications",
        "arn:aws:dynamodb:ap-northeast-1:*:table/career-board-applications/index/*"
      ]
    }
  ]
}
```

