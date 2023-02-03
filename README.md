<img style="width: 100%; max-width: 603px;" src="https://user-images.githubusercontent.com/93782957/216638618-31c103bd-b328-4276-b4be-0ebd1fd95cbb.gif" alt="Reed_Solomon">

[![License: Apache 2](https://img.shields.io/badge/license-Apache%202-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
![Blazing Fast](https://img.shields.io/badge/speed-blazing%20🔥-brightgreen.svg)
![dependencies: same author](https://img.shields.io/badge/dependencies-same%20origin-salmon?logo=deno)

## A DataMatrix implementation for Deno.

Example to create the barcode above: (from test/repoUrl.ts)
```

// Generates a barcode for use in the README.md

import { Encoder } from "../mod.ts";

const symbols = new Encoder();

symbols.encodeText(`https://github.com/stokes91/deno-data-matrix`);

await Deno.writeFile(
 'repoUrlResult.gif',
 symbols.selectSymbolDimensions().generateEcc().toByteArray()
);  // 351 bytes

```

There are other encodings available:
encodeText, encodeC40, encodeX12 and encodeAscii.

All except X12 may accept any ASCII character and this code will do the apropriate work to 
get a desired character. In general, if you're working with mostly lower-case text, use Text;
and use C40 for mostly upper-case text; The number of 'shifts' to different character sets
will be reduced.

## X12
```
symbols.encodeX12(`216638618-31C103BD-B328-4276-B4BE-0EBD1FD95CBB`);
// Important: Hyphens will be dropped.
```
X12 has the most limitations and it may be suitable for unique id or product codes
keeping in mind the characters may not fall outside the specification, and this library will 
silently drop them if provided.
