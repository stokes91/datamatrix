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

export class Coord {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  moveTo(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }

  moveBy(x: number, y: number) {
    this.x = this.x + x;
    this.y = this.y + y;
    return this;
  }

  offsetFrom(x: number, y: number) {
    return new Coord(x - this.x, y - this.y);
  }
}
