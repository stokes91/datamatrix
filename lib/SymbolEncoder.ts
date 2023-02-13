/*
   Copyright 2023 Alexander Stokes
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
     http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

import {
  GaloisField,
  ReedSolomonEncoder,
} from "https://deno.land/x/reed_solomon@v2.3.3/mod.ts";

export const Encoding = {
  ASCII: 0,
  X12: 1,
  C40: 2,
  TEXT: 3,
};

import { SymbolInfo } from "./SymbolInfo.ts";

const DATAMATRIX_FIELD = new GaloisField(0x100, 0x12d, 2);

const ENCODER_CACHE: Array<ReedSolomonEncoder> = [];

const THROW_X12_ERRORS = false;

// capacity, ecc, edgeLength, moduleSqd, blocks

const SymbolSizes = [
  new SymbolInfo(1304, 62, 20, 6, 8),
  new SymbolInfo(1050, 68, 18, 6, 6),
  new SymbolInfo(816, 56, 24, 4, 6),
  new SymbolInfo(696, 68, 22, 4, 4),
  new SymbolInfo(576, 56, 20, 4, 4),
  new SymbolInfo(456, 48, 18, 4, 4),
  new SymbolInfo(368, 36, 16, 4, 4),
  new SymbolInfo(280, 56, 14, 4, 2),
  new SymbolInfo(204, 42, 24, 2, 2),

  new SymbolInfo(174, 68, 22, 2, 1),
  new SymbolInfo(144, 56, 20, 2, 1),
  new SymbolInfo(114, 48, 18, 2, 1),
  new SymbolInfo(86, 42, 16, 2, 1),
  new SymbolInfo(62, 36, 14, 2, 1),
  new SymbolInfo(44, 28, 24, 1, 1),
  new SymbolInfo(36, 24, 22, 1, 1),
  new SymbolInfo(30, 20, 20, 1, 1),
  new SymbolInfo(22, 18, 18, 1, 1),
  new SymbolInfo(18, 14, 16, 1, 1),
  new SymbolInfo(12, 12, 14, 1, 1),
  new SymbolInfo(8, 10, 12, 1, 1),
  new SymbolInfo(5, 7, 10, 1, 1),
  new SymbolInfo(3, 5, 8, 1, 1),
];

function ToX12(byte: number) {
  if (byte > 0x2f && byte < 0x3a) {
    return byte - 0x2c;
  } else if (byte > 0x40 && byte < 0x5b) {
    return byte - 0x33;
  } else if (byte === 0x2a) {
    return 0x01;
  } else if (byte === 0x3e) {
    return 0x02;
  } else if (byte === 0x20) {
    return 0x03;
  } else if (byte === 0x0d) {
    return 0x00;
  } else if (THROW_X12_ERRORS) {
    throw new Error(
      "Unexpected byte 0x" + byte.toString(16) + " in X12 Encoding",
    );
  } else {
    return 0xff;
  }
}

function Randomize253State(codewordPosition: number) {
  const pseudoRandom = ((149 * codewordPosition) % 253) + 1;
  const tempVariable = 0x81 + pseudoRandom;
  return tempVariable <= 254 ? tempVariable : tempVariable - 254;
}

export class SymbolEncoder {
  array: Array<number>;
  capacity: number;
  ecc: number;
  edgeLength: number;
  moduleSqd: number;
  blocks: number;
  blockSize: number;
  mode: number;

  constructor() {
    this.array = [];
    this.capacity = 0;
    this.ecc = 0;
    this.edgeLength = 0;
    this.mode = Encoding.ASCII;
    this.blocks = 1;
    this.moduleSqd = 1;
    this.blockSize = 0;
  }

  encodeAscii(data: string) {
    if (this.mode !== Encoding.ASCII) {
      this.array.push(0xfe);
      this.mode = Encoding.ASCII;
    }

    data
      .split("")
      .map((that) => {
        return that.charCodeAt(0) + 1;
      })
      .forEach((that) => {
        this.array.push(that);
      });

    return this;
  }

  encodeC40(data: string) {
    const unpacked = [];
    for (let i = 0; i < data.length; i += 1) {
      const byte = data.charCodeAt(i);

      if (byte == 0x20) {
        unpacked.push(0x03);
      } else if (byte >= 0x30 && byte <= 0x39) {
        unpacked.push(byte - 0x30 + 4); // 0x30 - 0x39 begin at 4.
      } else if (byte >= 0x41 && byte <= 0x5a) {
        unpacked.push(byte - 0x41 + 14); // 0x41 - 0x5a begin at 14.
      } else if (byte < 0x20) { // ' '
        unpacked.push(0x00);
        unpacked.push(byte);
      } else if (byte <= 0x2f) { // '/'
        unpacked.push(0x01);
        unpacked.push(byte - 0x21); // 0x21 - 0x2f begin at 0
      } else if (byte <= 0x40) { // '@'
        unpacked.push(0x01);
        unpacked.push(byte - 0x3a + 15); // 0x3a - 0x40 begin at 15
      } else if (byte <= 0x5f) { //  '_'
        unpacked.push(0x01);
        unpacked.push(byte - 0x5b + 22); // 0x5b - 0x5f begin at 22
      } else if (byte <= 0x7f) {
        unpacked.push(0x02);
        unpacked.push(byte - 0x60);
      } else {
        unpacked.push(0x01);
        unpacked.push(0x1e); // Hibit
        unpacked.push(byte - 0x80);
      }
    }

    if (this.mode !== Encoding.C40 && this.mode !== Encoding.ASCII) {
      this.array.push(0xfe);
      this.mode = Encoding.ASCII;
      this.array.push(0xe6);
      this.mode = Encoding.C40;
    } else if (this.mode !== Encoding.C40) {
      this.array.push(0xe6);
      this.mode = Encoding.C40;
    }

    for (let i = 0; i < unpacked.length; i += 3) {
      let v = 0x640 * unpacked[i] + 1;
      if (i + 1 < unpacked.length) v += 0x28 * unpacked[i + 1];
      if (i + 2 < unpacked.length) v += unpacked[i + 2];

      this.array.push((v >>> 8) & 0xff);
      this.array.push(v & 0xff);
    }

    return this;
  }

  encodeText(data: string) {
    const unpacked = [];
    for (let i = 0; i < data.length; i += 1) {
      const byte = data.charCodeAt(i);

      if (byte == 0x20) {
        unpacked.push(0x03);
      } else if (byte >= 0x30 && byte <= 0x39) {
        unpacked.push(byte - 0x30 + 4); // 0x30 - 0x39 begin at 4.
      } else if (byte >= 0x61 && byte <= 0x7a) {
        unpacked.push(byte - 0x61 + 14); // 0x61 - 0x7a begin at 14.
      } else if (byte < 0x20) { // ' '
        unpacked.push(0x00);
        unpacked.push(byte);
      } else if (byte <= 0x2f) { // '/'
        unpacked.push(0x01);
        unpacked.push(byte - 0x21); // 0x21 - 0x2f begin at 0
      } else if (byte <= 0x40) { // '@'
        unpacked.push(0x01);
        unpacked.push(byte - 0x3a + 15); // 0x3a - 0x40 begin at 15
      } else if (byte >= 0x5b && byte <= 0x5f) { // '[' '_'
        unpacked.push(0x01);
        unpacked.push(byte - 0x5b + 22); // 0x5b - 0x5f begin at 22
      } else if (byte == 0x60) { // '`'
        unpacked.push(0x02);
        unpacked.push(0x00); // 0x60 begins at 0
      } else if (byte <= 0x5a) { // 0x5a
        unpacked.push(0x02);
        unpacked.push(byte - 0x41 + 1); // 0x41 - 0x5a begin at 1
      } else {
        unpacked.push(0x01);
        unpacked.push(0x1e); // Hibit
        unpacked.push(byte - 0x80);
      }
    }

    if (this.mode !== Encoding.TEXT && this.mode !== Encoding.ASCII) {
      this.array.push(0xfe);
      this.mode = Encoding.ASCII;
      this.array.push(0xef);
      this.mode = Encoding.TEXT;
    } else if (this.mode !== Encoding.TEXT) {
      this.array.push(0xef);
      this.mode = Encoding.TEXT;
    }

    for (let i = 0; i < unpacked.length; i += 3) {
      let v = 0x640 * unpacked[i] + 1;
      if (i + 1 < unpacked.length) v += 0x28 * unpacked[i + 1];
      if (i + 2 < unpacked.length) v += unpacked[i + 2];

      this.array.push((v >>> 8) & 0xff);
      this.array.push(v & 0xff);
    }

    return this;
  }

  encodeX12(data: string) {
    if (this.mode !== Encoding.X12 && this.mode !== Encoding.ASCII) {
      this.array.push(0xfe);
      this.mode = Encoding.ASCII;
      this.array.push(0xee);
      this.mode = Encoding.X12;
    } else if (this.mode !== Encoding.X12) {
      this.array.push(0xee);
      this.mode = Encoding.X12;
    }

    for (let i = 0; i < data.length; i += 3) {
      let v = ToX12(data.charCodeAt(i));
      if (v == 0xff) {
        i -= 2;
        continue;
      }

      v = 0x640 * v + 1;
      if (i + 1 < data.length) v += 0x28 * ToX12(data.charCodeAt(i + 1));
      if (i + 2 < data.length) v += ToX12(data.charCodeAt(i + 2));

      this.array.push((v >>> 8) & 0xff);
      this.array.push(v & 0xff);
    }

    this.mode = Encoding.X12;
    return this;
  }

  selectSymbolDimensions() {
    let l = SymbolSizes.length;
    while (l--) {
      if (this.array.length <= SymbolSizes[l].capacity) break;
    }

    if (SymbolSizes[l].capacity < this.array.length) {
      this.array.splice(0, this.array.length - SymbolSizes[l].capacity);
    }

    const symbolInfo: SymbolInfo = SymbolSizes[l];

    this.capacity = symbolInfo.capacity;
    this.ecc = symbolInfo.ecc;
    this.edgeLength = symbolInfo.edgeLength;
    this.moduleSqd = symbolInfo.moduleSqd;
    this.blocks = symbolInfo.blocks;
    this.blockSize = symbolInfo.blockSize;

    return this;
  }

  generateEcc() {
    if (this.mode !== Encoding.ASCII && this.array.length < this.capacity) {
      this.array.push(0xfe);
    }

    if (this.array.length < this.capacity) {
      this.array.push(0x81);
    }
    while (this.array.length < this.capacity) {
      this.array.push(Randomize253State(this.array.length + 1));
    }

    if (!ENCODER_CACHE[this.ecc]) {
      ENCODER_CACHE[this.ecc] = new ReedSolomonEncoder(
        DATAMATRIX_FIELD,
        this.ecc,
      );
    }

    // Divide into interleaved blocks.
    if (this.blocks > 1) {
      const sourceArray = this.array;
      const blockCapacity = this.blockSize - this.ecc;

      this.array = new Array(this.capacity + this.ecc * this.blocks);

      for (let p = 0; p < this.array.length; p++) {
        this.array[p] = sourceArray[p];
      }

      for (let block = 0; block < this.blocks; block++) {
        const sourceMultiplexed = new Array(blockCapacity);
        let pos = 0;
        for (let d = block; d < this.blockSize; d += this.blocks) {
          sourceMultiplexed[pos++] = sourceArray[d];
        }

        const ecc: Array<number> = ENCODER_CACHE[this.ecc].encode(
          sourceMultiplexed,
        );

        pos = blockCapacity;
        for (let e = block; e < this.ecc * this.blocks; e += this.blocks) {
          this.array[this.capacity + e] = ecc[pos++];
        }
      }
    } else {
      this.array = ENCODER_CACHE[this.ecc].encode(this.array);
    }

    return this;
  }
}
