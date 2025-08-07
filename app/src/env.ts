import dotenv from "dotenv-safe";
import { z } from "zod";

dotenv.config({ allowEmptyValues: true });

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  TELEGRAM_ID: z.string().min(1),
  PHONE_NUMBER: z.string().min(1),
  TFA_PASSWORD: z.string().optional(),
  API_ID: z.string().min(1).transform(Number),
  API_HASH: z.string().min(1),
  API_SESSION: z.string().optional(),
  MAXIMUM_SUPPLY: z.string().transform(Number),
  MAXIMUM_PRICE: z.string().transform(Number),
  BUY_STRATEGY: z.string().transform(Number),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
