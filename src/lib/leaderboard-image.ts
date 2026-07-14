import type { ShareRow } from "./share";

/** A leaderboard row with what the image card needs to draw a ring dial. */
export interface CardRow extends ShareRow {
  ringFill: number; // 0..1
  isLoss: boolean; // true = lost weight (lime), false = gained (pink)
}

// Activity-rings theme, matching globals.css.
const BG = "#000000";
const CARD = "#141416";
const BORDER = "#2a2a2e";
const TEXT = "#f5f5f7";
const MUTED = "#8e8e93";
const LIME = "#a6ff00";
const GOLD = "#ffd60a";
const PINK = "#ff375f";
const CYAN = "#00e5ff";
const RING_COLORS = [LIME, PINK, CYAN];

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif';
const font = (weight: number, size: number) =>
  `${weight} ${size}px ${FONT_STACK}`;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Truncate text with an ellipsis so it never overflows `maxWidth`. */
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

const SILVER = "#c7c7cc";
const BRONZE = "#cd7f32";

/**
 * Podium colours for the rank number. Drawn rather than using 🥇🥈🥉 emoji:
 * the card is rasterised on the sender's device, so an emoji would depend on
 * that device having an emoji font — coloured text renders the same anywhere.
 */
function rankColor(rank: number): string {
  if (rank === 1) return GOLD;
  if (rank === 2) return SILVER;
  if (rank === 3) return BRONZE;
  return MUTED;
}

/** Draw the ring dial used on the leaderboard rows. */
function drawRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  stroke: number,
  fillPct: number,
  color: string,
  initial: string,
) {
  ctx.lineWidth = stroke;
  ctx.strokeStyle = BORDER;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const pct = Math.min(Math.max(fillPct, 0), 1);
  if (pct > 0) {
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  ctx.fillStyle = TEXT;
  ctx.font = font(700, 13);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initial, cx, cy + 0.5);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
}

/**
 * Render the leaderboard as a shareable PNG card. Returns null if the canvas
 * isn't available. Like the text version, this shows standings only — never
 * anyone's actual body weight.
 */
export async function drawLeaderboardCard(input: {
  challengeName: string;
  ruleLabel: string;
  rows: CardRow[];
  pot: number;
  currency: string;
  siteLabel: string;
}): Promise<Blob | null> {
  const SCALE = 2; // retina-crisp output
  const W = 540;
  const PAD = 28;
  const HEADER_H = 138;
  const ROW_H = 62;
  const FOOTER_H = 84;
  const rowCount = Math.max(input.rows.length, 1);
  const H = HEADER_H + rowCount * ROW_H + FOOTER_H;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "top";

  try {
    await document.fonts.ready;
  } catch {
    /* fonts are a nicety — draw regardless */
  }

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Wordmark
  ctx.fillStyle = LIME;
  ctx.font = font(800, 12);
  ctx.fillText("FAT BOYZ", PAD, 22);

  // Title + rule
  ctx.fillStyle = TEXT;
  ctx.font = font(800, 28);
  ctx.fillText(fit(ctx, input.challengeName, W - PAD * 2), PAD, 44);
  ctx.fillStyle = MUTED;
  ctx.font = font(600, 14);
  ctx.fillText(fit(ctx, input.ruleLabel, W - PAD * 2), PAD, 82);

  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 114);
  ctx.lineTo(W - PAD, 114);
  ctx.stroke();

  // Rows
  if (input.rows.length === 0) {
    ctx.fillStyle = MUTED;
    ctx.font = font(600, 15);
    ctx.fillText("Nobody's on the board yet.", PAD, HEADER_H + 16);
  }

  input.rows.forEach((row, i) => {
    const y = HEADER_H + i * ROW_H;
    const h = ROW_H - 10;

    ctx.fillStyle = CARD;
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    roundRect(ctx, PAD, y, W - PAD * 2, h, 14);
    ctx.fill();
    ctx.stroke();

    const midY = y + h / 2;

    // Rank (gold/silver/bronze for the podium)
    ctx.fillStyle = rankColor(row.rank);
    ctx.font = font(800, 17);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(row.rank), PAD + 22, midY);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Ring with initial
    drawRing(
      ctx,
      PAD + 62,
      midY,
      15,
      4,
      row.ringFill,
      RING_COLORS[(row.rank - 1) % RING_COLORS.length],
      (row.name.charAt(0) || "?").toUpperCase(),
    );

    // Metric (right), then name fills the space left over
    ctx.fillStyle = row.isLoss ? LIME : PINK;
    ctx.font = font(800, 19);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const metricW = ctx.measureText(row.metric).width;
    ctx.fillText(row.metric, W - PAD - 16, midY);

    ctx.fillStyle = TEXT;
    ctx.font = font(700, 18);
    ctx.textAlign = "left";
    const nameX = PAD + 88;
    const nameMax = W - PAD - 16 - metricW - 12 - nameX;
    ctx.fillText(fit(ctx, row.name, nameMax), nameX, midY);
    ctx.textBaseline = "top";
  });

  // Footer: pot + link
  const footerY = HEADER_H + rowCount * ROW_H + 10;
  ctx.strokeStyle = BORDER;
  ctx.beginPath();
  ctx.moveTo(PAD, footerY);
  ctx.lineTo(W - PAD, footerY);
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.font = font(800, 20);
  ctx.fillText(
    `${input.currency} ${input.pot.toLocaleString()} pot`,
    PAD,
    footerY + 18,
  );

  ctx.fillStyle = MUTED;
  ctx.font = font(600, 13);
  ctx.textAlign = "right";
  ctx.fillText(input.siteLabel, W - PAD, footerY + 24);
  ctx.textAlign = "left";

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/png"),
  );
}
