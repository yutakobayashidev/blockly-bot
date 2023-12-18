import { createMiddleware } from "hono/factory";
import OpenAI from "openai";
import { HonoConfig } from "@/config";

export const inject = createMiddleware<HonoConfig>(async (c, next) => {
  if (!c.get("openai")) {
    const client = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });
    c.set("openai", client);
  }

  await next();
});
