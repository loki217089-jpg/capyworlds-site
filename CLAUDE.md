# CapyWorlds — Claude 開發指引

## 大型檔案寫入規則（最優先執行）

**問題根因**：`Write` 工具或 Agent 的單次輸出有 token 上限（約 21,000 tokens）。
當需要產生的檔案超過這個上限時，工具會觸發 `max_tokens` 錯誤並進入重試迴圈，導致浪費大量時間卻沒有產出。

### 強制規則：讀完規格 → 先切分，再動手

任何預估超過 **400 行**的新檔案，**必須**按以下流程處理：

```
1. 讀完規格 / 釐清需求
2. 在腦中（或寫成註解）規劃所有區塊，確認每塊 ≤ 200 行
3. 建立空白檔（或寫入第一個區塊）
4. 用 `cat >> file << 'EOF' ... EOF` 依序 append 後續區塊
5. 每個 heredoc 區塊寫完後確認行數，再繼續下一塊
```

### 區塊切法參考

| 檔案類型 | 建議切分點 |
|----------|-----------|
| 單頁 HTML 遊戲 | HTML/CSS → 常數/工具函式 → 世界生成 → 玩家/敵人 → 渲染 → HUD/UI → 主迴圈 |
| 長 JS 模組 | imports → types/constants → 各功能函式群 → exports |
| 長 CSS | reset/vars → layout → components → animations |

### 禁止事項

- ❌ 不可用單一 `Write` 工具呼叫寫超過 400 行的內容
- ❌ 不可啟動背景 Agent 去「一口氣」寫整個大型檔案
- ❌ 發現 `max_tokens` 錯誤後不可重試相同的 Write 呼叫

### 正確範例

```bash
# 建立檔案 + 第一段（HTML/CSS）
cat > game.html << 'BLOCK1'
<!DOCTYPE html>...（≤200行）
BLOCK1

# 第二段 append（常數/工具）
cat >> game.html << 'BLOCK2'
// === Constants ===...（≤200行）
BLOCK2

# 持續 append 直到完成
```

---

## 專案結構

```
/games/          各遊戲子目錄或單 HTML 檔
/worker/         Cloudflare Worker 後端
/index.html      首頁
/games/index.html 遊戲清單頁
```

## 遊戲新增流程

1. 在 `games/<game-name>/` 建立目錄 + `index.html`
2. 在 `games/index.html` 加入遊戲卡片（參考現有格式）
3. commit → push 到指定 `claude/` 分支

## 音效規範

- **即時動作音效 ≤ 300ms**（撿道具、升級、購買、射擊、受傷等一瞬間的動作）
- 加入音效時，若音檔時長超過 300ms，**必須**在 `audio.play()` 的第四個參數傳入截斷毫秒數（`maxMs`）
  - 例：`audio.play('pickup', 0.7, 1, 220)` → 只播前 220ms
- 背景音樂、爆炸長尾音、環境音不受此限制

## 技術約束

- 所有遊戲都是純前端，無外部依賴
- 使用繁體中文 UI
- 視覺風格跟隨現有設計（深色背景、金色/青色強調色）

---

## 使用者電腦環境（素材上傳路徑）

使用者有兩台電腦，請在對話開始時先確認是哪台，才給正確路徑指令。

### 辨認方式
叫使用者在 CMD 跑：
```cmd
echo %COMPUTERNAME%
```

### 筆電（目前已確認）
| 項目 | 路徑 |
|------|------|
| Git repo（本機） | `C:\Users\User\capyworlds` |
| 素材下載落地位置 | `C:\Users\User\Desktop\capyworlds\assets\` |
| 上傳素材指令 | 見下方「素材上傳 SOP」 |

### ACER 主機（路徑待確認）
第一次用 ACER 時請先跑 `echo %COMPUTERNAME%` 和 `echo %USERPROFILE%`，回報給 Claude 更新此欄位。

---

## 素材上傳 SOP（Windows CMD）

每次上傳新素材資料夾到 GitHub assets，照這個流程：

```cmd
:: 1. 把素材從落地位置複製進 git repo（筆電）
xcopy "C:\Users\User\Desktop\capyworlds\assets\<資料夾名稱>" "C:\Users\User\capyworlds\assets\<資料夾名稱>\" /E /I /Y

:: 2. 進 git repo
cd C:\Users\User\capyworlds

:: 3. 確認 git 有看到新資料夾
git status

:: 4. 加入 commit push
git add "assets\<資料夾名稱>"
git commit -m "Add <資料夾名稱>"
git push origin main
```

**常見錯誤：** `pathspec did not match any files` → 代表複製沒成功，先確認 `git status` 有沒有看到資料夾。

---

## 歷史對話重點紀錄

- **2026/3/19** 彈幕按鈕移到右上角，配色改用主題變數（與主題切換器一致）
- **2026/3/19** 節拍戰士 bug 修：第二關「繼續」按鈕按了 overlay 不消失 → 已修 `showOverlay`
- **2026/3/19** 節拍戰士音效：從 WebAudio 合成音改為素材庫真實音效（PickUp/Impact/PowerUp/Success/Negative 系列）
- **2026/3/19** 素材 `PostApocalypse_AssetPack_v1.1.2` 待上傳（路徑確認後請繼續）
