import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input', O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
export function run(P: Uint8Array, input: Uint8Array) {
  const D = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256), out = new Uint8Array(65536);
  let sp = 0, csp = 0, olen = 0, ip = 0, pc = 0, steps = 0, n = P.length;
  const end = (x: number) => [out.slice(0, olen), x] as const;
  for (;;) {
    if (steps === 1000000) return end(10);
    if (pc < 0 || pc >= n) return end(9);
    const op = P[pc]; let imm = 0, pop = 0, push = 0;
    switch (op) {
      case 0: imm = 0; break;
      case 3: imm = 0; pop = 1; break;
      case 1: imm = 1; push = 1; break;
      case 2: imm = 4; push = 1; break;
      case 4: imm = 0; pop = 1; push = 2; break;
      case 5: imm = 0; pop = 2; push = 2; break;
      case 6: imm = 0; pop = 2; push = 3; break;
      case 7: imm = 0; pop = 3; push = 3; break;
      case 16: case 17: case 18: case 19: case 20: case 21: case 22: case 24: case 25: case 26: case 28: case 29: case 30: case 32: case 33: case 34: imm = 0; pop = 2; push = 1; break;
      case 23: case 27: imm = 0; pop = 1; push = 1; break;
      case 48: case 51: imm = 2; break;
      case 52: imm = 0; break;
      case 49: case 50: imm = 2; pop = 1; break;
      case 64: imm = 0; pop = 1; push = 1; break;
      case 65: imm = 0; pop = 2; break;
      case 80: case 81: case 83: imm = 0; pop = 1; break;
      case 82: imm = 0; push = 1; break;
      default: return end(5);
    }
    if (pc + imm >= n) return end(9);
    steps++;
    const next = pc + 1 + imm;
    if (sp < pop) return end(2);
    if (sp - pop + push > 256) return end(3);
    pc = next;
    switch (op) {
      case 0: return end(0);
      case 1: D[sp++] = (P[next - 1] << 24) >> 24; break;
      case 2: D[sp++] = P[next - 4] | P[next - 3] << 8 | P[next - 2] << 16 | P[next - 1] << 24; break;
      case 3: sp--; break;
      case 4: D[sp] = D[sp - 1]; sp++; break;
      case 5: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 6: D[sp] = D[sp - 2]; sp++; break;
      case 7: { const t = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = t; break; }
      case 23: D[sp - 1] = -D[sp - 1] | 0; break;
      case 27: D[sp - 1] = ~D[sp - 1]; break;
      case 16: case 17: case 18: case 19: case 20: case 21: case 22: case 24: case 25: case 26: case 28: case 29: case 30: case 32: case 33: case 34: {
        const b = D[sp - 1], a = D[sp - 2]; let r = 0;
        if (op === 16) r = a + b | 0;
        else if (op === 17) r = a - b | 0;
        else if (op === 18) r = Math.imul(a, b);
        else if (op === 19) { if (!b) return end(4); r = a === -2147483648 && b === -1 ? a : a / b | 0; }
        else if (op === 20) { if (!b) return end(4); r = b === -1 ? 0 : a % b | 0; }
        else if (op === 21) { if (!b) return end(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
        else if (op === 22) { if (!b) return end(4); r = (a >>> 0) % (b >>> 0) | 0; }
        else if (op === 24) r = a & b;
        else if (op === 25) r = a | b;
        else if (op === 26) r = a ^ b;
        else if (op === 28) r = a << (b & 31);
        else if (op === 29) r = a >> (b & 31);
        else if (op === 30) r = a >>> (b & 31) | 0;
        else if (op === 32) r = a === b ? 1 : 0;
        else if (op === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        sp -= 2; D[sp++] = r; break;
      }
      case 48: { const r = (P[next - 2] | P[next - 1] << 8) << 16 >> 16; pc = next + r; break; }
      case 49: case 50: { const v = D[--sp]; if ((op === 49 ? v === 0 : v !== 0)) pc = next + (((P[next - 2] | P[next - 1] << 8) << 16) >> 16); break; }
      case 51: if (csp === 64) return end(7); C[csp++] = next; pc = P[next - 2] | P[next - 1] << 8; break;
      case 52: if (!csp) return end(8); pc = C[--csp]; break;
      case 64: if (D[sp - 1] < 0 || D[sp - 1] >= 256) return end(6); D[sp - 1] = M[D[sp - 1]]; break;
      case 65: { const addr = D[sp - 1]; if (addr < 0 || addr >= 256) return end(6); M[addr] = D[sp - 2]; sp -= 2; break; }
      case 80: { const s = String(D[sp - 1]); if (olen + s.length > 65536) return end(11); for (let i = 0; i < s.length; i++) out[olen++] = s.charCodeAt(i); sp--; break; }
      case 81: if (olen === 65536) return end(11); out[olen++] = D[--sp] & 255; break;
      case 82: D[sp++] = ip < input.length ? input[ip++] : -1; break;
      case 83: return end(D[--sp] & 255);
    }
  }
}
if (import.meta.main) {
  for (const id of readdirSync(I).sort()) {
    const d = join(O, id), [stdout, exit] = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
    mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'stdout.bin'), stdout); writeFileSync(join(d, 'exit.txt'), `${exit}\n`);
  }
}
