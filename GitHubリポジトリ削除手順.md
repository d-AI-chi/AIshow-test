# GitHubリポジトリ削除手順

## ⚠️ 注意事項

- **リポジトリを削除すると、すべてのコード、コミット履歴、Issue、Pull Requestが完全に削除されます**
- **この操作は取り消せません**
- **削除前に必要なデータをバックアップしてください**

## 削除手順

### ステップ1: GitHubにアクセス

1. https://github.com にアクセス
2. ログイン
3. リポジトリ一覧から「**AIshow-test**」を開く

### ステップ2: リポジトリの設定を開く

1. リポジトリページの上部メニューで「**Settings**」タブをクリック
2. ページを下にスクロール

### ステップ3: 危険ゾーンで削除

1. 「**Danger Zone**」（危険ゾーン）セクションまでスクロール
2. 「**Delete this repository**」（このリポジトリを削除）をクリック
3. 確認ダイアログが表示されます
4. リポジトリ名「**d-AI-chi/AIshow-test**」を入力して確認
5. 「**I understand the consequences, delete this repository**」をクリック

## ローカルのGit設定を削除する場合

GitHubリポジトリを削除した後、ローカルのGit設定も削除できます：

```bash
# リモート接続を削除
cd "/Users/daichishimizu/Documents/01. Private/AIshow-test"
git remote remove origin

# .gitフォルダを削除（Git履歴を完全に削除）
# 注意: この操作は取り消せません
rm -rf .git
```

## リポジトリを削除した後の影響

- ✅ ローカルのコードは残ります
- ❌ GitHub上のコードは完全に削除されます
- ❌ Vercelの自動デプロイが停止します（リポジトリが存在しないため）
- ❌ コミット履歴、Issue、Pull Requestがすべて削除されます

## 削除後の対応

### Vercelプロジェクトも削除する場合

1. [Vercelダッシュボード](https://vercel.com/dashboard)にアクセス
2. プロジェクトを開く
3. 「Settings」→「General」を開く
4. ページ下部の「**Delete Project**」をクリック

### 新しいリポジトリを作成する場合

削除後、必要に応じて新しいリポジトリを作成できます。

