# 斬魔忍者 Slash Monsters — Design Document

> Last updated: 2026-03-28

---

## Core Concept
**One-liner**: Monsters fall from the sky, player slashes to kill — Fruit Ninja × RPG progression

## Dual Core Gameplay
1. **Casual fast-paced**: 60-90 second rounds, WAVE system, escalating speed, retry on failure
2. **RPG progression**: XP leveling, weapon unlock/upgrade, skill tree, Boss challenges

---

## Weapon System (5 types)

| # | Weapon | Attack Arc | Speed | Special |
|---|--------|-----------|-------|---------|
| 1 | Short Blade | Narrow 45° | Very fast | Combo bonus, every 3 hits +50% damage |
| 2 | Greatsword | Wide 120° | Slow | High damage, knockback, multi-hit |
| 3 | Spear | Straight pierce | Medium | Penetrates 2-3 enemies, longest range |
| 4 | Boomerang | Parabolic arc | Med-slow | Hits on throw + return, auto-tracking |
| 5 | Magic Staff | Circular AOE | Slow | Tap-to-explode, largest area but long CD |

### Weapon Switching
- Bottom bar with 5 weapon icons, tap to switch (current highlighted)
- Each weapon has independent cooldown (blade ~0s, staff ~3s)

---

## Monster System (Current)

| Type | Emoji | Speed | HP | Size | Behavior | Notes |
|------|-------|-------|----|------|----------|-------|
| Slime | 🟩 | Slow (1) | 1 | 28px | straight | Basic enemy |
| Bat | 🦇 | Fast (2) | 1 | 24px | zigzag | Z-pattern movement |
| Skeleton | ☠️ | Medium (1.2) | 2 | 30px | straight | Takes 2 slashes |
| Goblin | 👹 | Medium (1.5) | 3 | 30px | dodge | Sidesteps slashes |
| Knight | 🛡️ | Slow (0.8) | 5 | 36px | shielded | Shield must break first |
| Boss | 👹 | Static | 20+wave×5 | 60px | fixed position | Every 5 waves |

**Problem**: Emoji render too dark on the `#0c1018` game background. Need custom pixel-art sprite sheet.

---

## Monster Sprite Sheet Specification

### Sheet Layout

```
Total size:  512 × 768 px
Grid:        4 columns × 6 rows
Cell size:   128 × 128 px
Spacing:     0px (cells are flush, no gaps)
Background:  #FAF4ED (light beige, uniform fill)
Style:       Pixel art, ~32×32 logical pixels upscaled 4x to 128×128 (nearest-neighbor, crisp)
Outline:     Every character has a 2px (logical) dark outline for visibility
```

### Grid Layout

| | Col 0: idle1 | Col 1: idle2 | Col 2: hit | Col 3: death |
|---|---|---|---|---|
| **Row 0 — Slime** | Resting round blob | Bounce up, stretched | Flash white, squished flat | Splatter into green droplets |
| **Row 1 — Bat** | Wings spread up | Wings folded down | Flash white, tumble spin | Poof into purple smoke wisps |
| **Row 2 — Skeleton** | Standing with rusty sword | Slight body sway | Flash white, jaw drops open | Bones scatter apart |
| **Row 3 — Goblin** | Dagger at the ready | Shifts weight, looks around | Flash white, staggers back | Falls forward, dagger drops |
| **Row 4 — Knight** | Shield raised, visor glowing | Shield pulse glow effect | Flash white, shield cracks | Armor crumbles to metal pieces |
| **Row 5 — Boss Demon** | Arms wide open, menacing | Chest heaves, flames flicker around horns | Flash white, recoils backward | Explosion into fiery embers |

### Color Palette Per Monster

All colors chosen for high visibility against the dark game background `#0c1018`.

