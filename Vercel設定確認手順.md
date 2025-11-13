# Vercel設定確認手順（画像付き説明）

## 「Production Branch」の確認方法

### ステップ1: プロジェクトを開く
1. https://vercel.com/dashboard にアクセス
2. ログイン後、プロジェクト一覧から該当のプロジェクトをクリック

### ステップ2: Settings（設定）を開く
1. プロジェクトページの上部にあるタブメニューで「**Settings**」をクリック
   - タブは以下のような順序で並んでいます：
     - Overview（概要）
     - Deployments（デプロイ履歴）
     - **Settings（設定）** ← ここをクリック
     - Analytics（分析）
     - Logs（ログ）

### ステップ3: Git設定を開く
1. Settingsページの左側メニューから「**Git**」をクリック
   - 左側メニューの項目：
     - General（一般）
     - **Git** ← ここをクリック
     - Environment Variables（環境変数）
     - Deploy Hooks（デプロイフック）
     - Domains（ドメイン）
     - など

### ステップ4: Production Branchを確認
1. 「Git」ページを開くと、以下のセクションが表示されます：
   - **Connected Git Repository**（接続されたGitリポジトリ）
     - GitHubリポジトリ名が表示されます
   - **Production Branch**（本番ブランチ）
     - ドロップダウンまたは表示で `main` または `master` が表示されます
     - ここが `main` になっていることを確認してください

2. **もし `master` になっている場合**：
   - ドロップダウンをクリックして `main` を選択
   - 変更が自動的に保存されます

### ステップ5: 自動デプロイの有効化を確認
1. 同じ「Git」ページで、以下の設定を確認：
   - **Automatic deployments from Git**（Gitからの自動デプロイ）
     - トグルスイッチがON（有効）になっていることを確認
     - 無効になっている場合は、スイッチをクリックしてONにします

## 重要なポイント

### 「Deploy Hooks」と「Git」の違い
- **Deploy Hooks**: 手動でデプロイをトリガーするためのURLを生成する機能
- **Git**: GitHubリポジトリとの接続設定と自動デプロイの設定

**自動デプロイの設定は「Git」タブで確認・変更します。**

### 確認すべき項目のまとめ
✅ **Git**タブで確認：
- Production Branch が `main` になっている
- Automatic deployments from Git が有効（ON）になっている
- Connected Git Repository に正しいリポジトリが表示されている

## トラブルシューティング

### 「Git」タブが見つからない場合
- プロジェクトがまだGitHubリポジトリに接続されていない可能性があります
- その場合は、プロジェクト作成時にGitHubリポジトリを接続する必要があります

### Production Branchが表示されない場合
- GitHubリポジトリが正しく接続されていない可能性があります
- 「Connected Git Repository」セクションでリポジトリが表示されているか確認してください

### 自動デプロイが動作しない場合
1. 「Git」タブで「Automatic deployments from Git」がONになっているか確認
2. Production Branchが正しいブランチ名（`main`）になっているか確認
3. GitHubリポジトリに正しくプッシュされているか確認

