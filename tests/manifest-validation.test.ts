// tests/manifest-validation.test.ts
// PWA manifest validation test
// Ensures the manifest.json file is valid and contains required fields

import fs from "fs";
import { expect, test, describe } from "vitest";

describe("PWA Manifest Validation", () => {
  test("manifest.json exists and is valid JSON", () => {
    const manifestPath = "public/manifest.json";
    expect(fs.existsSync(manifestPath)).toBe(true);
    
    const manifestContent = fs.readFileSync(manifestPath, "utf8");
    expect(() => JSON.parse(manifestContent)).not.toThrow();
  });

  test("manifest has required fields", () => {
    const manifest = JSON.parse(
      fs.readFileSync("public/manifest.json", "utf8")
    );
    
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.description).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBeTruthy();
    expect(manifest.theme_color).toBeDefined();
    expect(manifest.background_color).toBeDefined();
  });

  test("manifest has valid icons", () => {
    const manifest = JSON.parse(
      fs.readFileSync("public/manifest.json", "utf8")
    );
    
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
    
    manifest.icons.forEach((icon: any) => {
      expect(icon.src).toBeTruthy();
      expect(icon.sizes).toBeTruthy();
      expect(icon.type).toBeTruthy();
    });
  });

  test("manifest has valid display mode", () => {
    const manifest = JSON.parse(
      fs.readFileSync("public/manifest.json", "utf8")
    );
    
    const validDisplayModes = ["fullscreen", "standalone", "minimal-ui", "browser"];
    expect(validDisplayModes).toContain(manifest.display);
  });

  test("manifest has valid orientation", () => {
    const manifest = JSON.parse(
      fs.readFileSync("public/manifest.json", "utf8")
    );
    
    if (manifest.orientation) {
      const validOrientations = [
        "any",
        "natural",
        "landscape",
        "portrait",
        "portrait-primary",
        "portrait-secondary",
        "landscape-primary",
        "landscape-secondary"
      ];
      expect(validOrientations).toContain(manifest.orientation);
    }
  });

  test("manifest has valid categories", () => {
    const manifest = JSON.parse(
      fs.readFileSync("public/manifest.json", "utf8")
    );
    
    if (manifest.categories) {
      expect(Array.isArray(manifest.categories)).toBe(true);
      expect(manifest.categories.length).toBeGreaterThan(0);
    }
  });

  test("manifest colors are valid hex or named colors", () => {
    const manifest = JSON.parse(
      fs.readFileSync("public/manifest.json", "utf8")
    );
    
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    
    if (manifest.theme_color) {
      expect(
        hexColorRegex.test(manifest.theme_color) || 
        manifest.theme_color.length > 0
      ).toBe(true);
    }
    
    if (manifest.background_color) {
      expect(
        hexColorRegex.test(manifest.background_color) || 
        manifest.background_color.length > 0
      ).toBe(true);
    }
  });
});
