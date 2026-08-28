// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.

export function wlToHex(nm) {
  let r, g, b;
  if (nm < 440) {
    r = 0.3 + (0.7 * (440 - nm)) / 60;
    g = 0;
    b = 1;
  } else if (nm < 490) {
    r = 0;
    g = (nm - 440) / 50;
    b = 1;
  } else if (nm < 510) {
    r = 0;
    g = 1;
    b = (510 - nm) / 20;
  } else if (nm < 580) {
    r = (nm - 510) / 70;
    g = 1;
    b = 0;
  } else if (nm < 645) {
    r = 1;
    g = (645 - nm) / 65;
    b = 0;
  } else {
    r = 1;
    g = 0;
    b = 0;
  }
  const gamma = 0.8;
  r = Math.round(255 * Math.pow(Math.max(0, r), gamma));
  g = Math.round(255 * Math.pow(Math.max(0, g), gamma));
  b = Math.round(255 * Math.pow(Math.max(0, b), gamma));
  return (r << 16) | (g << 8) | b;
}

export const WL_COLORS = { F: 0x7799ff, d: 0x55ddbb, C: 0xff9980 };

export const WL_VALS = { F: 0.4861327, d: 0.5875618, C: 0.6562725 };
