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

const UtahCoords = [
  { x: 0, y: 0 },
  { x: -1, y: 0 },
  { x: -2, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: -1 },
  { x: -2, y: -1 },
  { x: -1, y: -2 },
  { x: -2, y: -2 },
];

const CornerCondition = [
  [
    { x: -1, y: 3 },
    { x: -1, y: 2 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -2, y: 0 },
    { x: 2, y: -1 },
    { x: 1, y: -1 },
    { x: 0, y: -1 },
  ],
  [
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -2, y: 0 },
    { x: -3, y: 0 },
    { x: -4, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: -2 },
    { x: 0, y: -3 },
  ],
  [
    { x: -1, y: 3 },
    { x: -1, y: 2 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -2, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: -2 },
    { x: 0, y: -3 },
  ],
  [
    { x: -1, y: 1 },
    { x: -2, y: 1 },
    { x: -3, y: 1 },
    { x: -1, y: 0 },
    { x: -2, y: 0 },
    { x: -3, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
  ],
];

export class SizedLayout {
  height: number;
  width: number;

  pixelCluster: Array<Coord>;
  penPosition: Coord;
  emptyBits: Array<boolean>;
  hasUnusedSpace: boolean;

  constructor(edgeLength: number) {
    this.height = edgeLength;
    this.width = edgeLength;

    this.penPosition = new Coord(0, 4);
    this.pixelCluster = [];

    this.emptyBits = new Array(this.height * this.width).fill(true);

    do {
      this.cornerCheck().diagonalDown().diagonalUp();
    } while (
      this.penPosition.y < this.height ||
      this.penPosition.x < this.width
    );

    this.hasUnusedSpace = this.emptyBits[this.emptyBits.length - 1] === true;
  }

  push(array: Array<Coord>) {

    array.forEach((coord) => {
      if (coord.y < 0) {
        coord.y += this.height;
        coord.x += 4 - ((this.width + 4) % 8);
      }

      if (coord.x < 0) {
        coord.x += this.width;
        coord.y += 4 - ((this.height + 4) % 8);
      }

      this.pixelCluster.push(coord);
      this.emptyBits[coord.y * this.width + coord.x] = false;
    });


    return this;
  }

  cornerCondition(i: number) {
    const cornerCondition = CornerCondition[i];

    this.push(
      cornerCondition.map((pos) => {
        const coord = new Coord(pos.x, pos.y);
        if (coord.x < 0) coord.x = this.width + coord.x;
        if (coord.y < 0) coord.y = this.height + coord.y;
        return coord;
      }),
    );

    return this;
  }

  cornerCheck() {
    if (this.penPosition.y === this.height && this.penPosition.x === 0) {
      this.cornerCondition(0);
    } else if (
      this.penPosition.y === this.height - 2 &&
      this.penPosition.x === 0 &&
      this.width % 4 !== 0
    ) {
      this.cornerCondition(1);
    } else if (
      this.penPosition.y === this.height - 2 &&
      this.penPosition.x === 0 &&
      this.width % 8 === 4
    ) {
      this.cornerCondition(2);
    } else if (
      this.penPosition.y === this.height + 4 &&
      this.penPosition.x === 2 &&
      this.width % 8 === 0
    ) {
      this.cornerCondition(3);
    }
    return this;
  }

  unassigned() {
    return this.emptyBits[this.penPosition.y * this.width + this.penPosition.x];
  }

  utah() {
    this.push(
      UtahCoords.map((pos) => {
        return new Coord(
          this.penPosition.x + pos.x,
          this.penPosition.y + pos.y,
        );
      }),
    );

    return this;
  }

  diagonalDown() {
    do {
      if (
        this.penPosition.y < this.height &&
        this.penPosition.x >= 0 &&
        this.unassigned()
      ) {
        this.utah();
      }

      this.penPosition.moveBy(2, -2);
    } while (this.penPosition.y >= 0 && this.penPosition.x < this.width);

    this.penPosition.moveBy(3, 1);
    return this;
  }

  diagonalUp() {
    do {
      if (
        this.penPosition.y >= 0 &&
        this.penPosition.x < this.width &&
        this.unassigned()
      ) {
        this.utah();
      }

      this.penPosition.moveBy(-2, 2);
    } while (this.penPosition.y < this.height && this.penPosition.x >= 0);

    this.penPosition.moveBy(1, 3);
    return this;
  }
}
