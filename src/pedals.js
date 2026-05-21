// fx-puzzle - ペダル定義 + チェーン解決
//
// ===== コア仕様 (Baba 的・1ペダル1赤字) =====
// 各ペダルは「赤字」と呼ばれる数値を1つだけ持つ。
//   - kind: "value"     → 赤字を使って攻撃プロファイルを更新する (apply 関数)
//   - kind: "modifier"  → 自分の左隣ペダルの赤字を、自分の赤字で書き換える
//
// Booster (×2) のルール: 「左隣のペダルの赤字」を自分の赤字 (=2) で乗算する。
// 武器の素ダメも、赤字 (damageRed:true) なら左端 Booster の対象になる。
//
// 状態異常 (burn/freeze/shock) は確率付与 (chance: 0.5) — 攻撃のたびに 50% 抽選。
// → Tremolo/Delay で攻撃回数を増やすほど状態異常が当たりやすくなる。
//
// 解決順:
//   Pass1: 右→左に走査。modifier が左隣の赤字をミューテートする。
//          (右にある modifier から処理されるので、Booster on Booster で
//           左の Booster 自身の赤字も先に増えてから自分の左隣を倍化する)
//   Pass2: 左→右に走査。weapon と value ペダルが (最終赤字を使って) atk を更新。
//
// 表示: name / desc / detail は src/data/texts.js (TEXTS.pedals[id]) に外出し。
//       このファイルはロジック (kind / red / color / icon / apply / op) だけ持つ。
//       初期化時に TEXTS からマージしてフィールドを補う。

"use strict";

