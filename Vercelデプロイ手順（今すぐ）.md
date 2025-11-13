# Vercelにデプロイする手順（今すぐ）

## 現在の状態

- ✅ コードの変更は完了（`AdminPage.tsx`が更新されました）
- ❌ まだGitHubにプッシュしていない
- ❌ Vercelにはまだ反映されていない

## デプロイ手順

### ステップ1: 変更をコミット

ターミナルで以下のコマンドを実行：

```bash
cd "/Users/daichishimizu/Documents/01. Private/AIshow-test"
git add src/pages/AdminPage.tsx
git commit -m "マッチング閾値の設定を改善（スライダー、クイック設定ボタン追加）"
```

### ステップ2: GitHubにプッシュ

```bash
git push origin main
```

### ステップ3: Vercelで自動デプロイを確認

1. [Vercelダッシュボード](https://vercel.com/dashboard)にアクセス
2. プロジェクトを開く
3. 「**Deployments**」タブを確認
4. 新しいデプロイが自動的に開始されます（数分かかります）

## デプロイ完了の確認

- 「Deployments」タブで最新のデプロイの状態が「🟢 Ready」になるまで待つ
- 通常2〜5分で完了します
- 完了後、サイトが自動的に更新されます

## 注意事項

- デプロイ中は「🟡 Building」と表示されます
- エラーが発生した場合は「🔴 Error」と表示され、ログを確認できます
- デプロイが完了すると、変更がサイトに反映されます

