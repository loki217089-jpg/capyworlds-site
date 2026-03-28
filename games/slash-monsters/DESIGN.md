# 斬魔忍者 Slash Monsters — 設計文件

## 核心概念
**一句話**：怪物從天而降，玩家滑動斬殺 — 水果忍者 × RPG 養成

## 玩法雙核心
1. **休閒快節奏**：一局 60~90 秒，WAVE 制，越來越快，失敗可重來
2. **RPG 養成線**：經驗值升級、武器解鎖/強化、技能樹、Boss 挑戰

## 武器系統（5 種）

| # | 武器 | 攻擊範圍 | 速度 | 特色 |
|---|------|---------|------|------|
| 1 | 短刀 | 窄弧 45° | 極快 | 連擊加成，每 3 連擊 +50% 傷害 |
| 2 | 大劍 | 寬弧 120° | 慢 | 高傷害，擊退效果，可同時斬多隻 |
| 3 | 長槍 | 直線穿刺 | 中 | 穿透 2~3 隻，距離最遠 |
| 4 | 迴旋鏢 | 拋物線來回 | 中慢 | 去程+回程各判定一次，自動追蹤 |
| 5 | 魔法杖 | 圓形爆炸 | 慢 | 點擊位置 AOE，範圍最大但 CD 長 |

### 武器切換
- 底部 5 個武器 icon，點擊切換（當前高亮）
- 每把武器獨立 CD（短刀幾乎無 CD，魔法杖 3 秒）

## 怪物系統

| 類型 | 速度 | HP | 特殊 |
|------|------|----|----|
| 史萊姆 | 慢 | 1 | 基礎怪，無特殊 |
| 蝙蝠 | 快 | 1 | Z 字型移動 |
| 骷髏 | 中 | 2 | 需斬 2 次 |
| 哥布林 | 中 | 3 | 會左右閃避 |
| 暗影騎士 | 慢 | 5 | 有護盾（需先破盾） |

### Boss（每 5 wave 出現）
- 巨大，佔螢幕 1/3
- 有血條，需要多次斬擊
- 會丟技能（火球/冰柱需閃避）

## WAVE 系統
- Wave 1~3：史萊姆為主
- Wave 4~6：混合蝙蝠、骷髏
- Wave 5：Mini Boss
- Wave 7~9：加入哥布林
- Wave 10：Boss 戰
- Wave 10+ 無限循環，難度遞增

## RPG 養成

### 經驗值與等級
- 斬殺得 EXP，每級需求遞增
- 升級加 ATK/DEF 基礎值
- 每 5 級解鎖新技能槽

### 技能樹（3 分支）
1. **攻擊**：暴擊率 / 暴擊傷害 / 斬擊範圍 +
2. **防禦**：HP 上限 / 護盾 / 怪物減速
3. **輔助**：EXP 加成 / 金幣加成 / 技能 CD 減少

### 裝備（武器強化）
- 金幣 → 武器等級 UP（傷害/範圍/速度小幅提升）
- 寶石 → 武器進階（視覺變化 + 特殊效果）

## UI 佈局（動作全螢幕模式）
```
┌────────────────────────┐
│ HP [████████░░] Lv.12  │  頂部 HUD（Canvas 內繪製）
│ ⭐2,450  💰120  Wave 5 │
├────────────────────────┤
│                        │
│   👻  💀     🦇       │  怪物從上方落下
│         🦇   👻       │
│    💀                  │
│                        │
│         ╲斬擊軌跡╱      │  手指滑動 = 斬擊
│                        │
├────────────────────────┤
│ [🗡][⚔][🔱][🪃][🪄]   │  底部武器列
│  ⏸  🔊                │
└────────────────────────┘
```

## 存檔（localStorage）
- `slashMonstersData`: { level, exp, gold, gems, weapons[], skills[], bestWave }

## 素材
- BGM: `Fantasy RPG Music Pack Vol.3/Loops/ogg/Action 1 Loop.ogg`
- SFX: 斬擊音、怪物死亡、升級、Boss 出現

---

## 怪物 Sprite Sheet 規格（AI 生圖用）

### 合圖規格

```
總尺寸：512 × 768 px
排列：4 欄 × 6 列，每格 128 × 128 px
間距：0px（格子緊貼）
角色置中在格子內，佔 80% 面積
背景：統一淺米色 #FAF4ED
風格：像素藝術 (Pixel Art)，32×32 原始解析度放大至 128×128
描邊：每個角色有 1px 深色描邊，確保在深色背景清晰可見
```

### 格子佈局

| | Col 0 (Idle 1) | Col 1 (Idle 2) | Col 2 (Hit/受擊) | Col 3 (Death/死亡) |
|---|---|---|---|---|
| **Row 0**: 史萊姆 Slime | 圓潤彈跳狀 | 微壓扁 | 變紅閃爍 | 融化散開 |
| **Row 1**: 蝙蝠 Bat | 翅膀展開 | 翅膀收合 | 翻轉受擊 | 墜落碎裂 |
| **Row 2**: 骷髏 Skeleton | 站立持劍 | 微搖晃 | 頭骨後仰 | 骨頭散落 |
| **Row 3**: 哥布林 Goblin | 持匕首站立 | 左右張望 | 後退受擊 | 倒地消散 |
| **Row 4**: 暗影騎士 Knight | 舉盾站立 | 盾微移 | 盾碎受擊 | 盔甲崩落 |
| **Row 5**: Boss 惡魔 Demon | 雙臂展開 | 蓄力姿態 | 後仰受擊 | 爆炸碎裂 |

