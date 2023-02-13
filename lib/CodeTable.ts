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

export class CodeTable {
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
