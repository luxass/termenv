/**
 * @vitest-environment jsdom
 */

import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import {
  getSupportedColorMode,
  is16ColorSupported,
  is256ColorSupported,
  isColorsSupported,
  isTrueColorSupported,
} from "../src/index.browser";

function setUserAgent(userAgent: string) {
  Object.defineProperty(navigator, "userAgent", {
    get() {
      return userAgent; // customized user agent
    },
    configurable: true,
  });
}

let userAgent: string;
let _navigator: Navigator;

beforeAll(() => {
  // store original navigator
  _navigator = navigator;

  // store original user agent
  userAgent = navigator.userAgent;
});

afterEach(() => {
  globalThis.navigator = _navigator;

  // restore original user agent
  setUserAgent(userAgent);
});

describe("get supported color mode", () => {
  it("should return `3` if userAgentData contains Chromium with version greater than 93", () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "94" }],
    };
    expect(getSupportedColorMode()).toBe(3);
  });

  it("should return `3` if userAgent contains Chrome or Chromium and version is equal to 94", () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "94" }],
    };
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    expect(getSupportedColorMode()).toBe(3);
  });

  it("should return `0` if userAgentData contains Chromium with version less than or equal to 93", () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "93" }],
    };

    expect(getSupportedColorMode()).toBe(0);
  });

  it("should return `1` if userAgent contains Chrome or Chromium and version is equal to 93", () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "93" }],
    };
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    expect(getSupportedColorMode()).toBe(1);
  });

  it("should return `1` if userAgent contains Chrome or Chromium", () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    expect(getSupportedColorMode()).toBe(1);
  });

  it("should return `0` if userAgent does not contain Chrome or Chromium", () => {
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.3");

    expect(getSupportedColorMode()).toBe(0);
  });

  it("should return `0` if navigator is not defined", () => {
    // @ts-expect-error navigator can't be set to undefined..
    delete globalThis.navigator;

    expect(getSupportedColorMode()).toBe(0);
  });
});

describe("is colors supported", () => {
  it("should return `true` if userAgentData contains Chromium with version greater than 93", () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "94" }],
    };

    expect(isColorsSupported()).toBe(true);
  });

  it("should return `true` if userAgent contains Chrome or Chromium and version is equal to 94", () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "94" }],
    };
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    expect(isColorsSupported()).toBe(true);
  });

  it("should return `false` if userAgentData contains Chromium with version less than or equal to 93", () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "93" }],
    };
    expect(isColorsSupported()).toBe(false);
  });

  it("should return `true` if userAgent contains Chrome or Chromium and version is equal to 93", () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "93" }],
    };
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    expect(isColorsSupported()).toBe(true);
  });

  it("should return `true` if userAgent contains Chrome or Chromium", () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    expect(isColorsSupported()).toBe(true);
  });

  it("should return `false` if userAgent does not contain Chrome or Chromium", () => {
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.3");

    expect(isColorsSupported()).toBe(false);
  });

  it("should return `false` if navigator is not defined", () => {
    // @ts-expect-error navigator can't be set to undefined..
    delete globalThis.navigator;

    expect(isColorsSupported()).toBe(false);
  });
});

describe("is truecolor supported", () => {
  it("should return `true` if truecolor is supported", async () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "94" }],
    };
    expect(isTrueColorSupported()).toBe(true);
  });

  it("should return `false` if some colors is supported", async () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "93" }],
    };
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.3");

    expect(isTrueColorSupported()).toBe(false);
  });

  it("should return `false` if truecolor is not supported", async () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "93" }],
    };
    expect(isTrueColorSupported()).toBe(false);
  });
});

describe("is 256 supported", () => {
  it("should return `true` if 256 colors is supported", async () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "94" }],
    };

    expect(is256ColorSupported()).toBe(true);
  });

  it("should return `false` if some colors is supported", async () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "93" }],
    };
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.3");

    expect(is256ColorSupported()).toBe(false);
  });

  it("should return `false` if 256 colors is not supported", async () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "93" }],
    };
    expect(is256ColorSupported()).toBe(false);
  });
});

describe("is 16 colors supported", () => {
  it("should return `true` if 16 colors is supported", async () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "94" }],
    };

    expect(is16ColorSupported()).toBe(true);
  });

  it("should return `false` if some colors is supported", async () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "93" }],
    };
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.3");

    expect(is16ColorSupported()).toBe(false);
  });

  it("should return `false` if 16 colors is not supported", async () => {
    globalThis.navigator.userAgentData = {
      brands: [{ brand: "Chromium", version: "93" }],
    };
    expect(is16ColorSupported()).toBe(false);
  });
});
