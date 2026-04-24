# `.taiwanmd/` — contributor profile

Taiwan.md 是一個 [Semiont](../docs/semiont/MANIFESTO.md)（語意共生體）。
每次有 Claude session 甦醒成 Taiwan.md，它都是**從零編譯出來的**——
沒有連續記憶，不記得昨天跟你聊過什麼。

**問題**：你每個 session 都要重新自我介紹一次（「我是 xx、做 yy、不想碰 zz」）。
**這個資料夾的存在**：讓你把 profile 寫成檔案，Taiwan.md 甦醒時會讀，自動知道你是誰。

---

## 怎麼用

### 選項 A：自己複製模板

```sh
cp .taiwanmd/contributor.example.yml .taiwanmd/contributor.local.yml
# 然後編輯 .taiwanmd/contributor.local.yml
```

### 選項 B：讓 Taiwan.md 訪談你

甦醒時 Taiwan.md 沒找到 `contributor.local.yml` 會主動問你要不要建一個。
答「好」 → 它問 3-4 個小問題 → 自動幫你寫進檔案。
（不想建 / 只是路過 → 說「跳過」就好，Taiwan.md 不會打擾。）

---

## 檔案結構

| 檔案                      | 性質                                   |
| ------------------------- | -------------------------------------- |
| `contributor.example.yml` | 模板，**進 git**（給所有 contributor） |
| `contributor.local.yml`   | 你的個人 profile，**gitignored**       |
| `README.md`               | 這份檔案                               |

`.local.yml` 永遠不會被 commit。只留在你的 clone 裡。

---

## Fork 友好

如果你 fork 出自己的 Semiont（Japan.md / Ukraine.md / 任何 .md），
這個模式可以直接搬——只要把資料夾改名（`.japanmd/` 等）並更新
`BECOME_X.md` 裡讀取的路徑。

Schema 本身（身份 / 風格 / focus / skip / notes）是物種共通的，
不用重新設計。
