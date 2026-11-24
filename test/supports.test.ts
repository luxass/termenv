import { describe, expect, it } from "vitest";

import {
  getColorSpace,
  SPACE_16_COLORS,
  SPACE_256_COLORS,
  SPACE_MONO,
  SPACE_TRUE_COLORS,
} from "../src/supports";

describe("detect CI color spaces", () => {
  it.each([
    ["AppVeyor", { CI: "1", APPVEYOR: "1" }, SPACE_16_COLORS],
    ["Azure DevOps", { TF_BUILD: "1" }, SPACE_16_COLORS],
    ["CircleCI", { CI: "1", CIRCLECI: "1" }, SPACE_16_COLORS],
    ["Drone", { CI: "1", DRONE: "1" }, SPACE_16_COLORS],
    ["Gitea Actions", { CI: "1", GITEA_ACTIONS: "1" }, SPACE_TRUE_COLORS],
    ["GitHub Actions", { CI: "1", GITHUB_ACTIONS: "1" }, SPACE_TRUE_COLORS],
    ["GitLab CI", { CI: "1", GITLAB_CI: "1" }, SPACE_16_COLORS],
    ["Netlify CI", { CI: "1", NETLIFY: "1" }, SPACE_16_COLORS],
    ["TeamCity", { TEAMCITY_VERSION: "1" }, SPACE_256_COLORS],
    ["Travis CI", { CI: "1", TRAVIS: "1" }, SPACE_16_COLORS],
    ["Vercel", { CI: "1", VERCEL: "1" }, SPACE_16_COLORS],
    ["Woodpecker", { CI: "1", WOODPECKER: "1" }, SPACE_16_COLORS],
    ["Generic CI", { CI: "1" }, SPACE_16_COLORS],
  ])("should return correct colors for %s", (_name, env, expected) => {
    const colorSpace = getColorSpace({
      process: {
        env,
        platform: process.platform,
      },
    });

    expect(colorSpace).toBe(expected);
  });
});

describe("flags & options", () => {
  it.each([
    // force enable colors using flags
    [["--color"], {}, SPACE_TRUE_COLORS],
    [["-color"], {}, SPACE_TRUE_COLORS],
    [["--color=true"], {}, SPACE_TRUE_COLORS],
    [["-color=true"], {}, SPACE_TRUE_COLORS],
    [["--color=always"], {}, SPACE_TRUE_COLORS],
    [["-color=always"], {}, SPACE_TRUE_COLORS],

    // force enable colors using env
    [[], { FORCE_COLOR: "3" }, SPACE_TRUE_COLORS],
    [[], { FORCE_COLOR: "true" }, SPACE_TRUE_COLORS],
    [[], { FORCE_COLOR: "always" }, SPACE_TRUE_COLORS],

    // force disable colors using flags
    [["--no-color"], {}, SPACE_MONO],
    [["-no-color"], {}, SPACE_MONO],
    [["--color=false"], {}, SPACE_MONO],
    [["-color=false"], {}, SPACE_MONO],
    [["--color=never"], {}, SPACE_MONO],
    [["-color=never"], {}, SPACE_MONO],

    // force disable colors using env
    [[], { NO_COLOR: "1" }, SPACE_MONO],
    [[], { FORCE_COLOR: "false" }, SPACE_MONO],
    [[], { FORCE_COLOR: "0" }, SPACE_MONO],

    // using both flags and env
    [["--color"], { FORCE_COLOR: "false" }, SPACE_MONO],
    [["--no-color"], { FORCE_COLOR: "true" }, SPACE_MONO],
    [["--color"], { NO_COLOR: "1" }, SPACE_MONO],
    [["--no-color"], { NO_COLOR: "0" }, SPACE_MONO],
  ])("using argv=(%s), env=(%s)", (argv, env, expected) => {
    const colorSpace = getColorSpace({
      process: {
        argv,
        env,
        platform: process.platform,
      },
    });

    expect(colorSpace).toBe(expected);
  });
});

function detectOnTTY(env: Record<string, string>, platform = "linux"): number {
  return getColorSpace({
    process: {
      platform,
      env,
      argv: [],
      stdout: { isTTY: true },
    },
  });
}

describe("terminal environment variables", () => {
  it("keeps truecolor for tmux, which uses TERM=screen*", () => {
    expect(
      detectOnTTY({ TERM: "screen-256color", COLORTERM: "truecolor", TERM_PROGRAM: "tmux" }),
    ).toBe(SPACE_TRUE_COLORS);
  });

  it("detects Google Cloud Shell as truecolor", () => {
    expect(detectOnTTY({ TERM: "xterm", GOOGLE_CLOUD_SHELL: "true" })).toBe(SPACE_TRUE_COLORS);
  });

  it("detects Windows terminals as truecolor", () => {
    expect(detectOnTTY({ TERM: "xterm" }, "win32")).toBe(SPACE_TRUE_COLORS);
  });

  it("ignores FORCE_COLOR values that match Object.prototype keys", () => {
    expect(detectOnTTY({ TERM: "xterm-256color", FORCE_COLOR: "constructor" })).toBe(
      SPACE_256_COLORS,
    );
  });
});

