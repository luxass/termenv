# termenv

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![jsr version][jsr-version-src]][jsr-version-href]

## 📦 Installation

```sh
npm install termenv
```

## 📚 Usage

> [!NOTE]
> This package will work best in server environments like Node.js or Deno, but also works in browser environments.

```ts
import {
  getColorSpace,
  is16ColorSupported,
  is256ColorSupported,
  isColorsSupported,
  isTrueColorSupported,
  isUnicodeSupported,
} from "termenv";

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
[jsr-version-src]: https://jsr.io/badges/@luxass/termenv?style=flat&labelColor=18181B&logoColor=4169E1
[jsr-version-href]: https://jsr.io/@luxass/termenv
