/**
 * Convert stroked SVG elements to filled outlines.
 *
 * Font generators (svgtofont / svg2ttf) only render filled shapes.
 * Stroke-only paths (e.g. line icons from Figma / Heroicons) produce
 * zero-area glyphs → blank icons.  This module converts the most
 * common stroke patterns into equivalent filled outlines that font
 * renderers can handle.
 *
 * Supported:
 *  - <path> with M/L/H/V commands (straight line segments)
 *  - <line> elements
 *  - Stroke linecaps: round, butt, square
 */

/**
 * Parse an SVG path `d` attribute into an array of
 * { cmd, args[] } objects.  Only absolute commands are
 * handled here (the icons we target are already absolute).
 */
function parsePathData(d) {
  const commands = [];
  const re = /([MLHVZmlhvz])\s*([^MLHVZmlhvz]*)/gi;
  let m;
  while ((m = re.exec(d)) !== null) {
    const cmd = m[1];
    const nums = m[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    commands.push({ cmd, args: nums });
  }
  return commands;
}

/**
 * Given a line segment (x1,y1)→(x2,y2), stroke-width `w` and
 * linecap style, return an SVG path `d` string that represents
 * the filled outline of that stroke.
 */
function lineToFilledPath(x1, y1, x2, y2, w, linecap) {
  const hw = w / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    // Degenerate: a dot → circle
    return `M${x1 - hw} ${y1}A${hw} ${hw} 0 1 0 ${x1 + hw} ${y1}A${hw} ${hw} 0 1 0 ${x1 - hw} ${y1}Z`;
  }

  // Perpendicular offsets
  const px = (-dy / len) * hw;
  const py = (dx / len) * hw;

  // Four corners of the stroke rectangle
  const p1 = `${x1 + px} ${y1 + py}`;
  const p2 = `${x2 + px} ${y2 + py}`;
  const p3 = `${x2 - px} ${y2 - py}`;
  const p4 = `${x1 - px} ${y1 - py}`;

  if (linecap === "round") {
    // Rectangle + semicircular arcs at each end
    return `M${p1}L${p2}A${hw} ${hw} 0 0 0 ${p3}L${p4}A${hw} ${hw} 0 0 0 ${p1}Z`;
  }

  if (linecap === "square") {
    // Extend rectangle by hw along the line direction at each end
    const ex = (dx / len) * hw;
    const ey = (dy / len) * hw;
    const s1 = `${x1 - ex + px} ${y1 - ey + py}`;
    const s2 = `${x2 + ex + px} ${y2 + ey + py}`;
    const s3 = `${x2 + ex - px} ${y2 + ey - py}`;
    const s4 = `${x1 - ex - px} ${y1 - ey - py}`;
    return `M${s1}L${s2}L${s3}L${s4}Z`;
  }

  // butt (default)
  return `M${p1}L${p2}L${p3}L${p4}Z`;
}

/**
 * Detect whether a <path> is stroke-only (has stroke, no meaningful
 * fill), extract the relevant attributes, and return filled
 * replacement markup.  Returns `null` when conversion is not needed
 * or not supported.
 */
