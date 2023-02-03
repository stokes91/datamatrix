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

// wget -O 'Hello World.gif' http://localhost:8080/?chl=Hello+World
//
// This will save a gif encoding of the requested chl query parameter.

import {Encoder} from "../mod.ts";

// Based on the base Deno webserver.ts example at
// https://deno.land/manual@v1.30.0/examples/http_server

const server = Deno.listen({ port: 8080 });
console.log(`HTTP webserver running.  Access it at:  http://localhost:8080/`);

for await (const conn of server) {

  serveHttp(conn);
}

async function serveHttp(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);

  for await (const requestEvent of httpConn) {

    const url = new URL(requestEvent.request.url);
    console.log("Path:", url.pathname);
    console.log("Query parameters:", url.searchParams);

    const chl = url.searchParams.get('chl');

    if (!chl) {
      requestEvent.respondWith(
        new Response('Expected data for the barcode in the form ?chl=<data>', {
          status: 400,
          headers: {
            'content-type': 'text/plain'
          }
        }),
      );
      return;
    }

    const data = decodeURI(chl);

    const symbols = new Encoder();

    if (/^[A-Z\d\>\ \*\n]{1,}$/.test(data)) {
      symbols.encodeX12(data);
    } else if (/^[A-Z\d]{1,}$/.test(data)) {
      symbols.encodeC40(data);
    } else if (/^[a-z\d]{1,}$/.test(data)) {
      symbols.encodeText(data);
    } else {  // More complicated swapping between character sets is possible.
      symbols.encodeAscii(data);
    }

    const body = symbols.selectSymbolDimensions().generateEcc().toByteArray();

    requestEvent.respondWith(
      new Response(body, {
        status: 200,
        headers: {
          'content-type': 'image/gif'
        }
      }),
    );
  }
}