// fx-puzzle - Training Stage + Pedal Board System
// 依存: src/pedals.js (PEDALS / resolveChain / computeChainItems / computeTargets / PEDAL_MAP)

"use strict";

// ========================================================================
// 追加スタイル（攻撃範囲プレビュー / ダメージ数字 / 敵ステータス表示）
// CSS本体には触らずJSで注入。
// ========================================================================
(function injectExtraStyles() {
  const css = `
    #map { position: relative; }

    /* 攻撃範囲プレビュー */
    .tile.targeted        { box-shadow: inset 0 0 0 2px rgba(255, 200, 80, 0.55); }
    .tile.targeted-fire   { box-shadow: inset 0 0 0 2px rgba(255, 110, 50, 0.75); }
    .tile.targeted-ice    { box-shadow: inset 0 0 0 2px rgba(120, 200, 255, 0.75); }
    .tile.targeted-thunder{ box-shadow: inset 0 0 0 2px rgba(255, 235, 80, 0.75); }

    /* 浮き上がるダメージ数字 */
    .floating-damage {
      position: absolute;
      pointer-events: none;
      transform: translate(-50%, 0);
      color: #ffd866;
      font-weight: bold;
      font-family: ui-monospace, "Menlo", monospace;
      font-size: 16px;
      text-shadow: 0 0 4px #000, 0 0 2px #000;
      animation: float-up 750ms ease-out forwards;
      z-index: 10;
    }
    .floating-damage.fire    { color: #ff7733; }
    .floating-damage.ice     { color: #88ddff; }
    .floating-damage.thunder { color: #ffee55; }
    .floating-damage.kill    { color: #ff3344; font-size: 18px; }
    .floating-damage.weak    { font-size: 18px; text-shadow: 0 0 6px #ffaa44, 0 0 3px #000; }
    .floating-damage.resist  { color: #88a; font-size: 13px; opacity: 0.9; }
    @keyframes float-up {
      0%   { transform: translate(-50%, 0); opacity: 1; }
      80%  { opacity: 0.9; }
      100% { transform: translate(-50%, -34px); opacity: 0; }
    }

    /* 敵ステータスパネル */
    #enemy-status {
      margin: 12px auto 4px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
      font-family: ui-monospace, monospace;
      font-size: 11px;
      color: var(--muted);
    }
    .enemy-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: #1a1a1f;
      border-radius: 4px;
      border: 1px solid #2a2a32;
    }
    .enemy-row.dead { opacity: 0.32; text-decoration: line-through; }
    .enemy-row .e-tag {
      color: var(--enemy);
      font-weight: bold;
      width: 22px;
    }
    .enemy-bar-bg {
      width: 70px;
      height: 6px;
      background: #333;
      border-radius: 3px;
      overflow: hidden;
    }
    .enemy-bar-fill {
      height: 100%;
      background: var(--enemy);
      transition: width 200ms ease-out;
    }
    .enemy-bar-fill.frozen  { background: #88ddff; }
    .enemy-bar-fill.burning { background: #ff7733; }
    .enemy-hp-text { color: #ddd; min-width: 52px; text-align: right; }
    .enemy-status-icons { font-size: 12px; min-width: 22px; }

    /* ===== レイス / ファントムレイス ===== */
    @keyframes wraith-float {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-1.5px); }
    }
    @keyframes wraith-aura-pulse {
      0%, 100% { filter: drop-shadow(0 0 4px rgba(187,136,255,0.55)); }
      50%      { filter: drop-shadow(0 0 9px rgba(187,136,255,0.95)); }
    }
    @keyframes phantom-aura-pulse {
      0%, 100% { filter: drop-shadow(0 0 5px rgba(221,102,255,0.65)); }
      50%      { filter: drop-shadow(0 0 12px rgba(221,102,255,1)); }
    }
    .tile.enemy.enemy-wraith > .char-svg {
      animation: wraith-float 1.6s ease-in-out infinite, wraith-aura-pulse 1.8s ease-in-out infinite;
    }
    .tile.enemy.enemy-phantomwraith > .char-svg {
      animation: wraith-float 1.4s ease-in-out infinite, phantom-aura-pulse 1.5s ease-in-out infinite;
    }

    /* ===== マスター・サムライ ===== */
    @keyframes samurai-stance {
      0%, 100% { filter: drop-shadow(0 0 3px rgba(220,80,100,0.55)); }
      50%      { filter: drop-shadow(0 0 8px rgba(255,90,110,0.95)); }
    }
    .tile.enemy.enemy-samurai > .char-svg {
      animation: samurai-stance 1.4s ease-in-out infinite;
    }
    /* ===== パリィ状態: 全身に金色の霞 + シマー + 揺れる残像 =====
       タイル本体: 強いパルスオーラ
       SVG: 残像のように上下に揺れる + 強い drop-shadow + 軽いブラー
       ::before: 揺れる金色の霞オーバーレイ (screen ブレンドで光が滲む)
       ::after: 右上の 🛡 マーカー */
    @keyframes samurai-parry-aura {
      0%, 100% {
        box-shadow:
          inset 0 0 12px rgba(255,216,102,0.65),
          0 0 14px rgba(255,216,102,0.55),
          0 0 22px rgba(255,180,80,0.4);
      }
      50% {
        box-shadow:
          inset 0 0 22px rgba(255,216,102,1.0),
          0 0 26px rgba(255,216,102,1.0),
          0 0 40px rgba(255,180,80,0.85);
      }
    }
    @keyframes samurai-parry-shimmer {
      0%, 100% {
        transform: translateY(0);
        filter: drop-shadow(0 0 6px rgba(255,216,102,0.95))
                drop-shadow(0 0 12px rgba(255,180,80,0.75))
                blur(0.3px);
      }
      50% {
        transform: translateY(-1px);
        filter: drop-shadow(0 0 14px rgba(255,216,102,1.0))
                drop-shadow(0 0 24px rgba(255,180,80,0.95))
                blur(0.55px);
      }
    }
    @keyframes samurai-parry-haze {
      0%   { transform: translate(-2px, 0)  scale(1.0); opacity: 0.55; }
      25%  { transform: translate( 1px,-1px) scale(1.05); opacity: 0.9; }
      50%  { transform: translate( 3px, 1px) scale(1.0); opacity: 0.75; }
      75%  { transform: translate(-1px, 2px) scale(1.08); opacity: 0.95; }
      100% { transform: translate(-2px, 0)  scale(1.0); opacity: 0.55; }
    }
    .tile.enemy.enemy-samurai.parry-stance {
      animation: samurai-parry-aura 700ms ease-in-out infinite;
      overflow: visible;
      z-index: 3;
    }
    .tile.enemy.enemy-samurai.parry-stance > .char-svg {
      animation: samurai-parry-shimmer 900ms ease-in-out infinite;
    }
    .tile.enemy.enemy-samurai.parry-stance::before {
      content: "";
      position: absolute;
      inset: -6px;
      pointer-events: none;
      z-index: 2;
      background:
        radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.55), transparent 55%),
        radial-gradient(ellipse at 70% 60%, rgba(255,216,102,0.85), transparent 60%),
        radial-gradient(ellipse at 50% 80%, rgba(255,150,60,0.55),  transparent 70%);
      mix-blend-mode: screen;
      filter: blur(3px);
      border-radius: 50%;
      animation: samurai-parry-haze 1.4s ease-in-out infinite;
    }
    .tile.enemy.enemy-samurai.parry-stance::after {
      content: "✨";
      position: absolute; top: -4px; right: -4px;
      font-size: 14px; line-height: 1;
      text-shadow: 0 0 8px #ffd866, 0 0 14px #ff9a40;
      pointer-events: none;
      z-index: 4;
      animation: samurai-parry-aura 700ms ease-in-out infinite;
    }
    /* パリィ表示 */
    .floating-damage.parry {
      color: #ffd866;
      font-size: 17px;
      text-shadow: 0 0 8px #ffd866, 0 0 12px #ff8a4d, 0 0 2px #000;
    }
    /* 不死モード表示 */
    .floating-damage.god {
      color: #7ed957;
      font-size: 17px;
      text-shadow: 0 0 8px #7ed957, 0 0 12px #44aa66, 0 0 2px #000;
    }
    /* 能力赤字デバフ表示 (Limiter / NoiseGate) */
    .floating-damage.red-debuff {
      color: #88c0e0;
      font-size: 14px;
      text-shadow: 0 0 6px #88c0e0, 0 0 10px #4488aa, 0 0 2px #000;
    }
    /* Shimmer パリィ表示 */
    .floating-damage.shimmer-parry {
      color: #d4b8ff;
      font-size: 16px;
      text-shadow: 0 0 8px #c8aaff, 0 0 14px #8866dd, 0 0 2px #000;
    }
    /* Shimmer 発動時の全身シマー (タイル全体に淡い紫の波紋) */
    @keyframes shimmer-burst {
      0%   { opacity: 0; transform: scale(0.6); }
      30%  { opacity: 1; transform: scale(1.15); }
      100% { opacity: 0; transform: scale(1.8); }
    }
    .shimmer-fx {
      position: absolute;
      width: var(--tile-size, 32px);
      height: var(--tile-size, 32px);
      background: radial-gradient(circle,
        rgba(200,170,255,0.85) 0%,
        rgba(150,110,220,0.55) 45%,
        rgba(120,80,180,0) 80%);
      pointer-events: none;
      z-index: 9;
      mix-blend-mode: screen;
      animation: shimmer-burst 520ms ease-out forwards;
    }

    /* ===== 土遁エフェクト (人面樹) ===== */
    @keyframes burrow-fx {
      0%   { opacity: 0; transform: scale(0.4) translateY(8px); }
      35%  { opacity: 1; transform: scale(1.2) translateY(0); }
      100% { opacity: 0; transform: scale(2.2) translateY(-4px); }
    }
    .burrow-fx {
      position: absolute;
      width: var(--tile-size, 32px);
      height: var(--tile-size, 32px);
      background: radial-gradient(circle,
        rgba(140,180,90,0.85) 0%,
        rgba(110,80,40,0.6) 45%,
        rgba(60,40,20,0) 85%);
      pointer-events: none;
      z-index: 8;
      animation: burrow-fx 520ms ease-out forwards;
    }
    .burrow-fx::after {
      content: "🌀";
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      color: #6a4a20;
      text-shadow: 0 0 4px #aaffaa;
    }

    /* ===== ジャイアントスパイカ ===== */
    @keyframes giant-turtle-glow {
      0%, 100% { filter: drop-shadow(0 0 3px rgba(255,80,60,0.45)); }
      50%      { filter: drop-shadow(0 0 9px rgba(255,90,60,0.9)); }
    }
    .tile.enemy.enemy-gianturtle > .char-svg {
      animation: giant-turtle-glow 1.6s ease-in-out infinite;
    }

    /* 隠蔽 (誰だかわからない敵): 紫モヤモヤ + 揺らぎ */
    @keyframes hidden-flicker {
      0%, 100% { opacity: 0.85; transform: translateX(0); }
      30%      { opacity: 1.0;  transform: translateX(-0.6px); }
      70%      { opacity: 0.7;  transform: translateX(0.6px); }
    }
    .tile.enemy.hidden-by-wraith > .char-svg {
      animation: hidden-flicker 600ms ease-in-out infinite;
      filter: drop-shadow(0 0 6px rgba(170,120,220,0.7));
    }
    .tile.enemy.hidden-by-wraith .tile-hp-bar { display: none; }
    .tile.enemy.hidden-by-wraith .tile-status-icons { display: none; }
    .enemy-row.hidden-row .e-tag { color: #aa88dd; }
    .enemy-row.hidden-row .enemy-bar-bg {
      background: repeating-linear-gradient(45deg, #2a1838 0 3px, #1a0f24 3px 6px);
    }
    .enemy-row.hidden-row .enemy-bar-fill { display: none; }
    .enemy-row.hidden-row .enemy-hp-text { color: #aa88dd; font-style: italic; }

    /* ===== レイジ・オーガ 怒り状態 ===== */
    @keyframes rage-shake {
      0%, 100% { transform: translate(0, 0); }
      20%      { transform: translate(-1px, 1px) rotate(-1.5deg); }
      40%      { transform: translate(1.5px, -1px) rotate(1.5deg); }
      60%      { transform: translate(-1.5px, 0) rotate(-1deg); }
      80%      { transform: translate(1px, 1px) rotate(1deg); }
    }
    @keyframes rage-pulse {
      0%, 100% { filter: drop-shadow(0 0 3px rgba(255,80,40,0.6)); }
      50%      { filter: drop-shadow(0 0 9px rgba(255,120,40,1)); }
    }
    .tile.enemy.rage > .char-svg {
      animation: rage-shake 320ms infinite, rage-pulse 700ms ease-in-out infinite;
    }
    .tile.enemy.rage::after {
      /* 怒り残ターン目印: タイルの右上に小さく光るマーク */
      content: "👹";
      position: absolute; top: -2px; right: -2px;
      font-size: 12px; line-height: 1;
      animation: rage-pulse 700ms ease-in-out infinite;
      pointer-events: none;
    }
    /* 人面樹に縛られて移動不可なプレイヤー: 右上に縛りマーク */
    .tile.player.root-bound::after {
      content: "🪢";
      position: absolute; top: -2px; right: -2px;
      font-size: 12px; line-height: 1;
      animation: rage-pulse 700ms ease-in-out infinite;
      pointer-events: none;
      text-shadow: 0 0 4px #66dd44;
    }
    /* 盾の騎士: プレイヤーが 3×3 内にいる間、右上に盾マーク + 黄金グロー */
    .tile.enemy.shield-active::after {
      content: "🛡";
      position: absolute; top: -2px; right: -2px;
      font-size: 12px; line-height: 1;
      animation: rage-pulse 700ms ease-in-out infinite;
      pointer-events: none;
      text-shadow: 0 0 6px #ffd866;
      z-index: 2;
    }
    .tile.enemy.shield-active {
      box-shadow: inset 0 0 10px rgba(255, 216, 102, 0.45) !important;
    }

    /* ===== 視認性強化（タイル上の overlays） ===== */
    .tile { position: relative; }
    .tile-hp-bar {
      position: absolute; bottom: 1px; left: 2px; right: 2px;
      height: 3px; background: rgba(0,0,0,0.6);
      border-radius: 1px; overflow: hidden; pointer-events: none;
    }
    .tile-hp-fill { height: 100%; background: #ff5e5e; transition: width 200ms ease-out; }
    .tile-hp-fill.warn { background: #ffd866; }
    .tile-hp-fill.bad  { background: #ff3344; }
    /* プレイヤーは満タンが緑、減ると黄→赤 */
    .tile-hp-fill-player { background: #66dd88; }

    .tile-status-icons {
      position: absolute; top: -3px; right: 0;
      font-size: 9px; line-height: 1; pointer-events: none;
      text-shadow: 0 0 3px #000;
    }

    .tile-facing {
      position: absolute; font-size: 11px;
      color: var(--accent); font-weight: bold; line-height: 1;
      text-shadow: 0 0 4px #000, 0 0 2px #000; pointer-events: none;
    }
    .tile-facing.dir-right { right: 0;  top: 50%; transform: translateY(-50%); }
    .tile-facing.dir-left  { left: 0;   top: 50%; transform: translateY(-50%); }
    .tile-facing.dir-up    { top: -1px; left: 50%; transform: translateX(-50%); }
    .tile-facing.dir-down  { bottom: -1px; left: 50%; transform: translateX(-50%); }

    /* ===== プレイヤー HP バー ===== */
    .hp-bar-wrap {
      display: inline-block; width: 110px; height: 10px;
      background: #2a2a32; border: 1px solid #444; border-radius: 5px;
      vertical-align: middle; margin-left: 8px; overflow: hidden;
    }
    .hp-bar-fill {
      display: block; height: 100%;
      background: linear-gradient(to right, #7ed957 0%, #ffd866 60%, #ff5e5e 100%);
      transition: width 220ms ease-out;
    }

    /* ===== チェーン発動アニメ ===== */
    .slot { transition: transform 120ms ease-out, box-shadow 120ms ease-out; }
    .slot.chain-active {
      box-shadow: 0 0 14px #ffd866, inset 0 0 10px rgba(255, 216, 102, 0.45);
      transform: translateY(-2px);
    }

    /* ===== 説明文中の赤字 (Booster の倍化対象) ===== */
    .red-val {
      color: #ff4d4d;
      font-weight: bold;
      font-family: ui-monospace, monospace;
      text-shadow: 0 0 3px rgba(255, 80, 80, 0.5);
    }
    .red-val.boosted {
      color: #ff2233;
      text-shadow: 0 0 8px #ff5566, 0 0 3px #000;
      animation: red-pulse 1.4s ease-in-out infinite;
    }
    .red-val .red-orig {
      color: #884444;
      font-weight: normal;
      text-decoration: line-through;
      margin-right: 2px;
      font-size: 0.85em;
    }
    @keyframes red-pulse {
      0%, 100% { filter: brightness(1.0); }
      50%      { filter: brightness(1.35); }
    }
    /* 武器素ダメ表示 (赤字なら倍化対象) */
    .weapon-dmg-red   { color: #ff4d4d; font-weight: bold; }
    .weapon-dmg-black { color: #999;    font-weight: bold; }

    /* ===== ペダル詳細ツールチップ (slot/inventory hover) ===== */
    #pedal-tooltip {
      position: fixed;
      max-width: 320px;
      padding: 10px 14px;
      background: #15151a;
      border: 1px solid #555;
      border-left: 4px solid #ffaa44;
      border-radius: 6px;
      font-family: ui-monospace, "Menlo", monospace;
      font-size: 12px;
      color: #e0e0e0;
      line-height: 1.5;
      z-index: 2000;
      pointer-events: none;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.7);
      white-space: pre-wrap;
      display: none;
    }
    #pedal-tooltip .tt-title {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 4px;
      letter-spacing: 1px;
    }
    #pedal-tooltip .tt-summary {
      color: #aaa;
      margin-bottom: 8px;
      font-size: 11px;
      padding-bottom: 6px;
      border-bottom: 1px solid #2a2a32;
    }
    #pedal-tooltip .tt-detail { color: #cfcfcf; }

    /* ===== 敵詳細ツールチップ (マップタイル hover) ===== */
    #enemy-tooltip {
      position: fixed;
      max-width: 280px;
      padding: 10px 14px;
      background: #15151a;
      border: 1px solid #555;
      border-left: 4px solid #ff5555;
      border-radius: 6px;
      font-family: ui-monospace, "Menlo", monospace;
      font-size: 12px;
      color: #e0e0e0;
      line-height: 1.55;
      z-index: 2000;
      pointer-events: none;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.7);
      display: none;
    }
    #enemy-tooltip .et-title {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 4px;
      letter-spacing: 1px;
    }
    #enemy-tooltip .et-summary {
      color: #aaa;
      font-size: 11px;
      margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 1px solid #2a2a32;
    }
    #enemy-tooltip .et-row { color: #cfcfcf; }
    #enemy-tooltip .et-row .lbl { color: #888; display: inline-block; width: 56px; }
    #enemy-tooltip .et-weak { color: #ff9966; }
    #enemy-tooltip .et-resist { color: #88c0e0; }
    #enemy-tooltip .et-status { color: #ffd866; }
    #enemy-tooltip .et-trait { color: #ffaa66; }

    /* ===== Q/W/E 攻撃ターゲットの予告ドット ===== */
    .attack-dot {
      position: absolute; width: 6px; height: 6px;
      border-radius: 50%; pointer-events: none;
    }
    .dot-w { top: 3px;    right: 3px; background: #88ddff; box-shadow: 0 0 4px #88ddff; }
    .dot-e { bottom: 3px; right: 3px; background: #7ed957; box-shadow: 0 0 4px #7ed957; }

    /* W/E のラベル小タグ */
    .attack-label {
      position: absolute; top: -2px; left: 2px;
      font-size: 8px; font-weight: bold;
      font-family: ui-monospace, monospace;
      pointer-events: none;
      text-shadow: 0 0 3px #000;
    }

    /* ===== 3-board レイアウト ===== */
    #board { flex-direction: column; gap: 4px; }
    .board-row {
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: center;
      padding: 4px 6px;
      border-radius: 8px;
      border: 2px solid transparent;
      transition: border-color 150ms ease-out, background 150ms ease-out;
    }
    .board-row.active {
      border-color: var(--accent);
      background: rgba(255, 182, 72, 0.06);
    }
    .board-label {
      cursor: pointer;
      padding: 6px 10px;
      font-family: ui-monospace, monospace;
      background: transparent;
      border: 2px solid;
      border-radius: 6px;
      min-width: 62px;
      line-height: 1.15;
      text-align: center;
      color: inherit;
    }
    .board-label:hover { background: rgba(255,255,255,0.05); }
    .board-row.active .board-label { background: rgba(255,182,72,0.1); }

    /* 3 ボードに収まるよう slot を少し圧縮 */
    .slot {
      width: 84px;
      min-height: 92px;
      padding: 6px 4px;
    }
    .pedal-icon { font-size: 22px; margin-top: 8px; }
    .pedal-name { font-size: 10px; margin-top: 2px; }
    .pedal-desc { font-size: 8px;  line-height: 1.2; }

    /* ===== ARM (構え) インジケータ ===== */
    #arm-indicator {
      margin-left: auto;
      padding: 3px 10px;
      border-radius: 4px;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      color: #666;
      border: 1px solid transparent;
      transition: background-color 150ms ease-out, border-color 150ms ease-out;
    }
    #arm-indicator.armed {
      background: rgba(255, 182, 72, 0.12);
      border-color: var(--accent);
      color: var(--text);
    }

    /* 構え中のターゲットは少し強めに光る */
    .tile.targeted        { animation: arm-pulse 900ms ease-in-out infinite; }
    @keyframes arm-pulse {
      0%, 100% { filter: brightness(1.0); }
      50%      { filter: brightness(1.35); }
    }

    /* ===== Game Over / Stage Clear バナー ===== */
    #log .entry.lose { color: #ff5544; font-weight: bold; }
    #game-end-banner {
      position: fixed;
      top: 40%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      padding: 24px 48px;
      border-radius: 12px;
      font-size: 28px;
      font-weight: bold;
      border: 3px solid;
      z-index: 1000;
      font-family: ui-monospace, monospace;
      text-align: center;
      box-shadow: 0 0 50px;
      letter-spacing: 4px;
    }
    #game-end-banner .sub {
      display: block;
      font-size: 11px;
      opacity: 0.7;
      margin-top: 10px;
      letter-spacing: 1px;
      font-weight: normal;
    }

    /* ===== Status banner (PIT / FIELD) ===== */
    #status-banner {
      text-align: center;
      padding: 8px;
      margin-bottom: 10px;
      font-weight: bold;
      font-family: ui-monospace, monospace;
      border-radius: 6px;
      font-size: 14px;
      letter-spacing: 2px;
      line-height: 1.3;
      transition: background 200ms, border-color 200ms, color 200ms;
    }
    #status-banner.on-pit {
      background: rgba(136, 221, 255, 0.10);
      color: #88ddff;
      border: 2px solid rgba(136, 221, 255, 0.5);
    }
    #status-banner.off-pit {
      background: rgba(255, 110, 90, 0.10);
      color: #ff9988;
      border: 2px solid rgba(255, 110, 90, 0.5);
    }
    #status-banner .sub {
      display: block;
      font-size: 11px;
      opacity: 0.75;
      letter-spacing: 1px;
      font-weight: normal;
      margin-top: 3px;
    }

    /* Field（ピット外）では filled スロットだけロック表示。装着は自由 */
    #board-panel.locked .slot.filled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    #board-panel.locked .slot.filled::after {
      content: "🔒";
      position: absolute;
      bottom: 3px;
      right: 5px;
      font-size: 11px;
      opacity: 0.85;
      pointer-events: none;
    }
    /* 空きスロットとインベントリは Field でも有効 */

    /* ===== Drag & Drop ビジュアル ===== */
    #inventory button[draggable="true"] { cursor: grab; }
    #inventory button.dragging { opacity: 0.4; cursor: grabbing; }
    .slot.drop-target {
      background: rgba(255, 216, 102, 0.18) !important;
      border-color: var(--accent) !important;
      border-style: solid !important;
      box-shadow: inset 0 0 12px rgba(255, 216, 102, 0.35) !important;
    }
    .slot.drop-reject {
      background: rgba(255, 70, 70, 0.15) !important;
      border-color: #ff5544 !important;
    }

    /* ===== Pit / Goal タイル ===== */
    .tile.pit {
      background: #1a3a4a;
      color: #88ddff;
      box-shadow: inset 0 0 6px rgba(136, 221, 255, 0.35);
    }
    .tile.goal {
      background: #4a3a10;
      color: #ffd866;
      animation: goal-pulse 1.6s ease-in-out infinite;
    }
    @keyframes goal-pulse {
      0%, 100% { filter: brightness(1.0); box-shadow: inset 0 0 6px rgba(255, 216, 102, 0.3); }
      50%      { filter: brightness(1.35); box-shadow: inset 0 0 14px rgba(255, 216, 102, 0.7); }
    }
    /* プレイヤーが乗っかってる時のピット背景を残す */
    .tile.player.on-pit-bg  { background: #1a3a4a; }
    .tile.player.on-goal-bg { background: #4a3a10; }

    /* ===== キャラクター SVG ===== */
    .char-svg {
      width: 100%;
      height: 100%;
      display: block;
      pointer-events: none;
    }
    /* スライムの跳ねるアニメ (transform-origin が下端) */
    .slime-body {
      transform-origin: 50% 92%;
      animation: slime-bounce 1.4s ease-in-out infinite;
    }
    @keyframes slime-bounce {
      0%, 100% { transform: scaleX(1.0) scaleY(1.0); }
      45%      { transform: scaleX(1.08) scaleY(0.86); }
      55%      { transform: scaleX(1.08) scaleY(0.86); }
    }
    /* 炎スライム頭の炎 */
    .slime-flame {
      transform-origin: 16px 8px;
      animation: flame-flicker 0.55s ease-in-out infinite;
    }
    @keyframes flame-flicker {
      0%, 100% { transform: scaleY(1.0)  scaleX(1.0); opacity: 0.95; }
      50%      { transform: scaleY(1.25) scaleX(0.85); opacity: 1.0; }
    }
    /* 氷スライムの結晶きらめき */
    .slime-crystal {
      transform-origin: 50% 50%;
      animation: crystal-twinkle 1.8s ease-in-out infinite;
    }
    @keyframes crystal-twinkle {
      0%, 100% { opacity: 0.85; }
      50%      { opacity: 1.0; filter: drop-shadow(0 0 3px #cce8ff); }
    }
    /* 凍結中はバウンス停止 + 青オーバーレイ */
    .tile.enemy.frozen .slime-body {
      animation: none;
      filter: brightness(0.8) saturate(0.5) hue-rotate(160deg);
    }
    .tile.enemy.frozen::after {
      content: '❄';
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: rgba(160, 220, 255, 0.65);
      text-shadow: 0 0 6px #88ddff;
      pointer-events: none;
      animation: frost-shake 1.2s ease-in-out infinite;
    }
    @keyframes frost-shake {
      0%, 100% { transform: translate(0, 0) rotate(0); }
      50%      { transform: translate(0.5px, -0.5px) rotate(8deg); }
    }
    /* プレイヤー */
    .player-body {
      transform-origin: 50% 95%;
      animation: player-idle 1.6s ease-in-out infinite;
    }
    @keyframes player-idle {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-1px); }
    }
    /* キャラ SVG が追加された時、tile の中央寄せ用テキストを潰す */
    .tile.player, .tile.enemy { font-size: 0; padding: 1px; }

    /* ===== 床落ちペダル ===== */
    .tile.floor.pickup {
      background: #2a2a32;
      font-size: 0;
      padding: 1px;
    }
    .pickup-marker {
      position: absolute;
      inset: 3px;
      border: 1.6px solid var(--pedal-color, #fff);
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.55);
      color: var(--pedal-color, #fff);
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-shadow: 0 0 4px var(--pedal-color, #fff);
      animation: pickup-pulse 1.5s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes pickup-pulse {
      0%, 100% { transform: scale(1.0); opacity: 0.85; }
      50%      { transform: scale(1.10); opacity: 1.0;
                 box-shadow: 0 0 6px var(--pedal-color, #fff); }
    }

    /* ===== ボス スライム ===== */
    .tile.enemy.boss {
      box-shadow: inset 0 0 12px rgba(220, 50, 50, 0.6);
      animation: boss-aura 1.6s ease-in-out infinite;
    }
    @keyframes boss-aura {
      0%, 100% { filter: brightness(1.0); }
      50%      { filter: brightness(1.18) drop-shadow(0 0 4px #ff4444); }
    }

    /* ===== 被弾フラッシュ (overlay: 攻撃ごとに新規 DOM 生成、衝突なし) ===== */
    .hurt-fx {
      position: absolute;
      width: var(--tile-size, 32px);
      height: var(--tile-size, 32px);
      background: radial-gradient(circle, rgba(255,60,60,0.85), rgba(255,60,60,0) 70%);
      pointer-events: none;
      z-index: 8;
      animation: hurt-fx-anim 320ms ease-out forwards;
    }
    @keyframes hurt-fx-anim {
      0%   { opacity: 0;   transform: scale(0.55); }
      25%  { opacity: 1;   transform: scale(1.15); }
      100% { opacity: 0;   transform: scale(1.5); }
    }

    /* ===== アーチャーの矢 (overlay: 起点から飛ぶ) ===== */
    .arrow-fx {
      position: absolute;
      width: var(--tile-size, 32px);
      height: var(--tile-size, 32px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-family: ui-monospace, monospace;
      color: #ffd866;
      text-shadow: 0 0 6px #ff7733, 0 0 3px #000;
      pointer-events: none;
      z-index: 9;
      animation: arrow-fly 260ms ease-out forwards;
    }
    @keyframes arrow-fly {
      0%   { transform: translate(0, 0); opacity: 0; }
      15%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { transform: translate(var(--arrow-x, 0), var(--arrow-y, 0)); opacity: 0; }
    }

    /* ===== クランクブリッツのフック (overlay: 飛んで戻る) ===== */
    .hook-fx {
      position: absolute;
      width: var(--tile-size, 32px);
      height: var(--tile-size, 32px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      pointer-events: none;
      z-index: 9;
      filter: drop-shadow(0 0 4px #ffcc44);
      animation: hook-grab 500ms cubic-bezier(0.3, 0, 0.7, 1) forwards;
    }
    @keyframes hook-grab {
      0%   { transform: translate(0, 0);                            opacity: 0; }
      15%  { opacity: 1; }
      45%  { transform: translate(var(--hook-x, 0), var(--hook-y, 0)); opacity: 1; }
      55%  { transform: translate(var(--hook-x, 0), var(--hook-y, 0)); opacity: 1; }
      100% { transform: translate(0, 0);                            opacity: 0; }
    }
    .hook-chain {
      position: absolute;
      height: 3px;
      width: var(--chain-len, 32px);
      background: linear-gradient(90deg, #ffcc44 0%, #ffaa22 100%);
      box-shadow: 0 0 5px rgba(255,200,80,0.85);
      transform-origin: 0 50%;
      transform: rotate(var(--chain-rot, 0deg)) scaleX(0);
      pointer-events: none;
      z-index: 8;
      animation: hook-chain-pulse 500ms cubic-bezier(0.3, 0, 0.7, 1) forwards;
    }
    @keyframes hook-chain-pulse {
      0%   { transform: rotate(var(--chain-rot, 0deg)) scaleX(0); opacity: 0.4; }
      30%  { opacity: 0.95; }
      45%  { transform: rotate(var(--chain-rot, 0deg)) scaleX(1); opacity: 0.95; }
      55%  { transform: rotate(var(--chain-rot, 0deg)) scaleX(1); opacity: 0.95; }
      100% { transform: rotate(var(--chain-rot, 0deg)) scaleX(0); opacity: 0; }
    }

    /* クランクブリッツ本体: 青い目の点滅 + 黄味の発光 */
    @keyframes crank-glow {
      0%, 100% { filter: drop-shadow(0 0 3px rgba(255,200,80,0.5)); }
      50%      { filter: drop-shadow(0 0 8px rgba(255,200,80,0.95)); }
    }
    .tile.enemy.enemy-crankblitz > .char-svg {
      animation: crank-glow 1.4s ease-in-out infinite;
    }

    /* ===== 敵 lunge (overlay: 殴る方向に飛んで戻る) ===== */
    .lunge-fx {
      position: absolute;
      width: var(--tile-size, 32px);
      height: var(--tile-size, 32px);
      background: radial-gradient(circle, rgba(255,210,100,0.7), rgba(255,210,100,0) 65%);
      pointer-events: none;
      z-index: 7;
      animation: lunge-fx-anim 350ms ease-out forwards;
    }
    @keyframes lunge-fx-anim {
      0%   { transform: translate(0, 0); opacity: 0.5; }
      40%  { transform: translate(var(--lunge-x, 0px), var(--lunge-y, 0px));
             opacity: 1; }
      100% { transform: translate(calc(var(--lunge-x, 0px) * 1.4),
                                  calc(var(--lunge-y, 0px) * 1.4));
             opacity: 0; }
    }

    /* HUD HP の脈動 (#hp ルートに class を付与、renderHud の innerHTML 入れ替えで消えない) */
    #hp.hurt        { animation: hp-text-hurt 380ms ease-out; }
    @keyframes hp-text-hurt {
      0%   { color: var(--text); }
      30%  { color: #ff5544; text-shadow: 0 0 6px #ff5566; }
      100% { color: var(--text); }
    }
    #hp.hurt .hp-bar-wrap {
      animation: hp-bar-hurt 380ms ease-out;
    }
    @keyframes hp-bar-hurt {
      0%   { box-shadow: 0 0 0 rgba(255,80,80,0); transform: translateX(0); }
      20%  { box-shadow: 0 0 10px rgba(255,80,80,0.95); transform: translateX(-3px); }
      40%  { transform: translateX(3px); }
      60%  { transform: translateX(-2px); }
      80%  { transform: translateX(2px); }
      100% { box-shadow: 0 0 0 rgba(255,80,80,0); transform: translateX(0); }
    }

    /* 画面 shake (プレイヤー被ダメ時) — mapEl 全体を揺らす */
    #map.shake { animation: screen-shake 220ms ease-out; }
    @keyframes screen-shake {
      0%, 100% { transform: translate(0, 0); }
      20% { transform: translate(-3px, 1px); }
      40% { transform: translate(3px, -1px); }
      60% { transform: translate(-2px, 1px); }
      80% { transform: translate(2px, 0); }
    }

    /* ===== インベントリ ミニメニュー ===== */
    #item-menu {
      position: fixed;
      min-width: 160px;
      background: #1a1a1f;
      border: 1px solid #555;
      border-left: 3px solid var(--accent);
      border-radius: 6px;
      padding: 4px;
      z-index: 9000;
      box-shadow: 0 6px 24px rgba(0,0,0,0.75);
      font-family: ui-monospace, monospace;
      font-size: 12px;
    }
    #item-menu .menu-header {
      padding: 4px 8px;
      font-weight: bold;
      letter-spacing: 1px;
      border-bottom: 1px solid #2a2a30;
      margin-bottom: 3px;
    }
    #item-menu .menu-option {
      display: block;
      width: 100%;
      text-align: left;
      padding: 5px 10px;
      background: transparent;
      border: none;
      color: #e0e0e0;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      border-radius: 3px;
    }
    #item-menu .menu-option:hover { background: #2c2c34; }
    #item-menu .menu-option.danger        { color: #ff7766; }
    #item-menu .menu-option.danger:hover  { background: rgba(255,90,80,0.15); }
    #item-menu .menu-option.cancel        { color: #888; }
    #item-menu .menu-option.cancel:hover  { background: #2a2a30; }
    #item-menu .menu-sep {
      height: 1px;
      background: #2a2a30;
      margin: 3px 0;
    }
    #item-menu .menu-hint {
      padding: 8px 10px;
      font-size: 11px;
      color: #cfcfcf;
      line-height: 1.5;
      background: rgba(255, 216, 102, 0.06);
      border-left: 2px solid #ffd866;
      margin: 2px 0;
    }
    #item-menu .menu-hint b { color: #ffd866; }

    /* ===== Floor インジケータ (HUD) ===== */
    #floor-indicator {
      padding: 3px 10px;
      border-radius: 4px;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      color: var(--accent);
      border: 1px solid var(--accent);
      background: rgba(255, 182, 72, 0.08);
      letter-spacing: 1px;
    }

    /* ===== マップ直上のクイック操作ヘルプ ===== */
    #quick-help {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 10px;
      padding: 8px 12px;
      margin: 4px 0 8px;
      background: linear-gradient(180deg, #1a1d24, #161920);
      border: 1px solid #2c313c;
      border-radius: 6px;
      font-size: 13px;
      color: #cfd3da;
      line-height: 1.5;
    }
    #quick-help b { color: #ffd866; font-weight: 600; margin-right: 4px; }
    #quick-help .qh-sep { color: #444; padding: 0 2px; }
    #quick-help .qh-note { color: #888; font-size: 11px; margin-left: 4px; }
    #quick-help kbd {
      display: inline-block;
      min-width: 18px;
      padding: 1px 6px;
      margin: 0 1px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #e8eaef;
      background: #2a2f3a;
      border: 1px solid #404858;
      border-bottom-width: 2px;
      border-radius: 3px;
      text-align: center;
    }

    /* ===== 赤ちゃん / NPC ===== */
    @keyframes baby-idle {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-1px); }
    }
    .baby-body { transform-origin: 50% 95%; animation: baby-idle 1.4s ease-in-out infinite; }

    /* 味方オーラ (赤ちゃん): 緑 */
    @keyframes ally-aura {
      0%, 100% { box-shadow: inset 0 0 8px rgba(126,217,87,0.55), 0 0 6px rgba(126,217,87,0.45); }
      50%      { box-shadow: inset 0 0 14px rgba(126,217,87,0.85), 0 0 14px rgba(126,217,87,0.85); }
    }
    @keyframes ally-aura-glow {
      0%, 100% { filter: drop-shadow(0 0 2px rgba(126,217,87,0.55)); }
      50%      { filter: drop-shadow(0 0 7px rgba(126,217,87,1.0)); }
    }
    .tile.baby {
      font-size: 0; padding: 1px; background: #1f2a1f;
      animation: ally-aura 1.6s ease-in-out infinite;
    }
    .tile.baby > .char-svg { animation: ally-aura-glow 1.6s ease-in-out infinite, baby-idle 1.4s ease-in-out infinite; }
    .tile.baby.on-pit-bg  { background: #1a3a4a; }
    .tile.baby.on-goal-bg { background: #4a3a10; }

    /* 話せる NPC オーラ: 黄色 */
    @keyframes talkable-aura {
      0%, 100% { box-shadow: inset 0 0 10px rgba(255,216,102,0.55), 0 0 6px rgba(255,216,102,0.5); }
      50%      { box-shadow: inset 0 0 18px rgba(255,216,102,0.85), 0 0 16px rgba(255,216,102,0.95); }
    }
    @keyframes talkable-aura-glow {
      0%, 100% { filter: drop-shadow(0 0 3px rgba(255,216,102,0.55)); }
      50%      { filter: drop-shadow(0 0 9px rgba(255,216,102,1.0)); }
    }
    .tile.npc-knight {
      font-size: 0; padding: 1px; background: #2a221a;
      animation: talkable-aura 1.6s ease-in-out infinite;
    }
    /* 絶命後の騎士 (屍): オーラ無し、グレーアウト */
    .tile.npc-knight-dead {
      font-size: 0; padding: 1px;
      background: #15140f;
      box-shadow: inset 0 0 6px rgba(0,0,0,0.6);
    }
    .tile.npc-knight-dead > .char-svg {
      animation: none;
      filter: grayscale(1) brightness(0.45) drop-shadow(0 0 2px rgba(60,30,30,0.5));
    }
    .tile.npc-mother {
      font-size: 0; padding: 1px; background: #2a2532;
      animation: talkable-aura 1.6s ease-in-out infinite;
    }
    /* 騎士: 黄オーラ + ほんのり赤の血のグロー */
    @keyframes knight-bleed-aura {
      0%, 100% { filter: drop-shadow(0 0 3px rgba(255,216,102,0.55)) drop-shadow(0 0 2px rgba(200,40,40,0.55)); }
      50%      { filter: drop-shadow(0 0 9px rgba(255,216,102,1.0))  drop-shadow(0 0 6px rgba(220,60,60,0.95)); }
    }
    .tile.npc-knight > .char-svg { animation: knight-bleed-aura 1.6s ease-in-out infinite; }
    .tile.npc-mother > .char-svg { animation: talkable-aura-glow 1.6s ease-in-out infinite, baby-idle 1.6s ease-in-out infinite; }

    /* 赤ちゃん HP ミニバー (タイル下端、ピンク系) */
    .tile-hp-fill-baby { background: #ff88bb; }

    /* 赤ちゃんの吹き出し */
    .baby-speech-bubble {
      position: absolute;
      z-index: 70;
      padding: 4px 9px;
      background: linear-gradient(180deg, #fff4f8, #ffe0ea);
      color: #5a2238;
      font-family: ui-monospace, "Menlo", monospace;
      font-size: 12px;
      font-weight: bold;
      border: 1.5px solid #cc7799;
      border-radius: 12px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.4);
      pointer-events: none;
      animation: baby-bubble-pop 1.6s ease-out forwards;
      white-space: nowrap;
    }
    .baby-speech-bubble::after {
      content: "";
      position: absolute;
      bottom: -6px;
      left: 14px;
      border-style: solid;
      border-width: 6px 6px 0 0;
      border-color: #ffe0ea transparent transparent transparent;
    }
    .baby-speech-bubble.weak  { color: #8a4422; background: linear-gradient(180deg, #fff0e0, #ffd5b8); border-color: #cc8855; }
    .baby-speech-bubble.weak::after { border-top-color: #ffd5b8; }
    .baby-speech-bubble.dying { color: #883366; background: linear-gradient(180deg, #f8e0e8, #f0c0d8); border-color: #aa5577; }
    .baby-speech-bubble.dying::after { border-top-color: #f0c0d8; }
    .baby-speech-bubble.hurt  { color: #aa1144; background: linear-gradient(180deg, #ffe6ee, #ffcad6); border-color: #cc3355; }
    .baby-speech-bubble.hurt::after  { border-top-color: #ffcad6; }
    .baby-speech-bubble.die   { color: #6a2244; background: linear-gradient(180deg, #e8d0d8, #d0a8b8); border-color: #774455; }
    .baby-speech-bubble.die::after   { border-top-color: #d0a8b8; }
    @keyframes baby-bubble-pop {
      0%   { transform: translateY(4px) scale(0.7); opacity: 0; }
      18%  { transform: translateY(-2px) scale(1.05); opacity: 1; }
      30%  { transform: translateY(0) scale(1.0); opacity: 1; }
      85%  { opacity: 1; }
      100% { transform: translateY(-3px); opacity: 0; }
    }
    /* 死亡時バブルは長め */
    .baby-speech-bubble.die { animation-duration: 2400ms; }

    /* 母の吹き出し: 落ち着いた色味、左下から矢印 */
    .mother-speech-bubble {
      position: absolute;
      z-index: 70;
      padding: 5px 11px;
      background: linear-gradient(180deg, #f0e6d6, #d8c8b0);
      color: #4a3520;
      font-family: ui-monospace, "Menlo", monospace;
      font-size: 12px;
      font-weight: bold;
      border: 1.5px solid #88663a;
      border-radius: 12px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.45);
      pointer-events: none;
      animation: baby-bubble-pop 2400ms ease-out forwards;
      white-space: nowrap;
    }
    .mother-speech-bubble::after {
      content: "";
      position: absolute;
      bottom: -6px;
      left: 14px;
      border-style: solid;
      border-width: 6px 6px 0 0;
      border-color: #d8c8b0 transparent transparent transparent;
    }
    /* 喜びモードの赤ちゃんバブル: ほっこり色 */
    .baby-speech-bubble.joy {
      color: #aa3366;
      background: linear-gradient(180deg, #fff0f8, #ffd0e0);
      border-color: #cc5588;
      animation-duration: 2400ms;
    }
    .baby-speech-bubble.joy::after { border-top-color: #ffd0e0; }

    /* ===== NPC ダイアログ (画面中央 + 暗転バックドロップ) ===== */
    #npc-dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(1.5px);
      z-index: 2999;
      cursor: pointer;
      animation: backdrop-fade-in 200ms ease-out;
      transition: background 350ms ease-out, backdrop-filter 350ms ease-out;
    }
    /* 演出中: 一時的に暗転を薄くしてマップが透けるようにする */
    #npc-dialog-backdrop.reveal {
      background: rgba(0, 0, 0, 0.18);
      backdrop-filter: blur(0px);
    }
    #npc-dialog.reveal {
      opacity: 0.32;
      transition: opacity 350ms ease-out;
    }
    #npc-dialog {
      transition: opacity 350ms ease-out;
    }
    @keyframes backdrop-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    #npc-dialog {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      min-width: 420px;
      max-width: 600px;
      padding: 22px 28px 18px;
      background: linear-gradient(180deg, #1a1820, #0f0d14);
      color: #f0e6d6;
      border: 2px solid #c9a531;
      border-radius: 12px;
      font-family: ui-monospace, "Menlo", monospace;
      font-size: 16px;
      line-height: 1.7;
      box-shadow: 0 12px 40px rgba(0,0,0,0.85), 0 0 30px rgba(201,165,49,0.25);
      z-index: 3000;
      cursor: pointer;
      animation: dialog-pop-in 220ms cubic-bezier(0.2, 1, 0.4, 1);
    }
    @keyframes dialog-pop-in {
      from { transform: translate(-50%, -45%) scale(0.94); opacity: 0; }
      to   { transform: translate(-50%, -50%) scale(1.0);   opacity: 1; }
    }

    /* ===== システム通知ダイアログ (取得アイテム説明など) ===== */
    #system-dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(1.5px);
      z-index: 2999;
      cursor: pointer;
      animation: backdrop-fade-in 200ms ease-out;
    }
    #system-dialog {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      min-width: 420px;
      max-width: 560px;
      padding: 20px 26px 18px;
      background: linear-gradient(180deg, #15201a, #0c1410);
      color: #e6f3da;
      border: 2px solid #7ed957;
      border-radius: 12px;
      font-family: ui-monospace, "Menlo", monospace;
      font-size: 14px;
      line-height: 1.65;
      box-shadow: 0 12px 40px rgba(0,0,0,0.85), 0 0 30px rgba(126,217,87,0.25);
      z-index: 3000;
      animation: dialog-pop-in 220ms cubic-bezier(0.2, 1, 0.4, 1);
    }
    #system-dialog .sys-title {
      font-weight: bold;
      color: #7ed957;
      font-size: 15px;
      letter-spacing: 1px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #2a3a2a;
    }
    #system-dialog .sys-body { color: #e6f3da; }
    #system-dialog .sys-body b { color: #ffd866; }
    #system-dialog .sys-close {
      margin-top: 14px;
      display: block;
      width: 100%;
      padding: 8px;
      background: rgba(126,217,87,0.15);
      color: #b8e8a0;
      border: 1px solid #7ed957;
      border-radius: 6px;
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
      letter-spacing: 1px;
    }
    #system-dialog .sys-close:hover { background: rgba(126,217,87,0.3); color: #fff; }

    /* ===== 加護の演出 (画面中央に金色のリング + 十字) ===== */
    .blessing-overlay {
      position: fixed;
      left: 0; top: 0;
      width: 100vw; height: 100vh;
      z-index: 3500;
      pointer-events: none;
    }
    @keyframes blessing-ring {
      0%   { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
      18%  { opacity: 0.95; }
      100% { transform: translate(-50%, -50%) scale(3.6); opacity: 0; }
    }
    @keyframes blessing-cross-pop {
      0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0; filter: blur(8px); }
      18%  { opacity: 1; filter: blur(0); }
      40%  { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
      80%  { opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; filter: blur(3px); }
    }
    @keyframes blessing-sparkle {
      0%   { transform: translate(-50%, -50%) scale(0.4) rotate(0deg);   opacity: 0; }
      30%  { opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1.6) rotate(180deg); opacity: 0; }
    }
    .blessing-overlay .ring {
      position: absolute;
      left: 50%; top: 50%;
      width: 180px; height: 180px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,216,102,0.85) 0%, rgba(255,180,80,0.5) 35%, rgba(255,216,102,0) 70%);
      animation: blessing-ring 1.6s ease-out forwards;
    }
    .blessing-overlay .ring.delay { animation-delay: 280ms; }
    .blessing-overlay .cross {
      position: absolute;
      left: 50%; top: 50%;
      font-size: 92px;
      color: #fff;
      text-shadow: 0 0 18px #ffd866, 0 0 36px #ff8a4d, 0 0 60px #ffaa44;
      font-family: ui-monospace, monospace;
      animation: blessing-cross-pop 1.7s cubic-bezier(0.2, 1, 0.4, 1) forwards;
    }
    .blessing-overlay .sparkle {
      position: absolute;
      left: 50%; top: 50%;
      width: 130px; height: 130px;
      background: conic-gradient(
        from 0deg,
        rgba(255,216,102,0) 0deg,
        rgba(255,216,102,0.8) 45deg,
        rgba(255,216,102,0) 90deg,
        rgba(255,216,102,0.8) 135deg,
        rgba(255,216,102,0) 180deg,
        rgba(255,216,102,0.8) 225deg,
        rgba(255,216,102,0) 270deg,
        rgba(255,216,102,0.8) 315deg,
        rgba(255,216,102,0) 360deg
      );
      mask: radial-gradient(circle, #000 30%, transparent 70%);
      -webkit-mask: radial-gradient(circle, #000 30%, transparent 70%);
      animation: blessing-sparkle 1.7s ease-out forwards;
    }
    #npc-dialog .npc-name {
      font-weight: bold;
      color: #ffd866;
      font-size: 13px;
      letter-spacing: 1px;
      margin-bottom: 6px;
      padding-bottom: 5px;
      border-bottom: 1px solid #3a3220;
    }
    #npc-dialog .npc-line {
      color: #f0e6d6;
      white-space: pre-wrap;
    }
    #npc-dialog .npc-hint {
      text-align: right;
      font-size: 10px;
      color: #888;
      margin-top: 8px;
      letter-spacing: 1px;
    }

    /* ===== 赤ちゃんボード (4 番目の行) ===== */
    .board-row.row-b { border-color: transparent; }
    .board-row.row-b.active {
      border-color: #ff88bb;
      background: rgba(255, 136, 187, 0.06);
    }
    .slot.blessing-locked {
      border-color: #ffd866 !important;
      box-shadow: inset 0 0 10px rgba(255,216,102,0.35) !important;
      cursor: not-allowed;
    }
    .slot.blessing-locked::after {
      content: "✟";
      position: absolute;
      top: 2px; right: 4px;
      color: #ffd866;
      font-size: 12px;
      text-shadow: 0 0 4px #ffd866;
    }

    /* ===== 1F チュートリアル吹き出し ===== */
    .tutorial-bubble {
      position: absolute;
      z-index: 60;
      max-width: 260px;
      padding: 10px 22px 10px 12px;
      background: linear-gradient(180deg, #fff8d6, #ffe8a3);
      color: #2a2200;
      font-size: 13px;
      line-height: 1.45;
      border: 2px solid #c9a531;
      border-radius: 10px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.45);
      pointer-events: auto;
      animation: tut-bob 1.6s ease-in-out infinite;
    }
    .tutorial-bubble b { color: #8a5b00; }
    /* 既定: 左側に矢印 (タイルの右側に吹き出し) */
    .tutorial-bubble::before {
      content: "";
      position: absolute;
      left: -10px;
      top: 50%;
      transform: translateY(-50%);
      border-style: solid;
      border-width: 10px 12px 10px 0;
      border-color: transparent #c9a531 transparent transparent;
    }
    .tutorial-bubble::after {
      content: "";
      position: absolute;
      left: -7px;
      top: 50%;
      transform: translateY(-50%);
      border-style: solid;
      border-width: 8px 10px 8px 0;
      border-color: transparent #ffe8a3 transparent transparent;
    }
    /* point-left: 右側に矢印 (タイルの左側に吹き出し) */
    .tutorial-bubble.point-left::before {
      left: auto;
      right: -10px;
      border-width: 10px 0 10px 12px;
      border-color: transparent transparent transparent #c9a531;
    }
    .tutorial-bubble.point-left::after {
      left: auto;
      right: -7px;
      border-width: 8px 0 8px 10px;
      border-color: transparent transparent transparent #ffe8a3;
    }
    .tutorial-bubble .tut-close {
      position: absolute;
      top: 2px; right: 6px;
      cursor: pointer;
      font-size: 14px;
      color: #8a5b00;
      line-height: 1;
    }
    .tutorial-bubble .tut-close:hover { color: #c9a531; }
    @keyframes tut-bob {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-3px); }
    }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
})();

// ========================================================================
// フロア定義 (3 フロア、すべて 22×14)
// ========================================================================
// マップ凡例:
//   # 壁  . 床  @ プレイヤー開始(ピット扱い)
//   P ピット (編集可、敵侵入不可)  G ゴール
//   E 無属性スライム  F 炎スライム  I 氷スライム  B ボススライム
//   K スパイカ (棘亀: 攻撃を受ける毎にカウンター反射、ダメはフロア別)
//   J ジャイアントスパイカ (上位棘亀: HP85/ATK6、棘嵐 4→8→16→32 連撃倍化反射、燃焼/押出無効)
//   W 人面樹 (押し出し無効)
//   A アーチャー (4方向直線3マス・矢で攻撃、壁/敵で止まる)
//   H クランクブリッツ (HP70/ATK5、直線5マスのロケットグラブで引き寄せ + ダメ)
//   Q レイジ・オーガ (HP100/ATK10、死亡時 3T 怒り状態)
//   R レイス (HP80/ATK4、周囲 3×3 の敵を幻惑で隠す)
//   X ファントムレイス (HP100/ATK10、周囲 5×5 の敵を幻惑で隠す)
//   D Z O T L M V S U N C → ペダル (PEDAL_MAP 参照、R/X は敵に再割当て済み)
//
// 各フロア enemyConfig:
//   { hp, atk, dropChance(0-1), dropPool: [pedalId, ...] }
//   thorn/tree/archer も同じスキーマで指定。thorn は counter (任意, デフォ 2) も持つ

// 各フロアは 1 つ以上の map バリアントを持ち、ロード時に乱択。
// ? = pickup スポット (pickupPool からシャッフルして配置)
// pickup スポット数より pool が大きければ毎回違う組み合わせが出る。
const FLOORS = [
  {
    id: 1,
    pickupPool: ["driver", "tremolo", "phaser", "beam"],
    maps: [
      [ // Variant A: open layout
        "######################",
        "#....................#",
        "#.@..................#",
        "#....................#",
        "#......?.............#",
        "#....................#",
        "#......##............#",
        "#....2...............#",
        "#.E.................E#",
        "#....................#",
        "#............?.......#",
        "#....................#",
        "#......P............G#",
        "######################",
      ],
      [ // Variant B: 2 障害物 + 別配置
        "######################",
        "#.@..................#",
        "#....................#",
        "#....##.....?........#",
        "#....##..............#",
        "#....................#",
        "#.E................E.#",
        "#..............2.....#",
        "#....##..............#",
        "#....##.............P#",
        "#....................#",
        "#.......?............#",
        "#...................G#",
        "######################",
      ],
    ],
    enemyConfig: {
      neutral: { hp: 22, atk: 2, dropChance: 0.50, dropPool: ["phaser", "preamp", "sustainer"] },
    },
  },
  {
    id: 2,
    pickupPool: ["phaser", "booster", "delay", "aurashot"],
    maps: [
      [ // Variant A: 縦壁で部屋分割
        "######################",
        "#....................#",
        "#.@.....#...F....I...#",
        "#.......#............#",
        "#.......#......##....#",
        "#.......#............#",
        "#...?...........?....#",
        "#.......#............#",
        "#.......#......##....#",
        "#.......#....F....K..#",
        "#...3...#............#",
        "#.E.....#............#",
        "#.......P...........G#",
        "######################",
      ],
      [ // Variant B: 横チョーク 2 段
        "######################",
        "#.@..................#",
        "#....................#",
        "#......F....I........#",
        "#......?....?........#",
        "#....................#",
        "#######........#######",
        "#.........3..........#",
        "#######........#######",
        "#............I.......#",
        "#............E.......#",
        "#.......F............#",
        "#......P............G#",
        "######################",
      ],
    ],
    enemyConfig: {
      neutral: { hp: 28, atk: 3, dropChance: 0.35, dropPool: ["delay", "lift", "gigadelay", "tripletter"] },
      fire:    { hp: 30, atk: 3, dropChance: 0.45, dropPool: ["phaser", "delay", "booster", "compressor"] },
      ice:     { hp: 30, atk: 3, dropChance: 0.45, dropPool: ["booster", "powersupply"] },
      thorn:   { hp: 22, atk: 2, counter: 3, dropChance: 0.50, dropPool: ["preamp", "cut", "trim"] },
    },
  },
  {
    id: 3,
    pickupPool: ["lift", "push", "overdrive", "trim"],
    maps: [
      [ // Variant A: 中央障害物 + 左右配置
        "######################",
        "#.@..................#",
        "#....................#",
        "#....F....I.....F....#",
        "#.........K..........#",
        "#......##............#",
        "#....?..........?....#",
        "#....................#",
        "#......##............#",
        "#....I.....F....I....#",
        "#....................#",
        "#.....P..............#",
        "#......B............G#",
        "######################",
      ],
      [ // Variant B: 闘技場型 (ピラー4本)
        "######################",
        "#....................#",
        "#.@..................#",
        "#......F....I........#",
        "#....................#",
        "#...##........##.....#",
        "#...##....?...##.....#",
        "#....................#",
        "#...##....?...##.....#",
        "#...##........##.....#",
        "#....................#",
        "#.....I....F.....I...#",
        "#....P......B.......G#",
        "######################",
      ],
    ],
    enemyConfig: {
      fire: { hp: 35, atk: 3, dropChance: 0.30, dropPool: ["phaser", "overdrive", "push", "pusher"] },
      ice:  { hp: 35, atk: 3, dropChance: 0.30, dropPool: ["overdrive", "push", "sustainer"] },
      thorn: { hp: 32, atk: 2, counter: 4, dropChance: 0.45, dropPool: ["preamp", "cut", "trim", "lift"] },
      boss: { hp: 80, atk: 4, dropChance: 1.00, dropPool: ["stack", "overdrive", "beam", "aurashot", "tripletter", "pusher", "gigadelay"] },
    },
  },
  {
    id: 4,
    pickupPool: ["tremolo", "delay", "gigadelay", "preamp", "sustainer"],
    maps: [
      [
        "######################",
        "#.@..................#",
        "#....................#",
        "#.....##.............#",
        "#.E...##......?......#",
        "#.............W......#",
        "#......#......#......#",
        "#...?..#......#..?...#",
        "#......#......#......#",
        "#.....F#......#.ER...#",
        "#......#......#......#",
        "#......##............#",
        "#......P............G#",
        "######################",
      ],
      [
        "######################",
        "#.@..................#",
        "#.....F.....E........#",
        "#....................#",
        "#...##.....##........#",
        "#...##.....##.....?..#",
        "#....................#",
        "#.......?............#",
        "#....................#",
        "#...##.....##........#",
        "#...##.E...##........#",
        "#....................#",
        "#.......P...........G#",
        "######################",
      ],
    ],
    enemyConfig: {
      neutral: { hp: 32, atk: 3, dropChance: 0.35, dropPool: ["delay", "gigadelay", "preamp", "lift"] },
      fire:    { hp: 35, atk: 3, dropChance: 0.40, dropPool: ["phaser", "tremolo", "booster", "compressor"] },
      tree:    { hp: 80, atk: 3, dropChance: 0.45, dropPool: ["trim", "lift", "preamp", "stack"] },
    },
  },
  {
    id: 5,
    pickupPool: ["booster", "overdrive", "tripletter", "push"],
    maps: [
      [
        "######################",
        "#.@..................#",
        "#....................#",
        "#....##........##....#",
        "#....##...?....##....#",
        "#.........W..........#",
        "#.E................I.#",
        "#..........B.........#",
        "#.E................I.#",
        "#....................#",
        "#....##........##....#",
        "#....##...?....##....#",
        "#.....P.............G#",
        "######################",
      ],
      [
        "######################",
        "#.@..................#",
        "#..##................#",
        "#..##......I.........#",
        "#....................#",
        "#......##............#",
        "#......##......?.....#",
        "#....I......B........#",
        "#............R.......#",
        "#.........##.........#",
        "#...?.....##....E....#",
        "#....................#",
        "#.....P.............G#",
        "######################",
      ],
    ],
    enemyConfig: {
      neutral: { hp: 35, atk: 4, dropChance: 0.30, dropPool: ["overdrive", "booster", "lift", "powersupply"] },
      ice:     { hp: 38, atk: 4, dropChance: 0.40, dropPool: ["booster", "delay", "tripletter"] },
      tree:    { hp: 95, atk: 4, dropChance: 0.40, dropPool: ["trim", "stack", "preamp", "powersupply"] },
      boss:    { hp: 100, atk: 5, dropChance: 1.00, dropPool: ["overdrive", "stack", "tripletter", "pusher", "gigadelay"] },
    },
  },
  {
    id: 6,
    pickupPool: ["phaser", "compressor", "lift"],
    maps: [
      [
        "######################",
        "#.@..................#",
        "#......F....I........#",
        "#..............A.....#",
        "#...##........##.....#",
        "#...##.....?..##.....#",
        "#..........H.........#",
        "#.....I....F.....F...#",
        "#....................#",
        "#...##.....?..##.....#",
        "#...##........##.....#",
        "#.....F....IR....I...#",
        "#......P............G#",
        "######################",
      ],
      [
        "######################",
        "#.@.................F#",
        "#....................#",
        "#.I.......##.........#",
        "#.........##...?.....#",
        "#....................#",
        "#....F....##....I....#",
        "#.........H..........#",
        "#......?...##........#",
        "#...........##.......#",
        "#.I.........##.......#",
        "#.................F..#",
        "#......P............G#",
        "######################",
      ],
    ],
    enemyConfig: {
      fire: { hp: 42, atk: 4, dropChance: 0.30, dropPool: ["phaser", "compressor", "overdrive", "preamp"] },
      ice:  { hp: 42, atk: 4, dropChance: 0.30, dropPool: ["compressor", "overdrive", "preamp"] },
      archer: { hp: 26, atk: 3, dropChance: 0.50, dropPool: ["beam", "aurashot", "tripletter", "tremolo"] },
    },
  },
  {
    id: 7,
    pickupPool: ["stack", "gigadelay", "tremolo", "powersupply"],
    maps: [
      [
        "######################",
        "#.@..................#",
        "#...........n........#",
        "#.E.E.K........FXF.A.#",
        "#....................#",
        "#......##............#",
        "#...?..##......?.....#",
        "#......##............#",
        "#....................#",
        "#.I.I.I........E.Q.E.#",
        "#....................#",
        "#......##............#",
        "#......P............G#",
        "######################",
      ],
      [
        "######################",
        "#.@..................#",
        "#.......n............#",
        "#.E..F..I..Q..F..I...#",
        "#....................#",
        "#...##....##....##...#",
        "#.?.##.?..##.?..##...#",
        "#...##....##....##...#",
        "#....................#",
        "#.I..E..F..I..E..F...#",
        "#....................#",
        "#....................#",
        "#...P...............G#",
        "######################",
      ],
    ],
    enemyConfig: {
      neutral: { hp: 45, atk: 4, dropChance: 0.30, dropPool: ["tremolo", "delay", "gigadelay", "stack"] },
      fire:    { hp: 48, atk: 5, dropChance: 0.30, dropPool: ["phaser", "tremolo", "powersupply"] },
      ice:     { hp: 48, atk: 5, dropChance: 0.30, dropPool: ["tremolo", "powersupply"] },
      thorn:   { hp: 48, atk: 3, counter: 6, dropChance: 0.40, dropPool: ["preamp", "cut", "trim", "powersupply"] },
      archer:  { hp: 30, atk: 4, dropChance: 0.45, dropPool: ["beam", "tripletter", "tremolo", "preamp"] },
    },
  },
  {
    id: 8,
    pickupPool: ["trim", "cut", "overdrive", "pusher"],
    maps: [
      [
        "######################",
        "#.@..................#",
        "#....................#",
        "#...........W........#",
        "#..........J.........#",
        "#.A.......O........I.#",
        "#.......?...?........#",
        "#......Z...B...Z.....#",
        "#.......?...?........#",
        "#.Q..............X.F.#",
        "#........W...........#",
        "#....................#",
        "#.....P.............G#",
        "######################",
      ],
      [
        "######################",
        "#.@..................#",
        "#..........H.........#",
        "#.......##...........#",
        "#.......##....?......#",
        "#....I...W..O..Q.....#",
        "#.......Z..B....Z....#",
        "#....F.........I.....#",
        "#......?.....W.......#",
        "#.......##...........#",
        "#.......##...........#",
        "#............J.......#",
        "#......P............G#",
        "######################",
      ],
    ],
    enemyConfig: {
      neutral: { hp: 50, atk: 5, dropChance: 0.25, dropPool: ["overdrive", "stack", "cut", "trim"] },
      fire:    { hp: 52, atk: 5, dropChance: 0.30, dropPool: ["phaser", "pusher", "compressor"] },
      ice:     { hp: 52, atk: 5, dropChance: 0.30, dropPool: ["pusher", "compressor"] },
      tree:    { hp: 130, atk: 4, dropChance: 0.40, dropPool: ["trim", "stack", "preamp", "compressor"] },
      archer:  { hp: 35, atk: 4, dropChance: 0.45, dropPool: ["beam", "tripletter", "compressor", "preamp"] },
      boss:    { hp: 130, atk: 5, dropChance: 1.00, dropPool: ["stack", "gigadelay", "pusher", "tripletter", "overdrive"] },
    },
  },
  {
    id: 9,
    pickupPool: ["stack", "gigadelay", "tripletter", "push"],
    maps: [
      [
        "######################",
        "#.@..................#",
        "#....................#",
        "#..F....ZQ....ZA..O..#",
        "#....................#",
        "#...##.....##........#",
        "#...##..?..##....?...#",
        "#....................#",
        "#...##.....##....W...#",
        "#...##.....##........#",
        "#....................#",
        "#..K.....W.....IR....#",
        "#......P............G#",
        "######################",
      ],
      [
        "######################",
        "#.@.................F#",
        "#....................#",
        "#....##############..#",
        "#....#............I..#",
        "#....#..######....F..#",
        "#....#..#....#....O..#",
        "#....#..#?...#..?....#",
        "#....#..######....Q..#",
        "#....#............F.Z#",
        "#....##############..#",
        "#.....W..........W...#",
        "#......P............G#",
        "######################",
      ],
    ],
    enemyConfig: {
      fire: { hp: 58, atk: 6, dropChance: 0.30, dropPool: ["phaser", "stack", "preamp", "powersupply"] },
      ice:  { hp: 58, atk: 6, dropChance: 0.30, dropPool: ["stack", "preamp", "powersupply"] },
      thorn:  { hp: 62, atk: 3, counter: 8, dropChance: 0.40, dropPool: ["preamp", "cut", "trim", "stack"] },
      tree:   { hp: 150, atk: 5, dropChance: 0.40, dropPool: ["trim", "stack", "preamp", "powersupply"] },
      archer: { hp: 40, atk: 5, dropChance: 0.45, dropPool: ["beam", "tripletter", "compressor", "stack"] },
    },
  },
  {
    id: 10,
    pickupPool: ["stack", "pusher", "tripletter", "gigadelay", "compressor"],
    maps: [
      [
        "######################",
        "#.@..................#",
        "#..........m.........#",
        "#.F......Q....W....I.#",
        "#....................#",
        "#......##....##......#",
        "#...?..........?.....#",
        "#.....Z..O.B....Z....#",
        "#......##....##......#",
        "#..........J.........#",
        "#.I......A.........F.#",
        "#...W............W...#",
        "#.....P.............G#",
        "######################",
      ],
      [
        "######################",
        "#......m.............#",
        "#.@..................#",
        "#....................#",
        "#.F....##....##..X.I.#",
        "#......##....##......#",
        "#....Z..O.B....Z.....#",
        "#......##....##......#",
        "#.I....##....##....Q.#",
        "#.........J..........#",
        "#......?......?......#",
        "#...W..........W.....#",
        "#....P..............G#",
        "######################",
      ],
    ],
    enemyConfig: {
      fire: { hp: 70, atk: 6, dropChance: 0.30, dropPool: ["phaser", "stack", "gigadelay", "preamp"] },
      ice:  { hp: 70, atk: 6, dropChance: 0.30, dropPool: ["stack", "gigadelay", "powersupply"] },
      thorn:  { hp: 75, atk: 4, counter: 10, dropChance: 0.50, dropPool: ["preamp", "cut", "trim", "stack", "gigadelay"] },
      tree:   { hp: 180, atk: 5, dropChance: 0.45, dropPool: ["trim", "stack", "preamp", "gigadelay"] },
      archer: { hp: 48, atk: 5, dropChance: 0.50, dropPool: ["beam", "tripletter", "stack", "compressor", "preamp"] },
      boss: { hp: 200, atk: 7, dropChance: 1.00, dropPool: ["stack", "gigadelay", "tripletter", "pusher", "compressor", "overdrive", "aurashot", "beam"] },
    },
  },
];

let currentFloorIdx = 0;
let currentFloor = FLOORS[0];

// 全フロアのバリアントは 22×14 で統一 (parseMap でバリデーション)
const COLS = currentFloor.maps[0][0].length;
const ROWS = currentFloor.maps[0].length;

// ========================================================================
// ラベル
// ========================================================================
// element / shape / status のラベルは src/data/texts.js (TEXTS.labels) に外出し。
// WEAPONS / FLOORS の name/desc/hint も同じく TEXTS から読む。
// (WEAPONS / FLOORS の merge は WEAPONS 定義の直後でまとめて行う)
const ELEMENT_LABEL = (window.TEXTS && window.TEXTS.labels && window.TEXTS.labels.element) || {};
const SHAPE_LABEL   = (window.TEXTS && window.TEXTS.labels && window.TEXTS.labels.shape)   || {};
const STATUS_LABEL  = (window.TEXTS && window.TEXTS.labels && window.TEXTS.labels.status)  || {};

const FACING_CHAR   = { "1,0": "→", "-1,0": "←", "0,1": "↓", "0,-1": "↑" };
const FACING_ARROW  = { "1,0": "▶", "-1,0": "◀", "0,1": "▼", "0,-1": "▲" };
const FACING_DIR    = { "1,0": "dir-right", "-1,0": "dir-left", "0,1": "dir-down", "0,-1": "dir-up" };

// ========================================================================
// 武器（Source）
// ========================================================================
// 武器テーブル: 各武器は1つの攻撃形状を持つ。Q/W/E に装備して使う。
// damageRed:true なら素ダメも左端 modifier の対象 (赤字)、false は聖域 (黒字)。
// effect (任意): 武器固有の特殊効果。doAttack 内で分岐処理する。
//   "sustain"  ← 同一対象への連続ヒットでダメ +10%/回 (別対象でリセット)
//   "compress" ← 各ヒットで対象の最大HP × atk.compress% を追加ダメ (compress は赤字)
//   "pushback" ← 各ヒットで対象を player.facing 方向に「赤字」マスぶんノックバック
//   "lofi"     ← 装備ペダルのうち originalRed ≤ 2 のものは red を 3 倍にする
//                (pedals.js / computeChainItems で source.effect を読み処理)
const WEAPONS = {
  longsword: {
    id: "longsword", icon: "⚔",
    damage: 10, damageRed: true,  shape: "single",
    color: "#ffd866",
  },
  beam: {
    id: "beam",      icon: "═",
    damage:  5, damageRed: false,
    range:   2, rangeRed:  true,  shape: "beam",
    color: "#88ddff",
  },
  aurashot: {
    id: "aurashot",  icon: "◎",
    damage:  4, damageRed: true,  shape: "around-8",
    color: "#7ed957",
  },
  sustainer: {
    id: "sustainer", icon: "∿",
    damage:  4, damageRed: false,
    hits:    2, hitsRed:   true,
    shape:   "single",
    color:   "#aaffaa",
    effect:  "sustain",  // 同一対象への連続ヒットで +25%/回 累積 (固定値)
  },
  tripletter: {
    id: "tripletter", icon: "彡",
    damage:  8, damageRed: true,  shape: "triple-front",
    color: "#ffaaff",
  },
  compressor: {
    id: "compressor", icon: "▣",
    damage:  10, damageRed: false,
    compress: 5,  compressRed: true,
    shape: "single",
    color: "#ddbb66",
    effect: "compress",
  },
  pusher: {
    id: "pusher",     icon: "➤",
    damage:  6, damageRed: true,  shape: "single",
    color: "#aaddff",
    effect: "pushback",
  },
  lofi: {
    id: "lofi",       icon: "▒",
    damage:  7, damageRed: true,  shape: "single",
    color: "#bb99aa",
    effect: "lofi",
  },
};

// TEXTS から WEAPONS / FLOORS の name/desc/hint をマージ (texts.js を先に読む前提)
(function mergeTexts() {
  const T = (typeof window !== "undefined" && window.TEXTS) || null;
  if (!T) return;
  if (T.weapons) {
    for (const id in WEAPONS) {
      const t = T.weapons[id];
      if (!t) continue;
      WEAPONS[id].name = t.name;
      WEAPONS[id].desc = t.desc;
    }
  }
  if (T.floors) {
    for (const f of FLOORS) {
      const t = T.floors[f.id];
      if (!t) continue;
      f.name = t.name;
      f.hint = t.hint;
    }
  }
})();

// ========================================================================
// 11F-20F: 既存 1-10F を clone して敵 HP/ATK を ×1.5、dropChance +0.05。
// マップは流用 (n/m の NPC 文字も含まれるが parseMap で babyAcquired / motherKey
// チェックして条件を満たさなければ無視されるため、17F の騎士は再出現しない、
// 20F の母も再登場しない)。
// 名前は元の "7F: ノイズフロア" → "17F: ノイズフロア †" の形で生成。
// ========================================================================
(function generateExtendedFloors() {
  const cloneFloor = (base) => ({
    id: base.id + 10,
    pickupPool: [...base.pickupPool],
    maps: base.maps.map((m) => m.slice()),
    enemyConfig: Object.fromEntries(
      Object.entries(base.enemyConfig).map(([k, v]) => [
        k,
        { ...v, dropPool: [...(v.dropPool || [])] },
      ])
    ),
  });
  const baseCount = FLOORS.length; // 10 のはず
  for (let i = 0; i < baseCount; i++) {
    const base = FLOORS[i];
    const ext = cloneFloor(base);
    const baseLabel = (base.name || `Floor ${base.id}`).replace(/^\d+F:\s*/, "");
    ext.name = `${ext.id}F: ${baseLabel} †`;
    ext.hint = (base.hint || "") + "  ※ 鍵を手にした奥階層。敵 HP/ATK ×1.5";
    for (const type in ext.enemyConfig) {
      const ec = ext.enemyConfig[type];
      ec.hp = Math.floor(ec.hp * 1.5);
      ec.atk = Math.max(1, Math.floor(ec.atk * 1.5));
      ec.dropChance = Math.min(1, (ec.dropChance || 0) + 0.05);
    }
    FLOORS.push(ext);
  }
})();

// プレイヤーの装備スロット (Q/W/E に武器ID または null)
// 初期: Q=ロングソードのみ、W/E は無装備 (拾うまで使えない)
const weapons = {
  q: "longsword",
  w: null,
  e: null,
};

// マップ上の文字 → 武器ID (床落ち武器配置用)
const WEAPON_MAP = {
  "1": "longsword",
  "2": "beam",
  "3": "aurashot",
  "4": "sustainer",
  "5": "tripletter",
  "6": "compressor",
  "7": "pusher",
  "8": "lofi",
};

// グローバル・ドロップ・プール: 全武器 + 全ペダル。
// ?スポット / 敵ドロップともにここから乱択 (フロアごとの pickupPool / dropPool は使用しない)
// kind:"baby-locked" のペダル (騎士の最期の加護) はドロップ対象から除外する。
// 各エントリは { kind, id, weight }。weight が大きいほど出現しやすい。
// ペダル側に rarity を指定すると weight = 1/rarity (例: rarity 5 → 1/5 の出現率)。
const GLOBAL_DROP_POOL = Object.keys(WEAPONS)
  .map((id) => ({ kind: "weapon", id, weight: 1 }))
  .concat(
    Object.keys(PEDALS)
      .filter((id) => PEDALS[id].kind !== "baby-locked")
      .map((id) => ({
        kind: "pedal",
        id,
        weight: 1 / (PEDALS[id].rarity || 1),
      }))
  );

// 重み付き 1 件選択。pool 中の各要素 e に対して、確率は e.weight / sumWeight。
function weightedPick(pool) {
  if (!pool || pool.length === 0) return null;
  let total = 0;
  for (const e of pool) total += e.weight || 1;
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const e of pool) {
    r -= e.weight || 1;
    if (r < 0) return e;
  }
  return pool[pool.length - 1];
}

// 床落ち時の統一アイコン (拾うまで何かは分からない)
const UNKNOWN_ICON = {
  weapon: { icon: "⚔", color: "#ffd866" },
  pedal:  { icon: "♪", color: "#cce8ff" },
};

// ========================================================================
// 状態
// ========================================================================
const player = {
  x: 0, y: 0,
  hp: 50, hpMax: 50, baseHpMax: 50,
  // baseHpMax = フロア/恒久的な最大HP。hpMax = baseHpMax + passive HP ペダル合算。
  // recomputePlayerHpMax() がボード状態から動的に hpMax を再計算する。
  facing: { dx: 1, dy: 0 },
};

// 装備中の "maxHpBoost" フック passive ペダル (Body 等) の合計を反映して
// player.hpMax を再計算。装着で増えたぶんは player.hp にも即時加算、
// 取り外しで減ったぶんは player.hp を新 hpMax にクランプする。
// 同じペダル ID を複数枠/別ボードに装着している場合は加算 (各 instance ぶんカウント)。
function recomputePlayerHpMax() {
  let bonus = 0;
  for (const key of activeBoardKeys()) {
    const b = board[key];
    if (!b) continue;
    for (const it of b) {
      if (!it) continue;
      const p = PEDALS[it.id];
      if (!p || p.kind !== "passive" || p.hook !== "maxHpBoost") continue;
      bonus += p.red || 0;
    }
  }
  const oldMax = player.hpMax;
  const newMax = player.baseHpMax + bonus;
  if (newMax === oldMax) return;
  player.hpMax = newMax;
  if (newMax > oldMax) {
    player.hp += (newMax - oldMax);
    log(`♬ 最大HP +${newMax - oldMax} (現 ${player.hp}/${player.hpMax})`, "win");
  } else {
    if (player.hp > newMax) player.hp = newMax;
    log(`♬ 最大HP −${oldMax - newMax} (現 ${player.hp}/${player.hpMax})`, "");
  }
}

// 赤ちゃんボードの maxHpBoost passive を集計して baby.hpMax を再計算。
// baby が存在しない場合は no-op。装着/取り外し時に呼び出す。
function recomputeBabyHpMax() {
  if (!baby) return;
  let bonus = 0;
  for (const it of baby.board) {
    if (!it) continue;
    const p = PEDALS[it.id];
    if (!p || p.kind !== "passive" || p.hook !== "maxHpBoost") continue;
    bonus += p.red || 0;
  }
  const oldMax = baby.hpMax;
  const newMax = baby.baseHpMax + bonus;
  if (newMax === oldMax) return;
  baby.hpMax = newMax;
  if (newMax > oldMax) {
    baby.hp += (newMax - oldMax);
    log(`👶 赤ちゃんの最大HP +${newMax - oldMax} (現 ${baby.hp}/${baby.hpMax})`, "win");
  } else {
    if (baby.hp > newMax) baby.hp = newMax;
    log(`👶 赤ちゃんの最大HP −${oldMax - newMax} (現 ${baby.hp}/${baby.hpMax})`, "");
  }
}

// ===== 敵の特殊能力 =====
// 全ての敵の特殊能力 (弱点 / 耐性 / 状態異常無効 / 反撃 / 移動制限 / 遠隔等) は
// enemy.abilities: string[] に格納する。ゲームロジックは type ではなく
// abilities を参照するので、将来「封印」武器でこの配列から要素を削れば
// 該当能力を無効化できる (= 共通の disable インターフェース)。
//
// ability id 規約:
//   "weak-<elem>"    弱点 (×2)
//   "resist-<elem>"  耐性 (×0.5)
//   "immune-<stat>"  状態異常無効 (burn/freeze/shock)
//   "counter-thorn"  攻撃を受けると反射ダメージ (値は enemy.counter)
//   "rooted"         押し出し (Pusher / pushback) 無効
//   "root-bind"      隣接時、プレイヤーの移動を阻止する (攻撃と向き変更は可)
//   "damage-taken-cap-5" 自身の 3×3 内にプレイヤーがいる時に限り、受けるダメージを 5 に上限
//   "ranged-3"       遠隔3マス矢攻撃 (アーチャー)
const ENEMY_ABILITIES = {
  "weak-fire":     { name: "炎弱点 ×2",      kind: "weak",   color: "#ff9966", icon: "⚠" },
  "weak-ice":      { name: "氷弱点 ×2",      kind: "weak",   color: "#ff9966", icon: "⚠" },
  "weak-thunder":  { name: "雷弱点 ×2",      kind: "weak",   color: "#ff9966", icon: "⚠" },
  "resist-fire":   { name: "炎耐性 ×0.5",    kind: "resist", color: "#88c0e0", icon: "🛡" },
  "resist-ice":    { name: "氷耐性 ×0.5",    kind: "resist", color: "#88c0e0", icon: "🛡" },
  "resist-thunder":{ name: "雷耐性 ×0.5",    kind: "resist", color: "#88c0e0", icon: "🛡" },
  "immune-burn":   { name: "燃焼無効",        kind: "immune", color: "#ffaa88", icon: "🚫" },
  "immune-freeze": { name: "凍結無効",        kind: "immune", color: "#aaccff", icon: "🚫" },
  "immune-shock":  { name: "麻痺無効",        kind: "immune", color: "#ffee99", icon: "🚫" },
  "counter-thorn": { name: "棘 (反撃)",       kind: "trait",  color: "#ffaa66", icon: "✦" },
  "counter-thorn-storm": { name: "棘嵐 (連撃で倍化反射 4→8→16→32...)", kind: "trait", color: "#ff6644", icon: "✦" },
  "rooted":        { name: "押し出し無効",    kind: "trait",  color: "#aaffaa", icon: "⚓" },
  "root-bind":     { name: "根縛り (隣接で移動阻止)", kind: "trait", color: "#88dd88", icon: "🪢" },
  "damage-taken-cap-5": { name: "鉄壁の盾 (3×3 内のプレイヤーから被ダメを 5 に上限)", kind: "trait", color: "#ffd866", icon: "🛡" },
  "ranged-3":      { name: "遠隔3マス (矢)",  kind: "trait",  color: "#ffaaff", icon: "🏹" },
  "rocket-grab-5": { name: "ロケットグラブ (直線5マス・引き寄せ)", kind: "trait", color: "#ffcc44", icon: "🪝" },
  "death-rage":    { name: "死亡時 3T 怒り (ATK×2)", kind: "trait", color: "#ff5544", icon: "👹" },
  "hide-aura-3":   { name: "幻惑オーラ 3×3 (周囲の敵を隠す)", kind: "trait", color: "#bb88ff", icon: "👁" },
  "hide-aura-5":   { name: "幻惑オーラ 5×5 (周囲の敵を隠す)", kind: "trait", color: "#dd66ff", icon: "👁" },
  "quad-strike":   { name: "四連斬 (隣接で 1 ターンに 4 連撃)", kind: "trait", color: "#ff77aa", icon: "⚔" },
  "parry-after-quad": { name: "完遂後パリィ (4 連が全弾命中で次ターン武器無効)", kind: "trait", color: "#ffd866", icon: "🛡" },
  "burrow-emerge-5": { name: "土遁 (5×5 内の対象の隣へ瞬間移動)", kind: "trait", color: "#8aaa66", icon: "🌀" },
};

// enemy.reds キー → 表示名 (tooltip / ログ用)
// Limiter/NoiseGate で削れる「能力赤字」の人間可読ラベル。
const REDS_LABEL = {
  rage: "怒りT数",
  quadStrike: "連撃数",
};

// 敵タイプ → 初期「能力赤字 (reds)」の初期値。
// Limiter / NoiseGate で削れる数値群。何も持たない敵は {} を返す。
function defaultRedsFor(type) {
  if (type === "ogre")    return { rage: 3 };
  if (type === "samurai") return { quadStrike: 4 };
  return {};
}

// 敵タイプ → 初期 abilities 配列。spawn 時に enemy.abilities にコピーする。
function defaultAbilitiesFor(type, isBoss) {
  const list = [];
  if (type === "fire") {
    list.push("weak-ice", "resist-fire", "immune-burn");
  } else if (type === "ice") {
    list.push("weak-fire", "resist-ice", "immune-freeze");
  } else if (type === "thorn") {
    list.push("counter-thorn");
  } else if (type === "gianturtle") {
    list.push("counter-thorn-storm", "immune-burn", "rooted");
  } else if (type === "tree") {
    list.push("rooted", "root-bind", "burrow-emerge-5");
  } else if (type === "samurai") {
    list.push("quad-strike", "parry-after-quad");
  } else if (type === "archer") {
    list.push("ranged-3");
  } else if (type === "crankblitz") {
    list.push("rocket-grab-5");
  } else if (type === "ogre") {
    list.push("death-rage");
  } else if (type === "knight") {
    list.push("damage-taken-cap-5");
  } else if (type === "wraith") {
    list.push("hide-aura-3");
  } else if (type === "phantomwraith") {
    list.push("hide-aura-5");
  }
  // boss は現状 neutral タイプ。専用能力は今のところ無し。
  return list;
}

// ===== 幻惑オーラ (レイス / ファントムレイス) =====
// レイスは周囲 3×3 (Chebyshev 距離 1)、ファントムレイスは 5×5 (距離 2) の
// 範囲内にいる他の敵を「隠蔽」する。レイス自身は常に可視。
//   - 識別名/属性アイコンが ??? になる
//   - HP/HPmax の数値が出ない
//   - 状態異常アイコンも見えない
//   - tooltip にも幻惑オーラのせいで分からない旨を出す
function isEnemyHiddenByWraith(target) {
  if (!target || target.hp <= 0) return false;
  // レイス系自身は隠れない (本体が見えないと攻略不能なため)
  if (target.type === "wraith" || target.type === "phantomwraith") return false;
  for (const w of enemies) {
    if (w === target) continue;
    if (w.hp <= 0) continue;
    let radius = 0;
    if (w.type === "wraith")              radius = 1;
    else if (w.type === "phantomwraith")  radius = 2;
    else continue;
    const dx = Math.abs(target.x - w.x);
    const dy = Math.abs(target.y - w.y);
    if (dx <= radius && dy <= radius) return true;
  }
  return false;
}

// ===== 属性相性 =====
// 敵の abilities を参照: weak-<elem> なら ×2、resist-<elem> なら ×0.5、それ以外 ×1。
function getElementMultiplier(attackerElement, enemy) {
  if (!enemy || !enemy.abilities) return 1.0;
  if (enemy.abilities.includes(`weak-${attackerElement}`))   return 2.0;
  if (enemy.abilities.includes(`resist-${attackerElement}`)) return 0.5;
  return 1.0;
}

const ENEMY_TYPE_LABEL = {
  neutral: "無属性", fire: "炎", ice: "氷",
  thorn: "棘", gianturtle: "鋼棘", tree: "樹", archer: "弓", ogre: "鬼",
  wraith: "怨霊", phantomwraith: "幻霊", crankblitz: "鉤機械",
  knight: "盾騎士", samurai: "侍",
};
const ENEMY_TYPE_COLOR = {
  neutral: "#88aa88", fire: "#ff8a4d", ice: "#88c0e0",
  thorn: "#bb9966", gianturtle: "#aaaab0",
  tree: "#779966", archer: "#cc99cc",
  ogre: "#cc5544",
  wraith: "#bb88ff", phantomwraith: "#dd66ff",
  crankblitz: "#d4a040",
  knight: "#c8b070", samurai: "#dd5566",
};
// マップ文字 → 敵タイプ。'B' のみ isBoss も true になる (parseMap で分岐)
const ENEMY_CHAR_TYPE = {
  E: "neutral", F: "fire", I: "ice", B: "neutral",
  K: "thorn", W: "tree", A: "archer",
  J: "gianturtle",      // ジャイアントスパイカ (HP250/ATK6、棘嵐 4→8→16→32 / 燃焼無効 / 押し出し無効)
  H: "crankblitz",      // クランクブリッツ (HP70/ATK5、直線5マスのロケットグラブで引き寄せ)
  Q: "ogre",            // レイジ・オーガ (HP100/ATK10、死亡時 3T 怒り状態)
  R: "wraith",          // レイス (HP80/ATK4、周囲3×3の敵を隠す)
  X: "phantomwraith",   // ファントムレイス (HP100/ATK10、周囲5×5の敵を隠す)
  Z: "knight",          // 盾の騎士 (HP50/ATK2、3×3 内のプレイヤー被ダメを 5 にキャップ)
  O: "samurai",         // マスター・サムライ (HP100/ATK7、4 連斬 + 完遂後パリィ)
};

// レイジ・オーガ: フロアに依存しない固定スタッツ。
// HP 100 / ATK 10 / ドロップは確定 (ボス級報酬)。
const OGRE_STATS = {
  hp: 100, atk: 10,
  dropChance: 1.0,
  dropPool: ["badassdriver", "stack", "subwoofer", "tubedriver"],
};

// レイス: 中堅 (ボススライム相当)。HP 80 / ATK 4 / 3×3 隠蔽オーラ。
const WRAITH_STATS = {
  hp: 80, atk: 4,
  dropChance: 0.75,
  dropPool: ["phaser", "tremolo", "preamp"],
};

// ファントムレイス: 上位 (レイジ・オーガ相当)。HP 100 / ATK 10 / 5×5 隠蔽オーラ。
const PHANTOM_WRAITH_STATS = {
  hp: 100, atk: 10,
  dropChance: 1.0,
  dropPool: ["stack", "gigadelay", "overdrive", "compressor"],
};

// クランクブリッツ: ロケットグラブで引き寄せる機械系。HP 70 / ATK 5。
// 4 方向直線 5 マス以内に視線が通ればグラブ → ダメージ + 目の前へ強制移動。
// 線を切る (壁/敵に遮らせる) か速攻で倒すしかない。
const CRANK_BLITZ_STATS = {
  hp: 70, atk: 5,
  dropChance: 0.85,
  dropPool: ["pusher", "sustainer", "stack", "subwoofer"],
};

// ジャイアントスパイカ: 棘亀の上位種。連撃 (Delay/Tremolo) に強烈なアンチ。
// 1 攻撃中の N ヒット目: 4 × 2^(N-1) の反射 (1:4, 2:8, 3:16, 4:32, 5:64...)
// 単発の大火力なら反射 4 で抜けるが、連撃ビルドは自爆級。
// 燃焼無効・押し出し無効で「チクチク削り」「位置ずらし」をブロック。
const GIANT_TURTLE_STATS = {
  hp: 250, atk: 6,
  dropChance: 1.0,
  dropPool: ["subwoofer", "badassdriver", "tubedriver", "stack", "gigadelay"],
};

// 盾の騎士: 自身の 3×3 内にプレイヤーがいる時に限り、受けるダメージを 5 に上限化。
// 範囲外から殴れば通常通り通る (ロングアーム / アーチャー狙撃 / Tremolo 連撃で
// 自分が遠くから攻める等)。接近戦では単発火力が止まるタンク。
const KNIGHT_STATS = {
  hp: 50, atk: 5,
  dropChance: 0.60,
  dropPool: ["preamp", "body", "cabsim", "lift"],
};

// マスター・サムライ: 接近すると 1 ターンで 4 連斬 (ATK 7)。
// 4 ヒット全てが命中で完遂すると、次のプレイヤーターンが 1 ターン限りパリィ状態:
//   武器による攻撃は当たらない (状態異常・押し出し・反射等もキャンセル)。
// HP は中堅 (100)。範囲攻撃や凍結で四連を止められれば崩せる。
const SAMURAI_STATS = {
  hp: 100, atk: 7,
  dropChance: 0.85,
  dropPool: ["tubedriver", "badassdriver", "stack", "tripletter", "preamp"],
};

const ENEMY_ATK = 3;       // 敵の攻撃力
const ENEMY_ALERT_RANGE = 99; // 全マップ範囲で索敵（部屋分かれてても寄ってくる）

const BOARD_SIZE = 4;
// 各スロットは null または item オブジェクト { uid, kind:"pedal", id }
const board = {
  q: new Array(BOARD_SIZE).fill(null),
  w: new Array(BOARD_SIZE).fill(null),
  e: new Array(BOARD_SIZE).fill(null),
};
// ボード上のペダル ID 配列を取り出す (resolveChain 用)
function getSlotPedalIds(boardKey) {
  const b = board[boardKey];
  if (!b) return new Array(BOARD_SIZE).fill(null);
  return b.map((it) => (it ? it.id : null));
}
let activeBoard = "q";
let pendingAttack = null; // null | "q" | "w" | "e" | "r" | "t" | "y" — 構え中の攻撃キー
const ATTACK_COLORS = {
  q: "#ffd866", w: "#88ddff", e: "#7ed957", b: "#ff88bb",
  // LineSelector で開く追加スロット
  r: "#bb88ff", t: "#cc66cc", y: "#dd55aa",
};

// LineSelector で追加開放できるスロットの順序。
const LINE_SELECTOR_SLOTS = ["r", "t", "y"];
const MAIN_BOARD_KEYS = ["q", "w", "e"];

// 現在装着中の LineSelector を { 'r': item, 't': item, ... } 形式で返す。
// LineSelector 自体は Q/W/E/R/T/Y どのボードにも置ける (BABY は不可)。
function lineSelectorOwners() {
  const map = {};
  for (const key of MAIN_BOARD_KEYS.concat(LINE_SELECTOR_SLOTS)) {
    const b = board[key];
    if (!b) continue;
    for (const it of b) {
      if (it && it.id === "lineselector" && it.lineSlot) {
        map[it.lineSlot] = it;
      }
    }
  }
  return map;
}

// 現在開いている追加スロット (Q/W/E は常時、R/T/Y は LineSelector があるもののみ) を返す。
function activeBoardKeys() {
  const owners = lineSelectorOwners();
  return MAIN_BOARD_KEYS.concat(LINE_SELECTOR_SLOTS.filter((k) => !!owners[k]));
}

// 次に開ける LineSelector スロット (r → t → y の順)。全部埋まっていれば null。
function findFreeLineSlot() {
  const owners = lineSelectorOwners();
  for (const k of LINE_SELECTOR_SLOTS) if (!owners[k]) return k;
  return null;
}

// ピット（編集可能エリア）とゴール
const pits = new Set();   // "x,y" 形式
const goal = { x: -1, y: -1 };
function isOnPit() {
  return pits.has(`${player.x},${player.y}`);
}

/** @type {{x:number,y:number,type:string,isBoss?:boolean,hp:number,hpMax:number,atk:number,dropChance:number,dropPool:string[],status:any[]}[]} */
const enemies = [];
const walls = new Set();

// ===== 赤ちゃんイベント関連の永続状態 (ランを跨いでは持ち越さない) =====
// babyAcquired: 7F で騎士から託された後 true。再度 7F に来ても騎士は出ない。
// motherKey: 10F で母から鍵を受け取った後 true。10F の G で次フロアへ。
// baby: 生存中なら { x, y, hp, hpMax, baseHpMax: 10, board: [item, null, null],
//                   facing, lastBubbleTurn, recentBubble }。
//       死亡時は null に戻し、復活させない。
const npcs = [];               // [{ type: "knight"|"mother", x, y, completed }]
let baby = null;
let babyAcquired = false;
let motherKey = false;
let activeDialog = null;       // { npcType, lines, idx, onComplete } | null
let babyWithMother = false;    // 母に渡した後: 赤ちゃんは母の隣に固定 / 無敵 / 喜び続ける
let joyTimerId = null;         // 喜びバブルの繰り返し用 setInterval ハンドル
const BABY_BOARD_SIZE = 3;

// 武器・ペダル固有のランタイム状態 (doAttack を跨いで保持)
//   sustainer    : 最後にヒットさせた敵への連続ヒット回数 (別の敵に当てるとリセット)
//   tripletecho  : ボード別「スイング」回数。tripletecho の赤字回ごとに会心 (×2)。
//                    Q/W/E のいずれかに tripletecho ペダルが乗っているときだけ加算。
const weaponState = {
  sustainer: { lastEnemy: null, streak: 0 },
  tripletecho: { q: 0, w: 0, e: 0, r: 0, t: 0, y: 0 },
};

// 床落ちアイテム: "x,y" -> { kind: "pedal"|"weapon", id }
const pickups = new Map();

// インベントリ: 個別インスタンス配列 (同じ種類でもユニーク uid を持つ)
// 各要素: { uid: number, kind: "pedal"|"weapon", id: string }
// 最大数 (debug の「全アイテム取得」で Infinity に上書きされる)
let INV_MAX = 30;
const inventory = [];
let uidCounter = 0;
function nextUid() { return ++uidCounter; }
function newItem(kind, id) { return { uid: nextUid(), kind, id }; }
function findInInventory(uid) {
  return inventory.find((it) => it.uid === uid);
}
function removeFromInventoryByUid(uid) {
  const idx = inventory.findIndex((it) => it.uid === uid);
  if (idx >= 0) return inventory.splice(idx, 1)[0];
  return null;
}
function itemDef(item) {
  return item.kind === "weapon" ? WEAPONS[item.id] : PEDALS[item.id];
}
function itemDefById(kind, id) {
  return kind === "weapon" ? WEAPONS[id] : PEDALS[id];
}

let turn = 0;
let gameOver = false;

// ========================================================================
// DOM
// ========================================================================
const mapEl      = document.getElementById("map");
const hpEl       = document.getElementById("hp");
const faceEl     = document.getElementById("face");
const turnEl     = document.getElementById("turn");
const logEl      = document.getElementById("log");
const boardEl    = document.getElementById("board");
const summaryEl  = document.getElementById("chain-summary");
const boardPanel = document.getElementById("board-panel");
const hudEl      = document.getElementById("hud");

// Floor インジケータ (HUD 中央寄り)
const floorEl = document.createElement("span");
floorEl.id = "floor-indicator";
hudEl.appendChild(floorEl);

// 🐞 DEBUG: 任意のフロアにワープするドロップダウン。
// loadFloor() を直接呼び、現在の入力ロック中・gameOver/RunClear からも復帰可能にする。
// 既定で非表示、D キーで トグル。
const floorWarpEl = document.createElement("select");
floorWarpEl.id = "floor-warp";
floorWarpEl.title = "[DEBUG] 任意のフロアにジャンプ";
floorWarpEl.style.cssText =
  "margin-left:8px;background:#1a1a22;color:#cfcfcf;border:1px solid #6a4aaa;" +
  "border-radius:4px;font-family:ui-monospace,monospace;font-size:11px;" +
  "padding:1px 4px;cursor:pointer;outline:none;display:none";
for (let i = 0; i < FLOORS.length; i++) {
  const opt = document.createElement("option");
  opt.value = String(i);
  const nm = FLOORS[i].name || `Floor ${i + 1}`;
  opt.textContent = `🐞 F${i + 1}: ${nm}`;
  floorWarpEl.appendChild(opt);
}
floorWarpEl.addEventListener("change", () => {
  if (inputLocked) {
    // 敵ターン進行中: 変更を破棄して元に戻す
    floorWarpEl.value = String(currentFloorIdx);
    return;
  }
  const idx = parseInt(floorWarpEl.value, 10);
  if (Number.isNaN(idx) || idx < 0 || idx >= FLOORS.length) return;
  // gameOver / RunClear 状態からの復帰も許可 (HP 0 のままだと即詰みなので全回復)
  const wasGameOver = gameOver;
  gameOver = false;
  const banner = document.getElementById("game-end-banner");
  if (banner) banner.remove();
  if (wasGameOver || player.hp <= 0) {
    player.hp = player.hpMax;
  }
  const nm = FLOORS[idx].name || `Floor ${idx + 1}`;
  log(`🐞 [DEBUG] フロア ${idx + 1} (${nm}) にワープ`, "win");
  loadFloor(idx);
  floorWarpEl.blur();
});
hudEl.appendChild(floorWarpEl);

// ARM (構え) インジケータ（HUD 右端に追加）
const armEl = document.createElement("span");
armEl.id = "arm-indicator";
hudEl.appendChild(armEl);

// PIT / FIELD ステータスバナー（map の上）
const statusBanner = document.createElement("div");
statusBanner.id = "status-banner";
mapEl.parentElement.insertBefore(statusBanner, mapEl);

// インベントリ（動的）
const inventoryTitle = document.createElement("div");
inventoryTitle.className = "panel-title";
inventoryTitle.style.marginTop = "14px";
inventoryTitle.textContent = "📦 Inventory（クリックで装着）";
const inventoryEl = document.createElement("div");
inventoryEl.id = "inventory";
inventoryEl.style.cssText =
  "display:flex; gap:6px; justify-content:center; flex-wrap:wrap;";

// === デバッグ: 全アイテム取得 / モンスター出現 / 不死トグル ===
// 既定で非表示、D キーでトグル。
let playerInvincible = false;

const debugBar = document.createElement("div");
debugBar.style.cssText =
  "display:none; justify-content:center; gap:6px; flex-wrap:wrap; margin-top:10px;";

const dbgBtnStyle =
  "background:#3a2a40; color:#e0c0ff; border:1px solid #885599; " +
  "padding:4px 10px; border-radius:6px; font-size:11px; " +
  "font-family:ui-monospace,monospace; cursor:pointer;";

const debugAllBtn = document.createElement("button");
debugAllBtn.type = "button";
debugAllBtn.textContent = "🛠 全アイテム取得";
debugAllBtn.style.cssText = dbgBtnStyle;
debugAllBtn.addEventListener("click", () => {
  INV_MAX = Infinity;
  const has = new Set(inventory.map((it) => it.kind + ":" + it.id));
  let added = 0;
  for (const id of Object.keys(WEAPONS)) {
    if (has.has("weapon:" + id)) continue;
    inventory.push(newItem("weapon", id));
    added++;
  }
  for (const id of Object.keys(PEDALS)) {
    if (has.has("pedal:" + id)) continue;
    inventory.push(newItem("pedal", id));
    added++;
  }
  log(`🛠 DEBUG: 全アイテム取得 (+${added}) / インベントリ上限 解除`, "pickup");
  renderAll();
});
debugBar.appendChild(debugAllBtn);

// --- モンスター出現セレクタ + 出現ボタン ---
// プレイヤー隣接の最初の空きマスに 1 体スポーン。
const DEBUG_MONSTER_LIST = [
  { type: "neutral", isBoss: false, label: "無属性スライム" },
  { type: "fire",    isBoss: false, label: "炎スライム" },
  { type: "ice",     isBoss: false, label: "氷スライム" },
  { type: "neutral", isBoss: true,  label: "ボス・スライム" },
  { type: "thorn",   isBoss: false, label: "スパイカ" },
  { type: "gianturtle", isBoss: false, label: "ジャイアントスパイカ" },
  { type: "tree",       isBoss: false, label: "人面樹" },
  { type: "archer",     isBoss: false, label: "アーチャー" },
  { type: "crankblitz", isBoss: false, label: "クランクブリッツ" },
  { type: "ogre",       isBoss: false, label: "レイジ・オーガ" },
  { type: "wraith",     isBoss: false, label: "レイス" },
  { type: "phantomwraith", isBoss: false, label: "ファントムレイス" },
  { type: "knight",     isBoss: false, label: "盾の騎士" },
  { type: "samurai",    isBoss: false, label: "マスター・サムライ" },
];
const debugMonsterEl = document.createElement("select");
debugMonsterEl.style.cssText =
  "background:#1a1a22;color:#cfcfcf;border:1px solid #6a4aaa;border-radius:4px;" +
  "font-family:ui-monospace,monospace;font-size:11px;padding:1px 4px;cursor:pointer;outline:none;";
DEBUG_MONSTER_LIST.forEach((m, i) => {
  const opt = document.createElement("option");
  opt.value = String(i);
  opt.textContent = `🐞 ${m.label}`;
  debugMonsterEl.appendChild(opt);
});
debugBar.appendChild(debugMonsterEl);

const spawnBtn = document.createElement("button");
spawnBtn.type = "button";
spawnBtn.textContent = "出現";
spawnBtn.style.cssText = dbgBtnStyle;
spawnBtn.addEventListener("click", () => {
  const idx = parseInt(debugMonsterEl.value, 10) || 0;
  const def = DEBUG_MONSTER_LIST[idx];
  if (!def) return;
  debugSpawnEnemy(def.type, def.isBoss);
});
debugBar.appendChild(spawnBtn);

// --- 不死トグル ---
const godBtn = document.createElement("button");
godBtn.type = "button";
function refreshGodBtn() {
  godBtn.textContent = `🛡 不死: ${playerInvincible ? "ON" : "OFF"}`;
  godBtn.style.cssText = dbgBtnStyle +
    (playerInvincible
      ? "background:#2a3a20;color:#b8e8a0;border-color:#7ed957;"
      : "");
}
refreshGodBtn();
godBtn.addEventListener("click", () => {
  playerInvincible = !playerInvincible;
  refreshGodBtn();
  log(`🐞 不死モード: ${playerInvincible ? "ON" : "OFF"}`, "info");
});
debugBar.appendChild(godBtn);

boardPanel.insertBefore(debugBar, summaryEl);

// プレイヤー隣接の空きマスを探して敵をスポーン (デバッグ用)。
function debugSpawnEnemy(type, isBoss) {
  const candidates = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
  let spot = null;
  for (const [dx, dy] of candidates) {
    const x = player.x + dx, y = player.y + dy;
    if (!inBounds(x, y)) continue;
    if (walls.has(`${x},${y}`)) continue;
    if (pits.has(`${x},${y}`)) continue;
    if (goal.x === x && goal.y === y) continue;
    if (baby && baby.hp > 0 && baby.x === x && baby.y === y) continue;
    if (npcs.some((n) => n.x === x && n.y === y)) continue;
    if (enemies.some((e) => e.hp > 0 && e.x === x && e.y === y)) continue;
    spot = { x, y };
    break;
  }
  if (!spot) {
    log("🐞 [DEBUG] 隣接マスが全て埋まっている", "lose");
    return;
  }
  const cfg = currentFloor.enemyConfig || {};
  const defaultEnemy = { hp: 25, atk: 2, dropChance: 0, dropPool: [] };
  const ec = type === "ogre"          ? OGRE_STATS
           : type === "wraith"        ? WRAITH_STATS
           : type === "phantomwraith" ? PHANTOM_WRAITH_STATS
           : type === "gianturtle"    ? GIANT_TURTLE_STATS
           : type === "crankblitz"    ? CRANK_BLITZ_STATS
           : type === "knight"        ? KNIGHT_STATS
           : type === "samurai"       ? SAMURAI_STATS
           : (isBoss ? (cfg.boss || defaultEnemy) : (cfg[type] || defaultEnemy));
  const enemy = {
    x: spot.x, y: spot.y, type, isBoss,
    hp: ec.hp, hpMax: ec.hp,
    atk: ec.atk,
    dropChance: ec.dropChance || 0,
    dropPool: ec.dropPool || [],
    status: [],
    abilities: defaultAbilitiesFor(type, isBoss),
    reds: defaultRedsFor(type),
  };
  if (type === "thorn") enemy.counter = ec.counter != null ? ec.counter : 2;
  enemies.push(enemy);
  log(`🐞 ${enemyDisplayName(enemy)} を出現 (${spot.x},${spot.y})`, "win");
  renderAll();
}
boardPanel.insertBefore(inventoryTitle, summaryEl);
boardPanel.insertBefore(inventoryEl, summaryEl);

// 敵ステータスパネル（mapの直下に挿入）
const enemyStatusEl = document.createElement("div");
enemyStatusEl.id = "enemy-status";
mapEl.insertAdjacentElement("afterend", enemyStatusEl);

// ペダル詳細ツールチップ (hover で表示)
const pedalTooltip = document.createElement("div");
pedalTooltip.id = "pedal-tooltip";
document.body.appendChild(pedalTooltip);

function showPedalTooltip(p, originalRed, effectiveRed, anchorEl) {
  const boosted = effectiveRed !== originalRed;
  const summary = renderDescWithRed(p.desc, originalRed, effectiveRed);
  // noRed フラグ付きペダル (HP 増強系等) は赤字行を出さず固定値として扱う
  const redLine = p.noRed
    ? `<span style="color:#888">固定値 (modifier の影響なし)</span>`
    : (boosted
        ? `赤字: <span class="red-val boosted"><span class="red-orig">${originalRed}</span>${effectiveRed}</span>` +
          ` <span style="opacity:0.6">(Booster で倍化中)</span>`
        : `赤字: <span class="red-val">${originalRed}</span>`);
  pedalTooltip.innerHTML =
    `<div class="tt-title" style="color:${p.color}">${p.icon} ${p.name}</div>` +
    `<div class="tt-summary">${redLine}<br>${summary}</div>` +
    `<div class="tt-detail">${escapeHtml(p.detail || "")}</div>`;
  pedalTooltip.style.display = "block";
  positionTooltipNear(anchorEl);
}

function hidePedalTooltip() { pedalTooltip.style.display = "none"; }

function positionTooltipNear(anchorEl) {
  if (!anchorEl) return;
  const r = anchorEl.getBoundingClientRect();
  const tt = pedalTooltip.getBoundingClientRect();
  let left = r.right + 8;
  let top  = r.top;
  // 右端に収まらなければ左側に出す
  if (left + tt.width > window.innerWidth - 8) {
    left = r.left - tt.width - 8;
  }
  if (top + tt.height > window.innerHeight - 8) {
    top = window.innerHeight - tt.height - 8;
  }
  if (top < 8) top = 8;
  pedalTooltip.style.left = `${Math.max(8, left)}px`;
  pedalTooltip.style.top = `${top}px`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])
  );
}

function attachTooltip(el, p, originalRed, effectiveRed) {
  el.addEventListener("mouseenter", () => showPedalTooltip(p, originalRed, effectiveRed, el));
  el.addEventListener("mouseleave", hidePedalTooltip);
  el.addEventListener("mousemove", () => positionTooltipNear(el));
}

// ---- 武器ツールチップ (pedalTooltip DOM を流用) ----
// weaponItem: チェーン解決後の weapon item (computeChainItems の items[0])。
//   null なら未装備時 (インベントリ表示) で、素ダメだけ表示。
function getShapeLabel(shape, range) {
  if (shape === "beam") {
    const r = range != null ? range : "?";
    return `直線${r}マス`;
  }
  return (window.TEXTS && TEXTS.labels && TEXTS.labels.shape && TEXTS.labels.shape[shape]) || shape;
}

function weaponEffectText(src) {
  switch (src.effect) {
    case "sustain":  return "同一対象に連続ヒットで +25%/回 累積 (固定値、別対象でリセット)";
    case "compress": return "各ヒットで対象の最大HP × 武器の赤字% を追加ダメージ";
    case "pushback": return "敵を「武器の赤字」マスぶんノックバック (壁/敵で止まる)";
    case "lofi":     return "装備ペダルのうち赤字 ≤ 2 のものは効果が ×3";
    default:         return null;
  }
}

function showWeaponTooltip(src, weaponItem, slotIds, anchorEl) {
  // 武器の「赤字」は damage / range / compress / hits のいずれか (なし=damage 固定)
  const rangeRed    = !!src.rangeRed;
  const compressRed = !!src.compressRed;
  const damageRed   = !!src.damageRed;
  const hitsRed     = !!src.hitsRed;

  // --- ダメージ行 ---
  const baseDmg = src.damage;
  // 赤字が damage の場合のみ weaponItem.red が解決後ダメージ
  const finalDmg = (damageRed && weaponItem) ? weaponItem.red : baseDmg;
  const dmgBoosted = damageRed && weaponItem && finalDmg !== baseDmg;
  const dmgClass = damageRed ? "weapon-dmg-red" : "weapon-dmg-black";
  const dmgTag = damageRed
    ? `<span style="color:#ff8888;font-weight:bold">赤字</span> <span style="opacity:0.7">(modifier で増減可)</span>`
    : `<span style="color:#aaaaaa;font-weight:bold">黒字</span> <span style="opacity:0.7">(ペダルで変えられない固定値)</span>`;
  const dmgVal = dmgBoosted
    ? `<span class="${dmgClass}">${baseDmg}</span> <span style="opacity:0.6">→</span> ` +
      `<span class="${dmgClass}" style="text-shadow:0 0 6px #ff5566">${finalDmg}</span>`
    : `<span class="${dmgClass}">${baseDmg}</span>`;
  const dmgLine = `<div>ダメージ: ${dmgVal} ${dmgTag}</div>`;

  // --- 射程行 (rangeRed のときだけ表示) ---
  let rangeLine = "";
  if (rangeRed) {
    const baseRange = src.range || 0;
    const finalRange = weaponItem ? weaponItem.red : baseRange;
    const rBoosted = finalRange !== baseRange;
    const rVal = rBoosted
      ? `<span class="weapon-dmg-red">${baseRange}</span> <span style="opacity:0.6">→</span> ` +
        `<span class="weapon-dmg-red" style="text-shadow:0 0 6px #ff5566">${finalRange}</span>`
      : `<span class="weapon-dmg-red">${baseRange}</span>`;
    rangeLine = `<div style="margin-top:4px">射程: ${rVal} マス ` +
      `<span style="color:#ff8888;font-weight:bold">赤字</span> ` +
      `<span style="opacity:0.7">(modifier で増減可)</span></div>`;
  }

  // --- 追加ダメ%行 (compressRed のときだけ表示) ---
  let compressLine = "";
  if (compressRed) {
    const baseC = src.compress || 0;
    const finalC = weaponItem ? weaponItem.red : baseC;
    const cBoosted = finalC !== baseC;
    const cVal = cBoosted
      ? `<span class="weapon-dmg-red">${baseC}</span> <span style="opacity:0.6">→</span> ` +
        `<span class="weapon-dmg-red" style="text-shadow:0 0 6px #ff5566">${finalC}</span>`
      : `<span class="weapon-dmg-red">${baseC}</span>`;
    compressLine = `<div style="margin-top:4px">追加ダメ: 対象最大HP × ${cVal}% ` +
      `<span style="color:#ff8888;font-weight:bold">赤字</span> ` +
      `<span style="opacity:0.7">(modifier で増減可)</span></div>`;
  }

  // --- 攻撃回数行 (hitsRed のときだけ表示) ---
  let hitsLine = "";
  if (hitsRed) {
    const baseH = src.hits || 0;
    const finalH = weaponItem ? weaponItem.red : baseH;
    const hBoosted = finalH !== baseH;
    const hVal = hBoosted
      ? `<span class="weapon-dmg-red">${baseH}</span> <span style="opacity:0.6">→</span> ` +
        `<span class="weapon-dmg-red" style="text-shadow:0 0 6px #ff5566">${finalH}</span>`
      : `<span class="weapon-dmg-red">${baseH}</span>`;
    hitsLine = `<div style="margin-top:4px">攻撃回数: ${hVal} 回 ` +
      `<span style="color:#ff8888;font-weight:bold">赤字</span> ` +
      `<span style="opacity:0.7">(modifier で増減可)</span></div>`;
  }

  // --- 形状行 ---
  // beam は range が動的なので、解決後の値があれば優先表示
  const rangeForShape = (rangeRed && weaponItem) ? weaponItem.red : src.range;
  const shapeLabel = getShapeLabel(src.shape, rangeForShape);
  const shapeLine = `<div style="margin-top:4px">形状: <span style="color:#cce">${escapeHtml(shapeLabel)}</span></div>`;

  const effectText = weaponEffectText(src);
  const effectRow = effectText
    ? `<div class="tt-detail" style="margin-top:6px"><span style="color:#ffcc66">効果:</span> ${escapeHtml(effectText)}</div>`
    : "";

  // チェーンに 1 つでもペダルが乗っているなら「解決後」セクションを末尾に追加
  const hasPedals = Array.isArray(slotIds) && slotIds.some((id) => id != null);
  const resolvedSection = hasPedals ? buildResolvedSection(src, slotIds) : "";

  pedalTooltip.innerHTML =
    `<div class="tt-title" style="color:${src.color}">${src.icon} ${src.name}</div>` +
    `<div class="tt-summary">${dmgLine}${rangeLine}${compressLine}${hitsLine}${shapeLine}</div>` +
    `<div class="tt-detail">${escapeHtml(src.desc || "")}</div>` +
    effectRow +
    resolvedSection;
  pedalTooltip.style.display = "block";
  positionTooltipNear(anchorEl);
}

function attachWeaponTooltip(el, src, weaponItem, slotIds) {
  el.addEventListener("mouseenter", () => showWeaponTooltip(src, weaponItem, slotIds, el));
  el.addEventListener("mouseleave", hidePedalTooltip);
  el.addEventListener("mousemove", () => positionTooltipNear(el));
}

// 武器ツールチップの「チェーン解決後」セクションを HTML 文字列で組み立てる。
// slotIds に1つでもペダルが乗っているときだけ呼ぶこと。
function buildResolvedSection(src, slotIds) {
  const atk = resolveChain(src, slotIds);
  const lines = [];

  // ダメージ: 素ダメ → 解決後 (差があるときだけ矢印で見せる)
  const baseDmg = src.damage || 0;
  if (atk.damage !== baseDmg) {
    lines.push(
      `<div>最終ダメ: <span class="weapon-dmg-red">${baseDmg}</span> ` +
      `<span style="opacity:0.6">→</span> ` +
      `<span class="weapon-dmg-red" style="text-shadow:0 0 6px #ff5566">${atk.damage}</span></div>`
    );
  } else {
    lines.push(`<div>最終ダメ: <span class="weapon-dmg-red">${atk.damage}</span></div>`);
  }

  // 属性
  if (atk.element && atk.element !== "normal") {
    const elemLabel = ELEMENT_LABEL[atk.element] || atk.element;
    const elemColor = atk.element === "fire" ? "#ff8866" :
                      atk.element === "ice"  ? "#88ccff" :
                      atk.element === "thunder" ? "#ffee55" : "#ddd";
    lines.push(`<div>属性: <span style="color:${elemColor}">${escapeHtml(elemLabel)}</span></div>`);
  }

  // 攻撃回数
  if (atk.hits > 1) {
    lines.push(`<div>攻撃回数: <span style="color:#ff77aa">×${atk.hits}</span></div>`);
    // 同一対象に全弾命中したとき (× 弱点等抜き) の理論合計
    lines.push(
      `<div style="opacity:0.7;font-size:10px">└ 1スイング合計目安: ${atk.damage} × ${atk.hits} = ${atk.damage * atk.hits}</div>`
    );
  }

  // 状態異常
  if (atk.statusEffects.length > 0) {
    const labels = atk.statusEffects.map((s) => {
      const lbl = STATUS_LABEL[s.type] || s.type;
      const ch  = s.chance != null && s.chance < 1 ? ` ${Math.round(s.chance * 100)}%` : "";
      const dur = s.duration ? `${s.duration}T` : "";
      return `${lbl}${dur}${ch}`;
    });
    // hits>1 のときは「抽選回数 = hits × 異常数」の目安も
    const rolls = atk.hits * atk.statusEffects.length;
    const rollNote = atk.hits > 1 || atk.statusEffects.length > 1
      ? ` <span style="opacity:0.6;font-size:10px">(計 ${rolls} 回抽選)</span>`
      : "";
    lines.push(`<div>状態異常: <span style="color:#ffd866">${escapeHtml(labels.join(" + "))}</span>${rollNote}</div>`);
  }
  // Phaser: 累積ヒット凍結
  if (atk.phaserRequired) {
    lines.push(`<div>凍結条件: <span style="color:#88ddff">同じ敵に ${atk.phaserRequired} ヒットで凍結4T</span></div>`);
  }

  // 射程 / 追加ダメ% は base section にも出ているが、解決後の値を再掲
  if (src.rangeRed) {
    lines.push(`<div>射程: <span class="weapon-dmg-red">${atk.range}</span> マス</div>`);
  }
  if (src.compressRed) {
    lines.push(
      `<div>追加ダメ: 対象最大HP × <span class="weapon-dmg-red">${atk.compress}</span>%/ヒット</div>`
    );
  }

  // パッシブ系ペダル (preamp / powersupply / tripletecho 等) の列挙
  const passiveIds = [];
  const seen = new Set();
  for (const id of slotIds) {
    if (!id || seen.has(id)) continue;
    const p = PEDALS[id];
    if (!p || p.kind !== "passive") continue;
    seen.add(id);
    passiveIds.push(id);
  }
  if (passiveIds.length > 0) {
    const parts = passiveIds.map((id) => {
      const p = PEDALS[id];
      return `<span style="color:${p.color}">${p.icon} ${escapeHtml(p.name || id)}</span>`;
    });
    lines.push(`<div style="margin-top:4px">パッシブ: ${parts.join(" / ")}</div>`);
  }

  return `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #555">` +
         `<div style="color:#ffcc66;font-size:11px;margin-bottom:4px;letter-spacing:1px">▼ チェーン解決後</div>` +
         lines.join("") +
         `</div>`;
}

// 敵詳細ツールチップ (マップタイル hover で表示)
const enemyTooltip = document.createElement("div");
enemyTooltip.id = "enemy-tooltip";
document.body.appendChild(enemyTooltip);

function enemyDisplayName(e) {
  if (e.isBoss) return "ボス・スライム";
  if (e.type === "thorn")  return "スパイカ";
  if (e.type === "gianturtle") return "ジャイアントスパイカ";
  if (e.type === "tree")   return "人面樹";
  if (e.type === "archer") return "アーチャー";
  if (e.type === "crankblitz") return "クランクブリッツ";
  if (e.type === "ogre")   return "レイジ・オーガ";
  if (e.type === "wraith")        return "レイス";
  if (e.type === "phantomwraith") return "ファントムレイス";
  if (e.type === "knight")        return "盾の騎士";
  if (e.type === "samurai")       return "マスター・サムライ";
  const label = ENEMY_TYPE_LABEL[e.type] || "無属性";
  return `${label}スライム`;
}

function enemyTypeIcon(e) {
  if (e.isBoss) return "👑";
  if (e.type === "thorn")  return "🛡";
  if (e.type === "gianturtle") return "🗿";
  if (e.type === "tree")   return "🌳";
  if (e.type === "archer") return "🏹";
  if (e.type === "crankblitz") return "🪝";
  if (e.type === "ogre")   return "👹";
  if (e.type === "wraith")        return "👻";
  if (e.type === "phantomwraith") return "💀";
  if (e.type === "knight")        return "🛡";
  if (e.type === "samurai")       return "⚔";
  return e.type === "fire" ? "🔥" : e.type === "ice" ? "❄" : "・";
}

// 敵のキャラ紹介 (tooltip 用、短くフレーバー寄り)。
// 識別は isBoss → 否 → type の順。封印で abilities を消しても、紹介文は変わらない。
function enemyFlavorText(e) {
  if (e.isBoss) {
    return "フロアの番人。スライムとは格が違う、覚悟して挑め。";
  }
  switch (e.type) {
    case "neutral": return "クリーンな素の音。クセも特技も無い、まずは練習相手に。";
    case "fire":    return "常時オーバードライブ気味の熱血漢。身体が燃えてて燃焼が効かない。";
    case "ice":     return "位相が止まってる冷血漢。氷漬けだから凍結はもう効かない。";
    case "thorn":   return "叩かれるたびに棘を返してくる、機嫌の悪い亀。";
    case "gianturtle": return "鋼鉄の甲羅を持つ亀の上位種 (HP 250)。連撃するほど棘が伸びる (4→8→16→32...)。単発の大火力でぶち抜くしかない。燃焼も押し出しも効かない。";
    case "tree":    return "ステージに根を張った巨木。隣接すれば根で動きを縛る (root-bind)。さらに 5×5 圏内に獲物がいれば地中に潜って隣に出現する (土遁)。距離を保つだけでは安全ではない。";
    case "archer":  return "離れて矢を放つ慎重派。近づけば普通の雑魚に成り下がる。";
    case "crankblitz": return "直線5マス以内にいるとロケットグラブで掴んで目の前まで引き寄せる蒸気機械。線を切るか速攻で潰せ。";
    case "ogre":    return "倒しても3ターンは怒り狂って暴れ回る、頑丈な鬼。最後の一発に気をつけろ。";
    case "wraith":  return "周囲3×3の仲間を幻惑のオーラで隠す怨霊。隣の敵が誰なのか、本人を倒すまで見えない。";
    case "phantomwraith": return "5×5の広域に幻惑を撒く上位種。HPも正体も判別不能の包囲網を作るやばい奴。";
    case "knight":  return "誇り高き盾の騎士。自身を中心とする 3×3 内にプレイヤーがいる間、構えた盾で被ダメージを 5 に上限する (盾マークが点る)。範囲外からの遠隔・直線攻撃には無防備。接近戦では連撃や凍結で削るしかない。";
    case "samurai": return "達人の剣士。隣接すると 1 ターンで 4 連斬 (ATK7) を放ち、4 発全てが命中すると次のターンは構えに入り武器攻撃を全て弾く。連撃ビルドは止められ易い。範囲攻撃や凍結で四連を中断するのが鍵。";
    default:        return "詳細情報なし。倒して調査せよ。";
  }
}

// 敵の特殊能力一覧 (tooltip 用)。abilities が空なら "なし" を返す。
// 「封印」武器で abilities から削れば即座にここの表示も消える。
function enemyAbilitiesInfo(e) {
  if (!e.abilities || e.abilities.length === 0) {
    return `<span style="opacity:0.5">なし (全属性等倍 / 状態異常通り)</span>`;
  }
  const parts = e.abilities.map((id) => {
    const a = ENEMY_ABILITIES[id];
    if (!a) return `<span>${id}</span>`;
    // 棘の反撃ダメージ値は enemy.counter から動的に注入
    let label = a.name;
    if (id === "counter-thorn" && e.counter != null) {
      label = `棘 (反撃 ${e.counter} ダメ)`;
    }
    // death-rage が発動中なら残ターンを併記
    if (id === "death-rage" && e.rage) {
      label = `怒り状態 残${e.rage.turnsLeft}T (ATK×2 / 無敵)`;
    }
    return `<span style="color:${a.color}">${a.icon} ${label}</span>`;
  });
  return parts.join("<br>");
}

function enemyStatusLine(e) {
  const parts = [];
  for (const s of e.status) {
    if (s.type === "burn")   parts.push(`🔥燃焼${s.turns ? `(${s.turns})` : ""}`);
    if (s.type === "freeze") parts.push(`❄凍結${s.turns ? `(${s.turns})` : ""}`);
    if (s.type === "shock")  parts.push(`⚡麻痺${s.turns ? `(${s.turns})` : ""}`);
  }
  return parts.length ? parts.join(" ") : "";
}

function enemyDropInfo(e) {
  if (!e.dropPool || e.dropPool.length === 0) return "なし";
  const names = e.dropPool.map((id) => {
    const def = WEAPONS[id] ? WEAPONS[id] : PEDALS[id];
    return def ? def.name : id;
  });
  const pct = Math.round((e.dropChance || 0) * 100);
  return `${pct}% / ${names.join("・")}`;
}

function showEnemyTooltip(e, anchorEl) {
  const hidden = isEnemyHiddenByWraith(e);
  const divider = `<div style="border-top:1px solid #3a3a44;margin:8px 0"></div>`;
  if (hidden) {
    // 幻惑オーラに包まれた敵: 正体・HP・状態すべて不明
    enemyTooltip.innerHTML =
      `<div class="et-title" style="color:#bb88ff">👁 ???</div>` +
      `<div class="et-row"><span class="lbl">HP</span>?? / ??</div>` +
      `<div style="margin-top:6px;color:#d4b8ff;font-style:italic;font-size:11px;line-height:1.5">` +
        `ファントムレイスの幻惑オーラに包まれていて、何の敵か分からない。<br>` +
        `HPも残り体力も読めない。まずはオーラの元 (レイス系) を倒せ。` +
      `</div>` +
      divider +
      `<div style="color:#888;font-size:10px">▼ 特殊能力</div>` +
      `<div style="color:#aa88dd;font-style:italic">不明</div>`;
    enemyTooltip.style.display = "block";
    positionEnemyTooltipNear(anchorEl);
    return;
  }
  const color = ENEMY_TYPE_COLOR[e.type] || "#888";
  const status = enemyStatusLine(e);
  const flavor = enemyFlavorText(e);
  // 能力赤字 (Limiter/NoiseGate で削れる数値) があれば一覧化
  let redsLine = "";
  if (e.reds && Object.keys(e.reds).length > 0) {
    const parts = [];
    for (const k of Object.keys(e.reds)) {
      const label = REDS_LABEL[k] || k;
      parts.push(`<span style="color:#88c0e0">${label} <b>${e.reds[k]}</b></span>`);
    }
    redsLine = `<div class="et-row" style="margin-top:4px"><span class="lbl">能力赤字</span>${parts.join(" / ")}</div>`;
  }
  enemyTooltip.innerHTML =
    `<div class="et-title" style="color:${color}">${enemyTypeIcon(e)} ${enemyDisplayName(e)}</div>` +
    `<div class="et-row"><span class="lbl">HP</span>${Math.max(0, e.hp)} / ${e.hpMax}</div>` +
    `<div style="margin-top:6px;color:#d4d4d4;font-style:italic;font-size:11px;line-height:1.5">${escapeHtml(flavor)}</div>` +
    divider +
    `<div><div style="color:#888;font-size:10px;margin-bottom:4px;letter-spacing:1px">▼ 特殊能力</div>${enemyAbilitiesInfo(e)}</div>` +
    redsLine +
    divider +
    `<div class="et-row"><span class="lbl">攻撃</span>${e.atk}</div>` +
    `<div class="et-row"><span class="lbl">ドロップ</span>${enemyDropInfo(e)}</div>` +
    (status ? `<div class="et-row et-status"><span class="lbl">状態</span>${status}</div>` : "");
  enemyTooltip.style.display = "block";
  positionEnemyTooltipNear(anchorEl);
}

function hideEnemyTooltip() { enemyTooltip.style.display = "none"; }

// NPC (騎士 / 母) ホバー時の説明
function showNpcTooltip(n, anchorEl) {
  let title, color, flavor;
  if (n.type === "knight" && n.dead) {
    enemyTooltip.innerHTML =
      `<div class="et-title" style="color:#888">🛡 騎士の屍</div>` +
      `<div style="margin-top:4px;color:#888;font-style:italic;font-size:11px;line-height:1.5">${escapeHtml("返事がない。ただの屍のようだ。")}</div>`;
    enemyTooltip.style.display = "block";
    positionEnemyTooltipNear(anchorEl);
    return;
  }
  if (n.type === "knight") {
    title = "🛡 瀕死の騎士";
    color = "#cc8866";
    flavor = "深手を負った騎士。胸に小さな子を抱いている。最期の力を振り絞って、誰かに加護を託そうとしている――。隣接すると会話。";
  } else if (n.type === "mother") {
    title = "💖 母";
    color = "#ffaacc";
    flavor = "我が子を失い、ずっと探し続けていた母。あなたが連れてきた赤ちゃんを見れば、奥への扉を開く鍵を渡してくれるかもしれない。隣接で会話。";
  } else {
    return;
  }
  enemyTooltip.innerHTML =
    `<div class="et-title" style="color:${color}">${title}</div>` +
    `<div style="margin-top:4px;color:#d4d4d4;font-style:italic;font-size:11px;line-height:1.5">${escapeHtml(flavor)}</div>`;
  enemyTooltip.style.display = "block";
  positionEnemyTooltipNear(anchorEl);
}

// 赤ちゃんホバー時の説明
function showBabyTooltip(b, anchorEl) {
  if (babyWithMother) {
    enemyTooltip.innerHTML =
      `<div class="et-title" style="color:#ff88bb">👶 赤ちゃん</div>` +
      `<div style="margin-top:4px;color:#d4d4d4;font-style:italic;font-size:11px;line-height:1.5">${escapeHtml("母と再会した小さな命。もう怖いものは何もない。")}</div>` +
      `<div style="color:#ff88bb;margin-top:4px">💖 母に抱かれて安心しきっている (聖域)</div>`;
    enemyTooltip.style.display = "block";
    positionEnemyTooltipNear(anchorEl);
    return;
  }
  const blessing = hasBlessing()
    ? '<div style="color:#ffd866;margin-top:4px">✟ 騎士の最期の加護: 敵物理ダメ → 1</div>'
    : "";
  const flavor = "騎士から託された小さな命。プレイヤーの後ろを付いてきて、敵に殴られると HP を失う。";
  enemyTooltip.innerHTML =
    `<div class="et-title" style="color:#ff88bb">👶 赤ちゃん</div>` +
    `<div style="margin-top:4px;color:#d4d4d4;font-style:italic;font-size:11px;line-height:1.5">${escapeHtml(flavor)}</div>` +
    blessing +
    `<div style="border-top:1px solid #3a3a44;margin:8px 0"></div>` +
    `<div style="color:#7ed957;font-size:11px;line-height:1.5">🎛 <b>BABY ボード</b> にペダルを装着できる</div>`;
  enemyTooltip.style.display = "block";
  positionEnemyTooltipNear(anchorEl);
}
function positionEnemyTooltipNear(anchorEl) {
  if (!anchorEl) return;
  const r = anchorEl.getBoundingClientRect();
  const tt = enemyTooltip.getBoundingClientRect();
  let left = r.right + 8;
  let top  = r.top;
  if (left + tt.width > window.innerWidth - 8) {
    left = r.left - tt.width - 8;
  }
  if (top + tt.height > window.innerHeight - 8) {
    top = window.innerHeight - tt.height - 8;
  }
  if (top < 8) top = 8;
  enemyTooltip.style.left = `${Math.max(8, left)}px`;
  enemyTooltip.style.top = `${top}px`;
}

// インベントリ アイテム ミニメニュー (クリックで装着/捨てる)
let activeItemMenu = null;
function hideItemMenu() {
  if (activeItemMenu) activeItemMenu.remove();
  activeItemMenu = null;
}
function showItemMenu(item, anchorEl) {
  hideItemMenu();
  const def = itemDef(item);
  if (!def) return;
  const menu = document.createElement("div");
  menu.id = "item-menu";

  const header = document.createElement("div");
  header.className = "menu-header";
  header.style.color = def.color;
  header.textContent = `${def.icon} ${def.name}`;
  menu.appendChild(header);

  const addOpt = (label, fn, cls) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "menu-option" + (cls ? " " + cls : "");
    b.textContent = label;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      fn();
      hideItemMenu();
    });
    menu.appendChild(b);
  };
  const sep = () => {
    const s = document.createElement("div");
    s.className = "menu-sep";
    menu.appendChild(s);
  };

  if (item.kind === "weapon") {
    for (const slotKey of activeBoardKeys()) {
      const cur = weapons[slotKey];
      const suffix = cur ? ` (現: ${WEAPONS[cur].name})` : "";
      addOpt(`⚔ ${slotKey.toUpperCase()} スロットに装備${suffix}`, () => equipWeaponTo(item.uid, slotKey));
    }
  } else {
    // ペダル: 装着はドラッグ&ドロップ専用 (クリック装着は廃止)
    const hint = document.createElement("div");
    hint.className = "menu-hint";
    hint.innerHTML =
      '🎛 装着するには下の <b>[Q]</b> / <b>[W]</b> / <b>[E]</b> ボードの空きスロットへ' +
      '<b style="color:#ffd866">ドラッグ&ドロップ</b>してください';
    menu.appendChild(hint);
  }
  sep();
  addOpt("🗑 捨てる", () => discardItem(item.uid), "danger");
  addOpt("キャンセル", () => {}, "cancel");

  // 位置決め (アンカーの右隣、画面外なら左)
  document.body.appendChild(menu);
  activeItemMenu = menu;
  const r = anchorEl.getBoundingClientRect();
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let left = r.right + 6;
  if (left + mw > window.innerWidth - 8) left = r.left - mw - 6;
  if (left < 8) left = 8;
  let top = r.top;
  if (top + mh > window.innerHeight - 8) top = window.innerHeight - mh - 8;
  if (top < 8) top = 8;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}