function convertPathElement(tag) {
  const attr = (name) => {
    const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
    const m = tag.match(re);
    return m ? m[1] : null;
  };

  const stroke = attr("stroke");
  if (!stroke || stroke === "none") return null; // nothing to convert

  const fill = attr("fill");
  // If the element already has a visible fill, leave it alone
  if (fill && fill !== "none") return null;

  const d = attr("d");
  if (!d) return null;

  const strokeWidth = parseFloat(attr("stroke-width") || "1");
  const linecap = attr("stroke-linecap") || "butt";

  const commands = parsePathData(d);

  // Collect line segments from consecutive M/L/H/V commands
  const segments = [];
  let cx = 0,
    cy = 0,
    startX = 0,
    startY = 0;
  let supported = true;

  for (const { cmd, args } of commands) {
    switch (cmd) {
      case "M":
        cx = args[0];
        cy = args[1];
        startX = cx;
        startY = cy;
        // M can carry implicit L args after the first pair
        for (let i = 2; i + 1 < args.length; i += 2) {
          segments.push({ x1: cx, y1: cy, x2: args[i], y2: args[i + 1] });
          cx = args[i];
          cy = args[i + 1];
        }
        break;
      case "m":
        cx += args[0];
        cy += args[1];
        startX = cx;
        startY = cy;
        for (let i = 2; i + 1 < args.length; i += 2) {
          const nx = cx + args[i],
            ny = cy + args[i + 1];
          segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
          cx = nx;
          cy = ny;
        }
        break;
      case "L":
        for (let i = 0; i + 1 < args.length; i += 2) {
          segments.push({ x1: cx, y1: cy, x2: args[i], y2: args[i + 1] });
          cx = args[i];
          cy = args[i + 1];
        }
        break;
      case "l":
        for (let i = 0; i + 1 < args.length; i += 2) {
          const nx = cx + args[i],
            ny = cy + args[i + 1];
          segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
          cx = nx;
          cy = ny;
        }
        break;
      case "H":
        segments.push({ x1: cx, y1: cy, x2: args[0], y2: cy });
        cx = args[0];
        break;
      case "h":
        segments.push({ x1: cx, y1: cy, x2: cx + args[0], y2: cy });
        cx += args[0];
        break;
      case "V":
        segments.push({ x1: cx, y1: cy, x2: cx, y2: args[0] });
        cy = args[0];
        break;
      case "v":
        segments.push({ x1: cx, y1: cy, x2: cx, y2: cy + args[0] });
        cy += args[0];
        break;
      case "Z":
      case "z":
        if (cx !== startX || cy !== startY) {
          segments.push({ x1: cx, y1: cy, x2: startX, y2: startY });
        }
        cx = startX;
        cy = startY;
        break;
      default:
        // Curves, arcs, etc. — bail out and leave the element untouched
        supported = false;
        break;
    }
    if (!supported) break;
  }

  if (!supported || segments.length === 0) return null;

  // Build filled outline for each segment
  const color = stroke === "currentColor" ? "black" : stroke;
  const paths = segments.map((s) => {
    const outline = lineToFilledPath(
      s.x1,
      s.y1,
      s.x2,
      s.y2,
      strokeWidth,
      linecap
    );
    return `<path d="${outline}" fill="${color}"/>`;
  });

  return paths.join("");
}

/**
 * Convert a <line> element to a filled path.
 */
function convertLineElement(tag) {
  const attr = (name) => {
    const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
    const m = tag.match(re);
    return m ? m[1] : null;
  };

  const stroke = attr("stroke");
  if (!stroke || stroke === "none") return null;

  const x1 = parseFloat(attr("x1") || "0");
  const y1 = parseFloat(attr("y1") || "0");
  const x2 = parseFloat(attr("x2") || "0");
  const y2 = parseFloat(attr("y2") || "0");
  const strokeWidth = parseFloat(attr("stroke-width") || "1");
  const linecap = attr("stroke-linecap") || "butt";

  const color = stroke === "currentColor" ? "black" : stroke;
  const outline = lineToFilledPath(x1, y1, x2, y2, strokeWidth, linecap);
  return `<path d="${outline}" fill="${color}"/>`;
}

/**
 * Main entry point — transform an SVG string, converting stroked
 * elements to filled outlines where possible.
 */
function convertStrokesToFills(svgString) {
  // Handle <path> elements (self-closing)
  let result = svgString.replace(
    /<path\b[^>]*\/?>/gi,
    (match) => convertPathElement(match) || match
  );

  // Handle <line> elements (self-closing)
  result = result.replace(
    /<line\b[^>]*\/?>/gi,
    (match) => convertLineElement(match) || match
  );

  return result;
}

module.exports = { convertStrokesToFills };