| Monster | Primary | Secondary | Outline | Eyes / Accent | Notes |
|---------|---------|-----------|---------|---------------|-------|
| Slime | `#44ff66` bright green | `#22cc44` mid green | `#117733` dark green | `#ffffff` white highlight dots | Translucent jelly blob, big cute eyes, bright highlight on top-left |
| Bat | `#9944cc` purple | `#bb66ee` light purple | `#552288` deep purple | `#ff4444` red eyes | Spread wings show lighter membrane between bones |
| Skeleton | `#f0ead0` cream/bone | `#d4c8a0` tan | `#443322` dark brown | `#111111` hollow sockets | White bones with dark brown joints, rusty short sword |
| Goblin | `#cc5533` reddish-brown | `#aa3311` darker brown | `#661100` very dark red | `#ffee00` yellow slit eyes | Pointed ears, sly grin, small gold dagger in hand |
| Knight | `#88aadd` silver-blue | `#6688bb` steel blue | `#334466` dark slate | `#44ccff` glowing visor | Layered armor plates, round shield, blue energy visor slit |
| Boss | `#dd2222` deep red | `#aa1111` dark red | `#660000` blood red | `#ffaa00` fiery orange | Large muscular demon, curved horns, fills ~95% of cell |

### Style Guidelines

- **Pixel art**, ~32×32 logical pixels scaled 4x to 128×128 (nearest-neighbor upscale, crisp pixels, NO anti-aliasing blur)
- Consistent 2px (logical) dark outline on all sprites
- Each monster **centered in its cell**, occupying ~80% of the 128×128 area
- Boss (row 5) is larger — fills ~95% of the cell to convey size difference
- Death frames show the monster breaking apart / dissolving (show debris, NOT an empty cell)
- Hit frames: brief white flash overlay on the sprite, with a slight squish/recoil pose
- All sprites face forward (toward the player / viewer)

---

## AI Image Generation Prompt

> Copy-paste the following to GPT-4 / Gemini image generation:

```
Create a pixel art monster sprite sheet for a dark-themed mobile action game.

STRICT LAYOUT:
- Total image: exactly 512 x 768 pixels
- Grid: 4 columns x 6 rows, each cell exactly 128 x 128 pixels
- No gaps, no borders between cells
- Background: solid #FAF4ED (light beige) filling every cell uniformly

ROWS (top to bottom):
Row 0 — SLIME: bright green (#44ff66) jelly blob monster with darker (#117733) outline, white highlight dots, big cute eyes. Frames left to right: idle resting round shape, idle bounced up stretched shape, hit squished flat with white flash, death splattering into green droplets.

Row 1 — BAT: purple (#9944cc) bat creature with spread wings showing lighter (#bb66ee) membrane, red (#ff4444) eyes, pointed ears. Frames: idle wings spread up, idle wings folded down, hit tumbling with white flash, death poofing into purple smoke wisps.

Row 2 — SKELETON: cream/bone-white (#f0ead0) skeleton warrior with dark (#443322) outline, black (#111111) hollow eye sockets, holding a rusty short sword. Frames: idle standing with sword, idle slight body sway, hit jaw dropping open with white flash, death bones scattering apart.

Row 3 — GOBLIN: reddish-brown (#cc5533) skin, yellow (#ffee00) slit eyes, pointed ears, sly grin, holding a small gold dagger. Frames: idle dagger ready, idle shifting weight and looking around, hit staggering back with white flash, death falling forward and dagger dropping.

Row 4 — SHADOW KNIGHT: silver-blue (#88aadd) armored warrior, glowing blue (#44ccff) visor slit, carrying a round shield. Frames: idle shield raised, idle shield pulse glowing, hit shield cracking with white flash, death armor crumbling to metal pieces.

Row 5 — BOSS DEMON: large dark red (#dd2222) demon/ogre with curved horns, fiery orange (#ffaa00) eyes, muscular build — fills approximately 95% of the cell (much larger than other monsters). Frames: idle arms wide open menacing, idle chest heaving with flames flickering around horns, hit recoiling backward with white flash, death exploding into fiery embers.

STYLE:
- Retro pixel art, each sprite drawn at approximately 32x32 logical pixels, upscaled 4x with nearest-neighbor to fill the 128x128 cell (crisp pixels, no anti-aliasing blur)
- Consistent 2px (logical) dark outline on every sprite for visibility
- Each sprite centered in its cell, occupying roughly 80% of the cell area (Boss occupies approximately 95%)
- All sprites face forward toward the viewer
- Death frames show debris and particles, NOT an empty cell
- No text, no labels, no numbering anywhere on the image
```

