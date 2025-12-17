# Career Board

フルスタック課題「career-board」の実装です。Express + DynamoDB + S3 バックエンドと、バニラ JS のフロントエンドで以下を満たしています。

- メール/パスワード認証（登録・ログイン・ログアウト）
- 求人一覧表示 + 検索・フィルタ
- 求人詳細表示（クエリパラメータ job）
- 1求人のみ応募、応募取り消し、マイページ表示
- 管理者のみの求人 CRUD（admin@example.com）
- レスポンシブ対応のシングルページ UI

## セットアップ

1. 依存をインストール

```bash
bun install
```

2. 環境変数を設定（`.env`）

```bash
# AWS共通設定（必須）
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# DynamoDBテーブル名
DYNAMODB_USERS_TABLE=career-board-users
DYNAMODB_JOBS_TABLE=career-board-jobs
DYNAMODB_APPLICATIONS_TABLE=career-board-applications

# S3バケット（ファイルアップロード用）
AWS_S3_BUCKET=your-s3-bucket-name

# セッション暗号化キー（ランダムな文字列を設定）
SESSION_SECRET=change-me

# 管理者パスワード（省略時はadmin123）
ADMIN_PASSWORD=admin123

# サーバーポート
PORT=3000
```

3. DynamoDBテーブルを作成

```bash
# DynamoDB_TABLES.mdを参照してテーブルを作成
# または以下のスクリプトを実行
chmod +x scripts/create-tables.sh
./scripts/create-tables.sh
```

詳細は `DynamoDB_TABLES.md` を参照してください。

4. 起動

```bash
bun run index.ts
# or
bun run dev
```

初回起動時にテーブルが自動作成され、管理者アカウントとサンプル求人がシードされます。

## フロントエンドの使い方（ページ構成）

- `/` : ランディング。ヘッダーの「ログイン」で /login へ。
- `/login` : ログイン/新規登録ページ。認証成功後 /dashboard へリダイレクト。
- `/dashboard` : ログイン必須。求人一覧・検索/詳細/応募、マイページ、管理者CRUDを集約。

## ディレクトリ構成（主要）

- `index.ts` … アプリエントリ。ビューエンジン設定とルータのマウント。
- `routes/` … `auth.ts`、`jobs.ts`、`admin.ts`、`pages.ts` で API とページルートを分離。
- `lib/dynamodb.ts` … DynamoDB操作ライブラリ（CRUD関数）。
- `lib/s3.ts` … S3ファイルアップロード/削除操作。
- `views/` … `index.ejs`(LP), `login.ejs`, `dashboard.ejs`。
- `public/` … フロントの静的アセット（`login.js`, `dashboard.js`, `styles.css` など）。
- `db.ts` … シード処理（管理者アカウント、サンプル求人）。

## API ざっくり

- `POST /api/auth/register` `{email, password}`
- `POST /api/auth/login` `{email, password}`
- `POST /api/auth/logout`
- `GET  /api/auth/me`
- `GET  /api/jobs` (クエリ: search, location, minSalary)
- `GET  /api/jobs/:id`
- `POST /api/jobs/:id/apply` 認証必須、1求人のみ
- `POST /api/jobs/:id/cancel`
- `GET  /api/me/application`
- 管理者: `POST/PUT/DELETE /api/admin/jobs/:id`

## ファイルアップロード機能（AWS S3）

応募時に履歴書・職務経歴書（PDF/Word形式、最大10MB）をアップロードできます。

### AWS S3のセットアップ

1. **S3バケットの作成**

```bash
# AWS CLIでバケットを作成
aws s3 mb s3://your-career-board-bucket --region ap-northeast-1
```

または、AWSコンソールから：
- S3 → バケットを作成
- バケット名: `your-career-board-bucket`（一意な名前）
- リージョン: `ap-northeast-1`（東京）
- ブロックパブリックアクセス: すべてブロック（デフォルト）

2. **IAMユーザーとアクセスキーの作成**

AWSコンソール → IAM → ユーザー → ユーザーを作成

必要なポリシー（カスタムポリシーを作成）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-career-board-bucket/*"
    }
  ]
}
```

アクセスキーを作成し、`.env`に設定：

```bash
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_BUCKET=your-career-board-bucket
AWS_REGION=ap-northeast-1
```

3. **CORS設定（必要に応じて）**

S3バケット → アクセス許可 → CORS設定：

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "ExposeHeaders": []
  }
]
```

### 環境変数なしの場合

AWS S3の環境変数が設定されていない場合、ファイルアップロード機能は無効化されますが、
アプリケーションは通常通り動作します（ファイルなしで応募可能）。

## 管理者アカウント

- email: `admin@example.com`
- password: `.env` の `ADMIN_PASSWORD`（未設定なら `admin123`）

## デプロイ手順

### Vercel デプロイ

#### 1. AWS DynamoDBテーブルのセットアップ

`DynamoDB_TABLES.md` の手順に従って3つのテーブルを作成：
- `career-board-users` (GSI: EmailIndex)
- `career-board-jobs`
- `career-board-applications` (GSI: UserIdIndex, JobIdIndex)

```bash
# AWS CLI で作成する場合
aws dynamodb create-table --table-name career-board-users ...
aws dynamodb create-table --table-name career-board-jobs ...
aws dynamodb create-table --table-name career-board-applications ...
```

#### 2. AWS S3バケットのセットアップ

```bash
aws s3 mb s3://your-career-board-bucket --region ap-northeast-1
```

#### 3. IAMユーザーとアクセスキーの作成

DynamoDB + S3のアクセス権限を持つIAMユーザーを作成：

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
        "arn:aws:dynamodb:ap-northeast-1:*:table/career-board-*",
        "arn:aws:dynamodb:ap-northeast-1:*:table/career-board-*/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-career-board-bucket/*"
    }
  ]
}
```

#### 4. Vercel環境変数の設定

Vercelダッシュボード → Settings → Environment Variables で以下を追加：

```
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

DYNAMODB_USERS_TABLE=career-board-users
DYNAMODB_JOBS_TABLE=career-board-jobs
DYNAMODB_APPLICATIONS_TABLE=career-board-applications

AWS_S3_BUCKET=your-career-board-bucket

SESSION_SECRET=ランダムな長い文字列
ADMIN_PASSWORD=管理者パスワード
NODE_ENV=production
```

#### 5. デプロイ

```bash
git push  # Vercel GitHubインテグレーションが自動デプロイ
# または
vercel --prod
```

初回デプロイ後、管理者アカウントとサンプルデータが自動的にシードされます。

#### トラブルシューティング

**エラー: DynamoDBテーブルにアクセスできない**
→ Vercelダッシュボードで`AWS_ACCESS_KEY_ID`と`AWS_SECRET_ACCESS_KEY`が正しく設定されているか確認
→ IAMポリシーでDynamoDBテーブルへのアクセス権限が付与されているか確認

**エラー: S3バケットにアクセスできない**
→ `AWS_S3_BUCKET`環境変数が設定されているか確認
→ IAMポリシーでS3バケットへのアクセス権限が付与されているか確認

---

### その他のプラットフォーム（Render、AWS Lambda等）

同様にAWS認証情報とDynamoDBテーブル名を環境変数に設定してください：

```
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
DYNAMODB_USERS_TABLE=career-board-users
DYNAMODB_JOBS_TABLE=career-board-jobs
DYNAMODB_APPLICATIONS_TABLE=career-board-applications
AWS_S3_BUCKET=...
SESSION_SECRET=...
ADMIN_PASSWORD=...
```

- `Build Command`: `bun install`
- `Start Command`: `bun run index.ts`