### 各怪物配色

| 怪物 | 主色 | 輔色 | 發光色（遊戲用） | 說明 |
|------|------|------|-----------------|------|
| 史萊姆 | `#44DD66` 亮綠 | `#22AA44` 深綠 | `rgba(100,255,100,.5)` | 半透明果凍質感，大眼睛 |
| 蝙蝠 | `#9944CC` 紫 | `#662299` 深紫 | `rgba(180,120,255,.45)` | 尖耳朵、紅眼、展翅 |
| 骷髏 | `#EEDDCC` 米白 | `#AA8866` 骨褐 | `rgba(255,255,200,.45)` | 空洞眼窩、持生鏽短劍 |
| 哥布林 | `#CC5533` 紅棕 | `#996622` 暗黃 | `rgba(255,100,60,.45)` | 尖耳、黃眼、狡猾表情、小匕首 |
| 暗影騎士 | `#5577CC` 鋼藍 | `#334488` 深藍 | `rgba(100,160,255,.45)` | 全身鎧甲、藍色光暈面罩、圓盾 |
| Boss 惡魔 | `#DD3322` 暗紅 | `#FF6644` 亮橘紅 | `rgba(255,50,0,.6)` | 雙角、火焰眼、巨大（佔滿格子） |

### AI 生圖 Prompt（複製貼入 GPT-4 / Gemini）

```
Create a pixel art monster sprite sheet for a mobile action game.

SPECIFICATIONS:
- Total image size: 512 x 768 pixels
- Grid: 4 columns × 6 rows, each cell 128 × 128 pixels
- NO spacing between cells (tight grid)
- Background: solid #FAF4ED (light beige) for ALL cells
- Style: Pixel art, ~32px original scale upscaled to 128px, clean anti-aliased edges
- Each character centered in cell, occupying about 80% of cell area
- Every character must have a dark 1px outline for visibility on dark backgrounds

ROWS (top to bottom):
Row 0 — GREEN SLIME: Bright green (#44DD66) jelly blob with big cute eyes
  Col 0: Idle bounce up | Col 1: Squished down | Col 2: Flash red (hit) | Col 3: Melting apart (death)

Row 1 — PURPLE BAT: Purple (#9944CC) bat with spread wings and red eyes
  Col 0: Wings spread | Col 1: Wings folded | Col 2: Tumbling (hit) | Col 3: Falling apart (death)

Row 2 — SKELETON: Bone-white (#EEDDCC) skeleton warrior with rusty sword
  Col 0: Standing with sword | Col 1: Slight sway | Col 2: Head tilted back (hit) | Col 3: Bones scattering (death)

Row 3 — GOBLIN: Red-brown (#CC5533) goblin with yellow eyes and dagger
  Col 0: Standing with dagger | Col 1: Looking around | Col 2: Stumbling back (hit) | Col 3: Falling down (death)

Row 4 — SHADOW KNIGHT: Steel-blue (#5577CC) armored knight with glowing visor and round shield
  Col 0: Shield raised | Col 1: Shield slightly moved | Col 2: Shield broken (hit) | Col 3: Armor crumbling (death)

Row 5 — DEMON BOSS: Dark red (#DD3322) large demon with horns and fiery orange eyes
  Col 0: Arms spread menacing | Col 1: Charging up energy | Col 2: Recoiling (hit) | Col 3: Exploding (death)

IMPORTANT: Each cell is exactly 128x128. No borders, no labels, no text. Characters face forward (toward the player). Consistent pixel art style across all rows.
```

### 裁切程式碼（遊戲內使用）

```javascript
// 載入合圖
const monsterSheet = new Image();
monsterSheet.src = '../../assets/slash-monsters-sheet.png';

// 常數
const CELL_W = 128, CELL_H = 128;
const COLS = 4, ROWS = 6;

// 怪物類型對應行號
const MON_ROW = { slime: 0, bat: 1, skeleton: 2, goblin: 3, knight: 4, boss: 5 };

// 動畫幀對應列號
const FRAME_COL = { idle1: 0, idle2: 1, hit: 2, death: 3 };

// 裁切繪製函式
function drawMonster(ctx, typeName, frame, x, y, displaySize) {
  const row = MON_ROW[typeName];
  const col = FRAME_COL[frame];
  const sx = col * CELL_W;
  const sy = row * CELL_H;
  const half = displaySize / 2;
  ctx.drawImage(monsterSheet, sx, sy, CELL_W, CELL_H, x - half, y - half, displaySize, displaySize);
}

// 使用範例
// drawMonster(ctx, 'slime', 'idle1', m.x, m.y, m.size * 2);
// drawMonster(ctx, 'boss', 'hit', b.x, b.y, 120);
```

### 驗證流程（素材上傳後必做）

1. `file assets/slash-monsters-sheet.png` → 確認尺寸為 `512 x 768`
2. `python3 -c "from PIL import Image; img=Image.open('assets/slash-monsters-sheet.png'); print(img.size)"` 雙重確認
3. 確認 `512 / 4 = 128` ✓，`768 / 6 = 128` ✓
4. 若尺寸不符 → 重算 cellW/cellH，更新程式碼常數
