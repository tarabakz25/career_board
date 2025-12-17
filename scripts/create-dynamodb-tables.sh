#!/bin/bash

# DynamoDB テーブル作成スクリプト
# Usage: ./scripts/create-dynamodb-tables.sh [region]

REGION=${1:-ap-northeast-1}

echo "🚀 Creating DynamoDB tables in region: $REGION"
echo ""

# 1. Users テーブル
echo "📦 Creating career-board-users table..."
aws dynamodb create-table \
  --table-name career-board-users \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --global-secondary-indexes \
    "[{
      \"IndexName\": \"EmailIndex\",
      \"KeySchema\": [{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],
      \"Projection\": {\"ProjectionType\":\"ALL\"},
      \"ProvisionedThroughput\": {\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}
    }]" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION \
  2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ career-board-users created successfully"
else
  echo "⚠️  career-board-users might already exist or error occurred"
fi
echo ""

# 2. Jobs テーブル
echo "📦 Creating career-board-jobs table..."
aws dynamodb create-table \
  --table-name career-board-jobs \
  --attribute-definitions \
    AttributeName=jobId,AttributeType=S \
  --key-schema \
    AttributeName=jobId,KeyType=HASH \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION \
  2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ career-board-jobs created successfully"
else
  echo "⚠️  career-board-jobs might already exist or error occurred"
fi
echo ""

# 3. Applications テーブル
echo "📦 Creating career-board-applications table..."
aws dynamodb create-table \
  --table-name career-board-applications \
  --attribute-definitions \
    AttributeName=applicationId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
    AttributeName=jobId,AttributeType=S \
  --key-schema \
    AttributeName=applicationId,KeyType=HASH \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"UserIdIndex\",
        \"KeySchema\": [{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}],
        \"Projection\": {\"ProjectionType\":\"ALL\"},
        \"ProvisionedThroughput\": {\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}
      },
      {
        \"IndexName\": \"JobIdIndex\",
        \"KeySchema\": [{\"AttributeName\":\"jobId\",\"KeyType\":\"HASH\"}],
        \"Projection\": {\"ProjectionType\":\"ALL\"},
        \"ProvisionedThroughput\": {\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}
      }
    ]" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region $REGION \
  2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ career-board-applications created successfully"
else
  echo "⚠️  career-board-applications might already exist or error occurred"
fi
echo ""

echo "🎉 DynamoDB table creation process completed!"
echo ""
echo "To verify tables, run:"
echo "  aws dynamodb list-tables --region $REGION"
echo ""
echo "To check table status:"
echo "  aws dynamodb describe-table --table-name career-board-users --region $REGION"

