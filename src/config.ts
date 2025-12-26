import { z } from "zod";
import { config as loadDotenv } from "dotenv";

// Load .env file before parsing environment variables
loadDotenv();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SKIP_DB: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

export type AppConfig = z.infer<typeof envSchema>;

export const loadConfig = (): AppConfig => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.flatten().fieldErrors;
    const message = `Invalid environment configuration: ${JSON.stringify(
      formatted
    )}`;
    throw new Error(message);
  }

  return parsed.data;
};