const PEDALS = {
  // ===== Value: damage 倍率系 =====
  // atk.damage を red 倍する (Pass2 で適用)。順序依存:
  //   Fuzz Driver: (weapon + Fuzz の +3) × red
  //   Driver Fuzz: weapon × red + 3
  // modifier (Booster 等) で left の red を増減できるので、Driver Booster で更に強化可能。
  // Delay/GigaDelay でコピーすると複数回乗算 → 指数的に伸びる (Driver Delay = ×red ×red)。
  driver: {
    id: "driver", kind: "value",
    red: 2, color: "#ffdd44", icon: "▲",
    apply(atk, red) { if (red > 0) atk.damage = atk.damage * red; },
  },
  tubedriver: {
    id: "tubedriver", kind: "value",
    red: 3, color: "#ff9944", icon: "◆",
    apply(atk, red) { if (red > 0) atk.damage = atk.damage * red; },
  },
  badassdriver: {
    id: "badassdriver", kind: "value",
    red: 4, color: "#ff4444", icon: "⬢",
    apply(atk, red) { if (red > 0) atk.damage = atk.damage * red; },
  },

  // ===== Value: 状態異常付与 =====
  // Phaser: 累積ヒットで凍結を確定発動。
  //   赤字 = 同じ敵に必要な累積ヒット数 (デフォ 4)。
  //   凍結時間は固定 4T。
  //   apply は atk.phaserRequired を最小値で集約し、main.js 側の命中処理で実発動。
  phaser: {
    id: "phaser", kind: "value",
    red: 4, color: "#88ddff", icon: "❄",
    apply(atk, red) {
      if (red <= 0) return;
      if (atk.phaserRequired == null || red < atk.phaserRequired) {
        atk.phaserRequired = red;
      }
    },
  },

  // ===== Value: hits 系 =====
  tremolo: {
    id: "tremolo", kind: "value",
    red: 2, color: "#ff77aa", icon: "▶",
    apply(atk, red) { if (red > 0) atk.hits += red; },
  },

  // ===== Value: 特殊能力デバフ (Limiter / NoiseGate) =====
  // 命中ごとに対象の「能力 red」(enemy.reds の数値群) を 赤字 ぶん削る (下限 0)。
  // 例: オーガの怒りターン数 / サムライの連撃数 など。
  // atk.redDebuff にカウンタを乗せ、main.js 側の doAttack 内で実適用。
  // 自身の赤字は modifier (Booster 等) で増減可能。Delay/GigaDelay で複数回適用も可。
  limiter: {
    id: "limiter", kind: "value",
    red: 1, color: "#88c0e0", icon: "▾",
    apply(atk, red) { if (red > 0) atk.redDebuff = (atk.redDebuff || 0) + red; },
  },
  noisegate: {
    id: "noisegate", kind: "value",
    red: 2, color: "#5588cc", icon: "▽",
    apply(atk, red) { if (red > 0) atk.redDebuff = (atk.redDebuff || 0) + red; },
  },

  // ===== Copy: 左隣の value ペダルを赤字回数ぶん追加適用する =====
  // ※ 解決ロジック側 (resolveChain) で扱う。apply 関数は持たない。
  delay: {
    id: "delay", kind: "copy",
    red: 1, color: "#cc88ff", icon: "◌",
  },
  gigadelay: {
    id: "gigadelay", kind: "copy",
    red: 2, color: "#aa44ff", icon: "◎",
  },

  // ===== Modifier: 乗算 =====
  booster: {
    id: "booster", kind: "modifier",
    red: 2, color: "#ffaa44", icon: "×",
    op: "mult",
  },
  overdrive: {
    id: "overdrive", kind: "modifier",
    red: 3, color: "#ff8833", icon: "⊗",
    op: "mult",
  },
  stack: {
    id: "stack", kind: "modifier",
    red: 4, color: "#ff5522", icon: "✱",
    op: "mult",
  },

  // ===== Modifier: 加算 =====
  lift: {
    id: "lift", kind: "modifier",
    red: 1, color: "#88dd66", icon: "↑",
    op: "add",
  },
  push: {
    id: "push", kind: "modifier",
    red: 3, color: "#44bb44", icon: "⇑",
    op: "add",
  },

  // ===== Modifier: 減算 =====
  trim: {
    id: "trim", kind: "modifier",
    red: 1, color: "#6699dd", icon: "↓",
    op: "sub",
  },
  cut: {
    id: "cut", kind: "modifier",
    red: 3, color: "#4477bb", icon: "⇓",
    op: "sub",
  },

  // ===== Passive: チェーン計算には絡まない。main.js 側で発動フックを処理 =====
  // hook:
  //   "onHit"  ← 攻撃命中ごと (preamp)
  //   "onStep" ← 1歩移動ごと (powersupply)
  // ratio: 0..1 (現在 HP に対する回復率)
  preamp: {
    id: "preamp", kind: "passive",
    red: 2, color: "#ffcc55", icon: "♥",
    hook: "onHit", ratio: 0.02,
  },
  powersupply: {
    id: "powersupply", kind: "passive",
    red: 3, color: "#66ddaa", icon: "⚡",
    hook: "onStep", ratio: 0.03,
  },

  // ===== Passive: Triplet Echo =====
  // 赤字回ごとにそのボードの攻撃が「会心 (×2)」になる。
  // 赤字を Booster (×) で増やすと発動間隔が長くなる → 弱体化する。
  // Cut/Trim で赤字を削ると発動が頻繁になり、赤字 0 以下で毎攻撃が会心。
  // main.js 側 (doAttack 内) でチェーンから tripletecho の resolved red を読み発動判定。
  tripletecho: {
    id: "tripletecho", kind: "passive",
    red: 3, color: "#ff88dd", icon: "✦",
    hook: "onAttack",
    boostable: true, // modifier (×/+/−) で赤字が変動 → 発動間隔が変わる
  },

  // ===== Passive: 最大HP ブースト =====
  // 装着している間、player.baseHpMax に red をオン (装着で player.hp も同量増える)。
  // 同じ ID を複数装備すれば加算 (board[].forEach でユニーク数えではなく実装ぶん集計)。
  // modifier の対象外 (boostable: 未指定 → false)。
  // HP 増加系: 固定値で、赤字 (modifier 倍化対象) ではない。
  // red を「最大HP 増加量」として保持しつつ noRed フラグで UI から赤字表現を消す。
  body: {
    id: "body", kind: "passive",
    red: 10, color: "#88dd66", icon: "♬",
    hook: "maxHpBoost", noRed: true,
  },
  cabsim: {
    id: "cabsim", kind: "passive",
    red: 30, color: "#66bb88", icon: "▥",
    hook: "maxHpBoost", noRed: true,
  },
  subwoofer: {
    id: "subwoofer", kind: "passive",
    red: 50, color: "#44aa66", icon: "▩",
    hook: "maxHpBoost", noRed: true,
  },

  // ===== Passive: LineSelector (武器スロット追加) =====
  // 装着するごとに R / T / Y の順で新しい武器スロットを 1 つ解放 (最大 3 個)。
  // 赤字無し (固定機能)、modifier の影響無し。
  // ★ ペダルを外すと、その追加スロットに装備していた武器と、そのスロット内のペダル
  //   全てが「消失」する (インベントリには戻らない)。removePedalFromSlot 側で
  //   確認ダイアログを出してから喪失処理を実行する。
  lineselector: {
    id: "lineselector", kind: "passive",
    red: 0, color: "#bb88ff", icon: "⫶",
    hook: "lineselector",
    noRed: true,
  },

  // ===== Passive: Shimmer (確率パリィ) =====
  // 敵の攻撃を受ける度、5% × red の確率で攻撃を完全に弾く。
  // boostable:true なので Booster / Stack 等で赤字を増やすと確率上昇。
  // hook:"shimmerParry" は main.js 側でダメージ計算前にチェック。
  shimmer: {
    id: "shimmer", kind: "passive",
    red: 1, color: "#c8aaff", icon: "✦",
    hook: "shimmerParry",
    boostable: true,
  },

  // ===== Baby-locked: 騎士の最期の加護 =====
  // 赤ちゃんボードのスロット 0 に固定で刺さっている特殊ペダル。
  // kind:"baby-locked" は resolveChain / computeChainItems の分岐に乗らないため
  // チェーン解決には影響しない (item は items[] に push されるが apply されない)。
  // 効果は main.js 側で「赤ちゃんが敵物理攻撃で受けるダメージを 1 にクランプ」として実装。
  // インベントリ / 通常ドロップには絶対に出ない (GLOBAL_DROP_POOL から除外)。
  knightsblessing: {
    id: "knightsblessing", kind: "baby-locked",
    red: 1, color: "#ffd866", icon: "✟",
    locked: true,
  },
};