// クリック外で閉じる (キャプチャ段で、アイテムボタン以外を押したら閉じる)
document.addEventListener("click", (e) => {
  if (!activeItemMenu) return;
  if (activeItemMenu.contains(e.target)) return;
  if (e.target.closest && e.target.closest(".inv-item")) return;
  hideItemMenu();
});

// ========================================================================
// マップ初期化
// ========================================================================
// Fisher-Yates shuffle (in place)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseMap() {
  enemies.length = 0;
  npcs.length = 0;
  walls.clear();
  pits.clear();
  pickups.clear();
  goal.x = -1; goal.y = -1;
  // マップを乱択
  const variants = currentFloor.maps;
  const variantIdx = Math.floor(Math.random() * variants.length);
  const map = variants[variantIdx];
  currentFloor._lastVariantIdx = variantIdx; // ログ用
  // pickup pool: グローバルプールから「重複なし」で重み付き抽選。
  // 同フロア内で同じアイテムは出ない。レア (weight 小) は選ばれにくい。
  const pool = [...GLOBAL_DROP_POOL];
  const cfg = currentFloor.enemyConfig || {};
  // フォールバック (フロアに該当 type が無い場合)
  const defaultEnemy = { hp: 25, atk: 2, dropChance: 0, dropPool: [] };
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = map[y][x];
      if (ch === "#") {
        walls.add(`${x},${y}`);
      } else if (ch === "@") {
        player.x = x; player.y = y;
        // ※ 開始位置はピットにしない (ピットを貴重な資源として扱う)
      } else if (ch === "P") {
        pits.add(`${x},${y}`);
      } else if (ch === "G") {
        goal.x = x; goal.y = y;
      } else if (ENEMY_CHAR_TYPE[ch]) {
        const isBoss = ch === "B";
        const type = ENEMY_CHAR_TYPE[ch];
        // ogre / wraith / phantomwraith / gianturtle / crankblitz はフロア cfg を無視して固定スタッツ
        const ec = type === "ogre"          ? OGRE_STATS
                 : type === "wraith"        ? WRAITH_STATS
                 : type === "phantomwraith" ? PHANTOM_WRAITH_STATS
                 : type === "gianturtle"    ? GIANT_TURTLE_STATS
                 : type === "crankblitz"    ? CRANK_BLITZ_STATS
                 : type === "knight"        ? KNIGHT_STATS
                 : type === "samurai"       ? SAMURAI_STATS
                 : (isBoss ? (cfg.boss || defaultEnemy) : (cfg[type] || defaultEnemy));
        const enemy = {
          x, y, type, isBoss,
          hp: ec.hp, hpMax: ec.hp,
          atk: ec.atk,
          dropChance: ec.dropChance || 0,
          dropPool: ec.dropPool || [],
          status: [],
          abilities: defaultAbilitiesFor(type, isBoss),
          reds: defaultRedsFor(type),
        };
        // スパイカ専用フィールド: 攻撃を受けた時のカウンターダメージ
        if (type === "thorn") enemy.counter = ec.counter != null ? ec.counter : 2;
        enemies.push(enemy);
      } else if (ch === "?") {
        // ランダム pickup スポット: 重み付き抽選 (重複なし)
        if (pool.length > 0) {
          const entry = weightedPick(pool);
          if (entry) {
            const idx = pool.indexOf(entry);
            if (idx >= 0) pool.splice(idx, 1);
            pickups.set(`${x},${y}`, { kind: entry.kind, id: entry.id });
          }
        }
      } else if (ch === "n") {
        // 瀕死の騎士 (7F のみ、赤ちゃん未取得時のみ出現)
        if (!babyAcquired) {
          npcs.push({ type: "knight", x, y, completed: false });
        }
      } else if (ch === "m") {
        // 母 (10F のみ、赤ちゃん生存時かつ鍵未取得時のみ出現)
        if (baby && !motherKey) {
          npcs.push({ type: "mother", x, y, completed: false });
        }
      } else if (PEDAL_MAP[ch]) {
        pickups.set(`${x},${y}`, { kind: "pedal", id: PEDAL_MAP[ch] });
      } else if (WEAPON_MAP[ch]) {
        pickups.set(`${x},${y}`, { kind: "weapon", id: WEAPON_MAP[ch] });
      }
    }
  }
}

