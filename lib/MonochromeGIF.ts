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

import { MonochromeGIFFrameEncoder } from "./MonochromeGIFFrameEncoder.ts";
import { Coord } from "./Coord.ts";
import { DrawInterface } from "./DrawInterface.ts";

const GIFMagicNumbers: Array<number> = [
  0x47,
  0x49,
  0x46,
  0x38,
  0x37,
  0x61,
  0x00,
  0x00,
  0x00,
  0x00,
  0x80,
  0x01,
  0x00,
];

export class MonochromeGIF implements DrawInterface {
  frame: Array<number>;
  edgeLength: number;
  inverted: boolean;

  constructor(edgeLength: number, inverted?: boolean) {
    this.edgeLength = edgeLength;
    this.frame = new Array(this.edgeLength * this.edgeLength * 4).fill(1);
    this.inverted = inverted || false;
  }

  draw(coord: Coord) {
    const position = 2 * (coord.y * this.edgeLength * 2 + coord.x);

    for (let yp = 2; yp--;) {
      for (let xp = 2; xp--;) {
        const offset = yp * this.edgeLength * 2 + xp;
        this.frame[position + offset] = 0;
      }
    }
  }

  toByteArray() {
    const byteArray = new Uint8Array(
      this.edgeLength * this.edgeLength * 4 + 29,
    );

    // Copy the header verbatim
    for (let i = 0; i < 13; i++) {
      byteArray[i] = GIFMagicNumbers[i];
    }

    // Write the color pallet
    for (let i = 13; i < 16; i++) {
      byteArray[i] = this.inverted ? 0xFF : 0x00;
    }
    for (let i = 16; i < 19; i++) {
      byteArray[i] = this.inverted ? 0x00 : 0xFF;
    }

    byteArray[19] = 0x2C;

    // Image size placed in four offsets.
    const imageDim = this.edgeLength * 2;
    const szLo = imageDim & 0xff;
    const szHi = imageDim >>> 8;

    [6, 8, 24, 26].forEach((offset) => {
      byteArray[offset] = szLo;
      byteArray[offset + 1] = szHi;
    });

    const mge = new MonochromeGIFFrameEncoder(this.edgeLength, byteArray);
    mge.encodeFrame(29, this.frame);

    return mge.byteArray;
  }
}
