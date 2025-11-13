# Vercel連携手順

## ✅ 完了したステップ
- ✅ 新しいGitHubリポジトリを作成
- ✅ ローカルのコードをGitHubにプッシュ

## 次のステップ: Vercelに連携

### ステップ1: Vercelダッシュボードにアクセス
1. https://vercel.com/dashboard にアクセス
2. ログイン

### ステップ2: 新しいプロジェクトを作成
1. 「**Add New...**」→「**Project**」をクリック
2. 「**Import Git Repository**」をクリック
3. リポジトリ一覧から「**d-AI-chi/AIshow-test**」を選択
4. 「**Import**」をクリック

### ステップ3: プロジェクト設定
以下の設定を確認・入力：

- **Framework Preset**: `Vite`（自動検出されるはず）
- **Root Directory**: `./`（そのまま）
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### ステップ4: 環境変数を設定（重要！）
「**Environment Variables**」セクションで以下を追加：

| 変数名 | 値 |
|--------|-----|
| `VITE_SUPABASE_URL` | `https://olzjxrwakkhcyqeguotn.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9semp4cndha2toY3lxZWd1b3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDM3MTgsImV4cCI6MjA3ODUxOTcxOH0.kCvW_8fvxtOWobrt9GGSZc9y3HYBk3P16837itsTxv0` |

**重要**: 環境変数を設定しないと、Supabaseに接続できません！

### ステップ5: デプロイ
1. 「**Deploy**」をクリック
2. 数分待つ（ビルド中）
3. 「Deployments」タブで「🟢 Ready」になるのを確認

### ステップ6: サイトURLを確認
1. プロジェクトページの上部に表示されるURLを確認
2. 通常は `https://aishow-test.vercel.app` または類似の形式
3. サイトにアクセスして動作確認

## 確認事項

- [ ] Vercelでプロジェクトを作成
- [ ] 環境変数を設定
- [ ] デプロイが成功
- [ ] サイトが正常に表示される
- [ ] 参加者登録ができる
- [ ] 管理者ページにアクセスできる

## トラブルシューティング

### ビルドエラーが発生する場合
1. 「Deployments」タブでエラーログを確認
2. 環境変数が正しく設定されているか確認
3. ローカルで `npm run build` が成功するか確認

### サイトが表示されない場合
1. デプロイが完了しているか確認（🟢 Ready）
2. 正しいURLにアクセスしているか確認
3. ブラウザのキャッシュをクリア

