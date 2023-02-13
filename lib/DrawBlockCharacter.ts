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
import { DrawInterface } from "./DrawInterface.ts";

const INVERTED_CHARSET = "\u2588\u2584\u2580 ";
const REGULAR_CHARSET = " \u2580\u2584\u2588";

export class DrawBlockCharacter implements DrawInterface {
  frame: Array<number>;
  edgeLength: number;
  inverted: boolean;

  constructor(edgeLength: number, inverted?: boolean) {
    this.edgeLength = edgeLength;
    this.frame = new Array(this.edgeLength * this.edgeLength).fill(1);
    this.inverted = inverted || false;
  }

  draw(coord: Coord) {
    const position = (coord.y * this.edgeLength + coord.x);

    this.frame[position] = 0;
  }

  toByteArray() {
    const charset = this.inverted ? INVERTED_CHARSET : REGULAR_CHARSET;
    let output = "\n" + charset[3];

    for (let y = 0; y < this.edgeLength; y += 2) {
      for (let x = 0; x < this.edgeLength; x++) {
        let chr = this.frame[(y) * this.edgeLength + x] +
          this.frame[(y + 1) * this.edgeLength + x] * 2;

        output += charset.charAt(chr);
      }
      output += "\n" + charset[3];
    }

    return new TextEncoder().encode(output + "\n");
  }
}
