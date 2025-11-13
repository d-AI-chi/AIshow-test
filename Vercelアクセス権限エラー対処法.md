# Vercelアクセス権限エラー対処法

## エラーの意味

「Git author renoschubert must have access to the project on Vercel to create deployments.」

このエラーは、GitHubのコミットの作者（renoschubert）がVercelプロジェクトへのアクセス権限を持っていないことを示しています。

## 解決方法

### 方法1: Vercelプロジェクトにユーザーを追加（推奨）

1. [Vercelダッシュボード](https://vercel.com/dashboard)にアクセス
2. プロジェクトを開く
3. 「**Settings**」タブをクリック
4. 左側メニューから「**Team**」または「**Members**」をクリック
5. 「**Invite Member**」または「**Add Member**」をクリック
6. GitHubユーザー名「renoschubert」を入力して招待
7. または、GitHubアカウントのメールアドレスを入力

### 方法2: Gitのコミット作者を変更

現在のGit設定を確認し、Vercelアカウントと同じメールアドレスに変更します。

#### ステップ1: 現在の設定を確認
```bash
git config user.name
git config user.email
```

#### ステップ2: Git設定を変更
```bash
# プロジェクト内でのみ設定を変更
git config user.name "あなたのVercelアカウント名"
git config user.email "あなたのVercelアカウントのメールアドレス"

# または、グローバル設定を変更
git config --global user.name "あなたのVercelアカウント名"
git config --global user.email "あなたのVercelアカウントのメールアドレス"
```

#### ステップ3: 最後のコミットの作者を変更
```bash
git commit --amend --author="あなたの名前 <あなたのメールアドレス>" --no-edit
git push origin main --force
```

**注意**: `--force`を使う場合は注意が必要です。他の人が同じブランチで作業している場合は避けてください。

### 方法3: Vercelプロジェクトの設定を確認

1. Vercelダッシュボードでプロジェクトを開く
2. 「Settings」→「Git」を確認
3. 「Connected Git Repository」で正しいGitHubアカウントが接続されているか確認
4. 必要に応じて、GitHubアカウントを再接続

## 推奨される対処順序

1. **まず方法1を試す**（最も安全）
   - Vercelプロジェクトにユーザーを追加
   - これで、どのGitHubアカウントからでもデプロイできるようになります

2. **方法1ができない場合、方法2を試す**
   - Gitのコミット作者をVercelアカウントと同じに変更
   - 新しいコミットを作成してプッシュ

3. **それでも解決しない場合、方法3を確認**
   - VercelとGitHubの接続を確認

## 確認事項

- Vercelにログインしているアカウントのメールアドレスを確認
- GitHubにログインしているアカウントのメールアドレスを確認
- 両方が一致しているか、またはVercelプロジェクトに両方のアカウントが追加されているか確認

## トラブルシューティング

### ユーザーを追加できない場合

- Vercelの無料プランでは、チームメンバーの追加に制限がある場合があります
- その場合は、方法2（Git設定の変更）を使用してください

### コミット作者を変更してもエラーが続く場合

- Vercelプロジェクトの「Settings」→「Git」でGitHub接続を確認
- GitHubアカウントを再認証する

