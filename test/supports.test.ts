import { platform } from "node:process";
import { describe, expect, it } from "vitest";
import { SPACE_16_COLORS, SPACE_256_COLORS, SPACE_TRUE_COLORS, getColorSpaceByRuntime } from "../src/supports";

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
    const isWin = platform === "win32";

    const colorSpace = getColorSpaceByRuntime(env, true, isWin);

    expect(colorSpace).toBe(expected);
  });
});