// フロア遷移: HP は持ち越し + 各フロア間で 25 回復 (3 フロア通しのバランス)
function loadFloor(idx) {
  if (idx < 0 || idx >= FLOORS.length) {
    showRunClear();
    return;
  }
  const isFirst = idx === 0;
  // 母に赤ちゃんを渡した後にフロアを跨いだ瞬間 → 赤ちゃんと母は 10F に残る
  // (実体は破棄、喜び timer も停止)
  if (babyWithMother) {
    stopJoyTimer();
    baby = null;
    babyWithMother = false;
  }
  currentFloorIdx = idx;
  currentFloor = FLOORS[idx];
  parseMap();
  pendingAttack = null;
  if (!isFirst) {
    const heal = 25;
    player.hp = Math.min(player.hpMax, player.hp + heal);
    if (baby) {
      const heal2 = Math.max(1, Math.ceil(baby.hpMax * 0.25));
      baby.hp = Math.min(baby.hpMax, baby.hp + heal2);
    }
  }
  // 赤ちゃん再配置: プレイヤーの隣 (4方向 → 斜め) で空きマスを探す
  if (baby) placeBabyNearPlayer();
  const variantLetter = String.fromCharCode(65 + (currentFloor._lastVariantIdx || 0));
  log(`=== ${currentFloor.name} [variant ${variantLetter}] ===`, "win");
  log(currentFloor.hint);
  // 床落ちアイテム数を log (内容は伏せる: 拾うまで何か分からない)
  if (pickups.size > 0) {
    let w = 0, p = 0;
    for (const entry of pickups.values()) {
      if (entry.kind === "weapon") w++; else p++;
    }
    const parts = [];
    if (w > 0) parts.push(`武器 ${w}`);
    if (p > 0) parts.push(`ペダル ${p}`);
    log(`床落ち: ${parts.join(" / ")}`, "pickup");
  }
  // フロア入場時点で NPC に隣接していたら会話発火
  checkNpcAdjacency();
  renderAll();
}