---

## Verification Checklist (after receiving the image)

Run these commands after the sprite sheet is uploaded to `assets/slash-monsters-sheet.png`:

```bash
# 1. Check actual dimensions
file assets/slash-monsters-sheet.png

# 2. Double-confirm with Pillow
python3 -c "from PIL import Image; img=Image.open('assets/slash-monsters-sheet.png'); print(img.size)"
# Expected output: (512, 768)

# 3. Verify integer division
# 512 / 4 = 128 (columns) -- must be integer
# 768 / 6 = 128 (rows) -- must be integer

# 4. If actual dimensions differ from spec:
#    cellW = actualWidth / 4
#    cellH = actualHeight / 6
#    Both MUST be integers. If not, request regeneration or resize.
```

---

## Crop Formula (for game code)

```javascript
// --- Sprite Sheet Constants ---
const SHEET_IMG = new Image();
SHEET_IMG.src = '../../assets/slash-monsters-sheet.png';
const SHEET_COLS = 4;   // idle1, idle2, hit, death
const SHEET_ROWS = 6;   // slime, bat, skeleton, goblin, knight, boss
let CELL_W = 128;       // recalculate after load if actual size differs
let CELL_H = 128;

// Monster name -> row index
const MONSTER_ROW = {
  slime: 0,
  bat: 1,
  skeleton: 2,
  goblin: 3,
  knight: 4,
  boss: 5
};

// Frame name -> column index
const FRAME_COL = {
  idle1: 0,
  idle2: 1,
  hit: 2,
  death: 3
};

// After image loads, verify and recalculate if needed
SHEET_IMG.onload = function() {
  CELL_W = SHEET_IMG.naturalWidth / SHEET_COLS;
  CELL_H = SHEET_IMG.naturalHeight / SHEET_ROWS;
};

/**
 * Draw a monster sprite from the sheet.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} monsterName - 'slime','bat','skeleton','goblin','knight','boss'
 * @param {string} frame - 'idle1','idle2','hit','death'
 * @param {number} x - center x on canvas
 * @param {number} y - center y on canvas
 * @param {number} displaySize - rendered size on canvas (e.g. monster.size * 2)
 */
function drawMonster(ctx, monsterName, frame, x, y, displaySize) {
  const row = MONSTER_ROW[monsterName];
  const col = FRAME_COL[frame];
  if (row === undefined || col === undefined) return;

  const sx = col * CELL_W;   // source x (top-left of cell in sheet)
  const sy = row * CELL_H;   // source y (top-left of cell in sheet)
  const half = displaySize / 2;

  ctx.drawImage(
    SHEET_IMG,
    sx, sy, CELL_W, CELL_H,            // source rect from sheet
    x - half, y - half,                 // dest position (centered on x,y)
    displaySize, displaySize            // dest size on canvas
  );
}

// Animation: alternate idle1/idle2 every ~500ms (at 60fps, every 30 ticks)
function getIdleFrame(tickCounter) {
  return (Math.floor(tickCounter / 30) % 2 === 0) ? 'idle1' : 'idle2';
}

// Usage examples:
// Normal monster:  drawMonster(ctx, m.name, getIdleFrame(tick), m.x, m.y, m.size * 2);
// Hit flash:       drawMonster(ctx, m.name, 'hit', m.x, m.y, m.size * 2);
// Boss:            drawMonster(ctx, 'boss', getIdleFrame(tick), b.x, b.y, 120);
```

### Integration Notes

- Replace the current `ctx.fillText(m.emoji, ...)` rendering (~line 515-525) with `drawMonster()` calls
- Keep the existing `glowColors` map as `ctx.shadowColor` behind the sprite for the glow effect
- When a monster is hit (`m.flashTimer > 0`), use `frame = 'hit'` instead of idle
- On monster death, play the `'death'` frame for ~300ms (18 ticks) before removing from the array
- Boss rendering (~line 528+) should also use `drawMonster('boss', frame, b.x, b.y, b.size)`
- If `SHEET_IMG` fails to load, fall back to current emoji rendering (graceful degradation)

