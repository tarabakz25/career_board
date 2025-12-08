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

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/career_board
SESSION_SECRET=change-me
ADMIN_PASSWORD=admin123   # 省略時 admin123
PORT=3000
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

## 管理者アカウント

- email: `admin@example.com`
- password: `.env` の `ADMIN_PASSWORD`（未設定なら `admin123`）

## デプロイのヒント（Render 想定）

- `Database` は PostgreSQL を作成し、接続文字列を `DATABASE_URL` として環境変数に設定。
- `Build Command`: `bun install`
- `Start Command`: `bun run index.ts`
