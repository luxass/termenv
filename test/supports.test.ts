import { describe, expect, it } from "vitest";
import {
  SPACE_16_COLORS,
  SPACE_256_COLORS,
  SPACE_MONO,
  SPACE_TRUE_COLORS,
  getColorSpace,
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
    [[], { FORCE_COLOR: "1" }, SPACE_TRUE_COLORS],
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

it("use True Color for non-detectable terminals", () => {
  const received = getColorSpace({
    process: {
      platform: "linux",
      env: {
        TERM: "thisisnotarealterminal",
      },
      argv: [],
    },
  });
  const expected = SPACE_TRUE_COLORS;
  expect(received).toEqual(expected);
});

describe("detect color space in terminals", () => {
  it.each([
    ["xterm", SPACE_16_COLORS],
    ["xterm-16colour", SPACE_16_COLORS],
    ["xterm-256", SPACE_256_COLORS],
    ["xterm-256color", SPACE_256_COLORS],
    ["xterm-256colour", SPACE_256_COLORS],
    ["xterm-kitty", SPACE_TRUE_COLORS],
    ["tmux", SPACE_16_COLORS],
    ["tmux-256color", SPACE_256_COLORS],
    ["vt220", SPACE_16_COLORS],
    ["vt320-w", SPACE_16_COLORS],
    ["vt52", SPACE_16_COLORS],
    ["vt525", SPACE_16_COLORS],
  ])("should return %s for %s", (term, expected) => {
    const received = getColorSpace({
      process: {
        platform: process.platform,
        env: {
          TERM: term,
        },
        argv: [],
        stdout: { isTTY: true },
        stderr: { isTTY: true },
      },
    });
    expect(received).toEqual(expected);
  });
});
