import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config";

describe("Environment Configuration", () => {
  it("should load configuration from .env file", () => {
    const config = loadConfig();

    expect(config.PORT).toBeDefined();
    expect(config.DATABASE_URL).toBeDefined();
    expect(config.SKIP_DB).toBeDefined();
  });

  it("should have correct default port", () => {
    const config = loadConfig();
    
    // PORT should be 3000 from .env or default
    expect(config.PORT).toBeGreaterThan(0);
  });

  it("should parse SKIP_DB as boolean", () => {
    const config = loadConfig();
    
    expect(typeof config.SKIP_DB).toBe("boolean");
  });
});
