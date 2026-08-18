import { describe, expect, it } from "vitest";
import { thumbnailSrcSet } from "./thumbnail";

const BASE = "https://i.ytimg.com/vi/dQw4w9WgXcQ";

describe("thumbnailSrcSet", () => {
  it("offers mqdefault alongside a maxres original", () => {
    expect(thumbnailSrcSet(`${BASE}/maxresdefault.jpg`)).toBe(
      `${BASE}/mqdefault.jpg 320w, ${BASE}/maxresdefault.jpg 1280w`,
    );
  });

  it("handles hq720, the other 16:9 large rendition", () => {
    expect(thumbnailSrcSet(`${BASE}/hq720.jpg`)).toBe(
      `${BASE}/mqdefault.jpg 320w, ${BASE}/hq720.jpg 1280w`,
    );
  });

  // These are 4:3 with letterbox bars baked in. Pairing them with a 16:9
  // candidate would make the browser swap between differently-framed images.
  it.each(["hqdefault", "sddefault", "default"])("declines the 4:3 rendition %s", (name) => {
    expect(thumbnailSrcSet(`${BASE}/${name}.jpg`)).toBeUndefined();
  });

  it("declines mqdefault itself — a single-candidate srcset buys nothing", () => {
    expect(thumbnailSrcSet(`${BASE}/mqdefault.jpg`)).toBeUndefined();
  });

  it("preserves a query string on both candidates", () => {
    expect(thumbnailSrcSet(`${BASE}/maxresdefault.jpg?sqp=abc`)).toBe(
      `${BASE}/mqdefault.jpg?sqp=abc 320w, ${BASE}/maxresdefault.jpg?sqp=abc 1280w`,
    );
  });

  // Anything not recognisably an i.ytimg 16:9 still must fall through to a
  // plain src rather than have sizes guessed for it.
  it.each([
    ["a non-YouTube host", "https://cdn.example.com/thumb.jpg"],
    ["an R2-hosted still", "https://media.vaidyasala.com/vi/abc/maxresdefault.jpg"],
    ["an unknown rendition name", `${BASE}/frame0.jpg`],
    ["a non-jpg extension", `${BASE}/maxresdefault.webp`],
    ["an empty string", ""],
  ])("returns undefined for %s", (_label, url) => {
    expect(thumbnailSrcSet(url)).toBeUndefined();
  });

  it("accepts http and mixed case, since the URL comes from stored JSON", () => {
    expect(thumbnailSrcSet(`http://i.ytimg.com/vi/abc/MaxresDefault.jpg`)).toBe(
      "http://i.ytimg.com/vi/abc/mqdefault.jpg 320w, http://i.ytimg.com/vi/abc/MaxresDefault.jpg 1280w",
    );
  });
});
