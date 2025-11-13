# AI-Show 診断

価値観が最も似ているペアを見つけるマッチング診断アプリです。

## セットアップ

```bash
npm install
npm run dev
```

## デプロイ（Vercel）

### 初回デプロイ

1. GitHubにリポジトリをプッシュ
2. [Vercel](https://vercel.com)でプロジェクトをインポート
3. 環境変数を設定：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. デプロイ

### 自動デプロイの設定

VercelでGitHubリポジトリを接続すると、**自動的に自動デプロイが有効**になります。

#### 確認方法
1. Vercelダッシュボードでプロジェクトを開く
2. 「Settings」→「Git」を確認
3. 「Production Branch」が `main` または `master` になっていることを確認

#### 自動デプロイの動作
- `main` ブランチにプッシュ → 本番環境に自動デプロイ
- 他のブランチにプッシュ → プレビュー環境に自動デプロイ

#### 手動で再デプロイする場合
1. Vercelダッシュボードでプロジェクトを開く
2. 「Deployments」タブを開く
3. 最新のデプロイの「...」メニューから「Redeploy」を選択

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `VITE_SUPABASE_URL` | SupabaseプロジェクトURL |
| `VITE_SUPABASE_ANON_KEY` | Supabase匿名キー |

## ビルド

```bash
npm run build
```

ビルド成果物は `dist` ディレクトリに出力されます。
