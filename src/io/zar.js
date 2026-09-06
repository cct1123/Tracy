// Extracted from the supplied Tracy prototype; see docs/architecture.md.

export function readLE(bytes, off, len) {
  let n = 0;
  for (let i = len - 1; i >= 0; i--) n = n * 256 + bytes[off + i];
  return n;
}

export function decodeNullTerminated(bytes, utf16 = false) {
  if (utf16) {
    let end = bytes.length;
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      if (bytes[i] === 0 && bytes[i + 1] === 0) {
        end = i;
        break;
      }
    }
    return new TextDecoder('utf-16le').decode(bytes.subarray(0, end));
  }
  let end = bytes.indexOf(0);
  if (end < 0) end = bytes.length;
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(
      bytes.subarray(0, end),
    );
  } catch (_) {
    return new TextDecoder('windows-1252').decode(bytes.subarray(0, end));
  }
}

export function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

export function zarLzwDecompress(src) {
  // Zemax variable-width LZW: MSB-first codes, initially 9 bits, dictionary grows.
  const dict = Array.from({ length: 256 }, (_, i) => Uint8Array.of(i));
  let width = 8,
    bit = 0,
    prev = null,
    total = 0;
  const chunks = [];
  function getBits(n) {
    let v = 0;
    for (let k = 0; k < n; k++) {
      const bi = bit >> 3,
        shift = 7 - (bit & 7);
      v = v * 2 + ((src[bi] >> shift) & 1);
      bit++;
    }
    return v;
  }
  while (true) {
    if (Math.pow(2, width) <= dict.length) width++;
    if (bit + width > src.length * 8) break;
    const code = getBits(width);
    let word;
    if (code < dict.length) word = dict[code];
    else if (prev) word = concatBytes(prev, prev.subarray(0, 1));
    else throw new Error('Invalid ZAR LZW stream');
    chunks.push(word);
    total += word.length;
    if (prev) dict.push(concatBytes(prev, word.subarray(0, 1)));
    prev = word;
    if (total > 256 * 1024 * 1024)
      throw new Error('ZAR member expands beyond 256 MB safety limit');
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export function decodeZemaxText(bytes) {
  // ZMX/AGF are normally ANSI/ASCII; tolerate UTF-8 and UTF-16LE exports.
  if (bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xfe)
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  let zeros = 0;
  for (let i = 1; i < Math.min(bytes.length, 200); i += 2)
    if (bytes[i] === 0) zeros++;
  if (zeros > 30) return new TextDecoder('utf-16le').decode(bytes);
  return new TextDecoder('windows-1252').decode(bytes);
}

export function parseZAR(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let off = 0;
  const members = [];
  while (off + 2 <= bytes.length) {
    const v0 = bytes[off],
      v1 = bytes[off + 1];
    const latest = v0 === 0xec,
      legacy = v0 === 0xea;
    if (!latest && !legacy) {
      if (members.length) break;
      throw new Error(
        `Unrecognized ZAR header 0x${v0.toString(16).padStart(2, '0')}${v1.toString(16).padStart(2, '0')}`,
      );
    }
    const totalHeader = latest ? 0x288 : 0x14c;
    if (off + totalHeader > bytes.length)
      throw new Error('Truncated ZAR header');
    const headerStart = off + 2;
    const size = latest
      ? readLE(bytes, headerStart + (0x10 - 2), 8)
      : readLE(bytes, headerStart + (0x0c - 2), 4);
    const nameStart = headerStart + (latest ? 0x30 - 2 : 0x20 - 2);
    const nameBytes = bytes.subarray(nameStart, off + totalHeader);
    let storedName = decodeNullTerminated(nameBytes, latest);
    off += totalHeader;
    if (!Number.isFinite(size) || size < 0 || off + size > bytes.length)
      throw new Error(
        `Invalid ZAR member size for ${storedName || 'unnamed member'}`,
      );
    const packed = bytes.subarray(off, off + size);
    off += size;
    const compressed = /\.LZW$/i.test(storedName);
    const fileName = compressed ? storedName.slice(0, -4) : storedName;
    const ext = (fileName.match(/\.([^.\\/]+)$/) || [])[1]?.toLowerCase() || '';
    // Only expand files the browser optical model can actually consume.
    let data = null;
    if (['zmx', 'agf'].includes(ext))
      data = compressed ? zarLzwDecompress(packed) : new Uint8Array(packed);
    members.push({ fileName, storedName, size, compressed, data, ext });
  }
  return members;
}
