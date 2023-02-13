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

import { SymbolEncoder } from "./SymbolEncoder.ts";

import { SizedLayout } from "./SizedLayout.ts";
import { Coord } from "./Coord.ts";
import { MonochromeGIF } from "./MonochromeGIF.ts";
import { DrawInterface } from "./DrawInterface.ts";
import { DrawBlockCharacter } from "./DrawBlockCharacter.ts";

const LAYOUT_CACHE: Array<SizedLayout> = [];

export class Encoder {
  private _symbolEncoder: SymbolEncoder;
  private _invertedImage: boolean;
  private _addedEcc: boolean;
  private _selectedDimensions: boolean;

  constructor() {
    this._symbolEncoder = new SymbolEncoder();
    this._invertedImage = false;
    this._addedEcc = false;
    this._selectedDimensions = false;
    return this;
  }

  encodeAscii(data: string) {
    this._symbolEncoder.encodeAscii(data);
    return this;
  }

  encodeC40(data: string) {
    this._symbolEncoder.encodeC40(data);
    return this;
  }

  encodeText(data: string) {
    this._symbolEncoder.encodeText(data);
    return this;
  }

  encodeX12(data: string) {
    this._symbolEncoder.encodeX12(data);
    return this;
  }

  inverted() {
    this._invertedImage = true;
    return this;
  }

  finalize(canvas: DrawInterface) {
    if (!this._addedEcc) {
      this._addedEcc = true;
      this._symbolEncoder.generateEcc();
    }

    // Timing Pattern
    for (let x = this._symbolEncoder.moduleSqd; x--;) {
      for (let y = this._symbolEncoder.moduleSqd; y--;) {
        // Single Cell at Left Bottom of module
        const px = x * (this._symbolEncoder.edgeLength + 2);
        const py = (y + 1) * (this._symbolEncoder.edgeLength + 2) - 1;

        canvas.draw(new Coord(px, py));

        // Solid Lines Left and Bottom
        for (let l = this._symbolEncoder.edgeLength + 2; l--;) {
          canvas.draw(new Coord(px, py - l));
          canvas.draw(new Coord(px + l, py));
        }

        // Dotted Cells Top and Right
        for (let l = this._symbolEncoder.edgeLength + 2; (l -= 2);) {
          canvas.draw(
            new Coord(px + this._symbolEncoder.edgeLength + 1, py - l),
          );
          canvas.draw(
            new Coord(px + l, py - this._symbolEncoder.edgeLength - 1),
          );
        }
      }
    }

    // Contents
    const edgeLength = this._symbolEncoder.edgeLength *
      this._symbolEncoder.moduleSqd;

    if (!LAYOUT_CACHE[edgeLength]) {
      LAYOUT_CACHE[edgeLength] = new SizedLayout(edgeLength);
    }

    const sizedLayout = LAYOUT_CACHE[edgeLength];

    for (let i = 0; i < this._symbolEncoder.array.length; i++) {
      const currentSymbol = this._symbolEncoder.array[i];

      for (let j = 0; j < 8; j++) {
        if (((currentSymbol >>> j) & 1) !== 0) {
          const coord = sizedLayout.pixelCluster[i * 8 + j];
          const xOffset = Math.floor(coord.x / this._symbolEncoder.edgeLength) *
            2;
          const yOffset = Math.floor(coord.y / this._symbolEncoder.edgeLength) *
            2;

          canvas.draw(new Coord(coord.x + xOffset + 1, coord.y + yOffset + 1));
        }
      }
    }

    if (sizedLayout.hasUnusedSpace) {
      canvas.draw(new Coord(edgeLength, edgeLength));
      canvas.draw(new Coord(edgeLength - 1, edgeLength - 1));
    }
  }

  toText() {
    if (!this._selectedDimensions) {
      this._selectedDimensions = true;
      this._symbolEncoder.selectSymbolDimensions();
    }

    const canvas = new DrawBlockCharacter(
      this._symbolEncoder.moduleSqd * (this._symbolEncoder.edgeLength + 2),
      this._invertedImage,
    );

    this.finalize(canvas);

    return canvas.toByteArray();
  }

  toGIF() {
    if (!this._selectedDimensions) {
      this._selectedDimensions = true;
      this._symbolEncoder.selectSymbolDimensions();
    }

    const canvas = new MonochromeGIF(
      this._symbolEncoder.moduleSqd * (this._symbolEncoder.edgeLength + 2),
      this._invertedImage,
    );

    this.finalize(canvas);

    return canvas.toByteArray();
  }
}