function showRunClear() {
  gameOver = true;
  log("★ 全フロア制覇！ ラン完遂！", "win");
  showGameEndBanner("★ RUN CLEAR", "#7ed957");
}

// 敵ドロップ: グローバルプールから重み付き抽選 (dropChance のみ enemy 設定を尊重)
function rollDrop(enemy) {
  if (Math.random() >= enemy.dropChance) return;
  const entry = weightedPick(GLOBAL_DROP_POOL);
  if (!entry) return;
  pickups.set(`${enemy.x},${enemy.y}`, { kind: entry.kind, id: entry.id });
  const label = entry.kind === "weapon" ? "武器" : "ペダル";
  log(`💎 ${label} がドロップ！(${enemy.x},${enemy.y})`, "pickup");
}

// プレイヤーが今いるマスにアイテムがあれば自動拾得 (インベントリ満杯なら拒否)
function tryPickup() {
  const key = `${player.x},${player.y}`;
  const entry = pickups.get(key);
  if (!entry) return;
  if (inventory.length >= INV_MAX) {
    log(`📦 インベントリ満杯 (${INV_MAX}/${INV_MAX})、拾えない`, "lose");
    return;
  }
  const def = itemDefById(entry.kind, entry.id);
  inventory.push(newItem(entry.kind, entry.id));
  pickups.delete(key);
  log(`📥 ${def.name} を入手 (${inventory.length}/${INV_MAX})`, "pickup");
  // 初回ペダル取得時にドラッグ案内の吹き出しを有効化
  if (entry.kind === "pedal" && !tutorialDismissed.pedal) {
    pedalTutorialActive = true;
  }
}

function setupGrid() {
  mapEl.style.setProperty("--cols", COLS);
  mapEl.style.setProperty("--rows", ROWS);
  mapEl.innerHTML = "";
  for (let i = 0; i < COLS * ROWS; i++) {
    const div = document.createElement("div");
    div.className = "tile";
    // renderMap が tile._enemy にセットした参照だけを見て表示するので、
    // 各 tile につきリスナは1セットだけ (renderMap で都度 attach するとスタックする)
    div.addEventListener("mouseenter", () => {
      if (div._enemy)      showEnemyTooltip(div._enemy, div);
      else if (div._npc)   showNpcTooltip(div._npc, div);
      else if (div._baby)  showBabyTooltip(div._baby, div);
    });
    div.addEventListener("mouseleave", hideEnemyTooltip);
    div.addEventListener("mousemove", () => {
      if (div._enemy || div._npc || div._baby) positionEnemyTooltipNear(div);
    });
    mapEl.appendChild(div);
  }
}

function tileAt(x, y) {
  return mapEl.children[y * COLS + x];
}

// ========================================================================
// キャラクター SVG (32×32 viewBox, tile に innerHTML で挿入)
// ========================================================================
function playerSvg(facing) {
  // facing.dx === -1 のときだけ水平反転 (上下は反転せず、矢印 overlay で示す)
  const flip = facing && facing.dx === -1
    ? 'transform="translate(32 0) scale(-1 1)"' : '';
  return (
    `<svg class="char-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
    `<g class="player-body" ${flip}>` +
      // 頭
      `<circle cx="14" cy="11" r="5" fill="#ffd866" stroke="#3a2a10" stroke-width="0.8"/>` +
      // 髪
      `<path d="M 9 9 Q 14 4, 19 9 L 18 7 L 14 6 L 10 7 Z" fill="#7a4f1a"/>` +
      // 体
      `<rect x="9" y="16" width="10" height="11" rx="2" fill="#ffb648" stroke="#3a2a10" stroke-width="0.8"/>` +
      // ベルト
      `<rect x="9" y="22" width="10" height="2" fill="#3a2a10"/>` +
      // 腕 (ギターを抱える)
      `<rect x="6" y="18" width="3" height="6" rx="1" fill="#ffb648" stroke="#3a2a10" stroke-width="0.6"/>` +
      `<rect x="19" y="18" width="3" height="6" rx="1" fill="#ffb648" stroke="#3a2a10" stroke-width="0.6"/>` +
      // ギターボディ
      `<ellipse cx="22" cy="22" rx="5" ry="3.5" fill="#7a4f1a" stroke="#000" stroke-width="0.6"/>` +
      `<circle cx="22" cy="22" r="1.2" fill="#1a0f05"/>` +
      // ネック
      `<rect x="9" y="20.5" width="13" height="1.4" fill="#5a3a10" stroke="#000" stroke-width="0.3"/>` +
      // 足
      `<rect x="10" y="27" width="3" height="3" fill="#3a2a10"/>` +
      `<rect x="15" y="27" width="3" height="3" fill="#3a2a10"/>` +
    `</g></svg>`
  );
}

const SLIME_PALETTE = {
  neutral: { body: "#7faa7f", shade: "#4a6a4a", spec: "#cfeacf", eye: "#1a1a1a" },
  fire:    { body: "#ff8a4d", shade: "#cc5020", spec: "#ffd0b0", eye: "#fff5dd" },
  ice:     { body: "#88c0e0", shade: "#4a7090", spec: "#e0f4ff", eye: "#ffffff" },
};

function slimeSvg(type, isBoss) {
  const base = SLIME_PALETTE[type] || SLIME_PALETTE.neutral;
  const c = isBoss
    ? { body: "#5a3a3a", shade: "#2a1818", spec: "#aa6868", eye: "#ff3344" }
    : base;
  // ボスは少し大きめ + 4 つ目
  const bossEyes = isBoss
    ? `<ellipse cx="9" cy="22" rx="1.4" ry="1.8" fill="#fff"/>` +
      `<circle  cx="9" cy="22.2" r="0.9" fill="${c.eye}"/>` +
      `<ellipse cx="23" cy="22" rx="1.4" ry="1.8" fill="#fff"/>` +
      `<circle  cx="23" cy="22.2" r="0.9" fill="${c.eye}"/>`
    : "";
  // 属性アクセント
  let accent = "";
  if (type === "fire") {
    accent =
      `<g class="slime-flame">` +
        `<path d="M 13 8 Q 14 2, 16 6 Q 18 2, 19 8 Q 16 11, 13 8 Z" ` +
              `fill="#ffcc44" stroke="#ff6600" stroke-width="0.4"/>` +
        `<path d="M 14.5 7 Q 16 4, 17.5 7 Q 16 9, 14.5 7 Z" fill="#fff5aa"/>` +
      `</g>`;
  } else if (type === "ice") {
    accent =
      `<g class="slime-crystal">` +
        `<polygon points="16,3 18,8 16,10 14,8" fill="#cce8ff" stroke="#fff" stroke-width="0.4"/>` +
        `<polygon points="11,7 12,10 10,11 9,9"   fill="#aad8f0" stroke="#fff" stroke-width="0.3"/>` +
        `<polygon points="22,7 23,9 21,11 20,10" fill="#aad8f0" stroke="#fff" stroke-width="0.3"/>` +
      `</g>`;
  }
  return (
    `<svg class="char-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
    `<g class="slime-body">` +
      // 影
      `<ellipse cx="16" cy="29" rx="11" ry="1.6" fill="rgba(0,0,0,0.35)"/>` +
      // ボディ
      `<path d="M 4 26 Q 4 11, 16 11 Q 28 11, 28 26 Q 28 28, 25 28 L 7 28 Q 4 28, 4 26 Z" ` +
            `fill="${c.body}" stroke="${c.shade}" stroke-width="1.2"/>` +
      // ハイライト
      `<ellipse cx="11" cy="16" rx="3.5" ry="2" fill="${c.spec}" opacity="0.75"/>` +
      // 目
      `<ellipse cx="11.5" cy="20" rx="2" ry="2.5" fill="#fff"/>` +
      `<ellipse cx="20.5" cy="20" rx="2" ry="2.5" fill="#fff"/>` +
      `<circle  cx="11.8" cy="20.5" r="1.1" fill="${c.eye}"/>` +
      `<circle  cx="20.8" cy="20.5" r="1.1" fill="${c.eye}"/>` +
      bossEyes +
      // 口
      `<path d="M 13 24 Q 16 26, 19 24" stroke="${c.shade}" stroke-width="0.8" fill="none"/>` +
    `</g>` +
    accent +
    `</svg>`
  );
}

// スパイカ: 棘付き亀甲 + 頭。低 HP/低 ATK だがカウンター持ち
function turtleSvg() {
  return (
    `<svg class="char-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="16" cy="29" rx="11" ry="1.6" fill="rgba(0,0,0,0.35)"/>` +
      // 頭 (上から覗く)
      `<ellipse cx="16" cy="14" rx="3.2" ry="2.8" fill="#9bc26b" stroke="#3c5a22" stroke-width="0.9"/>` +
      `<circle cx="14.6" cy="13.5" r="0.55" fill="#000"/>` +
      `<circle cx="17.4" cy="13.5" r="0.55" fill="#000"/>` +
      // 甲羅
      `<g class="turtle-shell">` +
        `<path d="M 4 24 Q 4 14, 16 14 Q 28 14, 28 24 Q 28 28, 22 28 L 10 28 Q 4 28, 4 24 Z" ` +
              `fill="#a06b3a" stroke="#5a3a18" stroke-width="1.2"/>` +
        // 甲羅模様
        `<path d="M 9 19 L 16 17 L 23 19 L 22 24 L 16 26 L 10 24 Z" ` +
              `fill="#7a4a22" opacity="0.55"/>` +
        // 棘 (黄色)
        `<polygon points="9,15 10,9 11,15" fill="#ffe066" stroke="#aa7733" stroke-width="0.4"/>` +
        `<polygon points="15,13 16,7 17,13" fill="#ffe066" stroke="#aa7733" stroke-width="0.4"/>` +
        `<polygon points="21,15 22,9 23,15" fill="#ffe066" stroke="#aa7733" stroke-width="0.4"/>` +
        `<polygon points="5,21 2,17 7,19" fill="#ffe066" stroke="#aa7733" stroke-width="0.4"/>` +
        `<polygon points="27,21 30,17 25,19" fill="#ffe066" stroke="#aa7733" stroke-width="0.4"/>` +
      `</g>` +
    `</svg>`
  );
}

