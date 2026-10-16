# termenv

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]

## 📦 Installation

```sh
npm install termenv
```

Node.js 24.11.0 or later is required. CI also tests the latest Bun 1.1, 1.2, 1.3, and 1.4 releases.

## 📚 Usage

> [!NOTE]
> This package works best in Node.js or Bun. It also works in browser environments.
> Deno is no longer a tested or supported runtime. Its detection remains for compatibility.

```ts
import {
  getColorSpace,
  is16ColorSupported,
  is256ColorSupported,
  isColorsSupported,
  isTrueColorSupported,
} from "termenv";
import { isUnicodeSupported } from "termenv/utils";

console.log(getColorSpace()); // => 3 | 2 | 1 | 0
// 3: 24-bit color support (16m colors)
// 2: 8-bit color support (256 colors)
// 1: 4-bit color support (16 colors)
// 0: no color support

console.log(isColorsSupported()); // => true | false
console.log(is16ColorSupported()); // => true | false
console.log(is256ColorSupported()); // => true | false
console.log(isTrueColorSupported()); // => true | false

console.log(isUnicodeSupported()); // => true | false
```

### Utilities

```ts
import {
  ERASE_LINE,
  ERASE_LINE_LEFT,
  ERASE_LINE_RIGHT,
  ERASE_SCREEN,
  ERASE_SCREEN_LEFT,
  ERASE_SCREEN_RIGHT,
  getWindowSize,
  isUnicodeSupported,
  RESET,
  strip,
} from "termenv/utils";

// strip ansi escape codes from a string
console.log(strip("\u001B[31mHello world!\u001B[39m")); // => Hello world!

process.stdout.write(RESET); // reset the terminal
process.stdout.write(ERASE_LINE); // erase the current line
process.stdout.write(ERASE_LINE_LEFT); // erase the line to the left of the cursor
process.stdout.write(ERASE_LINE_RIGHT); // erase the line to the right of the cursor
process.stdout.write(ERASE_SCREEN); // erase the screen
process.stdout.write(ERASE_SCREEN_LEFT); // erase the screen to the left of the cursor
process.stdout.write(ERASE_SCREEN_RIGHT); // erase the screen to the right of the cursor

console.log(isUnicodeSupported()); // => true | false
console.log(getWindowSize()); // => { width: 80, height: 24 }
```

## 📄 License

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/termenv?style=flat&colorA=18181B&colorB=4169E1
[npm-version-href]: https://npmjs.com/package/termenv
[npm-downloads-src]: https://img.shields.io/npm/dm/termenv?style=flat&colorA=18181B&colorB=4169E1
[npm-downloads-href]: https://npmjs.com/package/termenv
