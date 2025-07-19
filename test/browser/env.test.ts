/// <reference types="@vitest/browser/providers/playwright" />

import { describe, expect, it } from "vitest";
import { getTerminalEnvironment } from "../../src/env";

describe("env browser integration", () => {
  describe("browser runtime detection", () => {
    it("should detect browser runtime", () => {
      const environment = getTerminalEnvironment();
      expect(environment.runtime).toBe("browser");
    });

    it("should return browser-specific defaults", () => {
      const environment = getTerminalEnvironment();

      // Browser-specific expectations
      expect(environment.argv).toEqual([]);
      expect(environment.isTTY).toBe(false);
      expect(environment.env).toEqual({});
      expect(environment.platform).toBeUndefined();
    });

    it("should prioritize browser detection over Node.js indicators", () => {
      const mockHybridEnvironment = {
        window: { chrome: true }, // Browser indicator
        process: {
          versions: { node: "18.0.0" }, // Node.js indicator
          env: { NODE_ENV: "development" },
          platform: "darwin",
        },
      };

      const environment = getTerminalEnvironment(mockHybridEnvironment);
      expect(environment.runtime).toBe("browser");
    });
  });

  describe("browser environment variations", () => {
    it("should handle Chrome browser", () => {
      const mockChrome = {
        window: { chrome: { runtime: {} } },
      };

      const environment = getTerminalEnvironment(mockChrome);
      expect(environment.runtime).toBe("browser");
    });

    it("should handle browser with window.chrome property", () => {
      const mockChromeBasedBrowser = {
        window: { chrome: true },
      };

      const environment = getTerminalEnvironment(mockChromeBasedBrowser);
      expect(environment.runtime).toBe("browser");
    });

    it("should detect unknown for non-Chrome browsers", () => {
      // Current implementation only detects Chrome-based browsers
      const mockSafari = {
        window: { safari: { pushNotification: {} } },
      };

      const environment = getTerminalEnvironment(mockSafari);
      expect(environment.runtime).toBe("unknown");
    });

    it("should detect unknown for generic browser without chrome", () => {
      const mockBrowser = {
        window: { document: { createElement: () => ({}) } },
      };

      const environment = getTerminalEnvironment(mockBrowser);
      expect(environment.runtime).toBe("unknown");
    });

    it("should handle browser extension context", () => {
      const mockExtension = {
        window: { chrome: true },
        chrome: { runtime: { id: "extension-id" } },
      };

      const environment = getTerminalEnvironment(mockExtension);
      expect(environment.runtime).toBe("browser");
    });
  });

  describe("process object handling in browser", () => {
    it("should handle missing process object", () => {
      const mockBrowserOnly = {
        window: { chrome: true },
        // No process object
      };

      const environment = getTerminalEnvironment(mockBrowserOnly);
      expect(environment.runtime).toBe("browser");
      expect(environment.env).toEqual({});
      expect(environment.argv).toEqual([]);
      expect(environment.platform).toBeUndefined();
      expect(environment.isTTY).toBe(false);
    });

    it("should use process data when available in browser context", () => {
      const mockBrowserWithProcess = {
        window: { chrome: true },
        process: {
          env: { NODE_ENV: "production", API_URL: "https://api.example.com" },
          argv: ["node", "bundle.js", "--production"],
          platform: "linux",
          stdout: { isTTY: false },
        },
      };

      const environment = getTerminalEnvironment(mockBrowserWithProcess);
      expect(environment.runtime).toBe("browser");
      expect(environment.env).toEqual({
        NODE_ENV: "production",
        API_URL: "https://api.example.com",
      });
      expect(environment.argv).toEqual(["node", "bundle.js", "--production"]);
      expect(environment.platform).toBe("linux");
      expect(environment.isTTY).toBe(false);
    });
  });

  describe("edge cases and error handling", () => {
    it("should not throw errors with malformed global objects", () => {
      const malformedGlobals = [
        { window: null },
        { window: undefined },
        { window: 42 },
        { window: "not-an-object" },
        null,
        undefined,
      ];

      malformedGlobals.forEach((mockGlobal) => {
        expect(() => getTerminalEnvironment(mockGlobal)).not.toThrow();
      });
    });

    it("should detect unknown runtime when no identifiers present", () => {
      const emptyEnvironment = {};
      const environment = getTerminalEnvironment(emptyEnvironment);
      expect(environment.runtime).toBe("unknown");
    });

    it("should handle circular references in global object", () => {
      const mockCircular: any = {
        window: { chrome: true },
      };
      mockCircular.window.self = mockCircular.window;

      expect(() => getTerminalEnvironment(mockCircular)).not.toThrow();
      const environment = getTerminalEnvironment(mockCircular);
      expect(environment.runtime).toBe("browser");
    });
  });

  describe("real-world browser scenarios", () => {
    it("should work in Chrome-based iframe context", () => {
      const mockIframe = {
        window: {
          chrome: true,
          parent: { chrome: true },
          top: { location: { href: "https://parent.example.com" } },
        },
      };

      const environment = getTerminalEnvironment(mockIframe);
      expect(environment.runtime).toBe("browser");
    });

    it("should work in Chrome-based cross-origin iframe", () => {
      const mockCrossOriginIframe = {
        window: {
          chrome: true,
          // parent and top would throw SecurityError in real cross-origin iframe
        },
      };

      const environment = getTerminalEnvironment(mockCrossOriginIframe);
      expect(environment.runtime).toBe("browser");
    });

    it("should work in Chrome-based Progressive Web App", () => {
      const mockPWA = {
        window: {
          chrome: true,
          navigator: {
            standalone: true,
            serviceWorker: { register: () => {} },
          },
        },
      };

      const environment = getTerminalEnvironment(mockPWA);
      expect(environment.runtime).toBe("browser");
    });

    it("should detect unknown for non-Chrome PWA", () => {
      const mockSafariPWA = {
        window: {
          navigator: {
            standalone: true,
            serviceWorker: { register: () => {} },
          },
        },
      };

      const environment = getTerminalEnvironment(mockSafariPWA);
      expect(environment.runtime).toBe("unknown");
    });
  });
});
