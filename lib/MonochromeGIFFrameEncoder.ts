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

import { CodeTable } from "./CodeTable.ts";

const EOI_CODE = 5;
const CLEAR_CODE = 4;
const CODE_MASK = 3;
const MIN_CODE_SIZE = 2;
const ENDING_BYTE = 0x3B;

export class MonochromeGIFFrameEncoder {
  subBlock: number;
  p: number;
  codeSize: number;
  clearCode: number;
  nextCode: number;
  cur: number;
  curShift: number;
  edgeLength: number;
  byteArray: Uint8Array;

  constructor(edgeLength: number, byteArray: Uint8Array) {
    this.subBlock = 1 + 29;
    this.p = 0;
    this.codeSize = MIN_CODE_SIZE + 1;
    this.clearCode = 1 << MIN_CODE_SIZE;
    this.nextCode = EOI_CODE + 1;
    this.cur = 0;
    this.curShift = 0;
    this.edgeLength = edgeLength;
    this.byteArray = byteArray;
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

  emitCode(code: number) {
    this.cur |= code << this.curShift;
    this.curShift += this.codeSize;
    this.writeBytes(8);
  }

  encodeFrame(position: number, frame: Array<number>) {
    const codeTable = new CodeTable();

    this.p = position;

    this.byteArray[this.p++] = MIN_CODE_SIZE;
    this.p++;

    let lastCode = frame[0] & CODE_MASK;
    this.emitCode(CLEAR_CODE);
    for (let i = 1; i < frame.length; i++) {
      const byte = frame[i];
      const key = (lastCode << 8) | byte;
      const pos = codeTable.indexOf(key);
      if (!~pos) {
        this.emitCode(lastCode);
        if (this.nextCode === 0x1000) {
          this.emitCode(CLEAR_CODE);
          this.nextCode = EOI_CODE + 1;
          this.codeSize = MIN_CODE_SIZE + 1;
          codeTable.clear();
        } else {
          if (this.nextCode >= 1 << this.codeSize) ++this.codeSize;
          codeTable.push(key, this.nextCode++);
        }
        lastCode = byte;
      } else {
        lastCode = codeTable.array[pos];
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

    this.byteArray[this.p++] = ENDING_BYTE;
    this.byteArray = this.byteArray.slice(0, this.p);
  }
}
