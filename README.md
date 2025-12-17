# Career Board

フルスタック課題「career-board」の実装です。Express + PostgreSQL バックエンドと、バニラ JS のフロントエンドで以下を満たしています。

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
# PostgreSQL接続文字列
DATABASE_URL=postgres://postgres:postgres@localhost:5432/career_board

# セッション暗号化キー（ランダムな文字列を設定）
SESSION_SECRET=change-me

# 管理者パスワード（省略時はadmin123）
ADMIN_PASSWORD=admin123

# サーバーポート
PORT=3000

# AWS S3設定（ファイルアップロード機能を使用する場合）
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET=your-bucket-name
```

3. データベースを作成し、必要ならスキーマを流し込み

```bash
createdb career_board
psql "$DATABASE_URL" -f db/schema.sql
```

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
- `views/` … `index.ejs`(LP), `login.ejs`, `dashboard.ejs`。
- `public/` … フロントの静的アセット（`login.js`, `dashboard.js`, `styles.css` など）。
- `db.ts` … PG 接続とテーブル作成/シード処理。

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

#### 1. データベースのセットアップ

以下のいずれかのマネージドPostgreSQLを使用：

**Vercel Postgres（推奨）:**
```bash
# Vercel ダッシュボードで Storage → Create Database → Postgres
# 自動的に DATABASE_URL が環境変数に追加されます
```

**Neon（無料枠あり）:**
- [neon.tech](https://neon.tech) でプロジェクトを作成
- 接続文字列をコピー（形式: `postgresql://user:pass@host/db?sslmode=require`）

**Supabase:**
- [supabase.com](https://supabase.com) でプロジェクトを作成
- Database Settings から接続文字列を取得

#### 2. Vercel環境変数の設定

Vercelダッシュボード → Settings → Environment Variables で以下を追加：

```
DATABASE_URL=postgresql://user:password@host:5432/career_board?sslmode=require
SESSION_SECRET=ランダムな長い文字列
ADMIN_PASSWORD=管理者パスワード
NODE_ENV=production

# ファイルアップロード機能を使用する場合
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET=your-bucket-name
```

#### 3. Prisma マイグレーション

データベースのテーブルを作成：

```bash
# ローカルから実行（DATABASE_URLを本番DBのものに設定）
npx prisma db push

# または Vercel CLI で
vercel env pull .env.production
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2-) npx prisma db push
```

#### 4. デプロイ

```bash
git push  # Vercel GitHubインテグレーションが自動デプロイ
# または
vercel --prod
```

#### トラブルシューティング

**エラー: `Can't reach database server at localhost:5432`**
→ Vercelダッシュボードで`DATABASE_URL`環境変数が設定されているか確認

**エラー: `no such table: users`**
→ `prisma db push`でテーブルを作成

---

### Render デプロイ

- `Database` は PostgreSQL を作成し、接続文字列を `DATABASE_URL` として環境変数に設定。
- `Build Command`: `bun install && bun run build`
- `Start Command`: `bun run index.ts`
