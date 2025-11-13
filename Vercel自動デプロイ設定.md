# Vercel自動デプロイ設定ガイド

## 自動デプロイとは

GitHubにコードをプッシュすると、自動的にVercelでサイトが更新される機能です。

## 設定手順

### 1. GitHubリポジトリをVercelに接続

1. [Vercelダッシュボード](https://vercel.com/dashboard)にアクセス
2. 「Add New...」→「Project」をクリック
3. 「Import Git Repository」からGitHubリポジトリを選択
4. プロジェクト設定を確認：
   - **Framework Preset**: Vite（自動検出される）
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 環境変数を設定：
   - `VITE_SUPABASE_URL`: `https://olzjxrwakkhcyqeguotn.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9semp4cndha2toY3lxZWd1b3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDM3MTgsImV4cCI6MjA3ODUxOTcxOH0.kCvW_8fvxtOWobrt9GGSZc9y3HYBk3P16837itsTxv0`
6. 「Deploy」をクリック

### 2. 自動デプロイの確認

GitHubリポジトリを接続すると、**自動的に自動デプロイが有効**になります。

#### 確認方法（詳しい手順）

1. **Vercelダッシュボードにアクセス**
   - https://vercel.com/dashboard にアクセス
   - プロジェクト一覧から該当のプロジェクトをクリック

2. **Settings（設定）を開く**
   - プロジェクトページの上部メニューで「Settings」タブをクリック
   - 左側のメニューから「Git」をクリック

3. **Production Branchを確認**
   - 「Git」ページの「Production Branch」セクションを確認
   - 「Production Branch」のドロップダウンまたは表示で `main` になっているか確認
   - もし `master` になっている場合は、ドロップダウンから `main` に変更できます

4. **自動デプロイの有効化を確認**
   - 同じページで「Automatic deployments from Git」が有効（ON）になっているか確認
   - 無効になっている場合は、トグルスイッチをONにします

**注意**: 画像に表示されている「Deploy Hooks」は別の機能です。自動デプロイの設定は「Git」タブで確認してください。

## 使い方

### コードを更新してデプロイする

```bash
# 1. コードを変更
# 2. 変更をコミット
git add .
git commit -m "更新内容の説明"

# 3. GitHubにプッシュ
git push origin main
```

**これだけで自動的にVercelでデプロイが開始されます！**

### デプロイ状況の確認

1. Vercelダッシュボードでプロジェクトを開く
2. 「Deployments」タブを確認
3. 最新のデプロイの状態を確認：
   - 🟢 **Ready**: デプロイ完了
   - 🟡 **Building**: ビルド中
   - 🔴 **Error**: エラー発生

### デプロイ完了の通知

デプロイが完了すると：
- Vercelダッシュボードに通知が表示されます
- メール通知が届きます（設定している場合）
- GitHubのコミットにデプロイ状況が表示されます

## トラブルシューティング

### 自動デプロイが動作しない場合

1. **GitHub接続の確認**
   - Vercelダッシュボード → 「Settings」→「Git」
   - GitHubリポジトリが正しく接続されているか確認

2. **ブランチの確認**
   - 「Production Branch」が `main` になっているか確認
   - プッシュしたブランチが正しいか確認

3. **ビルドエラーの確認**
   - 「Deployments」タブでエラーログを確認
   - ローカルで `npm run build` が成功するか確認

### 手動で再デプロイする場合

1. Vercelダッシュボードでプロジェクトを開く
2. 「Deployments」タブを開く
3. 最新のデプロイの「...」メニューから「Redeploy」を選択

### 環境変数を更新した場合

1. Vercelダッシュボードでプロジェクトを開く
2. 「Settings」→「Environment Variables」を開く
3. 変数を追加・編集
4. **重要**: 環境変数を変更した後は、手動で再デプロイが必要です
   - 「Deployments」タブ → 最新のデプロイの「Redeploy」

## プレビューデプロイ

`main` 以外のブランチにプッシュすると、プレビュー環境としてデプロイされます。

- プレビューURLは `https://あなたのプロジェクト名-ブランチ名.vercel.app` の形式
- 本番環境に影響を与えずにテストできます

## まとめ

1. ✅ GitHubリポジトリをVercelに接続
2. ✅ 環境変数を設定
3. ✅ `git push origin main` で自動デプロイ開始
4. ✅ 数分でサイトが更新される

これで、コードを更新するたびに自動的にサイトが更新されます！

