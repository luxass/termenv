# termenv

## 📦 Installation

```sh
npm install termenv
```

## 📚 Usage

```ts
import {
  getSupportedLevel,
  is16ColorSupported,
  is256ColorSupported,
  isColorsSupported,
  isTrueColorSupported
} from "termenv";

console.log(getSupportedLevel()); // => 3 | 2 | 1 | 0
// 3: 24-bit color support (16m colors)
// 2: 8-bit color support (256 colors)
// 1: 4-bit color support (16 colors)
// 0: no color support

console.log(isColorsSupported()); // => true | false
console.log(is16ColorSupported()); // => true | false
console.log(is256ColorSupported()); // => true | false
console.log(isTrueColorSupported()); // => true | false
```

This package also provides a `browser` export, which tries to detect the color support of the browser environment.

## 📄 License

Published under [MIT License](./LICENSE).
