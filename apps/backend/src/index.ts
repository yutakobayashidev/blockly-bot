import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  SYSTEM_PROMPT,
  SYSTEM_PATCH_PROMPT,
  INSIGHT_SYSTEM_PROMPT,
  SYSTEM_FIX_PROMPT,
} from "./prompts";
import { HonoConfig } from "@/config";
import { inject } from "./middleware/inject";
import { ratelimit } from "./middleware/ratelimit";
import { vValidator } from "@hono/valibot-validator";
import { buildSchema, insightSchema } from "@/schema";

const app = new Hono<HonoConfig>();

app.use(
  "*",
  inject,
  ratelimit,
  cors({
    origin: ["http://localhost:5173", "https://blockly.yutakobayashi.dev"],
    allowHeaders: ["Content-Type"],
    allowMethods: ["POST", "GET", "PATCH", "OPTIONS"],
    credentials: true,
  })
);

app.post("/build-block", vValidator("json", buildSchema), async (c) => {
  const { prompt, level } = await c.req.valid("json");

  const chatStream = await c.get("openai").chat.completions.create({
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT(level),
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    stream: true,
    response_format: { type: "json_object" },
    model: "gpt-4-1106-preview",
  });

  c.header("Content-Type", "text/event-stream");

  return c.streamText(async (stream) => {
    for await (const message of chatStream) {
      const text = message.choices[0]?.delta.content ?? "";
      await Promise.all(
        Array.from(text).map(async (s) => {
          await stream.write(s);
          await stream.sleep(20);
        })
      );
    }
  });
});

app.patch("/build-block", vValidator("json", buildSchema), async (c) => {
  const { prompt, level } = await c.req.valid("json");

  const chatStream = await c.get("openai").chat.completions.create({
    messages: [
      {
        role: "system",
        content: SYSTEM_PATCH_PROMPT(level),
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    stream: true,
    max_tokens: 1000,
    response_format: { type: "json_object" },
    model: "gpt-4-1106-preview",
  });

  return c.streamText(async (stream) => {
    for await (const message of chatStream) {
      await stream.write(message.choices[0].delta.content ?? "");
    }
  });
});

app.post("block-fix", async (c) => {
  const { error, xml } = await c.req.json();

  const chatStream = await c.get("openai").chat.completions.create({
    model: "gpt-4-1106-preview",
    max_tokens: 1000,
    stream: true,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: SYSTEM_FIX_PROMPT,
      },
      {
        role: "user",
        content: `エラー: ${error}\n\nXML:${xml}`,
      },
    ],
  });

  return c.streamText(async (stream) => {
    for await (const message of chatStream) {
      const text = message.choices[0]?.delta.content ?? "";
      await Promise.all(
        Array.from(text).map(async (s) => {
          await stream.write(s);
          await stream.sleep(20);
        })
      );
    }
  });
});

app.post("ask", async (c) => {
  const { prompt } = await c.req.json();

  const chat = await c.get("openai").chat.completions.create({
    model: "gpt-3.5-turbo",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const messageContent = chat.choices[0].message.content;

  return c.json({ message: messageContent });
});

app.post("blockly-insight", vValidator("json", insightSchema), async (c) => {
  const { image, xml, level } = await c.req.valid("json");

  const chatStream = await c.get("openai").chat.completions.create({
    model: "gpt-4-vision-preview",
    stream: true,
    max_tokens: 1000,
    messages: [
      {
        role: "system",
        content: INSIGHT_SYSTEM_PROMPT(level),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `このBlocklyブロックが何を行っているか説明してください。Blockly XML: \n\n${xml}`,
          },
          {
            type: "image_url",
            image_url: {
              url: image,
            },
          },
        ],
      },
    ],
  });

  return c.streamText(async (stream) => {
    for await (const message of chatStream) {
      await stream.write(message.choices[0].delta.content ?? "");
    }
  });
});

export default app;
