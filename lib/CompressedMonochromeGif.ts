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

import { Coord } from "./Coord.ts";

const EOI_CODE = 5;
const CLEAR_CODE = 4;
const CODE_MASK = 3;
const MIN_CODE_SIZE = 2;

class CodeTable {
  array: Array<number>;
  index: Array<number>;

  constructor() {
    this.array = [];
    this.index = [];
  }
  indexOf(key: number) {
    return this.index.indexOf(key);
  }
  push(key: number, value: number) {
    this.index.push(key);
    this.array.push(value);
  }
  clear() {
    this.index.splice(0, this.index.length);
    this.array.splice(0, this.array.length);
  }
}

export class CompressedMonochromeGif {
  data: Array<number>;
  byteArray: Uint8Array;
  subBlock: number;
  p: number;
  codeSize: number;
  clearCode: number;
  nextCode: number;
  cur: number;
  curShift: number;
  codeTable: CodeTable;
  edgeLength: number;

  constructor(edgeLength: number) {
    this.subBlock = 1 + 29;
    this.p = 2;
    this.codeSize = MIN_CODE_SIZE + 1;
    this.clearCode = 1 << MIN_CODE_SIZE;
    this.nextCode = EOI_CODE + 1;
    this.cur = 0;
    this.curShift = 0;
    this.codeTable = new CodeTable();
    this.byteArray = new Uint8Array(0);
    this.edgeLength = edgeLength;
    this.byteArray = new Uint8Array(this.edgeLength * this.edgeLength * 4 + 29);
    this.data = new Array(this.edgeLength * this.edgeLength * 4).fill(1);

    this.byteArray[0] = 0x47;
    this.byteArray[1] = 0x49;
    this.byteArray[2] = 0x46;
    this.byteArray[3] = 0x38;
    this.byteArray[4] = 0x37;
    this.byteArray[5] = 0x61;

    this.byteArray[10] = 0x80;
    this.byteArray[11] = 0x01;

    // Pallet Color 1
    this.byteArray[16] = 0xff;
    this.byteArray[17] = 0xff;
    this.byteArray[18] = 0xff;
    this.byteArray[19] = 0x2c;

    const imageDim = this.edgeLength * 2;
    const szLo = imageDim & 0xff;
    const szHi = imageDim >>> 8;

    [6, 8, 24, 26].forEach((offset) => {
      this.byteArray[offset] = szLo;
      this.byteArray[offset + 1] = szHi;
    });
  }

  writeBytes(size: number) {
    while (this.curShift >= size) {
      this.byteArray[this.p++] = this.cur & 0xff;
      this.cur >>= 8;
      this.curShift -= 8;
      if (this.p === this.subBlock + 0x100) {
        this.byteArray[this.subBlock] = 0xff;
        this.subBlock = this.p++;
      }
    }
  }

  end() {
    this.p = 29;
    this.byteArray[this.p] = MIN_CODE_SIZE;
    this.p += 2;

    let lastCode = this.data[0] & CODE_MASK;
    this.emitCode(CLEAR_CODE);
    for (let i = 1; i < this.data.length; i++) {
      const byte = this.data[i];
      const key = (lastCode << 8) | byte;
      const pos = this.codeTable.indexOf(key);
      if (!~pos) {
        this.ammend(key, lastCode);
        lastCode = byte;
      } else {
        lastCode = this.codeTable.array[pos];
      }
    }
    this.emitCode(lastCode);
    this.emitCode(EOI_CODE);
    this.writeBytes(1);
    if (this.subBlock + 1 === this.p) {
      this.byteArray[this.subBlock] = 0;
    } else {
      this.byteArray[this.subBlock] = this.p - this.subBlock - 1;
      this.byteArray[this.p++] = 0;
    }

    this.byteArray[this.p] = 0x3b;
    this.byteArray = this.byteArray.slice(0, this.p + 1);
  }

  emitCode(code: number) {
    this.cur |= code << this.curShift;
    this.curShift += this.codeSize;
    this.writeBytes(8);
  }

  ammend(key: number, value: number) {
    this.emitCode(value);
    if (this.nextCode === 0x1000) {
      this.clearTable();
    } else {
      if (this.nextCode >= 1 << this.codeSize) ++this.codeSize;
      this.codeTable.push(key, this.nextCode++);
    }
  }

  clearTable() {
    this.emitCode(CLEAR_CODE);
    this.nextCode = EOI_CODE + 1;
    this.codeSize = MIN_CODE_SIZE + 1;
    this.codeTable.clear();
  }

  draw(coord: Coord) {
    const { x, y } = coord;
    const position = 2 * (y * this.edgeLength * 2 + x);

    for (let yp = 2; yp--; ) {
      for (let xp = 2; xp--; ) {
        const offset = yp * this.edgeLength * 2 + xp;
        this.data[position + offset] = 0;
      }
    }
  }
}