// TEXTS から name / desc / detail をマージ (texts.js を先に読み込む前提)
// window 経由で渡ってくるが、Node の構文チェック (node --check) でも落ちないよう
// typeof で防衛的にアクセス。
(function mergeTexts() {
  const T = (typeof window !== "undefined" && window.TEXTS && window.TEXTS.pedals) || null;
  if (!T) return;
  for (const id in PEDALS) {
    const t = T[id];
    if (!t) continue;
    PEDALS[id].name = t.name;
    PEDALS[id].desc = t.desc;
    PEDALS[id].detail = t.detail;
  }
})();

// マップ上の文字 → ペダルID (床落ちペダル配置用)
// 予約文字: # . @ P G E F I B K W A 1 2 3 4 5 6 7 ?
//   (壁/床/プレイヤー/ピット/ゴール/敵類(スライム+スパイカ/人面樹/アーチャー)/武器/拾得スロット)
const PEDAL_MAP = {
  D: "driver",    X: "phaser",
  T: "tremolo",   L: "delay",   J: "gigadelay",
  M: "booster",   V: "overdrive", S: "stack",
  U: "lift",      R: "push",      N: "trim",    C: "cut",
  H: "preamp",    Y: "powersupply",
};

// ---- 攻撃プロファイル初期化 ----
function makeBaseAttack(source) {
  return {
    damage: 0,
    element: "normal",
    shape: source.shape || "single",
    range: source.range || 0,       // 動的な shape (beam 等) で参照。modifier で増減可能。
    compress: source.compress || 0, // コンプレッサー: 対象最大HP×compress% を追加ダメ。modifier で増減可能。
    hits: 1,
    statusEffects: [],
  };
}

// ---- チェーン解決の中間表現 (UI でも使う) ----
//
// items[0] は仮想 "weapon" 項目 (素ダメを担う)。
// items[1..] は filled スロットを左から順に並べたもの。
//
// 各 item は { kind, pedal, red, originalRed, redBoostable, slotIndex }。
// red は Pass1 でミューテートされる「最終赤字」。
function computeChainItems(source, slots) {
  const items = [];

  // 仮想 weapon item: 赤字 = 素ダメ / 射程 / 追加ダメ% / 攻撃回数 のいずれか1つ (武器ごと固定)
  //   damageRed:true   → red = damage   (modifier でダメージ増減)
  //   rangeRed:true    → red = range    (modifier で射程増減、damage は固定の黒字)
  //   compressRed:true → red = compress (modifier で追加ダメ%増減、damage は固定の黒字)
  //   hitsRed:true     → red = hits     (modifier で攻撃回数増減、damage は固定の黒字)
  //   どれも false      → red = damage   (固定値、modifier で変えられない)
  let redKind = "damage";
  let redValue = source.damage || 0;
  if (source.rangeRed) {
    redKind = "range";
    redValue = source.range || 0;
  } else if (source.compressRed) {
    redKind = "compress";
    redValue = source.compress || 0;
  } else if (source.hitsRed) {
    redKind = "hits";
    redValue = source.hits || 0;
  }
  items.push({
    kind: "weapon",
    pedal: null,
    red: redValue,
    originalRed: redValue,
    redBoostable: !!source.damageRed || !!source.rangeRed || !!source.compressRed || !!source.hitsRed,
    redKind: redKind,
    slotIndex: -1,
  });

  for (let i = 0; i < slots.length; i++) {
    const id = slots[i];
    if (!id) continue;
    const p = PEDALS[id];
    if (!p) continue;
    items.push({
      kind: p.kind,
      pedal: p,
      red: p.red,
      originalRed: p.red,
      // ペダルの赤字は基本ブースト可能。passive は (preamp/powersupply のように
      // ratio が固定で red は表示専用の) ものを想定して既定では false にしているが、
      // boostable:true を持つ passive (tripletecho 等) は明示的に modifier 対象にする。
      redBoostable: p.kind !== "passive" || !!p.boostable,
      slotIndex: i,
    });
  }

  // === 武器エフェクト: Lofi ===
  // 装備ペダルのうち originalRed ≤ 2 のものは red を 3 倍にする (Pass1 より先)。
  // 武器自身 (kind === "weapon") の赤字 (素ダメ) は対象外。
  if (source && source.effect === "lofi") {
    for (const it of items) {
      if (it.kind === "weapon") continue;
      if (it.originalRed <= 2) {
        it.red = it.originalRed * 3;
      }
    }
  }

  // Pass1: 右→左。modifier が左隣の赤字を書き換える。
  // op: "mult" | "add" | "sub" — sub は 0 で頭打ち
  for (let i = items.length - 1; i >= 1; i--) {
    const it = items[i];
    if (it.kind !== "modifier") continue;
    const left = items[i - 1];
    if (!left.redBoostable) continue;
    const op = it.pedal.op;
    if (op === "mult") {
      left.red = left.red * it.red;
    } else if (op === "add") {
      left.red = left.red + it.red;
    } else if (op === "sub") {
      left.red = Math.max(0, left.red - it.red);
    }
  }

  return items;
}