// CLICOLOR and CLICOLOR_FORCE (https://bixense.com/clicolors/) are deprecated in favor of
// FORCE_COLOR and NO_COLOR, so termenv doesn't read them.
describe("deprecated CLICOLOR variables", () => {
  it("ignores CLICOLOR=0", () => {
    expect(detectOnTTY({ TERM: "xterm-256color", CLICOLOR: "0" })).toBe(SPACE_256_COLORS);
  });

  it("ignores CLICOLOR_FORCE without a TTY", () => {
    const colorSpace = getColorSpace({
      process: {
        platform: "linux",
        env: { TERM: "xterm-256color", CLICOLOR_FORCE: "1" },
        argv: [],
        stdout: { isTTY: false },
      },
    });

    expect(colorSpace).toBe(SPACE_MONO);
  });
});

describe("COLORTERM", () => {
  it.each([
    ["a TTY", { COLORTERM: "truecolor" }, true, SPACE_TRUE_COLORS],
    ["a TTY with ansi256", { COLORTERM: "ansi256" }, true, SPACE_256_COLORS],
    ["a pipe or a file", { COLORTERM: "truecolor" }, false, SPACE_MONO],
    ["a dumb terminal", { COLORTERM: "truecolor", TERM: "dumb" }, true, SPACE_MONO],
    ["a mono terminal", { COLORTERM: "truecolor", TERM: "xterm-mono" }, true, SPACE_MONO],
    ["CI without a TTY", { COLORTERM: "ansi256", CI: "1" }, false, SPACE_256_COLORS],
    [
      "forced colors without a TTY",
      { COLORTERM: "ansi256", FORCE_COLOR: "true" },
      false,
      SPACE_256_COLORS,
    ],
  ])("sets the level only when the output can show colors: %s", (_name, env, isTTY, expected) => {
    const platform = process.platform === "win32" ? "linux" : process.platform;
    const colorSpace = getColorSpace({
      process: {
        platform,
        env,
        argv: [],
        stdout: { isTTY },
        stderr: { isTTY },
      },
    });

    expect(colorSpace).toBe(expected);
  });

  it("uses the COLORTERM level with the --color flag without a TTY", () => {
    const colorSpace = getColorSpace({
      process: {
        platform: process.platform,
        env: { COLORTERM: "ansi" },
        argv: ["--color"],
        stdout: { isTTY: false },
      },
    });

    expect(colorSpace).toBe(SPACE_16_COLORS);
  });
});

it("use 16-color for non-detectable terminals", () => {
  const colorSpace = getColorSpace({
    process: {
      // Windows terminals are detected as truecolor, so test another platform.
      platform: "linux",
      env: {
        TERM: "thisisnotarealterminal",
      },
      argv: [],
      stdout: { isTTY: true },
      stderr: { isTTY: true },
    },
  });

  expect(colorSpace).toEqual(SPACE_16_COLORS);
});

describe("detect color space in terminals", () => {
  it.each([
    ["xterm", SPACE_16_COLORS, undefined],
    ["xterm-16colour", SPACE_16_COLORS, undefined],
    ["xterm-256", SPACE_256_COLORS, undefined],
    ["xterm-256color", SPACE_256_COLORS, undefined],
    ["xterm-256colour", SPACE_256_COLORS, undefined],
    ["xterm-kitty", SPACE_TRUE_COLORS, "truecolor"],
    ["tmux", SPACE_16_COLORS, undefined],
    ["tmux-256color", SPACE_256_COLORS, undefined],
    ["vt220", SPACE_16_COLORS, undefined],
    ["vt320-w", SPACE_16_COLORS, undefined],
    ["vt52", SPACE_16_COLORS, undefined],
    ["vt525", SPACE_16_COLORS, undefined],
    ["alacritty", SPACE_TRUE_COLORS, undefined],
    ["contour", SPACE_TRUE_COLORS, undefined],
    ["rio", SPACE_TRUE_COLORS, undefined],
    ["wezterm", SPACE_TRUE_COLORS, undefined],
    ["xterm-ghostty", SPACE_TRUE_COLORS, undefined],
    ["xterm-kitty", SPACE_TRUE_COLORS, undefined],
    ["xterm", SPACE_256_COLORS, "yes"],
    ["xterm", SPACE_256_COLORS, "true"],
    ["xterm-256color", SPACE_TRUE_COLORS, "TrueColor"],
    ["screen-256color", SPACE_256_COLORS, "truecolor"],
    ["xterm", SPACE_16_COLORS, "constructor"],
  ])("should return term %s with space %s (COLORTERM=%s)", (term, expected, colorTerm) => {
    // windows supports true colors in 2024, so all of these `TERM` values
    // are returned as space 3 (true colors) when on windows.
    const platform = process.platform === "win32" ? "linux" : process.platform;
    const received = getColorSpace({
      process: {
        platform,
        env: {
          TERM: term,
          COLORTERM: colorTerm,
        },
        argv: [],
        stdout: { isTTY: true },
        stderr: { isTTY: true },
      },
    });
    expect(received).toEqual(expected);
  });
});
