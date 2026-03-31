/**
 * Application configuration module.
 *
 * Loads and validates all environment variables at startup using Zod.
 * The application will fail fast with a descriptive error if any required
 * variable is missing or invalid, preventing silent misconfiguration.
 *
 * @module config
 */

import "dotenv/config";
import { z } from "zod";

/** Zod schema for all required and optional environment variables. */
const envSchema = z.object({
  /** Absolute path to the Obsidian vault directory on the VPS filesystem. */
  VAULT_PATH: z.string().min(1, "VAULT_PATH must be a non-empty path"),

  /** Bearer token that remote clients must supply in the Authorization header. */
  MCP_API_KEY: z.string().min(16, "MCP_API_KEY must be at least 16 characters"),

  /** TCP port the HTTP server listens on. Defaults to 3000. */
  PORT: z
    .string()
    .optional()
    .default("3000")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(65535)),

  /** Runtime environment; controls log verbosity and dev-only features. */
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
});

/** Parsed and validated application configuration. */
export type AppConfig = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables.
 *
 * Throws a descriptive ZodError if validation fails so the process exits
 * with a clear message rather than a downstream TypeError.
 *
 * @returns Validated configuration object.
 * @throws {z.ZodError} If any required variable is missing or invalid.
 */
function loadConfig(): AppConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `  ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return result.data;
}

/** Singleton configuration instance loaded once at module import time. */
export const config: AppConfig = loadConfig();
