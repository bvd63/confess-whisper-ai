import { getServerEnv, ServerEnvSchema } from "@/config/env";

export const serverEnv = getServerEnv();
export { ServerEnvSchema, getServerEnv };
export type { ServerEnv } from "@/config/env";
