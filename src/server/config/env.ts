import { z } from "zod";
import { createServerEnvSchema } from "../../../supabase/functions/_shared/env-shared.ts";

const ServerEnvSchema = createServerEnvSchema(z);

const parsed = ServerEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "Invalid server env",
      errors: parsed.error.flatten().fieldErrors,
    }),
  );
  throw new Error("Server misconfigured: missing required environment variables");
}

export const serverEnv = parsed.data;
export type ServerEnv = typeof serverEnv;
