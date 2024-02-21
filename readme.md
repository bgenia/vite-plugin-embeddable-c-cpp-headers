# Embeddable C/C++ Headers

A simple plugin for transforming vite build artifacts to embeddable C/C++ headers.

## Example

```html
<!doctype html>
<html lang="en">
 <head>
  <title>Demo</title>
 </head>
 <body>
  <div id="root"></div>
 </body>
</html>
```

As C:

```c
const unsigned char index_html_data[] = {60,33,100,111,99,116,121,112,101,32,104,116,109,108,62,10,60,104,116,109,108,32,108,97,110,103,61,34,101,110,34,62,10,9,60,104,101,97,100,62,10,9,9,60,116,105,116,108,101,62,68,101,109,111,60,47,116,105,116,108,101,62,10,9,60,47,104,101,97,100,62,10,9,60,98,111,100,121,62,10,9,9,60,100,105,118,32,105,100,61,34,114,111,111,116,34,62,60,47,100,105,118,62,10,9,60,47,98,111,100,121,62,10,60,47,104,116,109,108,62,10};
const unsigned int index_html_length = 121;
```

As C++:

```cpp
namespace index_html {
constexpr const unsigned char data[] = {60,33,100,111,99,116,121,112,101,32,104,116,109,108,62,10,60,104,116,109,108,32,108,97,110,103,61,34,101,110,34,62,10,9,60,104,101,97,100,62,10,9,9,60,116,105,116,108,101,62,68,101,109,111,60,47,116,105,116,108,101,62,10,9,60,47,104,101,97,100,62,10,9,60,98,111,100,121,62,10,9,9,60,100,105,118,32,105,100,61,34,114,111,111,116,34,62,60,47,100,105,118,62,10,9,60,47,98,111,100,121,62,10,60,47,104,116,109,108,62,10};
constexpr const unsigned int length = 121;
}
```

## Configuration

```ts
import { defineConfig } from "vite"
import { embeddableCCppHeaders } from "vite-plugin-embeddable-c-cpp-headers"

export default defineConfig({
 plugins: [embeddableCCppHeaders({
  language: "c" | "c++",

  topLevelNamespace: string | undefined,
  namespace: (fileName: string) => string,
  
  prepend: string[],
  include: string[],
  
  dataType: string,
  lengthType: string,

  headerExtension: string,

  filter: (fileName: string) => boolean,

  // Only for C++
  topLevelNamespaceStyle: "legacy" | "c++17",
  constexpr: boolean
 })],
})
```