// ジャイアントスパイカ: 鉄の甲羅 + 銀の長棘 + 赤目。連撃アンチの上位種
function giantTurtleSvg() {
  return (
    `<svg class="char-svg giant-turtle-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="16" cy="29.5" rx="13" ry="1.9" fill="rgba(0,0,0,0.6)"/>` +
      // 頭 (大きめ、暗緑、赤く光る目)
      `<ellipse cx="16" cy="13" rx="3.8" ry="3.3" fill="#4a6a2a" stroke="#1a2810" stroke-width="1.0"/>` +
      `<ellipse cx="14.3" cy="12.6" rx="0.85" ry="1.0" fill="#220000"/>` +
      `<ellipse cx="17.7" cy="12.6" rx="0.85" ry="1.0" fill="#220000"/>` +
      `<circle cx="14.3" cy="12.7" r="0.5" fill="#ff2230"/>` +
      `<circle cx="17.7" cy="12.7" r="0.5" fill="#ff2230"/>` +
      `<circle cx="14.3" cy="12.5" r="0.18" fill="#ffe6c8"/>` +
      `<circle cx="17.7" cy="12.5" r="0.18" fill="#ffe6c8"/>` +
      // 甲羅 (鉄黒 + 光沢)
      `<g class="giant-turtle-shell">` +
        `<path d="M 2 25 Q 2 12, 16 12 Q 30 12, 30 25 Q 30 29.2, 23 29.2 L 9 29.2 Q 2 29.2, 2 25 Z" ` +
              `fill="#2a2a32" stroke="#08080c" stroke-width="1.4"/>` +
        // ハイライト
        `<path d="M 5 16 Q 16 13, 27 16 L 26 19 Q 16 16.5, 6 19 Z" fill="#54545e" opacity="0.55"/>` +
        // 六角中央模様
        `<path d="M 7 20 L 16 17 L 25 20 L 24 26 L 16 28 L 8 26 Z" ` +
              `fill="#15151c" stroke="#4a4a55" stroke-width="0.55"/>` +
        // 大きな銀棘 (5 本、長め)
        `<polygon points="5,15 6.5,3 8,15" fill="#dcdce6" stroke="#3a3a44" stroke-width="0.5"/>` +
        `<polygon points="14.2,11 16,1 17.8,11" fill="#e8e8f0" stroke="#3a3a44" stroke-width="0.5"/>` +
        `<polygon points="24,15 25.5,3 27,15" fill="#dcdce6" stroke="#3a3a44" stroke-width="0.5"/>` +
        `<polygon points="3,22 -2,15 5,18" fill="#dcdce6" stroke="#3a3a44" stroke-width="0.5"/>` +
        `<polygon points="29,22 34,15 27,18" fill="#dcdce6" stroke="#3a3a44" stroke-width="0.5"/>` +
        // 棘先の赤い光 (危険サイン)
        `<polygon points="6.5,3 7,5.5 6,5.5" fill="#ff5544"/>` +
        `<polygon points="16,1 16.7,4 15.3,4" fill="#ff5544"/>` +
        `<polygon points="25.5,3 26,5.5 25,5.5" fill="#ff5544"/>` +
      `</g>` +
    `</svg>`
  );
}

// 人面樹: 緑の樹冠 + 茶色の幹に表情。押し出し無効
function treeSvg() {
  return (
    `<svg class="char-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="16" cy="29" rx="9" ry="1.6" fill="rgba(0,0,0,0.35)"/>` +
      // 樹冠
      `<g class="tree-canopy">` +
        `<ellipse cx="11" cy="10" rx="6"  ry="6" fill="#4a9a4a" stroke="#1c4a22" stroke-width="0.8"/>` +
        `<ellipse cx="21" cy="10" rx="6"  ry="6" fill="#4a9a4a" stroke="#1c4a22" stroke-width="0.8"/>` +
        `<ellipse cx="16" cy="7"  rx="6"  ry="6" fill="#5cb05c" stroke="#1c4a22" stroke-width="0.8"/>` +
        `<ellipse cx="16" cy="12" rx="9"  ry="5" fill="#3c8a3c" stroke="#1c4a22" stroke-width="0.8"/>` +
      `</g>` +
      // 幹
      `<rect x="13" y="17" width="6" height="10" rx="1.5" ry="1.5" fill="#7a4a22" stroke="#3a2110" stroke-width="0.9"/>` +
      // 表情
      `<ellipse cx="14.7" cy="21" rx="0.9" ry="1.3" fill="#fff"/>` +
      `<ellipse cx="17.3" cy="21" rx="0.9" ry="1.3" fill="#fff"/>` +
      `<circle cx="14.7" cy="21.3" r="0.55" fill="#000"/>` +
      `<circle cx="17.3" cy="21.3" r="0.55" fill="#000"/>` +
      `<path d="M 13.5 24.5 Q 16 26.5, 18.5 24.5" stroke="#3a2110" stroke-width="0.7" fill="none"/>` +
    `</svg>`
  );
}

// アーチャー: 紫フード + 構えた弓
function archerSvg() {
  return (
    `<svg class="char-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="16" cy="29" rx="7" ry="1.4" fill="rgba(0,0,0,0.35)"/>` +
      // 体 (ローブ)
      `<path d="M 10 17 Q 16 14, 22 17 L 24 28 L 8 28 Z" fill="#7a5a99" stroke="#3a224a" stroke-width="0.9"/>` +
      // 頭/フード
      `<ellipse cx="16" cy="12" rx="4.5" ry="5" fill="#9a7ab8" stroke="#3a224a" stroke-width="0.9"/>` +
      `<path d="M 11 11 Q 16 5, 21 11 L 21 13 L 11 13 Z" fill="#5a3a78" stroke="#2a103a" stroke-width="0.7"/>` +
      // 目 (光る)
      `<ellipse cx="14.6" cy="13" rx="0.8" ry="1.1" fill="#ffcc55"/>` +
      `<ellipse cx="17.4" cy="13" rx="0.8" ry="1.1" fill="#ffcc55"/>` +
      // 弓
      `<path d="M 24 13 Q 28 20, 24 27" stroke="#8b5a2b" stroke-width="1.4" fill="none"/>` +
      `<line x1="24" y1="13" x2="24" y2="27" stroke="#e8e8e8" stroke-width="0.5"/>` +
      // 番えた矢
      `<line x1="24" y1="20" x2="16" y2="20" stroke="#5a3a18" stroke-width="0.9"/>` +
      `<polygon points="14,20 16.5,18.5 16.5,21.5" fill="#aaaaaa" stroke="#444" stroke-width="0.3"/>` +
    `</svg>`
  );
}

// クランクブリッツ: 黄色い機械系。胸の弁、青く光るバイザー、フック付きの腕
function crankBlitzSvg() {
  return (
    `<svg class="char-svg crank-blitz-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="16" cy="29.5" rx="9" ry="1.6" fill="rgba(0,0,0,0.45)"/>` +
      // 胴体 (台形、金属感)
      `<path d="M 8 28 L 9 14 Q 16 11, 23 14 L 24 28 Z" fill="#c89020" stroke="#5a3a08" stroke-width="1.1"/>` +
      `<path d="M 9 14 Q 16 11, 23 14 L 22 17 Q 16 14.5, 10 17 Z" fill="#e6b040" opacity="0.7"/>` +
      // 頭 (角ばった金属頭部)
      `<rect x="10.5" y="6" width="11" height="8" rx="1.2" fill="#b88018" stroke="#3a2410" stroke-width="1.0"/>` +
      // バイザー (青く光る)
      `<rect x="11.5" y="8.5" width="9" height="3" fill="#08182a" stroke="#06101c" stroke-width="0.5"/>` +
      `<rect x="12" y="9" width="3.5" height="2" fill="#44ccff"/>` +
      `<rect x="16.5" y="9" width="3.5" height="2" fill="#44ccff"/>` +
      `<rect x="12.3" y="9.3" width="1.2" height="1.4" fill="#aaeeff"/>` +
      `<rect x="16.8" y="9.3" width="1.2" height="1.4" fill="#aaeeff"/>` +
      // 頭頂アンテナ
      `<line x1="16" y1="6" x2="16" y2="3" stroke="#3a2410" stroke-width="0.8"/>` +
      `<circle cx="16" cy="2.5" r="0.9" fill="#ff5544"/>` +
      // 胸部 ボイラー弁
      `<circle cx="16" cy="20" r="2.4" fill="#3a2410" stroke="#1a0a04" stroke-width="0.5"/>` +
      `<circle cx="16" cy="20" r="1.4" fill="#ffaa22"/>` +
      `<circle cx="16" cy="20" r="0.55" fill="#fff5d0"/>` +
      // 左腕 (太い肩 + フック)
      `<ellipse cx="6" cy="17" rx="2.4" ry="2.4" fill="#b88018" stroke="#3a2410" stroke-width="0.9"/>` +
      `<rect x="4" y="19" width="4" height="6" fill="#c89020" stroke="#3a2410" stroke-width="0.7"/>` +
      `<path d="M 4 25 Q 4 28, 7 28 Q 5 26.5, 6 25 Z" fill="#888892" stroke="#1a1a22" stroke-width="0.5"/>` +
      // 右腕 (グラブ砲身)
      `<ellipse cx="26" cy="17" rx="2.4" ry="2.4" fill="#b88018" stroke="#3a2410" stroke-width="0.9"/>` +
      `<rect x="24" y="19" width="4" height="6" fill="#c89020" stroke="#3a2410" stroke-width="0.7"/>` +
      `<rect x="24.5" y="24" width="3" height="2" fill="#3a2410"/>` +
      `<circle cx="26" cy="25" r="0.55" fill="#ffcc44"/>` +
    `</svg>`
  );
}

// レイジ・オーガ: 赤い鬼。通常時は青眉/牙、怒り状態 (e.rage) で目が赤く光り炎が漂う
function ogreSvg(raging) {
  const skin       = raging ? "#dd3322" : "#a04434";
  const skinShade  = raging ? "#7a1c10" : "#5a2418";
  const eyeColor   = raging ? "#ffee44" : "#ffffff";
  const eyePupil   = raging ? "#ff2200" : "#221111";
  const browColor  = raging ? "#ffaa22" : "#3a1810";
  const auraGroup  = raging
    ? `<g class="ogre-aura">` +
        `<path d="M 6 6 Q 5 1, 9 4 Q 8 0, 12 3" fill="#ff8844" opacity="0.85"/>` +
        `<path d="M 26 6 Q 27 1, 23 4 Q 24 0, 20 3" fill="#ff8844" opacity="0.85"/>` +
        `<path d="M 16 2 Q 14 -1, 16 4 Q 18 -1, 16 2 Z" fill="#ffcc44" opacity="0.9"/>` +
      `</g>`
    : "";
  return (
    `<svg class="char-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
      auraGroup +
      `<ellipse cx="16" cy="29" rx="10" ry="1.7" fill="rgba(0,0,0,0.4)"/>` +
      // 体 (どっしりした台形)
      `<path d="M 7 28 L 9 17 Q 16 13, 23 17 L 25 28 Z" fill="${skin}" stroke="${skinShade}" stroke-width="1.2"/>` +
      // 頭
      `<ellipse cx="16" cy="13" rx="7" ry="6" fill="${skin}" stroke="${skinShade}" stroke-width="1.2"/>` +
      // 角 (左右)
      `<polygon points="9.5,8 11,3 12.5,9" fill="#e8d090" stroke="#6a5530" stroke-width="0.6"/>` +
      `<polygon points="22.5,8 21,3 19.5,9" fill="#e8d090" stroke="#6a5530" stroke-width="0.6"/>` +
      // 眉 (怒り時は太く吊り上がる)
      `<path d="M 11 11 L 14 ${raging ? "10" : "11.5"}" stroke="${browColor}" stroke-width="${raging ? "1.6" : "1.0"}" stroke-linecap="round"/>` +
      `<path d="M 18 ${raging ? "10" : "11.5"} L 21 11" stroke="${browColor}" stroke-width="${raging ? "1.6" : "1.0"}" stroke-linecap="round"/>` +
      // 目
      `<ellipse cx="13" cy="13.5" rx="1.4" ry="1.7" fill="${eyeColor}"/>` +
      `<ellipse cx="19" cy="13.5" rx="1.4" ry="1.7" fill="${eyeColor}"/>` +
      `<circle cx="13" cy="13.8" r="0.7" fill="${eyePupil}"/>` +
      `<circle cx="19" cy="13.8" r="0.7" fill="${eyePupil}"/>` +
      // 口 (怒り時は牙剥き)
      (raging
        ? `<path d="M 12 16.5 L 14 18 L 16 17 L 18 18 L 20 16.5" stroke="${skinShade}" stroke-width="0.9" fill="none"/>` +
          `<polygon points="13.5,17 14,19 14.5,17" fill="#ffffff"/>` +
          `<polygon points="17.5,17 18,19 18.5,17" fill="#ffffff"/>`
        : `<path d="M 13 16.5 Q 16 17.5, 19 16.5" stroke="${skinShade}" stroke-width="0.7" fill="none"/>`
      ) +
      // 胸の腕
      `<ellipse cx="8" cy="22" rx="2.3" ry="3.2" fill="${skin}" stroke="${skinShade}" stroke-width="0.9"/>` +
      `<ellipse cx="24" cy="22" rx="2.3" ry="3.2" fill="${skin}" stroke="${skinShade}" stroke-width="0.9"/>` +
    `</svg>`
  );
}

// レイス: 紫の幽霊。ひらひら浮遊し、虚ろな目。3×3 の幻惑オーラ
function wraithSvg() {
  return (
    `<svg class="char-svg wraith-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="16" cy="29" rx="7" ry="1.2" fill="rgba(80,40,140,0.35)"/>` +
      // オーラ
      `<circle cx="16" cy="16" r="14" fill="#bb88ff" opacity="0.10"/>` +
      `<circle cx="16" cy="16" r="10" fill="#bb88ff" opacity="0.15"/>` +
      // ボディ (ひらひら裾)
      `<path d="M 6 12 Q 16 4, 26 12 L 26 24 Q 23 28, 20 24 Q 17 28, 14 24 Q 11 28, 8 24 Q 6 22, 6 18 Z" ` +
            `fill="#9b6fd0" stroke="#3a1a5a" stroke-width="0.9" opacity="0.92"/>` +
      // 内側ハイライト
      `<path d="M 9 13 Q 16 8, 23 13 L 22 19 Q 16 16, 10 19 Z" fill="#c9a8f4" opacity="0.5"/>` +
      // 虚ろな目
      `<ellipse cx="12.5" cy="14" rx="1.6" ry="2.2" fill="#1a0a2a"/>` +
      `<ellipse cx="19.5" cy="14" rx="1.6" ry="2.2" fill="#1a0a2a"/>` +
      `<circle cx="12.5" cy="14" r="0.6" fill="#ff66ff"/>` +
      `<circle cx="19.5" cy="14" r="0.6" fill="#ff66ff"/>` +
      // 口
      `<ellipse cx="16" cy="19" rx="1.6" ry="1.0" fill="#1a0a2a"/>` +
    `</svg>`
  );
}

// ファントムレイス: 黒紫の上位種。二重輪郭・赤い目。5×5 の広域幻惑オーラ
function phantomWraithSvg() {
  return (
    `<svg class="char-svg phantom-wraith-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="16" cy="29" rx="8" ry="1.4" fill="rgba(60,10,90,0.45)"/>` +
      // 広範囲オーラ (二層)
      `<circle cx="16" cy="16" r="15" fill="#dd66ff" opacity="0.10"/>` +
      `<circle cx="16" cy="16" r="11" fill="#dd66ff" opacity="0.16"/>` +
      `<circle cx="16" cy="16" r="7"  fill="#dd66ff" opacity="0.22"/>` +
      // 外殻 (ぼろぼろの黒紫ローブ)
      `<path d="M 4 11 Q 16 2, 28 11 L 28 26 Q 25 30, 22 26 Q 19 30, 16 26 Q 13 30, 10 26 Q 7 30, 4 26 Z" ` +
            `fill="#3a1050" stroke="#100020" stroke-width="1.1" opacity="0.95"/>` +
      // 内側 (薄い紫)
      `<path d="M 8 13 Q 16 7, 24 13 L 24 22 Q 16 18, 8 22 Z" fill="#7a3aaa" opacity="0.7"/>` +
      // 赤い目 (光る)
      `<ellipse cx="12" cy="13" rx="2" ry="2.6" fill="#000"/>` +
      `<ellipse cx="20" cy="13" rx="2" ry="2.6" fill="#000"/>` +
      `<circle cx="12" cy="13.3" r="1.0" fill="#ff2244"/>` +
      `<circle cx="20" cy="13.3" r="1.0" fill="#ff2244"/>` +
      `<circle cx="12" cy="13" r="0.4" fill="#ffeecc"/>` +
      `<circle cx="20" cy="13" r="0.4" fill="#ffeecc"/>` +
      // 牙の口
      `<path d="M 12 19 L 14 22 L 16 19 L 18 22 L 20 19" stroke="#100020" stroke-width="1.1" fill="#1a0a2a"/>` +
    `</svg>`
  );
}

// 盾の騎士: 中央に金属ヘルム + 赤い羽根、左に大盾、右に槍。
// Pantheon イメージ。3×3 内のプレイヤーを庇い、被ダメを 5 にキャップ。
function knightSvg() {
  return (
    `<svg class="char-svg knight-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
      // 影
      `<ellipse cx="16" cy="29" rx="9" ry="1.6" fill="rgba(0,0,0,0.4)"/>` +
      // 赤いケープ
      `<path d="M 8 10 Q 4 16, 6 25 L 26 25 Q 28 16, 24 10 L 22 12 Q 16 14, 10 12 Z" ` +
            `fill="#cc2233" stroke="#7a1422" stroke-width="0.4"/>` +
      // 鎧 (胴)
      `<rect x="11" y="14" width="10" height="11" fill="#a0a3aa" stroke="#48484f" stroke-width="0.4" rx="1"/>` +
      `<path d="M 13 16 L 19 16 L 19 22 L 17 24 L 15 24 L 13 22 Z" fill="#c8b070" stroke="#6a5530" stroke-width="0.3"/>` +
      // 槍 (右側、斜めに長く)
      `<line x1="23" y1="5" x2="29" y2="27" stroke="#7a5a30" stroke-width="1.3" stroke-linecap="round"/>` +
      `<polygon points="22.5,5 25,3 24.2,7" fill="#e0e2e8" stroke="#48484f" stroke-width="0.3"/>` +
      // 大盾 (左側、円形)
      `<g>` +
        `<ellipse cx="7.5" cy="18" rx="5" ry="6.5" fill="#3a78c8" stroke="#c8b070" stroke-width="1"/>` +
        `<path d="M 7.5 13 L 9 18 L 7.5 23 L 6 18 Z" fill="#c8b070"/>` +
        `<circle cx="7.5" cy="18" r="1.4" fill="#ffe488" stroke="#7a5a30" stroke-width="0.3"/>` +
      `</g>` +
      // ヘルム
      `<path d="M 11.5 6 Q 16 3, 20.5 6 L 20.5 12 Q 16 13.5, 11.5 12 Z" ` +
            `fill="#cccfd5" stroke="#5a5a65" stroke-width="0.4"/>` +
      // フェイスガード (横スリット)
      `<rect x="12.5" y="8.5" width="7" height="1.2" fill="#1a1a22"/>` +
      // 赤い羽根 (横向きのプルーム)
      `<path d="M 16 3 Q 21 0, 24 1.5 Q 22 4, 17 5 Z" ` +
            `fill="#ee3344" stroke="#aa1122" stroke-width="0.3"/>` +
    `</svg>`
  );
}

// 隠蔽状態の敵 (誰だか分からない)
function hiddenEnemySvg() {
  return (
    `<svg class="char-svg hidden-enemy-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="16" cy="29" rx="8" ry="1.4" fill="rgba(60,40,90,0.4)"/>` +
      // モヤモヤしたシルエット
      `<path d="M 7 13 Q 16 6, 25 13 L 25 25 Q 22 28, 19 25 Q 16 28, 13 25 Q 10 28, 7 25 Z" ` +
            `fill="#5a4a6a" stroke="#2a1f38" stroke-width="0.8" opacity="0.85"/>` +
      // ?
      `<text x="16" y="22" text-anchor="middle" font-size="16" font-weight="bold" ` +
            `fill="#ddccff" stroke="#1a0a2a" stroke-width="0.4" font-family="ui-monospace,monospace">?</text>` +
    `</svg>`
  );
}

// dispatcher: 敵タイプに応じた SVG を返す
function enemySvg(e) {
  if (e.type === "thorn")  return turtleSvg();
  if (e.type === "gianturtle") return giantTurtleSvg();
  if (e.type === "tree")   return treeSvg();
  if (e.type === "archer") return archerSvg();
  if (e.type === "crankblitz") return crankBlitzSvg();
  if (e.type === "ogre")   return ogreSvg(!!e.rage);
  if (e.type === "wraith")        return wraithSvg();
  if (e.type === "phantomwraith") return phantomWraithSvg();
  if (e.type === "knight") return knightSvg();
  if (e.type === "samurai") return samuraiSvg(!!e.parryActive);
  return slimeSvg(e.type, e.isBoss);
}

// ===== マスター・サムライ SVG =====
// 着流し + 髷 + 刀。parry 中は刀を真横に構えて防御ポーズ。
function samuraiSvg(parrying) {
  return (
    `<svg class="char-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
      // 着物の裾 (袴)
      `<path d="M 7 22 L 9 30 L 23 30 L 25 22 Z" fill="#3a2a3a" stroke="#1a0a1a" stroke-width="0.5"/>` +
      // 上半身 (着物)
      `<path d="M 8 14 L 24 14 L 25 22 L 7 22 Z" fill="#5a2a3a" stroke="#1a0a1a" stroke-width="0.5"/>` +
      // 着物のV襟
      `<path d="M 14 14 L 16 17 L 18 14 L 16 16 Z" fill="#f0e6d6"/>` +
      // 帯
      `<rect x="7" y="20" width="18" height="2" fill="#dcb840" stroke="#1a0a1a" stroke-width="0.4"/>` +
      // 顔
      `<circle cx="16" cy="10" r="4.5" fill="#ffd4b0" stroke="#1a0a1a" stroke-width="0.5"/>` +
      // 目つき (鋭い)
      `<path d="M 13.5 10 L 14.8 10" stroke="#1a0a1a" stroke-width="0.8" stroke-linecap="round"/>` +
      `<path d="M 17.2 10 L 18.5 10" stroke="#1a0a1a" stroke-width="0.8" stroke-linecap="round"/>` +
      // 髷 (頭頂のちょんまげ)
      `<rect x="14.5" y="4" width="3" height="3" fill="#1a0a14"/>` +
      // 髪
      `<path d="M 11.5 8 Q 11 5, 16 5 Q 21 5, 20.5 8 L 19.5 9 Q 18 7, 16 7 Q 14 7, 12.5 9 Z" fill="#1a0a14"/>` +
      // 刀 (parry 中は横、通常は背中に差した立て構え)
      (parrying
        ? `<rect x="2" y="14.4" width="28" height="1.2" fill="#dadfe6" stroke="#1a0a14" stroke-width="0.3"/>` +
          `<rect x="13" y="13.7" width="6" height="2.6" fill="#7a3a4a" stroke="#1a0a14" stroke-width="0.3"/>`
        : `<rect x="24.4" y="6" width="1.2" height="20" fill="#dadfe6" stroke="#1a0a14" stroke-width="0.3" transform="rotate(15 25 16)"/>` +
          `<rect x="23.8" y="22" width="2.4" height="3.5" fill="#7a3a4a" stroke="#1a0a14" stroke-width="0.3" transform="rotate(15 25 23)"/>`) +
    `</svg>`
  );
}

// ===== 赤ちゃん SVG (小さい頭でっかちの幼児) =====
function babySvg() {
  return (
    `<svg class="char-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
    `<g class="baby-body">` +
      // 頭
      `<circle cx="16" cy="13" r="7.5" fill="#ffe0c0" stroke="#5a3a20" stroke-width="0.8"/>` +
      // ほっぺ
      `<circle cx="10.5" cy="15" r="1.7" fill="#ffb0b8" opacity="0.85"/>` +
      `<circle cx="21.5" cy="15" r="1.7" fill="#ffb0b8" opacity="0.85"/>` +
      // 目
      `<circle cx="13" cy="12.5" r="0.9" fill="#1a1a1a"/>` +
      `<circle cx="19" cy="12.5" r="0.9" fill="#1a1a1a"/>` +
      // 口
      `<path d="M 14.5 16.5 Q 16 17.5, 17.5 16.5" stroke="#aa5566" stroke-width="0.9" fill="none" stroke-linecap="round"/>` +
      // 胴
      `<rect x="11" y="20" width="10" height="9" rx="3" fill="#ffc8d4" stroke="#5a3a20" stroke-width="0.8"/>` +
      // よだれかけのリボン
      `<path d="M 12 21 L 16 23 L 20 21" stroke="#cc4477" stroke-width="0.7" fill="none"/>` +
    `</g></svg>`
  );
}