// ---- チェーン解決 (UI 用は computeChainItems を直接使ってもよい) ----
function resolveChain(source, slots) {
  const items = computeChainItems(source, slots);
  const atk = makeBaseAttack(source);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind === "weapon") {
      if (it.redKind === "range") {
        // 射程武器 (例: ロングアーム): damage は固定の黒字、red は射程マス数
        atk.damage = source.damage || 0;
        atk.range  = Math.max(0, it.red);
      } else if (it.redKind === "compress") {
        // 追加ダメ%武器 (例: コンプレッサー): damage は固定、red は対象最大HPに対する%
        atk.damage   = source.damage || 0;
        atk.compress = Math.max(0, it.red);
      } else if (it.redKind === "hits") {
        // 攻撃回数武器 (例: サスティナー): damage は固定、red は同対象への連続ヒット回数
        atk.damage = source.damage || 0;
        atk.hits   = Math.max(1, it.red);
      } else {
        atk.damage = it.red;
      }
    } else if (it.kind === "value") {
      it.pedal.apply(atk, it.red);
    } else if (it.kind === "copy") {
      // 左隣の value ペダルを、自分の赤字回数ぶん追加適用
      // (左隣が modifier/copy/passive/weapon のときは不発)
      const left = items[i - 1];
      if (left && left.kind === "value" && it.red > 0) {
        for (let k = 0; k < it.red; k++) {
          left.pedal.apply(atk, left.red);
        }
      }
    }
    // modifier は atk を直接いじらない (pass1 で役目を終えてる)
    // passive はチェーン計算に絡まない (main.js 側でフック処理)
  }
  return atk;
}

// ---- 攻撃形状 → ターゲットマス ----
// range: 動的な射程 (beam で使う)。固定形状の単発/triple-front 等では未使用。
function computeTargets(px, py, facing, shape, range) {
  const { dx, dy } = facing;

  if (shape === "single") {
    return [{ x: px + dx, y: py + dy }];
  }
  if (shape === "triple-front") {
    if (dx !== 0) {
      return [
        { x: px + dx, y: py - 1 },
        { x: px + dx, y: py },
        { x: px + dx, y: py + 1 },
      ];
    } else {
      return [
        { x: px - 1, y: py + dy },
        { x: px,     y: py + dy },
        { x: px + 1, y: py + dy },
      ];
    }
  }
  if (shape === "beam") {
    // 直線。range マス分前方に伸びる (range=0 なら空集合)。
    const r = Math.max(0, range | 0);
    const cells = [];
    for (let k = 1; k <= r; k++) {
      cells.push({ x: px + dx * k, y: py + dy * k });
    }
    return cells;
  }
  if (shape === "wide-5") {
    if (dx !== 0) {
      return [
        { x: px + dx, y: py - 2 },
        { x: px + dx, y: py - 1 },
        { x: px + dx, y: py },
        { x: px + dx, y: py + 1 },
        { x: px + dx, y: py + 2 },
      ];
    } else {
      return [
        { x: px - 2, y: py + dy },
        { x: px - 1, y: py + dy },
        { x: px,     y: py + dy },
        { x: px + 1, y: py + dy },
        { x: px + 2, y: py + dy },
      ];
    }
  }
  if (shape === "around-8") {
    return [
      { x: px - 1, y: py - 1 }, { x: px,     y: py - 1 }, { x: px + 1, y: py - 1 },
      { x: px - 1, y: py     },                           { x: px + 1, y: py     },
      { x: px - 1, y: py + 1 }, { x: px,     y: py + 1 }, { x: px + 1, y: py + 1 },
    ];
  }
  return [];
}
