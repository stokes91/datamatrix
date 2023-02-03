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

// Generates a barcode with data in different encodings.
// each encode[Type] appends text in the specified Type.

import { Encoder } from "../mod.ts";

const symbols = new Encoder();

symbols.encodeX12(`T3\r`)
  .encodeAscii(`\n!"#$%&'()*+,-./0123456789:;<=>?@`) // 1 character per symbol
  .encodeC40(`ABCDEFGHIJKLMNOPQRSTUVWXYZ`)    // 3 characters per symbol
  .encodeAscii(`[\\]^_\``)
  .encodeText(`abcdefghijklmnopqrstuvwxyz`)
  .encodeAscii(`{|}~`);

await Deno.writeFile(
 'mixedEncodingResult.gif',
 symbols.selectSymbolDimensions().generateEcc().toByteArray()
);  // 731 bytes.