// ===== NPC: 瀕死の騎士 SVG =====
// 構図: 跪いて剣を地面に立てて支えにし、左に大盾、頭を垂れた騎士。
// 兜のバイザー / 赤い羽根 / 鎧の十字紋 / 大盾の赤十字でひと目で「騎士」と分かるよう
// シルエットを正面寄り垂直に取り、足元に血だまりで「瀕死」を表現。
function dyingKnightSvg() {
  return (
    `<svg class="char-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
      // 血だまり
      `<ellipse cx="16" cy="29" rx="10" ry="2.2" fill="#7a1f30" opacity="0.75"/>` +
      // 剣 (右側、地面に突き刺さって支柱化)
      `<rect x="22.1" y="9"   width="1.4" height="20" fill="#dadfe6" stroke="#2a1810" stroke-width="0.4"/>` +
      // クロスガード (鍔)
      `<rect x="19.2" y="10.6" width="6.4" height="1.4" rx="0.3" fill="#cc9a3a" stroke="#2a1810" stroke-width="0.35"/>` +
      // グリップ (柄)
      `<rect x="22.2" y="6.6"  width="1.4" height="4" fill="#4a2d12"/>` +
      // ポメル (柄頭)
      `<circle cx="22.9" cy="6.3" r="1.2" fill="#e5b840" stroke="#2a1810" stroke-width="0.35"/>` +
      // 体 (鎧の胴、やや右に傾いて剣に体重を預ける)
      `<path d="M 8 17 L 21 17 L 22 27 L 9 27 Z" fill="#a8aeb8" stroke="#2a1810" stroke-width="0.6"/>` +
      // 胴の縁ライン (鎧感)
      `<path d="M 8 17 L 21 17" stroke="#5a606a" stroke-width="0.5"/>` +
      `<path d="M 9 21 L 22 21" stroke="#5a606a" stroke-width="0.4" opacity="0.7"/>` +
      // 紋章 (赤十字)
      `<path d="M 15.5 19 L 15.5 25.5 M 13.5 22 L 17.5 22" stroke="#c8334a" stroke-width="1.0"/>` +
      // 肩当て
      `<ellipse cx="8.5"  cy="17" rx="2.4" ry="1.6" fill="#7c828c" stroke="#2a1810" stroke-width="0.5"/>` +
      `<ellipse cx="21.5" cy="17" rx="2.4" ry="1.6" fill="#7c828c" stroke="#2a1810" stroke-width="0.5"/>` +
      // 剣を握る右腕
      `<path d="M 20.5 17.5 L 22.6 11.5" stroke="#9aa0aa" stroke-width="2.2" stroke-linecap="round"/>` +
      // 兜 (頭、やや下向きに俯いた感じ)
      `<path d="M 11 9.5 Q 11 4, 16 4 Q 21 4, 21 9.5 L 21 16 L 11 16 Z" fill="#c8ced8" stroke="#2a1810" stroke-width="0.6"/>` +
      // バイザー (横スリット)
      `<rect x="12" y="10.5" width="8" height="0.9" fill="#1a1a20"/>` +
      `<rect x="12" y="12.8" width="8" height="0.9" fill="#1a1a20"/>` +
      // ノーズガード (中央の縦帯)
      `<rect x="15.5" y="10.5" width="1" height="5" fill="#8a909a" stroke="#2a1810" stroke-width="0.3"/>` +
      // 羽根 (赤、しおれた感じで左斜め上)
      `<path d="M 16 4 Q 12 -0.5, 7 1.5 L 10.5 3 L 12 4.2 Z" fill="#c8334a" stroke="#2a1010" stroke-width="0.4"/>` +
      `<path d="M 10 2.4 Q 9 1.5, 8 2" stroke="#7a1828" stroke-width="0.4" fill="none"/>` +
      // 大盾 (左、地に立てる)
      `<path d="M 1 16.5 L 7 16.5 L 7 24.5 Q 7 27.5, 4 28.5 Q 1 27.5, 1 24.5 Z" fill="#cc9a3a" stroke="#2a1810" stroke-width="0.6"/>` +
      // 盾の赤十字
      `<path d="M 4 18.5 L 4 26.5 M 1.5 22 L 6.5 22" stroke="#c8334a" stroke-width="0.9"/>` +
      // 盾の縁の鋲 (装飾)
      `<circle cx="4" cy="17.5" r="0.4" fill="#4a2d12"/>` +
      `<circle cx="2"   cy="22" r="0.35" fill="#4a2d12"/>` +
      `<circle cx="6"   cy="22" r="0.35" fill="#4a2d12"/>` +
    `</svg>`
  );
}

// ===== NPC: 母 SVG (立ち姿、優しい笑顔) =====
function motherSvg() {
  return (
    `<svg class="char-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">` +
      // 髪 (長め)
      `<path d="M 8 11 Q 8 4, 16 4 Q 24 4, 24 11 L 24 22 Q 23 24, 21 24 L 11 24 Q 9 24, 8 22 Z" fill="#5a3a2a"/>` +
      // 顔
      `<circle cx="16" cy="11" r="5.5" fill="#ffe0c0" stroke="#3a2a10" stroke-width="0.7"/>` +
      // 前髪
      `<path d="M 11 8 Q 16 5, 21 8 L 20 10 L 16 8.5 L 12 10 Z" fill="#5a3a2a"/>` +
      // 目
      `<circle cx="14" cy="11" r="0.8" fill="#1a1a1a"/>` +
      `<circle cx="18" cy="11" r="0.8" fill="#1a1a1a"/>` +
      // 口 (優しい笑顔)
      `<path d="M 14.5 13.5 Q 16 14.6, 17.5 13.5" stroke="#aa5566" stroke-width="0.8" fill="none" stroke-linecap="round"/>` +
      // 服 (ドレス)
      `<path d="M 10 17 L 8 30 L 24 30 L 22 17 Z" fill="#bb88aa" stroke="#3a2a10" stroke-width="0.7"/>` +
      // エプロン
      `<rect x="13" y="18" width="6" height="9" fill="#f0e6d6" opacity="0.85"/>` +
    `</svg>`
  );
}

// ========================================================================
// 赤ちゃん配置 / フォロー / swap
// ========================================================================
function isCellFreeForBaby(x, y, ignoreBaby) {
  if (!inBounds(x, y)) return false;
  if (walls.has(`${x},${y}`)) return false;
  if (pits.has(`${x},${y}`)) return false;
  if (goal.x === x && goal.y === y) return false;
  if (player.x === x && player.y === y) return false;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    if (e.x === x && e.y === y) return false;
  }
  for (const n of npcs) {
    if (n.x === x && n.y === y) return false;
  }
  if (!ignoreBaby && baby && baby.x === x && baby.y === y) return false;
  return true;
}

// プレイヤーの近くに赤ちゃんを置く (フロア遷移時 / スポーン時)
// 4方向 → 斜め → ランダム空きセルの順で空きを探す
function placeBabyNearPlayer() {
  if (!baby) return;
  const ring4 = [[1,0],[-1,0],[0,1],[0,-1]];
  const ring8 = [[1,1],[-1,1],[1,-1],[-1,-1]];
  for (const [dx, dy] of ring4) {
    const x = player.x + dx, y = player.y + dy;
    if (isCellFreeForBaby(x, y, true)) { baby.x = x; baby.y = y; return; }
  }
  for (const [dx, dy] of ring8) {
    const x = player.x + dx, y = player.y + dy;
    if (isCellFreeForBaby(x, y, true)) { baby.x = x; baby.y = y; return; }
  }
  // フォールバック: 全マップ走査
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (isCellFreeForBaby(x, y, true)) { baby.x = x; baby.y = y; return; }
    }
  }
}

// プレイヤーの旧位置に追従。塞がってたら待機。
function doBabyFollow(oldPlayerX, oldPlayerY) {
  if (!baby) return;
  // 母に渡した後は追従しない (母の隣で固定)
  if (babyWithMother) return;
  // すでにプレイヤー隣接なら動かない (チラつき抑制)
  const adj = Math.abs(baby.x - player.x) + Math.abs(baby.y - player.y);
  if (adj <= 1) return;
  if (isCellFreeForBaby(oldPlayerX, oldPlayerY, true)) {
    // 赤ちゃんの向きをプレイヤー側に
    baby.facing = { dx: Math.sign(player.x - baby.x), dy: Math.sign(player.y - baby.y) };
    baby.x = oldPlayerX;
    baby.y = oldPlayerY;
  }
}

function npcAt(x, y) {
  return npcs.find((n) => n.x === x && n.y === y);
}

// ========================================================================
// NPC ダイアログ
// ========================================================================
function startNpcDialog(npc) {
  if (activeDialog) return;
  let lines, onComplete;
  if (npc.type === "knight") {
    // 騎士イベント: ① 会話 ② 赤ちゃん登場 ③ 加護演出 ④ 続く会話 → 絶命 (屍化)
    const spawnBaby = () => {
      babyAcquired = true;
      baby = {
        x: npc.x, y: npc.y,
        hp: 10, hpMax: 10, baseHpMax: 10,
        board: [newItem("pedal", "knightsblessing"), null, null],
        facing: { dx: 0, dy: 1 },
        lastBubbleTurn: -99,
      };
      placeBabyAtNpc(npc);
      recomputeBabyHpMax();
      renderAll();
      dialogReveal(1300);
      log("👶 騎士の腕の中から、小さな赤ちゃんが姿を見せた", "win");
    };
    const bestowBlessing = () => {
      playBlessingEffect();
      dialogReveal(1700);
      log("✟ 加護の光が赤ちゃんを包み込んだ", "win");
    };
    lines = [
      "騎士「ぐっ……来てくれたのか……」",
      "騎士「私はもう、長くない。だが――」",
      { text: "騎士「この子だけは、どうか頼む……」", onShow: spawnBaby },
      { text: "騎士「我が騎士の誇りに懸けて、最期の力を――」", onShow: bestowBlessing },
      "騎士「加護を、授ける」",
      "騎士「これで……この子は守られる」",
      "騎士「ありがとう……すまな……」",
    ];
    onComplete = () => {
      // 騎士は絶命 → 屍として戦場に残す (タイルは塞がるが攻撃対象にはならない)
      npc.dead = true;
      npc.completed = true;
      // 赤ちゃんは騎士から離れてプレイヤーの隣へ移動 (追従モードに)
      if (baby) placeBabyNearPlayer();
      babySaySpeech();
      log("🛡 騎士は静かに息を引き取った……", "lose");
      renderAll();
      // 取得イベントの通知ダイアログ
      showSystemDialog(
        "👶 赤ちゃんを託された",
        `<p>瀕死の騎士から、小さな赤ちゃんを託された。</p>` +
        `<p>胸には <b style="color:#ffd866">✟ 騎士の最期の加護</b> が刻まれている。<br>` +
        `<span style="color:#b8e8a0">→ 敵の物理攻撃で受けるダメージが <b>必ず 1</b> に変換される。</span></p>` +
        `<div style="margin-top:10px;padding:10px 12px;background:rgba(126,217,87,0.08);border-left:3px solid #7ed957;border-radius:4px">` +
          `<b style="color:#7ed957">🎛 BABY ボードが追加された</b><br>` +
          `<span style="font-size:12px;line-height:1.55">` +
            `画面下のペダルボードに <b>[BABY]</b> 行が増えている。<br>` +
            `空き 2 枠にペダルをドラッグ&ドロップで装着できる。<br>` +
            `<span style="color:#aaa;font-size:11px">取り外しはピット (P) でのみ</span>` +
          `</span>` +
        `</div>` +
        `<p style="margin-top:10px;color:#cfcfcf;font-size:12px">10F でその子の母を探し当てれば、奥への扉が開く。</p>`
      );
    };
  } else if (npc.type === "mother") {
    lines = [
      "母「……ああ! その子は……うちの子!」",
      "母「無事に……無事に連れてきてくれたのね」",
      "母「ありがとう……本当にありがとう」",
      "母「お礼に、奥への扉の鍵を渡すわ。気をつけて」",
    ];
    onComplete = () => {
      motherKey = true;
      npc.completed = true;
      log("🗝 母から 11F 以降の鍵を受け取った! ゴール (G) で次の階層へ", "win");
      // 赤ちゃんを母の隣に渡す: 以後は無敵 + 喜び続け、プレイヤーには追従しない。
      // 装着していたペダル (HP/防御系) は赤ちゃんと共に母に渡る = インベントリに戻らず喪失。
      if (baby) {
        babyWithMother = true;
        baby.hp = baby.hpMax;
        baby.board = [null, null, null];
        placeBabyAtNpc(npc);
      }
      startJoyTimer();
      renderAll();
    };
  } else {
    return;
  }
  activeDialog = { npcType: npc.type, lines, idx: 0, onComplete };
  renderNpcDialog();
  fireLineOnShow();
}

// ===== 演出ヘルパー =====
// 加護の光を画面中央にフラッシュ。ダイアログ上 (z-index 3500) に出るので会話越しでも見える。
function playBlessingEffect() {
  document.getElementById("blessing-overlay")?.remove();
  const ov = document.createElement("div");
  ov.id = "blessing-overlay";
  ov.className = "blessing-overlay";
  ov.innerHTML =
    `<div class="ring"></div>` +
    `<div class="ring delay"></div>` +
    `<div class="sparkle"></div>` +
    `<div class="cross">✟</div>`;
  document.body.appendChild(ov);
  setTimeout(() => ov.remove(), 1750);
}

// NPC ダイアログを一時的に半透明にしてマップ演出を見せる
function dialogReveal(durationMs) {
  const backdrop = document.getElementById("npc-dialog-backdrop");
  const dialog   = document.getElementById("npc-dialog");
  if (backdrop) backdrop.classList.add("reveal");
  if (dialog)   dialog.classList.add("reveal");
  setTimeout(() => {
    if (backdrop) backdrop.classList.remove("reveal");
    if (dialog)   dialog.classList.remove("reveal");
  }, durationMs);
}

// ダイアログ各行を { text, onShow? } 形式に揃えるためのアクセサ
function dialogLineText(line) {
  return typeof line === "string" ? line : (line && line.text) || "";
}
function dialogLineCount(lines) {
  return Array.isArray(lines) ? lines.length : 0;
}
function fireLineOnShow() {
  if (!activeDialog) return;
  const line = activeDialog.lines[activeDialog.idx];
  if (line && typeof line === "object" && typeof line.onShow === "function") {
    try { line.onShow(); } catch (e) { console.error(e); }
  }
}

// 確認ダイアログ (LineSelector 取り外しなど、不可逆操作で使う)。
// onConfirm が呼ばれるのはユーザーが confirm ボタンを押した時のみ。
// バックドロップ・キャンセルボタン・Esc は全てキャンセル扱い。
function showConfirmDialog({ title, bodyHtml, confirmLabel="OK", cancelLabel="キャンセル", danger=false, onConfirm }) {
  document.getElementById("system-dialog")?.remove();
  document.getElementById("system-dialog-backdrop")?.remove();
  const close = () => {
    document.getElementById("system-dialog")?.remove();
    document.getElementById("system-dialog-backdrop")?.remove();
  };
  const backdrop = document.createElement("div");
  backdrop.id = "system-dialog-backdrop";
  backdrop.addEventListener("click", close);
  document.body.appendChild(backdrop);
  const el = document.createElement("div");
  el.id = "system-dialog";
  if (danger) {
    el.style.borderColor = "#ff5544";
    el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.85), 0 0 30px rgba(255,85,68,0.3)";
  }
  const titleColor = danger ? "#ff5544" : "#7ed957";
  const confirmBg = danger ? "rgba(255,85,68,0.18)"  : "rgba(126,217,87,0.18)";
  const confirmBd = danger ? "#ff5544" : "#7ed957";
  const confirmCol= danger ? "#ffaa99" : "#b8e8a0";
  el.innerHTML =
    `<div class="sys-title" style="color:${titleColor};border-bottom-color:#3a2a2a">${title}</div>` +
    `<div class="sys-body">${bodyHtml}</div>` +
    `<div style="display:flex;gap:8px;margin-top:14px">` +
      `<button type="button" class="sys-confirm" style="flex:1;padding:8px;background:${confirmBg};color:${confirmCol};border:1px solid ${confirmBd};border-radius:6px;font-family:inherit;font-size:13px;cursor:pointer;letter-spacing:1px">${confirmLabel}</button>` +
      `<button type="button" class="sys-cancel" style="flex:1;padding:8px;background:rgba(150,150,150,0.1);color:#bbb;border:1px solid #555;border-radius:6px;font-family:inherit;font-size:13px;cursor:pointer">${cancelLabel}</button>` +
    `</div>`;
  el.addEventListener("click", (e) => e.stopPropagation());
  el.querySelector(".sys-confirm").addEventListener("click", () => {
    close();
    if (typeof onConfirm === "function") onConfirm();
  });
  el.querySelector(".sys-cancel").addEventListener("click", close);
  document.body.appendChild(el);
}

// 取得イベントなどを伝えるシステム通知ダイアログ (中央 + 暗転 + 緑枠)。
// NPC ダイアログとは別の見た目で、確認ボタン or バックドロップクリックで閉じる。
function showSystemDialog(titleHtml, bodyHtml) {
  // 既存があれば閉じる
  document.getElementById("system-dialog")?.remove();
  document.getElementById("system-dialog-backdrop")?.remove();
  const close = () => {
    document.getElementById("system-dialog")?.remove();
    document.getElementById("system-dialog-backdrop")?.remove();
  };
  const backdrop = document.createElement("div");
  backdrop.id = "system-dialog-backdrop";
  backdrop.addEventListener("click", close);
  document.body.appendChild(backdrop);
  const el = document.createElement("div");
  el.id = "system-dialog";
  el.innerHTML =
    `<div class="sys-title">${titleHtml}</div>` +
    `<div class="sys-body">${bodyHtml}</div>` +
    `<button type="button" class="sys-close">OK (Space / クリックで閉じる)</button>`;
  el.addEventListener("click", (e) => e.stopPropagation());
  el.querySelector(".sys-close").addEventListener("click", close);
  document.body.appendChild(el);
}

function advanceNpcDialog() {
  if (!activeDialog) return;
  activeDialog.idx++;
  if (activeDialog.idx >= dialogLineCount(activeDialog.lines)) {
    const cb = activeDialog.onComplete;
    activeDialog = null;
    document.getElementById("npc-dialog")?.remove();
    document.getElementById("npc-dialog-backdrop")?.remove();
    if (cb) cb();
    return;
  }
  renderNpcDialog();
  fireLineOnShow();
}

function renderNpcDialog() {
  if (!activeDialog) {
    document.getElementById("npc-dialog")?.remove();
    document.getElementById("npc-dialog-backdrop")?.remove();
    return;
  }
  // 暗転バックドロップ (クリックで台詞送り)
  let backdrop = document.getElementById("npc-dialog-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "npc-dialog-backdrop";
    backdrop.addEventListener("click", advanceNpcDialog);
    document.body.appendChild(backdrop);
  }
  let el = document.getElementById("npc-dialog");
  if (!el) {
    el = document.createElement("div");
    el.id = "npc-dialog";
    el.addEventListener("click", (e) => { e.stopPropagation(); advanceNpcDialog(); });
    document.body.appendChild(el);
  }
  const name = activeDialog.npcType === "knight" ? "瀕死の騎士"
             : activeDialog.npcType === "mother" ? "母"
             : "???";
  const total = dialogLineCount(activeDialog.lines);
  const text = dialogLineText(activeDialog.lines[activeDialog.idx]);
  el.innerHTML =
    `<div class="npc-name">${name}</div>` +
    `<div class="npc-line">${text}</div>` +
    `<div class="npc-hint">クリック / Space で次へ (${activeDialog.idx + 1}/${total})</div>`;
}

// プレイヤーが NPC に隣接したら自動で会話発火
function checkNpcAdjacency() {
  if (activeDialog) return;
  for (const n of npcs) {
    if (n.completed) continue;
    const d = Math.abs(n.x - player.x) + Math.abs(n.y - player.y);
    if (d === 1) {
      startNpcDialog(n);
      return;
    }
  }
}

// ========================================================================
// 赤ちゃんダメージ / 死亡
// ========================================================================
// 加護が刺さっていれば物理ダメは 1 にクランプ。
function hasBlessing() {
  if (!baby) return false;
  return baby.board.some((it) => it && it.id === "knightsblessing");
}

function damageBaby(rawDmg, source) {
  if (!baby) return;
  // 母に渡したあとは完全無敵 (まだ画面に居るが触れない聖域状態)
  if (babyWithMother) return;
  let dmg = rawDmg;
  if (source === "physical" && hasBlessing()) dmg = 1;
  baby.hp -= dmg;
  showFloatingDamage(baby.x, baby.y, dmg, "");
  spawnHurtFx(baby.x, baby.y);
  if (baby.hp <= 0) {
    baby.hp = 0;
    log("👶 赤ちゃんが力尽きた……", "lose");
    // 死亡台詞 → 短時間後に消滅 (renderMap が baby:null を見て自動でタイル戻す)
    showBabyBubble("あぅ・・・", "die");
    setTimeout(() => {
      baby = null;
      renderAll();
    }, 1400);
  } else {
    // 被弾時の即時バブル ("あうっ!" or "ぎゃっ")
    const cry = Math.random() < 0.5 ? "あうっ！" : "ぎゃっ";
    showBabyBubble(cry, "hurt");
  }
}

// ========================================================================
// 赤ちゃんの吹き出し (HP閾値ベース + 被弾時)
// ========================================================================
// クールダウン: 被弾以外は 3 ターン に 1 回まで
const BABY_BUBBLE_COOLDOWN_TURNS = 3;
function showBabyBubble(text, klass) {
  if (!baby) return;
  const t = tileAt(baby.x, baby.y);
  if (!t) return;
  // 既存バブルを除去 (重ねない)
  const old = document.getElementById("baby-speech-bubble-active");
  if (old) old.remove();
  const bubble = document.createElement("div");
  bubble.id = "baby-speech-bubble-active";
  bubble.className = "baby-speech-bubble" + (klass ? ` ${klass}` : "");
  bubble.textContent = text;
  document.body.appendChild(bubble);
  // 位置決め: タイル上端から少し上
  const rect = t.getBoundingClientRect();
  bubble.style.left = `${rect.left + window.scrollX - 4}px`;
  bubble.style.top  = `${rect.top + window.scrollY - 26}px`;
  const removeMs = klass === "die" ? 2400 : 1700;
  setTimeout(() => bubble.remove(), removeMs);
}

// HP 閾値に応じた台詞 (ランダム要素あり)
function babySaySpeech() {
  if (!baby) return;
  if (turn - baby.lastBubbleTurn < BABY_BUBBLE_COOLDOWN_TURNS) return;
  // 母に渡した後はターンベース発話は止める (喜び timer が担当)
  if (babyWithMother) return;
  const ratio = baby.hp / baby.hpMax;
  let text, klass = "";
  if (ratio >= 0.999) {
    text = "きゃっきゃっ";
  } else if (ratio >= 0.5) {
    text = Math.random() < 0.5 ? "ばぶばぶ" : "たいたい";
  } else if (ratio > 0.2) {
    text = "ぜぇ…ゼぇ…";
    klass = "weak";
  } else {
    text = "ひゅー…ひゅー…";
    klass = "dying";
  }
  baby.lastBubbleTurn = turn;
  showBabyBubble(text, klass);
}

// ===== 母のバブル / 喜びタイマー =====
function showMotherBubble(text) {
  const mom = npcs.find((n) => n.type === "mother");
  if (!mom) return;
  const t = tileAt(mom.x, mom.y);
  if (!t) return;
  const old = document.getElementById("mother-speech-bubble-active");
  if (old) old.remove();
  const bubble = document.createElement("div");
  bubble.id = "mother-speech-bubble-active";
  bubble.className = "mother-speech-bubble";
  bubble.textContent = text;
  document.body.appendChild(bubble);
  const rect = t.getBoundingClientRect();
  bubble.style.left = `${rect.left + window.scrollX - 4}px`;
  bubble.style.top  = `${rect.top + window.scrollY - 28}px`;
  setTimeout(() => bubble.remove(), 2400);
}

const BABY_JOY_LINES = [
  "きゃっきゃっきゃっきゃ",
  "あぱぱぱ！",
  "ばぶばぶー！",
  "きゃっきゃっ！",
  "うきゃー！",
];
const MOTHER_JOY_LINES = [
  "母「ああ……よかった……」",
  "母「うちの子……うちの子……」",
  "母「もう離さないわ」",
  "母「ありがとう……本当に」",
  "母「いい子いい子……」",
];

function startJoyTimer() {
  if (joyTimerId != null) return;
  let tick = 0;
  joyTimerId = setInterval(() => {
    if (!babyWithMother) { stopJoyTimer(); return; }
    if (gameOver || activeDialog) return; // ダイアログ表示中は被らない
    // 交互に: 偶数 tick = 赤ちゃん、奇数 = 母
    if (tick % 2 === 0) {
      const line = BABY_JOY_LINES[Math.floor(Math.random() * BABY_JOY_LINES.length)];
      showBabyBubble(line, "joy");
    } else {
      const line = MOTHER_JOY_LINES[Math.floor(Math.random() * MOTHER_JOY_LINES.length)];
      showMotherBubble(line);
    }
    tick++;
  }, 1400);
}

function stopJoyTimer() {
  if (joyTimerId != null) {
    clearInterval(joyTimerId);
    joyTimerId = null;
  }
  document.getElementById("baby-speech-bubble-active")?.remove();
  document.getElementById("mother-speech-bubble-active")?.remove();
}

// 母 NPC の隣に赤ちゃんを再配置 (渡した瞬間に呼ぶ)。
function placeBabyAtNpc(npc) {
  if (!baby) return;
  const ring4 = [[1,0],[-1,0],[0,1],[0,-1]];
  const ring8 = [[1,1],[-1,1],[1,-1],[-1,-1]];
  for (const [dx, dy] of [...ring4, ...ring8]) {
    const x = npc.x + dx, y = npc.y + dy;
    if (isCellFreeForBaby(x, y, true)) { baby.x = x; baby.y = y; baby.facing = { dx: -dx, dy: -dy }; return; }
  }
  // フォールバック: そのまま
}

// ========================================================================
// 描画
// ========================================================================
function renderMap() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = tileAt(x, y);
      const key = `${x},${y}`;
      t.style.color = "";
      t.style.textShadow = "";
      t.style.boxShadow = "";
      t.style.removeProperty("--pedal-color");
      t._enemy = null; // 敵ループで再セット
      t._npc   = null;
      t._baby  = null;
      if (walls.has(key)) {
        t.className = "tile wall";
        t.textContent = "#";
      } else if (goal.x === x && goal.y === y) {
        t.className = "tile goal";
        t.textContent = "G";
      } else if (pits.has(key)) {
        t.className = "tile pit";
        t.textContent = "P";
      } else if (pickups.has(key)) {
        // 床落ちアイテム ({kind, id} オブジェクト)
        const entry = pickups.get(key);
        // 床落ち時は kind ごとに統一アイコン (拾うまで何かは分からない)
        const ui = UNKNOWN_ICON[entry.kind] || UNKNOWN_ICON.pedal;
        t.className = "tile floor pickup" + (entry.kind === "weapon" ? " pickup-weapon" : "");
        t.style.setProperty("--pedal-color", ui.color);
        t.innerHTML = `<div class="pickup-marker">${ui.icon}</div>`;
      } else {
        t.className = "tile floor";
        t.textContent = ".";
      }
    }
  }
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const t = tileAt(e.x, e.y);
    const hidden = isEnemyHiddenByWraith(e);
    const shieldActive = !hidden && e.abilities && e.abilities.includes("damage-taken-cap-5")
                         && Math.abs(e.x - player.x) <= 1 && Math.abs(e.y - player.y) <= 1;
    const parryActive = !hidden && e.parryUntilTurn != null && turn <= e.parryUntilTurn;
    t.className = "tile enemy enemy-" + (hidden ? "hidden" : e.type)
                  + (hidden ? " hidden-by-wraith" : "")
                  + (!hidden && e.isBoss ? " boss" : "")
                  + (!hidden && e.rage ? " rage" : "")
                  + (shieldActive ? " shield-active" : "")
                  + (parryActive ? " parry-stance" : "");
    t.innerHTML = hidden ? hiddenEnemySvg() : enemySvg(e);
    t._enemy = e;
    if (!hidden) {
      if (e.status.some((s) => s.type === "freeze")) {
        t.classList.add("frozen");
      }
      if (e.status.some((s) => s.type === "burn")) {
        t.style.boxShadow = "inset 0 0 8px rgba(255,80,30,0.55)";
      }
      if (e.status.some((s) => s.type === "shock")) {
        t.style.boxShadow = "inset 0 0 8px rgba(255,238,85,0.65)";
      }
      if (e.rage) {
        // 怒り中は赤くオーラ発光 + 内側にもグロー
        t.style.boxShadow = "inset 0 0 12px rgba(255,60,30,0.85), 0 0 14px rgba(255,80,40,0.7)";
      }
      // --- HP ミニバー ---
      const ratio = Math.max(0, e.hp / e.hpMax);
      const hpBar = document.createElement("div");
      hpBar.className = "tile-hp-bar";
      const hpFill = document.createElement("div");
      hpFill.className = "tile-hp-fill";
      if (ratio < 0.3)      hpFill.classList.add("bad");
      else if (ratio < 0.6) hpFill.classList.add("warn");
      hpFill.style.width = `${(ratio * 100).toFixed(1)}%`;
      hpBar.appendChild(hpFill);
      t.appendChild(hpBar);
      // --- 状態異常アイコン ---
      const icons = [];
      if (e.status.some((s) => s.type === "burn"))   icons.push("🔥");
      if (e.status.some((s) => s.type === "freeze")) icons.push("❄");
      if (e.status.some((s) => s.type === "shock"))  icons.push("⚡");
      if (icons.length > 0) {
        const sEl = document.createElement("div");
        sEl.className = "tile-status-icons";
        sEl.textContent = icons.join("");
        t.appendChild(sEl);
      }
    }
  }
  // NPC 描画 (敵より後、プレイヤーより前)
  for (const n of npcs) {
    const t = tileAt(n.x, n.y);
    if (!t) continue;
    if (n.type === "knight") {
      // dead フラグで屍化: オーラ無し、グレースケール
      t.className = n.dead ? "tile npc-knight-dead" : "tile npc-knight";
      t.innerHTML = dyingKnightSvg();
    } else if (n.type === "mother") {
      t.className = "tile npc-mother";
      t.innerHTML = motherSvg();
    }
    t._npc = n;
  }
  // 赤ちゃん描画 (敵 / NPC より後、プレイヤーより前)
  if (baby && baby.hp > 0) {
    const t = tileAt(baby.x, baby.y);
    if (t) {
      const bkey = `${baby.x},${baby.y}`;
      t.className = "tile baby";
      if (pits.has(bkey)) t.classList.add("on-pit-bg");
      if (goal.x === baby.x && goal.y === baby.y) t.classList.add("on-goal-bg");
      t.innerHTML = babySvg();
      t._baby = baby;
      // HP ミニバー (ピンク系、敵と同じ位置/スタイル)
      const ratio = Math.max(0, baby.hp / baby.hpMax);
      const bar = document.createElement("div");
      bar.className = "tile-hp-bar";
      const fill = document.createElement("div");
      fill.className = "tile-hp-fill tile-hp-fill-baby";
      if (ratio < 0.2)      fill.classList.add("bad");
      else if (ratio < 0.5) fill.classList.add("warn");
      fill.style.width = `${(ratio * 100).toFixed(1)}%`;
      bar.appendChild(fill);
      t.appendChild(bar);
    }
  }
  const pt = tileAt(player.x, player.y);
  pt.className = "tile player";
  // ピット/ゴール上なら背景を維持
  const pkey = `${player.x},${player.y}`;
  if (goal.x === player.x && goal.y === player.y) pt.classList.add("on-goal-bg");
  else if (pits.has(pkey)) pt.classList.add("on-pit-bg");
  // 人面樹に縛られていれば縛りマークを表示
  if (adjacentRootBinder(player.x, player.y)) pt.classList.add("root-bound");
  pt.innerHTML = playerSvg(player.facing);
  // --- 向き矢印 (上下左右いずれにも対応する追加 indicator) ---
  const fkey = `${player.facing.dx},${player.facing.dy}`;
  const arrow = document.createElement("div");
  arrow.className = "tile-facing " + (FACING_DIR[fkey] || "");
  arrow.textContent = FACING_ARROW[fkey] || "?";
  pt.appendChild(arrow);
  // --- プレイヤー HP ミニバー (敵と同じスタイル、色は緑系) ---
  {
    const ratio = Math.max(0, player.hp / player.hpMax);
    const pBar = document.createElement("div");
    pBar.className = "tile-hp-bar tile-hp-bar-player";
    const pFill = document.createElement("div");
    pFill.className = "tile-hp-fill tile-hp-fill-player";
    if (ratio < 0.3)      pFill.classList.add("bad");
    else if (ratio < 0.6) pFill.classList.add("warn");
    pFill.style.width = `${(ratio * 100).toFixed(1)}%`;
    pBar.appendChild(pFill);
    pt.appendChild(pBar);
  }

  // === 攻撃範囲プレビュー（pendingAttack 構え時のみ） ===
  if (!gameOver && pendingAttack && weapons[pendingAttack]) {
    const key = pendingAttack;
    const src = WEAPONS[weapons[key]];
    const atk = resolveChain(src, getSlotPedalIds(key));
    const cells = computeTargets(player.x, player.y, player.facing, atk.shape, atk.range);
    const elemClass = elementTargetClass(atk.element);
    for (const c of cells) {
      if (!inBounds(c.x, c.y) || walls.has(`${c.x},${c.y}`)) continue;
      const t = tileAt(c.x, c.y);
      if (!t) continue;
      t.classList.add("targeted");
      if (elemClass) t.classList.add(elemClass);
    }
  }
}

function inBounds(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

function elementTargetClass(element) {
  if (element === "fire") return "targeted-fire";
  if (element === "ice")  return "targeted-ice";
  if (element === "thunder") return "targeted-thunder";
  return null;
}

function renderHud() {
  const ratio = Math.max(0, player.hp / player.hpMax);
  let inner =
    `HP ${player.hp}/${player.hpMax}` +
    `<span class="hp-bar-wrap"><span class="hp-bar-fill" style="width:${(ratio * 100).toFixed(0)}%"></span></span>`;
  if (baby) {
    const br = Math.max(0, baby.hp / baby.hpMax);
    inner +=
      `<span style="margin-left:14px;color:#ff88bb">👶 ${baby.hp}/${baby.hpMax}</span>` +
      `<span class="hp-bar-wrap" style="width:60px"><span class="hp-bar-fill" style="width:${(br*100).toFixed(0)}%;background:#ff88bb"></span></span>`;
  }
  if (motherKey) inner += `<span style="margin-left:10px;color:#ffd866">🗝 鍵</span>`;
  hpEl.innerHTML = inner;
  const fkey = `${player.facing.dx},${player.facing.dy}`;
  faceEl.textContent = `向き: ${FACING_CHAR[fkey] ?? "?"}`;
  turnEl.textContent = `Turn: ${turn}`;
  floorEl.textContent = `${currentFloor.name} (${currentFloorIdx + 1}/${FLOORS.length})`;
  if (floorWarpEl.value !== String(currentFloorIdx)) {
    floorWarpEl.value = String(currentFloorIdx);
  }
}

// 赤ちゃんボードを Q/W/E の下に並べる用のレンダリング
function renderBabyBoard() {
  if (!baby) return;
  const row = document.createElement("div");
  row.className = "board-row row-b" + (activeBoard === "b" ? " active" : "");
  row.dataset.board = "b";

  const label = document.createElement("button");
  label.type = "button";
  label.className = "board-label";
  label.style.color = "#ff88bb";
  label.style.borderColor = "#ff88bb";
  label.innerHTML =
    `<div style="font-weight:bold;font-size:14px">[BABY]</div>` +
    `<div style="font-size:10px;opacity:0.9">HP ${baby.hp}/${baby.hpMax}</div>`;
  label.title = "赤ちゃんボード — passive (HP/防御) のみ装着可。加護はロック。";
  label.addEventListener("click", () => {
    activeBoard = "b";
    label.blur();
    renderAll();
  });
  row.appendChild(label);

  for (let i = 0; i < BABY_BOARD_SIZE; i++) {
    const slot = createBabySlot(i);
    row.appendChild(slot);
    if (i < BABY_BOARD_SIZE - 1) {
      const c = document.createElement("span");
      c.className = "connector";
      c.textContent = "→";
      row.appendChild(c);
    }
  }
  boardEl.appendChild(row);
}

// 赤ちゃんボードのスロットを作る (受理: passive かつ hook が maxHpBoost のみ)。
function createBabySlot(i) {
  const slot = document.createElement("div");
  const slotItem = baby.board[i];
  const pid = slotItem ? slotItem.id : null;
  const isLocked = !!(slotItem && PEDALS[pid] && PEDALS[pid].locked);
  slot.className = "slot " + (pid ? "filled" : "empty") + (isLocked ? " blessing-locked" : "");

  if (!isLocked) {
    slot.addEventListener("dragover", (e) => {
      const incoming = e.dataTransfer && e.dataTransfer.types.includes("text/plain");
      if (!incoming) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (pid == null) slot.classList.add("drop-target");
      else slot.classList.add("drop-reject");
    });
    slot.addEventListener("dragleave", () => {
      slot.classList.remove("drop-target", "drop-reject");
    });
    slot.addEventListener("drop", (e) => {
      e.preventDefault();
      slot.classList.remove("drop-target", "drop-reject");
      const uidStr = e.dataTransfer.getData("text/plain");
      const uid = parseInt(uidStr, 10);
      if (!isNaN(uid)) placePedalAtBabySlot(i, uid);
    });
    slot.addEventListener("click", () => removePedalFromBabySlot(i));
  }

  const num = document.createElement("span");
  num.className = "slot-num";
  num.textContent = String(i + 1);
  slot.appendChild(num);

  if (pid) {
    const p = PEDALS[pid];
    slot.style.borderColor = p.color;
    slot.style.boxShadow = `inset 0 0 0 1px ${p.color}33`;
    const icon = document.createElement("div");
    icon.className = "pedal-icon";
    icon.style.color = p.color;
    icon.textContent = p.icon;
    slot.appendChild(icon);
    const name = document.createElement("div");
    name.className = "pedal-name";
    name.textContent = p.name;
    slot.appendChild(name);
    const desc = document.createElement("div");
    desc.className = "pedal-desc";
    desc.innerHTML = renderDescWithRed(p.desc, p.red, p.red);
    slot.appendChild(desc);
    attachTooltip(slot, p, p.red, p.red);
  } else {
    const emptyLabel = document.createElement("div");
    emptyLabel.className = "slot-empty-label";
    emptyLabel.textContent = "(空き)";
    slot.appendChild(emptyLabel);
    slot.title = `赤ちゃんスロット${i+1}: HP/防御系 passive をドラッグで装着`;
  }
  return slot;
}

// 赤ちゃんボードへのペダル装着 (passive maxHpBoost のみ受理)
function placePedalAtBabySlot(slotIdx, uid) {
  if (!baby) return false;
  if (slotIdx < 0 || slotIdx >= BABY_BOARD_SIZE) return false;
  if (baby.board[slotIdx] != null) {
    log("そのスロットは埋まってる (外しはピットで)");
    return false;
  }
  const item = findInInventory(uid);
  if (!item || item.kind !== "pedal") return false;
  const p = PEDALS[item.id];
  // 赤ちゃん枠は passive で hook が maxHpBoost / onStep のものを受理
  // (HP 増強系 + Power Supply 系の回復)
  const okHook = p && p.kind === "passive" && (p.hook === "maxHpBoost" || p.hook === "onStep");
  if (!okHook) {
    log("👶 赤ちゃんには HP/防御 (Body 等) か回復 (Power Supply) のペダルしか装着できない", "lose");
    return false;
  }
  removeFromInventoryByUid(uid);
  baby.board[slotIdx] = item;
  log(`${p.name} を [BABY] スロット${slotIdx + 1} に装着`, "pickup");
  recomputeBabyHpMax();
  renderAll();
  return true;
}

function removePedalFromBabySlot(slotIdx) {
  if (!baby) return;
  if (!isOnPit()) {
    log("⚔ FIELD では編集不可。ピット (P) に戻って");
    return;
  }
  if (slotIdx < 0 || slotIdx >= BABY_BOARD_SIZE) return;
  const item = baby.board[slotIdx];
  if (!item) return;
  if (PEDALS[item.id] && PEDALS[item.id].locked) {
    log("✟ 加護は外せない", "lose");
    return;
  }
  if (inventory.length >= INV_MAX) {
    log(`インベントリ満杯 (${INV_MAX})、外せない`, "lose");
    return;
  }
  baby.board[slotIdx] = null;
  inventory.push(item);
  log(`👶 ${PEDALS[item.id].name} を取り外した`, "");
  recomputeBabyHpMax();
  renderAll();
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (const key of activeBoardKeys()) {
    const weaponId = weapons[key];
    const src = weaponId ? WEAPONS[weaponId] : null;
    // チェーン中間表現を計算 (Booster で各ペダルの赤字がどう変わるか)
    const items = src ? computeChainItems(src, getSlotPedalIds(key)) : [];
    const itemBySlot = {};
    let weaponItem = null;
    for (const it of items) {
      if (it.kind === "weapon") weaponItem = it;
      else if (it.slotIndex >= 0) itemBySlot[it.slotIndex] = it;
    }

    const row = document.createElement("div");
    row.className = "board-row row-" + key + (key === activeBoard ? " active" : "");
    row.dataset.board = key;

    // ラベル（クリックでアクティブ切替）
    const label = document.createElement("button");
    label.type = "button";
    label.className = "board-label";
    label.style.color = ATTACK_COLORS[key];
    label.style.borderColor = ATTACK_COLORS[key];
    if (!src) {
      label.innerHTML =
        `<div style="font-weight:bold;font-size:14px">[${key.toUpperCase()}]</div>` +
        `<div style="font-size:9px;opacity:0.5">(武器なし)</div>`;
      label.title = `[${key.toUpperCase()}] 武器スロット空。インベントリから装備可`;
    } else {
      // 通常表示は武器名だけ。詳細 (赤字/黒字・ダメ・形状・効果) はホバーでツールチップ。
      label.innerHTML =
        `<div style="font-weight:bold;font-size:14px">[${key.toUpperCase()}]</div>` +
        `<div style="font-size:10px;opacity:0.85">${src.name}</div>`;
      attachWeaponTooltip(label, src, weaponItem, getSlotPedalIds(key));
    }
    label.addEventListener("click", () => {
      activeBoard = key;
      label.blur();
      renderAll();
    });
    row.appendChild(label);

    // スロット + コネクタ
    for (let i = 0; i < BOARD_SIZE; i++) {
      const slot = createSlot(key, i, itemBySlot[i]);
      row.appendChild(slot);
      if (i < BOARD_SIZE - 1) {
        const c = document.createElement("span");
        c.className = "connector";
        c.textContent = "→";
        row.appendChild(c);
      }
    }

    boardEl.appendChild(row);
  }
  // 赤ちゃん取得済みなら 4 行目として赤ちゃんボードを描画。
  // ただし母に渡した後 (babyWithMother) はボード自体を消す。
  if (baby && !babyWithMother) renderBabyBoard();
  else if (babyWithMother && activeBoard === "b") {
    // 母に渡した瞬間にアクティブだった場合は Q に戻す
    activeBoard = "q";
  }
}

function createSlot(boardKey, i, item) {
  const slot = document.createElement("div");
  const slotItem = board[boardKey][i];
  const pid = slotItem ? slotItem.id : null;
  slot.className = "slot " + (pid ? "filled" : "empty");

  // === ドラッグ&ドロップ受け入れ === (drag data = uid 文字列)
  slot.addEventListener("dragover", (e) => {
    const incoming = e.dataTransfer && e.dataTransfer.types.includes("text/plain");
    if (!incoming) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (pid == null) slot.classList.add("drop-target");
    else slot.classList.add("drop-reject");
  });
  slot.addEventListener("dragleave", () => {
    slot.classList.remove("drop-target", "drop-reject");
  });
  slot.addEventListener("drop", (e) => {
    e.preventDefault();
    slot.classList.remove("drop-target", "drop-reject");
    const uidStr = e.dataTransfer.getData("text/plain");
    const uid = parseInt(uidStr, 10);
    if (!isNaN(uid)) placePedalAtSlot(boardKey, i, uid);
  });

  slot.addEventListener("click", () => removePedalFromSlot(boardKey, i));

  const num = document.createElement("span");
  num.className = "slot-num";
  num.textContent = String(i + 1);
  slot.appendChild(num);

  if (pid) {
    const p = PEDALS[pid];
    slot.style.borderColor = p.color;
    slot.style.boxShadow = `inset 0 0 0 1px ${p.color}33`;

    const effectiveRed = item ? item.red : p.red;
    const originalRed  = item ? item.originalRed : p.red;
    const boosted = effectiveRed !== originalRed;

    const icon = document.createElement("div");
    icon.className = "pedal-icon";
    icon.style.color = p.color;
    icon.textContent = p.icon;
    slot.appendChild(icon);
    const name = document.createElement("div");
    name.className = "pedal-name";
    name.textContent = p.name;
    slot.appendChild(name);

    // 説明文: {red} を実効赤字に置換し、ブースト時は <s>元値</s>新値
    const desc = document.createElement("div");
    desc.className = "pedal-desc";
    desc.innerHTML = renderDescWithRed(p.desc, originalRed, effectiveRed);
    slot.appendChild(desc);

    attachTooltip(slot, p, originalRed, effectiveRed);
  } else {
    const emptyLabel = document.createElement("div");
    emptyLabel.className = "slot-empty-label";
    emptyLabel.textContent = "(空き)";
    slot.appendChild(emptyLabel);
    slot.title = `[${boardKey.toUpperCase()}] スロット${i+1}: ペダルをドラッグで装着`;
  }
  return slot;
}

// 説明文の {red} を「赤字 span」に置換。ブースト時は元値を取り消し線で併記。
function renderDescWithRed(template, originalRed, effectiveRed) {
  const boosted = effectiveRed !== originalRed;
  const inner = boosted
    ? `<span class="red-orig">${originalRed}</span>${effectiveRed}`
    : `${originalRed}`;
  const cls = "red-val" + (boosted ? " boosted" : "");
  return template.replace(/\{red\}/g, `<span class="${cls}">${inner}</span>`);
}

function renderInventory() {
  const n = inventory.length;
  const cap = Number.isFinite(INV_MAX) ? INV_MAX : "∞";
  inventoryTitle.innerHTML =
    `📦 Inventory (${n}/${cap}) - ペダルは <span style="color:${ATTACK_COLORS[activeBoard]};font-weight:bold">[${activeBoard.toUpperCase()}]</span> ボードに<b style="color:#ffd866">ドラッグ&ドロップ</b>で装着 / クリックで詳細`;
  inventoryEl.innerHTML = "";
  if (n === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "color:#666; font-family:ui-monospace,monospace; font-size:11px; padding:8px;";
    empty.textContent = "(空。床のアイテムを拾うか、敵ドロップを狙え)";
    inventoryEl.appendChild(empty);
    return;
  }
  for (const item of inventory) {
    const def = itemDef(item);
    if (!def) continue;
    const isWeapon = item.kind === "weapon";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "inv-item";
    btn.dataset.uid = item.uid;
    btn.style.cssText = `
      width: 110px;
      padding: 6px 4px;
      background: ${isWeapon ? "#2c2820" : "#2c2c34"};
      border: 1px solid ${isWeapon ? "#aa8844" : "#555"};
      border-radius: 6px;
      color: #ddd;
      cursor: pointer;
      font-family: ui-monospace, monospace;
      text-align: center;
    `;
    const headerLabel = isWeapon
      ? `<div style="font-size:8px;color:#cc9944;letter-spacing:1px">WEAPON</div>`
      : `<div style="font-size:8px;color:#9988bb;letter-spacing:1px">PEDAL</div>`;
    // 武器: 説明はホバーで表示。タイル上はアイコン + 名前のみ (赤字は出さない)。
    // ペダル: 従来どおり desc も簡易表示し、詳細はホバー。
    const descHtml = isWeapon
      ? ""
      : renderDescWithRed(def.desc, def.red, def.red);
    btn.innerHTML = `
      ${headerLabel}
      <div style="font-size:22px;font-weight:bold;color:${def.color};">${def.icon}</div>
      <div style="font-size:11px;margin-top:2px;">${def.name}</div>
      ${descHtml ? `<div style="font-size:9px;color:#777;margin-top:2px;line-height:1.3">${descHtml}</div>` : ""}
    `;
    if (isWeapon) attachWeaponTooltip(btn, def, null, null);
    else attachTooltip(btn, def, def.red, def.red);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      showItemMenu(item, btn);
    });
    // ペダルのみドラッグ可能 (武器はメニューから装備)
    if (!isWeapon) {
      btn.draggable = true;
      btn.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/plain", String(item.uid));
        ev.dataTransfer.effectAllowed = "copy";
        btn.classList.add("dragging");
      });
      btn.addEventListener("dragend", () => btn.classList.remove("dragging"));
    }
    inventoryEl.appendChild(btn);
  }
}

function renderChainSummary() {
  const lines = [];
  for (const key of activeBoardKeys()) {
    const weaponId = weapons[key];
    if (!weaponId) {
      lines.push(
        `<span style="color:${ATTACK_COLORS[key]};font-weight:bold">[${key.toUpperCase()}]</span> ` +
        `<span style="color:#666;font-size:12px">武器未装備</span>`
      );
      continue;
    }
    const src = WEAPONS[weaponId];
    const atk = resolveChain(src, getSlotPedalIds(key));
    const parts = [];
    parts.push(`${atk.damage}ダメ`);
    parts.push(ELEMENT_LABEL[atk.element] || atk.element);
    parts.push(getShapeLabel(atk.shape, atk.range));
    if (atk.hits > 1) parts.push(`×${atk.hits}回`);
    if (atk.statusEffects.length > 0) {
      parts.push(
        atk.statusEffects
          .map((s) => {
            const ch = s.chance != null && s.chance < 1
              ? ` ${Math.round(s.chance * 100)}%`
              : "";
            return `${STATUS_LABEL[s.type] || s.type}${s.duration}T${ch}`;
          })
          .join("+")
      );
    }
    if (atk.phaserRequired) {
      parts.push(`${atk.phaserRequired}ヒットで凍結4T`);
    }
    lines.push(
      `<span style="color:${ATTACK_COLORS[key]};font-weight:bold">[${key.toUpperCase()}] ${src.name}</span> ` +
      `<span style="color:#cfcfcf;font-size:12px">→ ${parts.join(" / ")}</span>`
    );
  }
  summaryEl.innerHTML = lines.join("<br>");
}

function renderEnemyStatus() {
  enemyStatusEl.innerHTML = "";
  enemies.forEach((e, idx) => {
    const row = document.createElement("div");
    row.className = "enemy-row";
    if (e.hp <= 0) row.classList.add("dead");
    const hidden = e.hp > 0 && isEnemyHiddenByWraith(e);
    if (hidden) row.classList.add("hidden-row");

    const tag = document.createElement("span");
    tag.className = "e-tag";
    tag.style.width = "44px";
    if (hidden) {
      tag.innerHTML =
        `E${idx + 1}<span style="color:#aa88dd;margin-left:4px;font-size:11px">?</span>`;
      tag.title = "幻惑オーラに隠れていて正体不明";
    } else {
      const typeIcon = enemyTypeIcon(e);
      const typeColor = ENEMY_TYPE_COLOR[e.type] || "#888";
      tag.innerHTML =
        `E${idx + 1}<span style="color:${typeColor};margin-left:4px;font-size:11px">${typeIcon}</span>`;
      // HP バーの title 属性: 詳細は別途マップタイル hover の tooltip に出るので
      // ここでは敵名 + 能力 ID リスト (短縮) のみ
      const abilityNames = (e.abilities || [])
        .map((id) => (ENEMY_ABILITIES[id] ? ENEMY_ABILITIES[id].name : id))
        .join(" / ");
      tag.title = enemyDisplayName(e) + (abilityNames ? ` — ${abilityNames}` : "");
    }

    const barBg = document.createElement("div");
    barBg.className = "enemy-bar-bg";
    const barFill = document.createElement("div");
    barFill.className = "enemy-bar-fill";
    if (!hidden) {
      const ratio = Math.max(0, e.hp / e.hpMax);
      barFill.style.width = `${(ratio * 100).toFixed(1)}%`;
      if (e.status.some((s) => s.type === "freeze")) barFill.classList.add("frozen");
      else if (e.status.some((s) => s.type === "burn")) barFill.classList.add("burning");
    }
    barBg.appendChild(barFill);

    const hpText = document.createElement("span");
    hpText.className = "enemy-hp-text";
    hpText.textContent = hidden ? "?/?" : `${Math.max(0, e.hp)}/${e.hpMax}`;

    const icons = document.createElement("span");
    icons.className = "enemy-status-icons";
    if (hidden) {
      icons.textContent = "";
    } else {
      const list = [];
      if (e.status.some((s) => s.type === "burn"))   list.push("🔥");
      if (e.status.some((s) => s.type === "freeze")) list.push("❄");
      if (e.status.some((s) => s.type === "shock"))  list.push("⚡");
      icons.textContent = list.join("");
    }

    row.append(tag, barBg, hpText, icons);
    enemyStatusEl.appendChild(row);
  });
}

function renderArmIndicator() {
  if (pendingAttack && weapons[pendingAttack]) {
    const src = WEAPONS[weapons[pendingAttack]];
    armEl.classList.add("armed");
    armEl.innerHTML =
      `ARM: <span style="color:${ATTACK_COLORS[pendingAttack]};font-weight:bold">` +
      `[${pendingAttack.toUpperCase()}] ${src.name}` +
      `</span> <span style="opacity:0.75">もう一度で発射</span>`;
  } else {
    armEl.classList.remove("armed");
    armEl.innerHTML =
      `<span style="opacity:0.5">構え無し（Q/W/E で構え → もう一度で発射）</span>`;
  }
}

function renderStatusBanner() {
  if (isOnPit()) {
    statusBanner.className = "on-pit";
    statusBanner.innerHTML =
      "🔧 PIT — 取り外し可 (敵にも狙われる、急げ)" +
      "<span class='sub'>編集 → 即離脱の判断が肝</span>";
  } else {
    statusBanner.className = "off-pit";
    statusBanner.innerHTML =
      "⚔ FIELD — 装着のみ可、取り外しはピット (P) で" +
      "<span class='sub'>装着済みペダルはハンダ付け状態</span>";
  }
}

function renderAll() {
  renderMap();
  renderHud();
  renderBoard();
  renderInventory();
  renderChainSummary();
  renderEnemyStatus();
  renderArmIndicator();
  renderStatusBanner();
  renderTutorialBubbles();
  boardPanel.classList.toggle("locked", !isOnPit());
}

// ========================================================================
// 1F チュートリアル吹き出し
//   - enemy: 敵にマウスオーバーで詳細が見れることを教える
//   - pit:   ピット上ではペダルの付け外しができ、通過で消えることを教える
// ========================================================================
const tutorialDismissed = { enemy: false, pit: false, pedal: false, aim: false };
let pedalTutorialActive = false;
let aimTutorialActive = false;

function findFirstPit() {
  for (const key of pits) {
    const [xs, ys] = key.split(",");
    return { x: +xs, y: +ys };
  }
  return null;
}

function placeBubble(bubble, tile) {
  // 既定: タイル右側に置く。右端で切れるなら左に出して矢印を反転
  const rect = tile.getBoundingClientRect();
  const bw = bubble.offsetWidth;
  const bh = bubble.offsetHeight;
  const margin = 14;
  const wantRight = rect.right + margin + bw < window.innerWidth - 8;
  bubble.classList.toggle("point-left", !wantRight);
  const bx = wantRight
    ? rect.right + window.scrollX + margin
    : rect.left + window.scrollX - margin - bw;
  let by = rect.top + window.scrollY + rect.height / 2 - bh / 2;
  // 画面の上下にクランプ
  const minTop = window.scrollY + 8;
  const maxTop = window.scrollY + window.innerHeight - bh - 8;
  by = Math.max(minTop, Math.min(maxTop, by));
  bubble.style.left = `${bx}px`;
  bubble.style.top = `${by}px`;
}

function renderOneBubble(id, key, html, getTile, opts) {
  const onlyFirstFloor = !opts || opts.onlyFirstFloor !== false;
  let bubble = document.getElementById(id);
  if ((onlyFirstFloor && currentFloorIdx !== 0) || tutorialDismissed[key]) {
    if (bubble) bubble.remove();
    return;
  }
  if (opts && opts.activeOnly && !opts.activeOnly()) {
    if (bubble) bubble.remove();
    return;
  }
  const tile = getTile();
  if (!tile) {
    if (bubble) bubble.remove();
    return;
  }
  if (!bubble) {
    bubble = document.createElement("div");
    bubble.id = id;
    bubble.className = "tutorial-bubble";
    bubble.innerHTML = '<span class="tut-close" title="閉じる">✕</span>' + html;
    document.body.appendChild(bubble);
    bubble.querySelector(".tut-close").addEventListener("click", () => {
      tutorialDismissed[key] = true;
      bubble.remove();
    });
  }
  placeBubble(bubble, tile);
}

function renderTutorialBubbles() {
  renderOneBubble(
    "tutorial-bubble-enemy",
    "enemy",
    '<b>💡 ヒント:</b> 敵タイルに<b>マウスを乗せる</b>と、' +
      'HP / 属性耐性 / 特殊能力 などの詳細が見られます。',
    () => {
      const e = enemies.find((en) => en.hp > 0);
      return e ? tileAt(e.x, e.y) : null;
    }
  );
  renderOneBubble(
    "tutorial-bubble-pit",
    "pit",
    '<b>🕳 ピット:</b> この上にいる間だけ、武器に装着済みの<b>ペダルを付け外し</b>できます。' +
      '<br><b>一度通過すると崩れて消える</b>ので、編集のタイミングは慎重に。',
    () => {
      const p = findFirstPit();
      return p ? tileAt(p.x, p.y) : null;
    }
  );
  // ペダル初取得時の案内: フロアに依存せず、未装着の間だけ表示
  renderOneBubble(
    "tutorial-bubble-pedal",
    "pedal",
    '<b>🎛 ペダル獲得!</b> 下の <b>[Q]</b> / <b>[W]</b> / <b>[E]</b> ボードの空きスロットへ' +
      '<b style="color:#8a5b00">ドラッグ&ドロップ</b>して装着してください。' +
      '<br><span style="color:#5a4400;font-size:11px">(クリックでは装着できません)</span>',
    () => {
      const firstPedal = inventory.find((it) => it.kind === "pedal");
      if (!firstPedal) return null;
      return inventoryEl.querySelector(`.inv-item[data-uid="${firstPedal.uid}"]`);
    },
    { onlyFirstFloor: false, activeOnly: () => pedalTutorialActive }
  );
  // 構え時の案内: 構えている間だけ、プレイヤータイルを指して矢印キーの新挙動を伝える
  renderOneBubble(
    "tutorial-bubble-aim",
    "aim",
    '<b>🎯 構え中:</b> <b>矢印キー</b>で<b>向き変更</b>のみ。' +
      '<br>移動せず、<b>ターンも消費しません</b>。同じキーをもう一度押すと発射。',
    () => (pendingAttack ? tileAt(player.x, player.y) : null),
    { onlyFirstFloor: false, activeOnly: () => aimTutorialActive && !!pendingAttack }
  );
}
window.addEventListener("resize", () => {
  if (typeof renderTutorialBubbles === "function") renderTutorialBubbles();
});

// ========================================================================
// ログ
// ========================================================================
function log(msg, cls = "") {
  const div = document.createElement("div");
  div.className = "entry " + cls;
  div.textContent = msg;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

// ========================================================================
// ボード操作
// ========================================================================
// ドラッグ&ドロップ用: 特定スロットに装着 (uid 指定)
function placePedalAtSlot(boardKey, slotIdx, uid) {
  const item = findInInventory(uid);
  if (!item || item.kind !== "pedal") return false;
  if (slotIdx < 0 || slotIdx >= BOARD_SIZE) return false;
  if (!board[boardKey]) return false; // 未開放ボードへの装着は不可
  if (board[boardKey][slotIdx] != null) {
    log("そのスロットは埋まってる (外しはピットで)");
    return false;
  }
  // LineSelector: 次の追加スロット (R/T/Y) を確保
  if (item.id === "lineselector") {
    const lineSlot = findFreeLineSlot();
    if (!lineSlot) {
      log("⚠ LineSelector は最大 3 つまで (R/T/Y 全て解放済)", "lose");
      return false;
    }
    item.lineSlot = lineSlot;
    if (!board[lineSlot]) board[lineSlot] = new Array(BOARD_SIZE).fill(null);
    if (weapons[lineSlot] === undefined) weapons[lineSlot] = null;
    log(`⫶ LineSelector → 新スロット [${lineSlot.toUpperCase()}] が解放された!`, "win");
  }
  removeFromInventoryByUid(uid);
  board[boardKey][slotIdx] = item;
  log(`${PEDALS[item.id].name} を [${boardKey.toUpperCase()}] スロット${slotIdx + 1} に装着`, "pickup");
  // ドラッグ装着の達成 → 案内チュートリアルを自動終了
  tutorialDismissed.pedal = true;
  pedalTutorialActive = false;
  recomputePlayerHpMax();
  renderAll();
  return true;
}

// 自動装着 (ミニメニュー「[Q] に装着」等から)
function autoEquipPedalTo(uid, boardKey) {
  const item = findInInventory(uid);
  if (!item || item.kind !== "pedal") return;
  const b = board[boardKey];
  if (!b) {
    log(`[${boardKey.toUpperCase()}] ボードは未開放`, "lose");
    return;
  }
  const idx = b.indexOf(null);
  if (idx < 0) {
    log(`[${boardKey.toUpperCase()}] ボードに空きが無い`, "lose");
    return;
  }
  placePedalAtSlot(boardKey, idx, uid);
}

// スロット → インベントリに戻す (ピット必須)
function removePedalFromSlot(boardKey, idx) {
  if (!isOnPit()) {
    log("⚔ FIELD では編集不可。ピット (P) に戻って");
    return;
  }
  if (idx < 0 || idx >= BOARD_SIZE) return;
  if (!board[boardKey]) return;
  const item = board[boardKey][idx];
  if (!item) return;
  if (inventory.length >= INV_MAX) {
    log(`インベントリ満杯 (${INV_MAX})、外せない`, "lose");
    return;
  }

  // LineSelector を外す: 対応スロット (R/T/Y) の武器とペダルが全て消失する。
  // ★ 喪失警告を必ず表示し、明示的に「外す」を選んだ場合だけ実行する。
  if (item.id === "lineselector" && item.lineSlot) {
    const ls = item.lineSlot;
    const wid = weapons[ls];
    const wName = wid ? WEAPONS[wid].name : "(無し)";
    // 消失対象から「外そうとしている LineSelector 自身」は除外する
    // (こいつはインベントリに戻すため)
    const pedals = (board[ls] || []).filter((p) => p && p !== item);
    const pedalNames = pedals.length
      ? pedals.map((p) => PEDALS[p.id].name).join(", ")
      : "(無し)";
    const hasLoss = !!wid || pedals.length > 0;
    showConfirmDialog({
      title: `⚠ LineSelector を外しますか?`,
      bodyHtml:
        `<p>このペダルを外すと、対応する <b style="color:#ff9966">[${ls.toUpperCase()}] スロット</b> の` +
        ` <b>武器</b> と <b>そのボードに装着していた全ペダル</b> が <b style="color:#ff5544">完全に消失</b> します。<br>` +
        `<span style="color:#aaa;font-size:12px">(インベントリには戻りません)</span></p>` +
        `<div style="margin-top:10px;padding:10px 12px;background:rgba(255,85,68,0.08);border-left:3px solid #ff5544;border-radius:4px">` +
          `<div style="color:#ff9988"><b>消失するもの:</b></div>` +
          `<div>・武器: <b style="color:#${hasLoss && wid ? "ffd866" : "888"}">${wName}</b></div>` +
          `<div>・ペダル: <b style="color:#${pedals.length ? "c8aaff" : "888"}">${pedalNames}</b></div>` +
        `</div>` +
        `<p style="margin-top:10px;font-size:12px;color:#cfcfcf">` +
          `先にそのスロットから武器/ペダルを取り出してから外せば、何も失わずに済みます。` +
        `</p>`,
      confirmLabel: hasLoss ? "💥 失っても外す" : "外す",
      cancelLabel: "キャンセル",
      danger: hasLoss,
      onConfirm: () => doRemoveLineSelector(boardKey, idx, item),
    });
    return;
  }

  board[boardKey][idx] = null;
  inventory.push(item);
  log(`${PEDALS[item.id].name} を [${boardKey.toUpperCase()}] スロット${idx + 1} から外した`);
  recomputePlayerHpMax();
  renderAll();
}

// LineSelector 取り外し本体: 対応スロットの全てを消失させ、ペダル本体は
// インベントリに戻す (lineSlot プロパティはクリア)。
// 「LineSelector が ls 自身のボードに置かれていた」ケースも安全に処理する。
function doRemoveLineSelector(boardKey, idx, item) {
  const ls = item.lineSlot;
  if (!ls) return;
  // 喪失ログ (LineSelector 自身は除外)
  if (weapons[ls]) {
    log(`💥 [${ls.toUpperCase()}] の武器 ${WEAPONS[weapons[ls]].name} が消失`, "lose");
  }
  if (board[ls]) {
    for (const p of board[ls]) {
      if (!p || p === item) continue;
      log(`💥 [${ls.toUpperCase()}] の ${PEDALS[p.id].name} が消失`, "lose");
    }
  }
  // 別ボード (boardKey !== ls) に LineSelector があった場合のみ、その枠を空ける。
  // boardKey === ls の場合は次の delete board[ls] で消えるので何もしなくて良い。
  if (boardKey !== ls && board[boardKey]) {
    board[boardKey][idx] = null;
  }
  // 追加スロットを丸ごと撤去
  weapons[ls] = null;
  delete board[ls];
  // LineSelector 自身はインベントリに戻す (lineSlot プロパティをクリア)
  delete item.lineSlot;
  inventory.push(item);
  // 構え/active board がそのスロットだった場合は q に逃がす
  if (pendingAttack === ls) pendingAttack = null;
  if (activeBoard === ls)  activeBoard = "q";
  log(`⫶ LineSelector を取り外した (スロット [${ls.toUpperCase()}] を撤去)`);
  recomputePlayerHpMax();
  renderAll();
}

// 武器装備: インベントリの武器を Q/W/E スロットに装備。
// 既存装備があれば外してインベントリに戻す。
// (スワップなら ±0、新規なら -1 なのでインベントリ容量チェック不要)
function equipWeaponTo(uid, slotKey) {
  const item = findInInventory(uid);
  if (!item || item.kind !== "weapon") return;
  const oldWid = weapons[slotKey];
  removeFromInventoryByUid(uid);
  weapons[slotKey] = item.id;
  if (oldWid) {
    inventory.push(newItem("weapon", oldWid));
    log(`${WEAPONS[item.id].name} を [${slotKey.toUpperCase()}] に装備 (旧 ${WEAPONS[oldWid].name} → インベントリ)`, "pickup");
  } else {
    log(`${WEAPONS[item.id].name} を [${slotKey.toUpperCase()}] に装備`, "pickup");
  }
  renderAll();
}

// アイテム破棄 (ミニメニュー「捨てる」)
function discardItem(uid) {
  const item = removeFromInventoryByUid(uid);
  if (!item) return;
  const def = itemDef(item);
  log(`🗑 ${def.name} を捨てた`);
  renderAll();
}

// ========================================================================
// ルール
// ========================================================================
function isWall(x, y) {
  return walls.has(`${x},${y}`);
}
function enemyAt(x, y) {
  return enemies.find((e) => e.hp > 0 && e.x === x && e.y === y);
}
function isBlocked(x, y) {
  return isWall(x, y) || !!enemyAt(x, y);
}

// 隣接する root-bind 持ち (人面樹) を探す。1 体でもいれば移動不可。
function adjacentRootBinder(x, y) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dx, dy] of dirs) {
    const e = enemyAt(x + dx, y + dy);
    if (e && e.hp > 0 && e.abilities && e.abilities.includes("root-bind")) {
      return e;
    }
  }
  return null;
}

function tryMove(dx, dy) {
  player.facing = { dx, dy };
  const binder = adjacentRootBinder(player.x, player.y);
  if (binder) {
    log(`🪢 ${enemyDisplayName(binder)} の根に縛られて動けない! (倒すまで移動不可)`, "lose");
    return false;
  }
  const nx = player.x + dx;
  const ny = player.y + dy;
  // NPC マス: 隣接で会話開始済みなので進めない (壁判定)
  if (npcAt(nx, ny)) return false;
  // 赤ちゃんマスへの移動: 母に渡した後は赤ちゃんが壁 (動かさない)、
  // それ以外は位置入れ替え (ピット崩しは通常通り)
  if (baby && baby.x === nx && baby.y === ny) {
    if (babyWithMother) return false;
    const oldKey = `${player.x},${player.y}`;
    const wasOnPit = pits.has(oldKey);
    const px = player.x, py = player.y;
    player.x = nx; player.y = ny;
    baby.x = px;   baby.y = py;
    if (wasOnPit) {
      pits.delete(oldKey);
      log("🕳 ピットが崩れた (使い捨て)", "info");
    }
    tryPickup();
    applyOnStepPassives();
    return true;
  }
  if (isBlocked(nx, ny)) return false;
  const oldKey = `${player.x},${player.y}`;
  const oldX = player.x, oldY = player.y;
  const wasOnPit = pits.has(oldKey);
  player.x = nx;
  player.y = ny;
  // ピットは使い捨て: 一度離れると消失する
  if (wasOnPit) {
    pits.delete(oldKey);
    log("🕳 ピットが崩れた (使い捨て)", "info");
  }
  // 赤ちゃんの追従 (旧プレイヤー位置に詰める)
  doBabyFollow(oldX, oldY);
  tryPickup();
  applyOnStepPassives();
  return true;
}

// ---- プッシャー用: 敵を 1 マスずらす ----
// 押し出し先が 壁 / 他敵 / ピット / ゴール / マップ外 なら止まる (false 返却)
// 人面樹 (tree) は根を張っていて押し出し無効
function tryPushEnemy(enemy, dir) {
  if (enemy.abilities && enemy.abilities.includes("rooted")) return false;
  const nx = enemy.x + dir.dx;
  const ny = enemy.y + dir.dy;
  if (!inBounds(nx, ny)) return false;
  if (isWall(nx, ny)) return false;
  if (enemyAt(nx, ny)) return false;
  if (pits.has(`${nx},${ny}`)) return false;
  if (goal.x === nx && goal.y === ny) return false;
  enemy.x = nx;
  enemy.y = ny;
  return true;
}

// ---- プッシャー用: 敵スプライトをスライド演出 → 実移動 ----
// pushbacks: [{ enemy, dir: {dx,dy}, distance: number }]
// 攻撃エフェクト (flash + ダメージ表示) が終わったあとに呼び出す。
// 1) 通過可能な最大マス数を distance まで走査
// 2) 敵のいるタイルに CSS transform を掛けてそのマスぶんスライド
// 3) アニメ完了まで sleep
// 4) インライン style を消してから enemy.x/y を更新 → renderMap
// 押し出しは「奥にいる敵から」処理することで、ビーム範囲の連鎖押しに対応。
async function performPushbacks(pushbacks) {
  if (pushbacks.length === 0) return;
  const TILE_PX  = 32;
  const SLIDE_MS = 180;
  const BUMP_MS  = 130;

  // 「押し出し方向で奥にいる敵」順に処理 (空きセルが順次空いていく)
  const sorted = [...pushbacks].sort((a, b) => {
    const sa = a.enemy.x * a.dir.dx + a.enemy.y * a.dir.dy;
    const sb = b.enemy.x * b.dir.dx + b.enemy.y * b.dir.dy;
    return sb - sa;
  });

  // 現在の敵の占有マスをシミュレートしながら canPush を決める
  const occupied = new Set();
  for (const e of enemies) if (e.hp > 0) occupied.add(`${e.x},${e.y}`);

  const moves = [];
  const bumps = [];
  for (const pb of sorted) {
    const t = tileAt(pb.enemy.x, pb.enemy.y);
    if (!t) continue;
    if (pb.enemy.abilities && pb.enemy.abilities.includes("rooted")) {
      // "rooted" 持ち (人面樹等) は押し出し無効 → 反動だけ表示
      bumps.push({ tile: t, dir: pb.dir });
      continue;
    }
    // 通過可能マスを 1 マスずつ確認して、最大 distance まで進める
    const requested = Math.max(1, pb.distance || 1);
    let actualDist = 0;
    let cx = pb.enemy.x, cy = pb.enemy.y;
    for (let step = 0; step < requested; step++) {
      const nx = cx + pb.dir.dx;
      const ny = cy + pb.dir.dy;
      const cellOk = inBounds(nx, ny) && !isWall(nx, ny)
                     && !pits.has(`${nx},${ny}`) && !(goal.x === nx && goal.y === ny);
      const free = cellOk && !occupied.has(`${nx},${ny}`);
      if (!free) break;
      actualDist++;
      cx = nx; cy = ny;
    }
    if (actualDist > 0) {
      occupied.delete(`${pb.enemy.x},${pb.enemy.y}`);
      occupied.add(`${cx},${cy}`);
      t.style.transition = `transform ${SLIDE_MS}ms cubic-bezier(0.25, 0.7, 0.35, 1)`;
      t.style.transform  = `translate(${pb.dir.dx * TILE_PX * actualDist}px, ${pb.dir.dy * TILE_PX * actualDist}px)`;
      t.style.zIndex     = "10";
      moves.push({ enemy: pb.enemy, dir: pb.dir, tile: t, distance: actualDist });
    } else {
      // ノックバック先が塞がってる: 小さくバウンドして止まる
      t.style.transition = `transform ${BUMP_MS / 2}ms ease-out`;
      t.style.transform  = `translate(${pb.dir.dx * 8}px, ${pb.dir.dy * 8}px)`;
      t.style.zIndex     = "10";
      bumps.push({ tile: t, dir: pb.dir });
    }
  }

  // バンプは折り返して 0 に戻る
  if (bumps.length > 0) {
    setTimeout(() => {
      for (const b of bumps) {
        b.tile.style.transition = `transform ${BUMP_MS / 2}ms ease-out`;
        b.tile.style.transform  = "";
      }
    }, BUMP_MS / 2 + 10);
  }

  if (moves.length === 0) {
    if (bumps.length > 0) {
      await sleep(BUMP_MS + 30);
      for (const b of bumps) {
        b.tile.style.transition = "";
        b.tile.style.transform  = "";
        b.tile.style.zIndex     = "";
      }
    }
    return;
  }

  // スライド完了を待つ
  await sleep(SLIDE_MS + 20);
  // 旧タイルから transform を除去 (renderMap は inline transform をクリアしないため)
  for (const m of moves) {
    m.tile.style.transition = "";
    m.tile.style.transform  = "";
    m.tile.style.zIndex     = "";
  }
  for (const b of bumps) {
    b.tile.style.transition = "";
    b.tile.style.transform  = "";
    b.tile.style.zIndex     = "";
  }
  // 実際の座標を更新
  for (const m of moves) {
    m.enemy.x += m.dir.dx * m.distance;
    m.enemy.y += m.dir.dy * m.distance;
  }
  renderMap();
}

// ---- Passive: 攻撃命中ごと (preamp 等) ----
// 対象ボードの slot にある passive (hook: "onHit") を発火する。
function applyOnHitPassives(boardKey) {
  const slots = getSlotPedalIds(boardKey);
  const seen = new Set();
  for (const id of slots) {
    if (!id || seen.has(id)) continue;
    const p = PEDALS[id];
    if (!p || p.kind !== "passive" || p.hook !== "onHit") continue;
    seen.add(id);
    const heal = Math.max(1, Math.ceil(player.hp * (p.ratio || 0)));
    const before = player.hp;
    player.hp = Math.min(player.hpMax, player.hp + heal);
    const actual = player.hp - before;
    if (actual > 0) log(`♥ ${p.name}: +${actual} HP`, "win");
  }
}

// ---- Passive: 1歩移動ごと (powersupply 等) ----
// 全ボード (Q/W/E + R/T/Y) を横断、同じ id は 1 回だけ発火 (重ね掛けなし)。
function applyOnStepPassives() {
  const seen = new Set();
  for (const key of activeBoardKeys()) {
    const slots = getSlotPedalIds(key);
    for (const id of slots) {
      if (!id || seen.has(id)) continue;
      const p = PEDALS[id];
      if (!p || p.kind !== "passive" || p.hook !== "onStep") continue;
      seen.add(id);
      const heal = Math.max(1, Math.ceil(player.hp * (p.ratio || 0)));
      const before = player.hp;
      player.hp = Math.min(player.hpMax, player.hp + heal);
      const actual = player.hp - before;
      if (actual > 0) log(`⚡ ${p.name}: +${actual} HP`, "win");
    }
  }
  // 赤ちゃんボードの onStep 系 (Power Supply 等) は赤ちゃん側に効く
  if (baby && baby.hp > 0 && !babyWithMother) {
    const bseen = new Set();
    for (const it of baby.board) {
      if (!it) continue;
      const id = it.id;
      if (bseen.has(id)) continue;
      const p = PEDALS[id];
      if (!p || p.kind !== "passive" || p.hook !== "onStep") continue;
      bseen.add(id);
      const heal = Math.max(1, Math.ceil(baby.hp * (p.ratio || 0)));
      const before = baby.hp;
      baby.hp = Math.min(baby.hpMax, baby.hp + heal);
      const actual = baby.hp - before;
      if (actual > 0) log(`👶⚡ ${p.name}: 赤ちゃん +${actual} HP`, "win");
    }
  }
}

// ========================================================================
// エフェクト
// ========================================================================
function flashTiles(cells, elementClass) {
  const flashed = [];
  for (const c of cells) {
    if (c.x < 0 || c.x >= COLS || c.y < 0 || c.y >= ROWS) continue;
    const t = tileAt(c.x, c.y);
    if (!t) continue;
    t.classList.add("flash");
    if (elementClass) t.classList.add(elementClass);
    flashed.push({ t, elementClass });
  }
  setTimeout(() => {
    for (const f of flashed) {
      f.t.classList.remove("flash");
      if (f.elementClass) f.t.classList.remove(f.elementClass);
    }
  }, 180);
}

function elementFlashClass(element) {
  if (element === "fire") return "flash-fire";
  if (element === "ice") return "flash-ice";
  if (element === "thunder") return "flash-thunder";
  return null;
}

function showFloatingDamage(x, y, dmg, elementClass, killed, mult) {
  const t = tileAt(x, y);
  if (!t) return;
  const left = t.offsetLeft + t.offsetWidth / 2;
  const top = t.offsetTop + 4;
  const el = document.createElement("div");
  el.className = "floating-damage";
  if (elementClass) el.classList.add(elementClass);
  if (killed) el.classList.add("kill");
  if (mult && mult > 1) el.classList.add("weak");
  if (mult && mult < 1) el.classList.add("resist");
  let suffix = "";
  if (mult && mult > 1) suffix = " WEAK!";
  else if (mult && mult < 1) suffix = " RESIST";
  el.textContent = killed ? `-${dmg} KO` : `-${dmg}${suffix}`;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  mapEl.appendChild(el);
  setTimeout(() => el.remove(), 760);
}

// ========================================================================
// 攻撃（範囲・回数を可視化）
// ========================================================================
function flashChainSequence(boardKey) {
  const slots = boardEl.querySelectorAll(`.row-${boardKey} .slot.filled`);
  slots.forEach((s, i) => {
    setTimeout(() => {
      s.classList.add("chain-active");
      setTimeout(() => s.classList.remove("chain-active"), 200);
    }, i * 90);
  });
}

async function doAttack(attackKey) {
  const weaponId = weapons[attackKey];
  if (!weaponId) {
    log(`[${attackKey.toUpperCase()}] 武器が装備されていない`);
    return false;
  }
  const src = WEAPONS[weaponId];
  if (!src) return false;
  const slotIds = getSlotPedalIds(attackKey);
  const items = computeChainItems(src, slotIds);
  const atk = resolveChain(src, slotIds);
  // weaponItem.red = 解決後の素ダメ赤字 (Pusher のノックバック距離にも使う)
  const weaponItem = items[0];
  // tripletecho (passive ペダル) の解決後 red を取り出す。
  // 装着されていれば、その赤字回ごとに会心 (×2) になる。
  const echoItem = items.find((it) => it.pedal && it.pedal.id === "tripletecho");
  const echoRed = echoItem ? echoItem.red : null;

  const targets = computeTargets(player.x, player.y, player.facing, atk.shape, atk.range);
  const flashClass = elementFlashClass(atk.element);
  flashChainSequence(attackKey);
  const floatColor =
    atk.element === "fire"    ? "fire"    :
    atk.element === "ice"     ? "ice"     :
    atk.element === "thunder" ? "thunder" : "";

  // 攻撃時の各セルに「最初にいた敵」を覚えておく（演出用）
  const initial = targets.map((c) => ({ cell: c, enemy: enemyAt(c.x, c.y) }));
  let totalHits = 0;
  let kills = 0;
  let skippedHits = 0;
  const HIT_INTERVAL = 170;
  // 棘嵐 (counter-thorn-storm) 用: この doAttack 中、対象ごとに何ヒット目かを追跡。
  // 1 ヒット目 4 / 2 ヒット目 8 / 3 ヒット目 16 ... と指数で反射が伸びる。
  // 攻撃が変わると (新しい doAttack) リセット。
  const stormHits = new Map();

  for (let h = 0; h < atk.hits; h++) {
    if (h > 0) {
      // 早期終了: 全対象が既に死亡 (または最初から不在) なら以降のスイングは無意味
      // → 多段ヒット (Tremolo + Delay + Stack 等) で空振りを延々待つ問題への対策。
      // Triplet Echo のカウンタも進めない (実際に振らなかった swing は数えない)。
      const aliveAny = initial.some(({ enemy }) => enemy && enemy.hp > 0);
      if (!aliveAny) {
        skippedHits = atk.hits - h;
        break;
      }
      await sleep(HIT_INTERVAL);
    }
    const thisHit = [];
    const pendingPushbacks = []; // プッシャー: 演出後にまとめて移動
    // Triplet Echo: スイング (h) 単位でカウント、赤字回ごとにスイング全体を会心 (×2)
    //   赤字 0 以下 → 毎攻撃が会心 (Trim/Cut で削り切るルート)
    let critThisSwing = false;
    if (echoRed !== null) {
      weaponState.tripletecho[attackKey]++;
      if (echoRed <= 0 || weaponState.tripletecho[attackKey] % echoRed === 0) {
        critThisSwing = true;
        log(`✦ Triplet Echo: 会心の一撃 (×2) !`, "win");
      }
    }
    for (const { cell, enemy } of initial) {
      if (!enemy || enemy.hp <= 0) {
        thisHit.push({ cell, dmg: 0, killed: false, applied: false, mult: 1 });
        continue;
      }
      const elemMult = getElementMultiplier(atk.element, enemy);
      let dmgF = atk.damage * elemMult;

      // === 武器エフェクト: per-hit ===
      // サスティナー: 同一対象連続ヒットで +25%/回 累積 (固定値、modifier 不可)
      if (src.effect === "sustain") {
        const ss = weaponState.sustainer;
        if (ss.lastEnemy === enemy) ss.streak += 1;
        else { ss.lastEnemy = enemy; ss.streak = 1; }
        dmgF *= 1 + 0.25 * (ss.streak - 1);
      }
      // トリプレッター: スイング単位 3回ごとに会心 (この swing 全体 ×2)
      if (critThisSwing) {
        dmgF *= 2;
      }
      // コンプレッサー: 対象の最大HP × atk.compress% を整数で加算 (modifier で増減可)
      if (src.effect === "compress") {
        dmgF += Math.ceil(enemy.hpMax * (atk.compress / 100));
      }

      let dmgComputed = Math.max(0, Math.floor(dmgF));
      // 盾の騎士: 自身の 3×3 内にプレイヤーがいる間だけ、被ダメを 5 に上限化。
      // (範囲外から殴れば通常通り通る — ロングアーム射撃 / 押し出して間合いを取る 等で攻略)
      if (
        enemy.abilities && enemy.abilities.includes("damage-taken-cap-5") &&
        Math.abs(enemy.x - player.x) <= 1 && Math.abs(enemy.y - player.y) <= 1 &&
        dmgComputed > 5
      ) {
        dmgComputed = 5;
      }
      // マスター・サムライ: パリィ中は武器ダメージ完全無効 (状態異常も付与しない)
      if (enemy.parryUntilTurn != null && turn <= enemy.parryUntilTurn) {
        thisHit.push({ cell, dmg: 0, killed: false, applied: true, mult: 1, parried: true });
        continue;
      }
      // 怒り中は無敵: ダメージ 0 として処理 (フロート表示も 0、HP も不変)。
      const dmg = enemy.rage ? 0 : dmgComputed;
      const before = enemy.hp;
      enemy.hp -= dmg;
      // === death-rage 介入 ===
      // 致命傷で怒り状態へ突入 (まだ rage 中でない場合のみ)。HP は 1 に戻して、
      // enemy.reds.rage T カウントダウン中は無敵 (上の dmg=0 ガードで以降の追撃は素通し)。
      // Limiter / NoiseGate で reds.rage が 0 まで削られている場合は怒り発動せず即絶命。
      if (enemy.hp <= 0 && before > 0) {
        const hasRage = enemy.abilities && enemy.abilities.includes("death-rage");
        const rageTurns = (enemy.reds && enemy.reds.rage != null) ? enemy.reds.rage : 3;
        if (hasRage && !enemy.rage && rageTurns > 0) {
          enemy.hp = 1;
          enemy.rage = { turnsLeft: rageTurns };
          log(`✦ ${enemyDisplayName(enemy)} が怒り状態に突入! ATK×2 / ${rageTurns}T 後に絶命`, "attack");
        }
      }
      totalHits++;
      for (const s of atk.statusEffects) {
        if (enemy.hp <= 0) break;
        if (enemy.status.some((es) => es.type === s.type)) continue;
        // 状態異常無効 (immune-burn / immune-freeze / immune-shock) はここで弾く。
        // abilities 配列ベースなので、将来「封印」武器で immune を消せば付与可能になる。
        if (enemy.abilities && enemy.abilities.includes(`immune-${s.type}`)) continue;
        const chance = s.chance != null ? s.chance : 1.0;
        if (Math.random() < chance) {
          enemy.status.push({
            type: s.type, duration: s.duration, damage: s.damage,
          });
        }
      }
      // === Phaser: 累積ヒットで凍結を確定発動 ===
      //   atk.phaserRequired が設定されていれば、命中ごとにカウンタを加算。
      //   閾値到達で 4T 凍結を付与し、カウンタをリセット。
      //   既に凍結中ならカウンタはそのまま据え置き (二重付与は避ける)。
      if (atk.phaserRequired != null && enemy.hp > 0 && dmg > 0) {
        const immune = enemy.abilities && enemy.abilities.includes("immune-freeze");
        if (!immune) {
          enemy.phaserHits = (enemy.phaserHits || 0) + 1;
          if (enemy.phaserHits >= atk.phaserRequired) {
            if (!enemy.status.some((es) => es.type === "freeze")) {
              enemy.status.push({ type: "freeze", duration: 4 });
              enemy.phaserHits = 0;
              log(`❄ ${enemyDisplayName(enemy)} が凍結! (4T)`, "win");
            }
          }
        }
      }
      const killed = before > 0 && enemy.hp <= 0;
      if (killed) {
        kills++;
        rollDrop(enemy);
        // サスティナーで対象が死んだ場合は streak リセット
        if (src.effect === "sustain" && weaponState.sustainer.lastEnemy === enemy) {
          weaponState.sustainer.lastEnemy = null;
          weaponState.sustainer.streak = 0;
        }
      } else if (src.effect === "pushback" && dmg > 0) {
        // プッシャー: ここでは即時移動せず記録のみ。
        // 攻撃エフェクト (flash + ダメージ表示) を見せてから
        // performPushbacks でスプライトをスライドさせて移動する。
        // 距離 = 武器の解決後 赤字 (modifier で増減可)。0以下は 1 に丸める。
        const pushDist = Math.max(1, weaponItem.red);
        pendingPushbacks.push({ enemy, dir: { ...player.facing }, distance: pushDist });
      }

      // === Passive: 命中ごとの hook (preamp 等) ===
      if (dmg > 0) applyOnHitPassives(attackKey);

      // === 特殊能力デバフ (Limiter / NoiseGate): 敵の能力 red を atk.redDebuff ぶん削る ===
      // 対象は enemy.reds (現状: rage=怒りT数 / quadStrike=連撃数 など)。
      // 各 red を一律に -atk.redDebuff (下限 0)。複数 red がある敵は全て影響を受ける。
      if (dmg > 0 && atk.redDebuff > 0 && enemy.hp > 0 && enemy.reds) {
        const changes = [];
        for (const k of Object.keys(enemy.reds)) {
          const before = enemy.reds[k];
          if (before <= 0) continue;
          const after = Math.max(0, before - atk.redDebuff);
          enemy.reds[k] = after;
          if (after !== before) changes.push(`${REDS_LABEL[k] || k} ${before}→${after}`);
        }
        if (changes.length > 0) {
          log(`▾ ${enemyDisplayName(enemy)} の能力赤字: ${changes.join(", ")}`, "win");
          showRedDebuffFx(enemy.x, enemy.y);
        }
      }

      // === スパイカ系: ヒットされる度にカウンター ===
      //   とどめでも反射する (Shiren の棘鎧と同じ挙動)。
      //   状態異常 (burn 等) の自動ダメ経由では発動しない (tickStatuses は別ループ)。
      //   abilities ベース (封印で消せる):
      //     counter-thorn        … 固定 enemy.counter
      //     counter-thorn-storm  … この attack 内の N ヒット目に 4 × 2^(N-1) を反射
      if (dmg > 0 && enemy.abilities) {
        let counter = 0;
        if (enemy.abilities.includes("counter-thorn-storm")) {
          const prev = stormHits.get(enemy) || 0;
          const idx = prev + 1;
          stormHits.set(enemy, idx);
          counter = 4 * Math.pow(2, idx - 1);
        } else if (enemy.abilities.includes("counter-thorn")) {
          counter = enemy.counter != null ? enemy.counter : 2;
        }
        if (counter > 0) {
          if (playerInvincible) {
            showGodFx(player.x, player.y);
            log(`🛡 GOD: ${enemyDisplayName(enemy)} の棘 (-${counter} → 0)`, "info");
          } else if (rollShimmerParry()) {
            showShimmerFx(player.x, player.y);
            log(`✦ Shimmer: ${enemyDisplayName(enemy)} の棘を弾いた! (-${counter} → 0)`, "win");
          } else {
            player.hp -= counter;
            showFloatingDamage(player.x, player.y, counter, "");
            spawnHurtFx(player.x, player.y);
            pulse(hpEl, "hurt", 400);
            log(`✦ ${enemyDisplayName(enemy)} の棘! -${counter}`, "attack");
          }
          if (player.hp <= 0) {
            player.hp = 0;
            gameOver = true;
            log(`棘で倒れた…`, "lose");
            showGameEndBanner("✗ GAME OVER", "#ff5544");
          }
        }
      }

      thisHit.push({ cell, dmg, killed, applied: true, mult: elemMult });
      if (gameOver) break;
    }
    flashTiles(targets, flashClass);
    for (const t of thisHit) {
      if (!t.applied) continue;
      if (t.parried) {
        showParryFx(t.cell.x, t.cell.y);
      } else {
        showFloatingDamage(t.cell.x, t.cell.y, t.dmg, floatColor, t.killed, t.mult);
      }
    }
    renderEnemyStatus();
    renderHud();
    renderMap();
    // === プッシャー: ヒット表示後に敵スプライトをスライド演出 → 実移動 ===
    if (pendingPushbacks.length > 0) {
      await performPushbacks(pendingPushbacks);
    }
    if (gameOver) break;
  }

  if (totalHits === 0) {
    log(`[${attackKey.toUpperCase()}]${src.name}: 空振り…`);
  } else {
    const elem = ELEMENT_LABEL[atk.element] || atk.element;
    const skipNote = skippedHits > 0 ? ` (残${skippedHits}回スキップ)` : "";
    log(
      `[${attackKey.toUpperCase()}]${src.name} ${elem} ${atk.hits}回×${atk.damage} → 計${totalHits}ヒット` +
        (kills ? ` / 撃破 ${kills}` : "") + skipNote,
      "attack"
    );
  }
  return true;
}

async function tickStatusesPaced() {
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    // 状態異常 (burn 等) の処理
    if (e.status && e.status.length > 0) {
      let burn = 0;
      for (const s of e.status) {
        if (s.type === "burn") burn += s.damage;
        s.duration--;
      }
      if (burn > 0) {
        const wasAlive = e.hp > 0;
        e.hp -= burn;
        // 怒り中なら燃焼でも死なない (HP 1 を維持)
        if (e.rage && e.hp <= 0) e.hp = 1;
        if (wasAlive && e.hp <= 0) {
          log(`敵が燃え尽きた（燃焼${burn}）`, "attack");
          rollDrop(e);
        } else {
          log(`敵に燃焼ダメ ${burn}`, "attack");
        }
        showFloatingDamage(e.x, e.y, burn, "fire", e.hp <= 0);
        renderEnemyStatus();
        renderMap();
        await sleep(PACE_MS);
      }
      e.status = e.status.filter((s) => s.duration > 0);
    }
  }
}

// 怒り状態 (death-rage) の残ターン処理。
// 敵行動「後」に呼ぶことで、怒り突入したターンも敵が殴れる (合計 3 回攻撃が成立する):
//   T0: 致命傷 → rage 突入 (turnsLeft=3) → 敵攻撃① → tickRage で 3→2
//   T1: プレイヤー攻撃(0ダメ) → 敵攻撃② → 2→1
//   T2: プレイヤー攻撃(0ダメ) → 敵攻撃③ → 1→0 で絶命
async function tickRagePaced() {
  for (const e of enemies) {
    if (!e.rage || e.hp <= 0) continue;
    e.rage.turnsLeft--;
    if (e.rage.turnsLeft <= 0) {
      e.hp = 0;
      e.rage = null;
      log(`✦ ${enemyDisplayName(e)} は怒り果てて絶命!`, "win");
      rollDrop(e);
      showFloatingDamage(e.x, e.y, "X", "", true);
      renderEnemyStatus();
      renderMap();
      await sleep(PACE_MS);
    }
  }
}

// ========================================================================
// 敵 AI
//   - 凍結 / 麻痺中は行動スキップ
//   - 隣接中なら攻撃
//   - 索敵範囲内なら 1 マス前進（壁・敵・プレイヤーマスは避ける）
// ========================================================================
function isCellBlockedForEnemy(self, x, y) {
  if (walls.has(`${x},${y}`)) return true;
  // ピットは聖域ではなくなった: 敵が侵入&追撃可能
  if (goal.x === x && goal.y === y) return true; // ゴールはプレイヤー専用
  if (x === player.x && y === player.y) return true; // プレイヤーマスは攻撃対象
  if (baby && baby.hp > 0 && baby.x === x && baby.y === y) return true; // 赤ちゃんマスも攻撃対象
  for (const o of enemies) {
    if (o === self) continue;
    if (o.hp <= 0) continue;
    if (o.x === x && o.y === y) return true;
  }
  for (const n of npcs) {
    if (n.x === x && n.y === y) return true; // NPC は不可侵
  }
  return false;
}

function enemyAttackPlayer(enemy) {
  let dmg = enemy.atk != null ? enemy.atk : ENEMY_ATK;
  // 怒り状態中は ATK ×2 (death-rage の効果)
  if (enemy.rage) dmg *= 2;

  // 敵 lunge: 殴る方向に飛び出す overlay (連発でも独立 DOM なので衝突しない)
  const ldx = Math.sign(player.x - enemy.x);
  const ldy = Math.sign(player.y - enemy.y);
  spawnLungeFx(enemy.x, enemy.y, ldx, ldy);

  if (playerInvincible) {
    showGodFx(player.x, player.y);
    log(`🛡 GOD: 敵の攻撃 (-${dmg} → 0)`, "info");
    return;
  }
  if (rollShimmerParry()) {
    showShimmerFx(player.x, player.y);
    log(`✦ Shimmer: ${enemyDisplayName(enemy)} の攻撃を弾いた! (-${dmg} → 0)`, "win");
    return;
  }

  player.hp -= dmg;
  showFloatingDamage(player.x, player.y, dmg, "");

  // プレイヤー被弾フラッシュ (overlay)
  spawnHurtFx(player.x, player.y);

  // HUD HP 脈動 + 画面 shake — pulse() で reflow → 連続 add でも毎回 restart
  pulse(hpEl, "hurt", 400);
  pulse(mapEl, "shake", 240);

  if (player.hp <= 0) {
    player.hp = 0;
    log(`敵の攻撃で倒れた… -${dmg}`, "lose");
    gameOver = true;
    showGameEndBanner("✗ GAME OVER", "#ff5544");
  } else {
    log(`敵に殴られた！ -${dmg}`, "attack");
  }
}

// 敵が赤ちゃんを攻撃。加護があれば最終ダメ=1 にクランプ。
function enemyAttackBaby(enemy) {
  if (!baby || baby.hp <= 0) return;
  let dmg = enemy.atk != null ? enemy.atk : ENEMY_ATK;
  if (enemy.rage) dmg *= 2;
  // 加護: 物理ダメは 1 に上限
  if (hasBlessing()) dmg = 1;
  const ldx = Math.sign(baby.x - enemy.x);
  const ldy = Math.sign(baby.y - enemy.y);
  spawnLungeFx(enemy.x, enemy.y, ldx, ldy);
  pulse(mapEl, "shake", 200);
  // damageBaby で floating + hurt fx + 死亡時バブル + バブル制御まで処理
  damageBaby(dmg, "physical");
  if (baby) log(`👶 赤ちゃんが殴られた！ -${dmg}`, "attack");
}

// アーチャー: 4 方向直線・3 マスまで・壁/他敵で止まる
//   条件を満たす方向があれば射撃 (返り値 true)。
//   矢は貫通せず、最初の障害物 (壁/敵) で止まる。プレイヤーがその手前にいれば命中。
const ARCHER_RANGE = 3;
function tryArcherShoot(archer) {
  const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
  for (const d of dirs) {
    for (let step = 1; step <= ARCHER_RANGE; step++) {
      const x = archer.x + d.dx * step;
      const y = archer.y + d.dy * step;
      if (!inBounds(x, y)) break;
      if (walls.has(`${x},${y}`)) break;
      // 自分以外の生存敵が射線にいれば矢が止まる (味方を撃たない)
      const blocker = enemies.find((o) => o !== archer && o.hp > 0 && o.x === x && o.y === y);
      if (blocker) break;
      if (player.x === x && player.y === y) {
        archerShoot(archer, d, step);
        return true;
      }
    }
  }
  return false;
}

function archerShoot(archer, dir, dist) {
  const dmg = archer.atk != null ? archer.atk : ENEMY_ATK;
  spawnArrowFx(archer.x, archer.y, dir, dist);
  if (playerInvincible) {
    showGodFx(player.x, player.y);
    log(`🛡 GOD: ${enemyDisplayName(archer)} の矢 (-${dmg} → 0)`, "info");
    return;
  }
  if (rollShimmerParry()) {
    showShimmerFx(player.x, player.y);
    log(`✦ Shimmer: ${enemyDisplayName(archer)} の矢を弾いた! (-${dmg} → 0)`, "win");
    return;
  }
  player.hp -= dmg;
  showFloatingDamage(player.x, player.y, dmg, "");
  spawnHurtFx(player.x, player.y);
  pulse(hpEl, "hurt", 400);
  pulse(mapEl, "shake", 240);
  if (player.hp <= 0) {
    player.hp = 0;
    log(`矢に倒れた… -${dmg}`, "lose");
    gameOver = true;
    showGameEndBanner("✗ GAME OVER", "#ff5544");
  } else {
    log(`🏹 ${enemyDisplayName(archer)} の矢! -${dmg}`, "attack");
  }
}

// クランクブリッツ: 4 方向直線 5 マスに視線が通ればロケットグラブ。
//   ダメージを与えつつ、プレイヤーを敵の目の前 (距離 1) まで強制移動。
//   隣接 (dist 1) では発動しない (近接攻撃に任せる)。
//   壁/他敵で線が遮られたら撃てない。
const CRANK_GRAB_RANGE = 5;
function tryCrankGrab(enemy) {
  const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
  for (const d of dirs) {
    for (let step = 1; step <= CRANK_GRAB_RANGE; step++) {
      const x = enemy.x + d.dx * step;
      const y = enemy.y + d.dy * step;
      if (!inBounds(x, y)) break;
      if (walls.has(`${x},${y}`)) break;
      const blocker = enemies.find((o) => o !== enemy && o.hp > 0 && o.x === x && o.y === y);
      if (blocker) break;
      if (player.x === x && player.y === y) {
        // 隣接 (step 1) では grab せず melee に任せる
        if (step === 1) return false;
        crankGrab(enemy, d, step);
        return true;
      }
    }
  }
  return false;
}

function crankGrab(enemy, dir, dist) {
  const dmg = enemy.atk != null ? enemy.atk : ENEMY_ATK;
  // フック飛行 → 着弾 → 引き戻し の順で演出
  spawnHookFx(enemy.x, enemy.y, dir, dist);
  if (playerInvincible) {
    showGodFx(player.x, player.y);
    log(`🛡 GOD: ${enemyDisplayName(enemy)} のロケットグラブ (-${dmg} → 0) / 引き寄せ`, "info");
    // 引き寄せ移動は続行 (ダメだけ無効、強制移動は性質上残す)
  } else if (rollShimmerParry()) {
    showShimmerFx(player.x, player.y);
    log(`✦ Shimmer: ${enemyDisplayName(enemy)} のロケットグラブを弾いた! (-${dmg} → 0) / 引き寄せ`, "win");
    // 引き寄せだけ続行 (ダメ無効)
  } else {
    player.hp -= dmg;
    showFloatingDamage(player.x, player.y, dmg, "");
    spawnHurtFx(player.x, player.y);
    pulse(hpEl, "hurt", 400);
    pulse(mapEl, "shake", 240);
    if (player.hp <= 0) {
      player.hp = 0;
      log(`🪝 グラブに倒れた… -${dmg}`, "lose");
      gameOver = true;
      showGameEndBanner("✗ GAME OVER", "#ff5544");
      return;
    }
  }
  // プレイヤーをクランクブリッツの目の前 (step 1) へ強制移動。
  //   destination = enemy + dir (line check で step 1 は通ること確定)
  const destX = enemy.x + dir.dx;
  const destY = enemy.y + dir.dy;
  const oldKey = `${player.x},${player.y}`;
  const wasOnPit = pits.has(oldKey);
  player.x = destX;
  player.y = destY;
  if (wasOnPit && oldKey !== `${destX},${destY}`) {
    pits.delete(oldKey);
    log("🕳 ピットが崩れた (使い捨て)", "info");
  }
  // プレイヤーの向きをクランクブリッツに向ける (即反撃しやすく)
  player.facing = { dx: -dir.dx, dy: -dir.dy };
  log(`🪝 ${enemyDisplayName(enemy)} のロケットグラブ! -${dmg} / 引き寄せ`, "attack");
  renderMap();
  renderHud();
}

// 戻り値: "attacked" | "moved" | "skipped"
//   "attacked" のみが「意味あるイベント」として拍を刻む対象
//
// ターゲット選択: プレイヤー / 赤ちゃんのうちマンハッタン距離が近い方。
//   同距離なら 50% でランダム選択 (赤ちゃんに偏らないように)。
//   赤ちゃんが死亡/未取得ならプレイヤー固定。
function pickEnemyTarget(enemy) {
  const pdist = Math.abs(player.x - enemy.x) + Math.abs(player.y - enemy.y);
  // 母に渡した後の赤ちゃんは聖域 (ターゲットに含めない)
  if (!baby || baby.hp <= 0 || babyWithMother) {
    return { x: player.x, y: player.y, kind: "player", dist: pdist };
  }
  const bdist = Math.abs(baby.x - enemy.x) + Math.abs(baby.y - enemy.y);
  if (bdist < pdist) return { x: baby.x, y: baby.y, kind: "baby", dist: bdist };
  if (pdist < bdist) return { x: player.x, y: player.y, kind: "player", dist: pdist };
  return Math.random() < 0.5
    ? { x: baby.x, y: baby.y, kind: "baby", dist: bdist }
    : { x: player.x, y: player.y, kind: "player", dist: pdist };
}

// 土遁の出現先候補: 対象の隣接 8 マスから最初の通行可能セルを返す
function findBurrowEmergeSpot(targetX, targetY, mover) {
  const candidates = [
    [1,0],[-1,0],[0,1],[0,-1],
    [1,1],[-1,1],[1,-1],[-1,-1],
  ];
  for (const [dx, dy] of candidates) {
    const x = targetX + dx, y = targetY + dy;
    if (!inBounds(x, y)) continue;
    if (walls.has(`${x},${y}`)) continue;
    if (pits.has(`${x},${y}`)) continue;
    if (goal.x === x && goal.y === y) continue;
    if (player.x === x && player.y === y) continue;
    if (baby && baby.hp > 0 && baby.x === x && baby.y === y) continue;
    if (npcs.some((n) => n.x === x && n.y === y)) continue;
    if (enemies.some((e) => e !== mover && e.hp > 0 && e.x === x && e.y === y)) continue;
    return { x, y };
  }
  return null;
}

function enemyAct(enemy) {
  if (enemy.status.some((s) => s.type === "freeze" || s.type === "shock")) {
    return "skipped";
  }
  // クランクブリッツ: グラブ視線が通れば優先 (引き寄せて削る)
  // (赤ちゃんは射程に入れない — 既存 tryCrankGrab はプレイヤー専用ロジックのため改修不要)
  if (enemy.abilities && enemy.abilities.includes("rocket-grab-5")) {
    if (tryCrankGrab(enemy)) return "attacked";
    // 撃てなければ近接 AI で接近
  }
  // 遠隔3マス能力持ち (アーチャー等) は射線が通れば射撃優先 (距離 1 でも矢を放つ)。
  // abilities ベース: "ranged-3" を封印された敵は射撃せず近接 AI に落ちる。
  if (enemy.abilities && enemy.abilities.includes("ranged-3")) {
    if (tryArcherShoot(enemy)) return "attacked";
    // 撃てなければ通常移動 (greedy) — 射線を取り直すために寄る
  }

  const target = pickEnemyTarget(enemy);
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.abs(dx) + Math.abs(dy);

  if (dist === 1) {
    if (target.kind === "baby") enemyAttackBaby(enemy);
    else                        enemyAttackPlayer(enemy);
    return "attacked";
  }

  // 人面樹: 土遁 (5×5 = Chebyshev 距離 ≤ 2 に獲物がいれば隣接マスへ瞬間移動)
  // メレー (Manhattan 1) で殴れる場面は上の if (dist === 1) で既に処理済み。
  // 残るのは「斜め隣接」「2 マス先」などメレー範囲外の 5×5 圏内。
  if (enemy.abilities && enemy.abilities.includes("burrow-emerge-5")) {
    const chebDist = Math.max(Math.abs(dx), Math.abs(dy));
    if (chebDist <= 2) {
      const spot = findBurrowEmergeSpot(target.x, target.y, enemy);
      if (spot) {
        spawnBurrowFx(enemy.x, enemy.y);
        enemy.x = spot.x;
        enemy.y = spot.y;
        spawnEmergeFx(enemy.x, enemy.y);
        log(`🌀 ${enemyDisplayName(enemy)} が地中から獲物の隣に出現!`, "attack");
        return "moved";
      }
    }
  }

  if (dist > ENEMY_ALERT_RANGE) return "skipped";

  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const preferX = Math.abs(dx) >= Math.abs(dy);
  const step = (mx, my) => {
    if (mx === 0 && my === 0) return false;
    const nx = enemy.x + mx;
    const ny = enemy.y + my;
    if (isCellBlockedForEnemy(enemy, nx, ny)) return false;
    enemy.x = nx;
    enemy.y = ny;
    return true;
  };

  if (preferX) {
    if (step(sx, 0)) return "moved";
    if (step(0, sy)) return "moved";
  } else {
    if (step(0, sy)) return "moved";
    if (step(sx, 0)) return "moved";
  }
  return "skipped";
}

// マスター・サムライ: 隣接時に 1 ターンで N 連斬 (N = enemy.reds.quadStrike, 初期 4)。
//   N ヒット全弾命中で次の自分のターン (= 次のプレイヤーターン) まで「パリィ」を予約。
//   doAttack 内でパリィ判定し、武器ダメージを完全無効化する。
//   Limiter / NoiseGate で reds.quadStrike が 0 まで削られると、samuraiQuadStrike は呼ばれず
//   通常 AI (単発メレー) に落ちる。
async function samuraiQuadStrike(samurai) {
  samurai.samuraiHitsThisTurn = 0;
  const maxHits = (samurai.reds && samurai.reds.quadStrike != null) ? samurai.reds.quadStrike : 4;
  if (maxHits <= 0) return;
  for (let i = 0; i < maxHits; i++) {
    if (samurai.hp <= 0 || gameOver) break;
    const t = pickEnemyTarget(samurai);
    if (t.dist !== 1) break; // 対象が離れた (赤ちゃん死亡等含む)
    if (t.kind === "baby") {
      if (!baby || baby.hp <= 0) break;
      enemyAttackBaby(samurai);
    } else {
      enemyAttackPlayer(samurai);
    }
    samurai.samuraiHitsThisTurn++;
    renderHud();
    renderEnemyStatus();
    await sleep(180);
  }
  if (samurai.samuraiHitsThisTurn >= maxHits && samurai.hp > 0) {
    samurai.parryActive = true;
    samurai.parryUntilTurn = turn + 1; // 次のプレイヤーターン (turn++ 後の値) と等価
    log(`⚔ ${enemyDisplayName(samurai)} ${maxHits}連斬完遂! 次のターンは構え (武器無効)`, "lose");
  }
}

async function enemiesActPaced() {
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    if (gameOver) break;
    // マスター・サムライ: 隣接時は連撃 async シーケンス
    // (reds.quadStrike が 0 になっていれば連撃せず通常 AI = 単発メレーに落ちる)
    if (e.type === "samurai" &&
        !e.status.some((s) => s.type === "freeze" || s.type === "shock")) {
      const maxHits = (e.reds && e.reds.quadStrike != null) ? e.reds.quadStrike : 4;
      const t = pickEnemyTarget(e);
      if (maxHits > 0 && t.dist === 1) {
        await samuraiQuadStrike(e);
        renderMap();
        renderHud();
        renderEnemyStatus();
        await sleep(PACE_MS);
        continue;
      }
      // 連撃不可 (reds 0 / 非隣接) なら通常 AI に落ちる
    }
    const result = enemyAct(e);
    if (result === "attacked") {
      // ★重要: ここで renderMap() を呼ぶとアニメ用 class (.lunging/.hurt) を
      //  className 上書きで消してしまう。HUD と敵パネルだけ更新し、
      //  タイル自体は最後まで触らない (アニメは setTimeout で自動消滅)。
      renderHud();
      renderEnemyStatus();
      await sleep(PACE_MS);
    }
  }
  renderMap();   // 全アニメ完了後に一括描画 (移動も最後にまとめて反映)
  renderEnemyStatus();
}

// ========================================================================
// ターン (トルネコ式リズム: 意味のあるイベントのみ拍を刻む)
// ========================================================================
// 拍 (敵が殴った時など意味あるイベント1個ぶんの間)
// 500ms = アニメ完了 (lunge 350ms) + 視覚的に「別イベント」と認識できる余白
const PACE_MS = 500;
let inputLocked = false;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// CSS アニメの再付与で確実に再生させるための reflow トリック
// (同一要素に同じ class を classList.add しても reflow しないと animation は restart しない)
function pulse(el, className, durationMs) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;          // 強制 reflow
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), durationMs);
}

// 能力赤字デバフ命中時の浮き文字 (Limiter / NoiseGate)
function showRedDebuffFx(tileX, tileY) {
  const t = tileAt(tileX, tileY);
  if (!t) return;
  const el = document.createElement("div");
  el.className = "floating-damage red-debuff";
  el.textContent = "▾ ABILITY -";
  el.style.left = `${t.offsetLeft + t.offsetWidth / 2}px`;
  el.style.top  = `${t.offsetTop + 4}px`;
  mapEl.appendChild(el);
  setTimeout(() => el.remove(), 760);
}

// 不死モード時の "GOD!" 浮き文字
function showGodFx(tileX, tileY) {
  const t = tileAt(tileX, tileY);
  if (!t) return;
  const el = document.createElement("div");
  el.className = "floating-damage god";
  el.textContent = "GOD!";
  el.style.left = `${t.offsetLeft + t.offsetWidth / 2}px`;
  el.style.top  = `${t.offsetTop + 4}px`;
  mapEl.appendChild(el);
  setTimeout(() => el.remove(), 760);
}

// Shimmer (確率パリィ) 発動時の演出: 紫の波紋 + 浮き文字
function showShimmerFx(tileX, tileY) {
  const t = tileAt(tileX, tileY);
  if (!t) return;
  // 紫の波紋オーバーレイ
  const o = document.createElement("div");
  o.className = "shimmer-fx";
  o.style.left = `${t.offsetLeft}px`;
  o.style.top  = `${t.offsetTop}px`;
  mapEl.appendChild(o);
  setTimeout(() => o.remove(), 540);
  // 浮き文字
  const el = document.createElement("div");
  el.className = "floating-damage shimmer-parry";
  el.textContent = "SHIMMER!";
  el.style.left = `${t.offsetLeft + t.offsetWidth / 2}px`;
  el.style.top  = `${t.offsetTop + 4}px`;
  mapEl.appendChild(el);
  setTimeout(() => el.remove(), 760);
}

// 装備中 Shimmer の解決後 red を合算 (modifier 効果を含む)。
// Q/W/E は武器の有無に関わらず常に computeChainItems を通す:
//   武器が無いボードは「ダメ 0 の仮想 source」でチェーン解決し、
//   左隣の modifier (Booster/Overdrive/PowerStack/Lift/Push/Trim/Cut) を Shimmer に適用する。
// BABY ボードは現状 modifier ペダルを受理しないため (Shimmer 自体も passive 経由で
// 拒否される) 素の red を加算するだけで十分。
function computeShimmerRedTotal() {
  let total = 0;
  const FAKE_SRC = { damage: 0 };
  for (const key of activeBoardKeys()) {
    const slots = getSlotPedalIds(key);
    const weaponId = weapons[key];
    const src = (weaponId && WEAPONS[weaponId]) ? WEAPONS[weaponId] : FAKE_SRC;
    const items = computeChainItems(src, slots);
    for (const it of items) {
      if (it.pedal && it.pedal.id === "shimmer") total += it.red;
    }
  }
  if (baby && !babyWithMother) {
    for (const it of baby.board) {
      if (it && it.id === "shimmer") total += PEDALS.shimmer.red || 0;
    }
  }
  return total;
}

// 被弾直前に呼び出し、true ならパリィ成立 (ダメージ無効化)。
function rollShimmerParry() {
  const totalRed = computeShimmerRedTotal();
  if (totalRed <= 0) return false;
  const chance = Math.min(1, 0.05 * totalRed);
  return Math.random() < chance;
}

// パリィ表示 (PARRY! の浮き文字)
function showParryFx(tileX, tileY) {
  const t = tileAt(tileX, tileY);
  if (!t) return;
  const el = document.createElement("div");
  el.className = "floating-damage parry";
  el.textContent = "PARRY!";
  el.style.left = `${t.offsetLeft + t.offsetWidth / 2}px`;
  el.style.top  = `${t.offsetTop + 4}px`;
  mapEl.appendChild(el);
  setTimeout(() => el.remove(), 760);
}

// 土遁: 潜入時/出現時 共に同じ渦エフェクトを置く
function spawnBurrowFx(tileX, tileY) {
  const t = tileAt(tileX, tileY);
  if (!t) return;
  const o = document.createElement("div");
  o.className = "burrow-fx";
  o.style.left = `${t.offsetLeft}px`;
  o.style.top  = `${t.offsetTop}px`;
  mapEl.appendChild(o);
  setTimeout(() => o.remove(), 540);
}
const spawnEmergeFx = spawnBurrowFx;

// 被弾フラッシュ overlay (mapEl 直下、攻撃ごとに新規 DOM)
function spawnHurtFx(tileX, tileY) {
  const t = tileAt(tileX, tileY);
  if (!t) return;
  const o = document.createElement("div");
  o.className = "hurt-fx";
  o.style.left = `${t.offsetLeft}px`;
  o.style.top  = `${t.offsetTop}px`;
  mapEl.appendChild(o);
  setTimeout(() => o.remove(), 360);
}

// 敵 lunge overlay (殴る方向 dx,dy に飛ぶ。攻撃ごとに新規 DOM)
function spawnLungeFx(fromX, fromY, dx, dy) {
  const t = tileAt(fromX, fromY);
  if (!t) return;
  const o = document.createElement("div");
  o.className = "lunge-fx";
  o.style.left = `${t.offsetLeft}px`;
  o.style.top  = `${t.offsetTop}px`;
  o.style.setProperty("--lunge-x", `${dx * 14}px`);
  o.style.setProperty("--lunge-y", `${dy * 14}px`);
  mapEl.appendChild(o);
  setTimeout(() => o.remove(), 380);
}

// フック overlay (クランクブリッツのロケットグラブ: 起点 → 着弾点 → 戻る)
//   1) 起点から着弾点まで伸びる (鎖 + フック)
//   2) フックがプレイヤーを掴んで戻る (引き寄せ演出)
function spawnHookFx(fromX, fromY, dir, dist) {
  const start = tileAt(fromX, fromY);
  if (!start) return;
  const tileSize = start.offsetWidth;
  // 鎖: 起点 → 着弾点を結ぶ細長い線 (伸びる + 縮む)
  const chain = document.createElement("div");
  chain.className = "hook-chain";
  chain.style.left = `${start.offsetLeft + tileSize / 2}px`;
  chain.style.top  = `${start.offsetTop + tileSize / 2}px`;
  chain.style.setProperty("--chain-x", `${dir.dx * tileSize * dist}px`);
  chain.style.setProperty("--chain-y", `${dir.dy * tileSize * dist}px`);
  // 線の長さと回転 (横/縦)
  const isHoriz = dir.dx !== 0;
  chain.style.setProperty("--chain-len", `${tileSize * dist}px`);
  chain.style.setProperty("--chain-rot", isHoriz ? (dir.dx > 0 ? "0deg" : "180deg") : (dir.dy > 0 ? "90deg" : "-90deg"));
  mapEl.appendChild(chain);
  setTimeout(() => chain.remove(), 520);
  // フック先端
  const hook = document.createElement("div");
  hook.className = "hook-fx";
  hook.textContent = "🪝";
  hook.style.left = `${start.offsetLeft}px`;
  hook.style.top  = `${start.offsetTop}px`;
  hook.style.setProperty("--hook-x", `${dir.dx * tileSize * dist}px`);
  hook.style.setProperty("--hook-y", `${dir.dy * tileSize * dist}px`);
  mapEl.appendChild(hook);
  setTimeout(() => hook.remove(), 520);
}

// 矢 overlay (アーチャーが射撃した時、起点 → 着弾点まで飛ぶ)
function spawnArrowFx(fromX, fromY, dir, dist) {
  const start = tileAt(fromX, fromY);
  if (!start) return;
  const o = document.createElement("div");
  o.className = "arrow-fx";
  o.textContent = dir.dx === 1 ? "→" : dir.dx === -1 ? "←" : dir.dy === 1 ? "↓" : "↑";
  // tileサイズの取得 (32 想定だが念のため計算)
  const tileSize = start.offsetWidth;
  o.style.left = `${start.offsetLeft}px`;
  o.style.top  = `${start.offsetTop}px`;
  o.style.setProperty("--arrow-x", `${dir.dx * tileSize * dist}px`);
  o.style.setProperty("--arrow-y", `${dir.dy * tileSize * dist}px`);
  mapEl.appendChild(o);
  setTimeout(() => o.remove(), 280);
}

async function performAction(actionFn) {
  if (gameOver || inputLocked) return;
  if (activeDialog) return; // ダイアログ中はクリックで進める (キーは別ハンドラ)
  inputLocked = true;
  try {
    const consumed = await actionFn();
    if (consumed) {
      await tickStatusesPaced();
      if (!gameOver) await enemiesActPaced();
      await tickRagePaced(); // 怒り残ターン減算は敵行動「後」
      turn++;
      checkWin();
      // 赤ちゃんの定期発話 (クールダウンあり)
      if (baby && baby.hp > 0) babySaySpeech();
      // NPC 隣接で会話発火
      checkNpcAdjacency();
    }
  } finally {
    renderAll();
    inputLocked = false;
  }
}

function checkWin() {
  if (player.x === goal.x && player.y === goal.y && !gameOver) {
    log(`★ ${currentFloor.name} クリア！`, "win");
    // 10F (idx 9) ゴール: 母の鍵が無ければラン完遂 (赤ちゃん死亡時 or 7F イベント未消化)。
    // 鍵あり → 11F (idx 10) へ進む。
    if (currentFloorIdx === 9 && !motherKey) {
      showRunClear();
      return;
    }
    if (currentFloorIdx + 1 >= FLOORS.length) {
      // 最終フロア突破
      showRunClear();
    } else {
      // 次フロアへ
      loadFloor(currentFloorIdx + 1);
    }
  }
}

function showGameEndBanner(text, color) {
  if (document.getElementById("game-end-banner")) return;
  const banner = document.createElement("div");
  banner.id = "game-end-banner";
  banner.style.color = color;
  banner.style.borderColor = color;
  banner.style.boxShadow = `0 0 50px ${color}66`;
  banner.innerHTML = `${text}<span class="sub">F5 でリスタート</span>`;
  document.body.appendChild(banner);
}

// ========================================================================
// 入力
// ========================================================================
// 2 段階発射: 1 度目で構え（範囲予告）、同じキー 2 度目で発射
function performAttackKey(key) {
  if (gameOver) return;
  if (!weapons[key]) {
    log(`[${key.toUpperCase()}] 武器が無い。インベントリから装備して`);
    return;
  }
  if (pendingAttack === key) {
    // 同じキーをもう一度 → 発射
    pendingAttack = null;
    performAction(() => doAttack(key));
  } else {
    // 別の攻撃キー or 初回 → 構え（ターン消費なし）
    pendingAttack = key;
    // 初回構え時にエイム案内の吹き出しを有効化
    if (!tutorialDismissed.aim) aimTutorialActive = true;
    renderAll();
  }
}

// 構え中の向き変更 (ターン消費なし)
function rotateFacing(dx, dy) {
  player.facing = { dx, dy };
  // 構え中の矢印を 1 回でも使ったら案内チュートリアルを自動終了
  tutorialDismissed.aim = true;
  aimTutorialActive = false;
  renderAll();
}

document.addEventListener("keydown", (e) => {
  if (gameOver) return;
  // システム通知ダイアログ中: Space / Enter で閉じる。他キーは無効。
  const sysDialog = document.getElementById("system-dialog");
  if (sysDialog) {
    if (e.key === " " || e.key === "Enter" || e.key === "Escape") {
      sysDialog.remove();
      document.getElementById("system-dialog-backdrop")?.remove();
      e.preventDefault();
    }
    return;
  }
  // NPC ダイアログ中: Space / Enter / クリック相当キーで台詞送り。他キーは無効。
  if (activeDialog) {
    if (e.key === " " || e.key === "Enter") {
      advanceNpcDialog();
      e.preventDefault();
    }
    return;
  }
  switch (e.key) {
    case "ArrowUp":
      if (pendingAttack) rotateFacing(0, -1);
      else performAction(() => tryMove(0, -1));
      e.preventDefault(); break;
    case "ArrowDown":
      if (pendingAttack) rotateFacing(0,  1);
      else performAction(() => tryMove(0,  1));
      e.preventDefault(); break;
    case "ArrowLeft":
      if (pendingAttack) rotateFacing(-1, 0);
      else performAction(() => tryMove(-1, 0));
      e.preventDefault(); break;
    case "ArrowRight":
      if (pendingAttack) rotateFacing( 1, 0);
      else performAction(() => tryMove( 1, 0));
      e.preventDefault(); break;
    case "q": case "Q": performAttackKey("q"); e.preventDefault(); break;
    case "w": case "W": performAttackKey("w"); e.preventDefault(); break;
    case "e": case "E": performAttackKey("e"); e.preventDefault(); break;
    case "r": case "R": if (board.r) performAttackKey("r"); e.preventDefault(); break;
    case "t": case "T": if (board.t) performAttackKey("t"); e.preventDefault(); break;
    case "y": case "Y": if (board.y) performAttackKey("y"); e.preventDefault(); break;
    case "Escape":
      if (pendingAttack) { pendingAttack = null; renderAll(); }
      break;
    case "1": case "2": case "3": case "4":
      if (activeBoard === "b") {
        removePedalFromBabySlot(parseInt(e.key, 10) - 1);
      } else {
        removePedalFromSlot(activeBoard, parseInt(e.key, 10) - 1);
      }
      e.preventDefault();
      break;
    case "d": case "D": {
      // 🐞 デバッグメニューの表示トグル
      const shown = floorWarpEl.style.display !== "none";
      floorWarpEl.style.display = shown ? "none" : "";
      debugBar.style.display = shown ? "none" : "flex";
      log(`🐞 デバッグメニュー: ${shown ? "OFF" : "ON"}`, "info");
      e.preventDefault();
      break;
    }
  }
});

// ========================================================================
// 起動
// ========================================================================
// コントロール表示
const _ctrlEl = document.querySelector("#controls p");
if (_ctrlEl) {
  _ctrlEl.innerHTML =
    '移動: ← ↑ ↓ → / 攻撃 Q W E (1度目=構え, 2度目=発射, Esc=解除) <br>' +
    '武器は各スロット (Q/W/E) に装備、初期は <span style="color:#ffd866">Q=ロングソード</span>のみ。' +
    'ビーム / オーラショットは床落ち or 敵ドロップで入手 → インベントリ・クリックで装備 <br>' +
    '<b style="color:#ff4d4d">赤字</b>=modifier 倍化対象 / 黒字=不可 / ' +
    'ペダルは<b>ドラッグ&ドロップ</b>で装着、' +
    '<span style="color:#88ddff">🔧 P</span>でのみ取り外し、' +
    '<span style="color:#ffd866">G</span>到達で次フロア';
}

// ログをマップの直下へ移動 (index.html は触らず JS で並び替え)
//   index.html の元順: hud → map → board-panel → legend → log → controls
//   ↓
//   実際の表示順: hud → map → log → board-panel → legend → controls
(() => {
  if (!mapEl || !logEl || !mapEl.parentNode) return;
  mapEl.parentNode.insertBefore(logEl, mapEl.nextSibling);
})();

// 凡例を新ペダル仕様に書き換え (index.html は触らず JS で上書き)
const _legendEl = document.getElementById("legend");
if (_legendEl) {
  // 加護 (baby-locked) は通常凡例から除外 (7F イベントで初対面の時に名乗らせたい)
  const legendItems = Object.values(PEDALS).filter((p) => p.kind !== "baby-locked").map((p) => {
    const descHtml = renderDescWithRed(p.desc, p.red, p.red);
    return (
      `<span class="legend-item" style="display:inline-block;margin:2px 6px;">` +
      `<b style="color:${p.color}">${p.icon} ${p.name}</b> ` +
      `<span style="opacity:0.85">${descHtml}</span>` +
      `</span>`
    );
  });
  legendItems.push(
    `<span class="legend-item" style="display:block;margin-top:8px;opacity:0.85;font-size:10px">` +
    `<b style="color:#ff4d4d">赤字</b>=Booster (×) の倍化対象 / ` +
    `状態異常は命中ごとに 50% 抽選 (Tremolo▶/Delay◌ で発動率↑) / ` +
    `ペダルにマウスを乗せると詳細` +
    `</span>`
  );
  _legendEl.innerHTML = legendItems.join("");
}

// 起動: グリッドを構築、Floor 1 をロード
log(`目標: 全 ${FLOORS.length} フロア通しでクリア。各 G で次へ。`);
log(`床のペダル文字 (D/T/X/M…) を踏むと所持、敵を倒すと一定確率でドロップ。`);

setupGrid();
loadFloor(0);
log("Q/W/E にそれぞれ独立したペダルボード。ラベルクリックで切替。");