---

## Boss Fight Improvements (TODO)

### Current Problems
- Boss spawns at fixed `y:80` (top of screen) and never moves — feels static and distant
- Boss fireballs (line 476-478) are the only threat; no positional danger
- Boss is visually just a larger emoji; no phase changes or escalation
- Boss HP scales (`20 + wave*5`) but behavior never changes

### Planned Improvements

1. **Boss position**: Spawn at `y: GH * 0.35` (~35% from top) so it is more central and visually imposing
2. **Boss movement**: Slow horizontal sinusoidal drift (`x += Math.sin(t * 0.02) * 1.5`), occasional lunge toward the player's last slash position
3. **Phase transitions at 50% HP**:
   - Sprite tints darker red, attack speed doubles
   - New attack: ground slam shockwave (horizontal line of danger particles across full width)
   - Screen tint shifts to red, persistent flame particle aura around boss
4. **Visual feedback**:
   - Boss sprite scales up 10% when enraged
   - HP bar changes color from green to yellow to red
   - Screen shake on boss attacks (already have `shakeTimer`)
5. **Unique bosses per milestone**:
   - Wave 5: Demon Lord (current)
   - Wave 10: Ice Titan (blue palette swap, freezing attacks)
   - Wave 15: Shadow Dragon (black/purple, wider attack patterns)
   - Wave 20+: Random from pool with stat scaling

---

## Future: Biome / Theme Monster Expansion

### Concept
After wave 10, the background theme changes and new monster types appear. Each biome introduces 2-3 unique monsters while keeping some universal types (slime, bat).

| Biome | Waves | New Monsters | Background Tint |
|-------|-------|--------------|-----------------|
| Dark Forest | 1-10 | Slime, Bat, Skeleton (current set) | Deep blue-green |
| Inferno | 11-20 | Fire Imp, Lava Golem, Phoenix | Dark red-orange |
| Frozen Crypt | 21-30 | Ice Wraith, Frost Giant, Snow Wolf | Dark cyan-blue |
| Shadow Realm | 31+ | Shadow Fiend, Void Knight, Lich | Deep purple-black |

Each biome would need an additional sprite sheet (same 4-column format):
- `slash-monsters-sheet.png` — base (6 rows x 4 cols = 512x768)
- `slash-monsters-inferno.png` — 3 rows x 4 cols = 512x384
- `slash-monsters-frozen.png` — 3 rows x 4 cols = 512x384
- `slash-monsters-shadow.png` — 3 rows x 4 cols = 512x384

---

## WAVE System

- Wave 1-3: Slime dominant
- Wave 4-6: Mix bat + skeleton
- Wave 5: Mini Boss
- Wave 7-9: Add goblin
- Wave 10: Boss fight
- Wave 10+: Infinite loop with scaling difficulty

---

## RPG Progression

### XP & Levels
- Kill monsters to earn EXP, each level requires more
- Level up increases base ATK/DEF
- Every 5 levels unlocks a new skill slot

### Skill Tree (3 branches)
1. **Attack**: Crit rate / Crit damage / Slash range +
2. **Defense**: Max HP / Shield / Monster slow
3. **Support**: EXP bonus / Gold bonus / Skill CD reduction

### Equipment (Weapon Upgrades)
- Gold -> weapon level up (small damage/range/speed boost)
- Gems -> weapon evolution (visual change + special effect)

---

## Save Data (localStorage)
- Key: `slashMonstersData`
- Value: `{ level, exp, gold, gems, weapons[], skills[], bestWave }`

## Assets
- **Sprite sheet**: `assets/slash-monsters-sheet.png` (to be generated)
- **BGM**: `Fantasy RPG Music Pack Vol.3/Loops/ogg/Action 1 Loop.ogg`
- **SFX**: Slash hit, monster death, level up, boss appear (from `sfx/` library)
- **Fallback**: Current emoji rendering remains as fallback if sprite sheet fails to load
