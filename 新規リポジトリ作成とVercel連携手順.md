# 新規GitHubリポジトリ作成とVercel連携手順

## ステップ1: 新しいGitHubリポジトリを作成

### 1-1. GitHubにアクセス
1. https://github.com にアクセスしてログイン
2. 右上の「**+**」アイコンをクリック
3. 「**New repository**」を選択

### 1-2. リポジトリ情報を入力
- **Repository name**: `AIshow-test` または別の名前（例: `aishow-diagnosis`）
- **Description**: （任意）「AI-Show 診断 - 価値観マッチングアプリ」
- **Visibility**: 
  - **Public**: 誰でも見れる（無料）
  - **Private**: 自分だけ（有料プランが必要な場合あり）
- **重要**: 以下のチェックボックスは**すべて外す**
  - ❌ Add a README file
  - ❌ Add .gitignore
  - ❌ Choose a license

### 1-3. リポジトリを作成
「**Create repository**」をクリック

## ステップ2: ローカルのコードを新しいリポジトリに接続

### 2-1. 現在のリモート接続を削除
```bash
cd "/Users/daichishimizu/Documents/01. Private/AIshow-test"
git remote remove origin
```

### 2-2. 新しいリポジトリに接続
```bash
# 新しいリポジトリのURLを使用（リポジトリ名に合わせて変更）
git remote add origin https://github.com/あなたのユーザー名/新しいリポジトリ名.git
```

### 2-3. コードをプッシュ
```bash
git branch -M main
git push -u origin main
```

## ステップ3: Vercelに新しいリポジトリを連携

### 3-1. Vercelダッシュボードにアクセス
1. https://vercel.com/dashboard にアクセス
2. ログイン

### 3-2. 新しいプロジェクトを作成
1. 「**Add New...**」→「**Project**」をクリック
2. 「**Import Git Repository**」をクリック
3. 作成した新しいリポジトリを選択
4. 「**Import**」をクリック

### 3-3. プロジェクト設定
- **Framework Preset**: Vite（自動検出される）
- **Root Directory**: `./`（そのまま）
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3-4. 環境変数を設定
「**Environment Variables**」セクションで以下を追加：

| 変数名 | 値 |
|--------|-----|
| `VITE_SUPABASE_URL` | `https://olzjxrwakkhcyqeguotn.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9semp4cndha2toY3lxZWd1b3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDM3MTgsImV4cCI6MjA3ODUxOTcxOH0.kCvW_8fvxtOWobrt9GGSZc9y3HYBk3P16837itsTxv0` |

### 3-5. デプロイ
「**Deploy**」をクリック

## ステップ4: デプロイ完了を確認

1. 数分待つ（ビルド中）
2. 「Deployments」タブで「🟢 Ready」になるのを確認
3. プロジェクトページの上部に表示されるURLを確認
4. サイトにアクセスして動作確認

## トラブルシューティング

### リモート接続エラーが発生する場合
```bash
# リモート接続を確認
git remote -v

# 正しく設定されていない場合は削除して再設定
git remote remove origin
git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
```

### プッシュエラーが発生する場合
```bash
# 強制プッシュ（注意: 既存の履歴を上書きします）
git push -u origin main --force
```

### Vercelでビルドエラーが発生する場合
1. 「Deployments」タブでエラーログを確認
2. ローカルで `npm run build` が成功するか確認
3. 環境変数が正しく設定されているか確認

## 確認チェックリスト

- [ ] 新しいGitHubリポジトリを作成
- [ ] ローカルのリモート接続を新しいリポジトリに変更
- [ ] コードをGitHubにプッシュ
- [ ] Vercelで新しいプロジェクトを作成
- [ ] 環境変数を設定
- [ ] デプロイが成功する
- [ ] サイトが正常に動作する

