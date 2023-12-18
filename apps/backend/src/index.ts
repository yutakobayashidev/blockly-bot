import { Hono } from "hono";
import OpenAI from "openai";
import { cors } from "hono/cors";
import {
  SYSTEM_PROMPT,
  SYSTEM_PATCH_PROMPT,
  INSIGHT_SYSTEM_PROMPT,
} from "./prompts";
import { HonoConfig } from "@/config";

const app = new Hono<HonoConfig>();

app.use(
  "/build-block",
  cors({
    origin: ["http://localhost:5173"],
    allowHeaders: [
      "X-Custom-Header",
      "Upgrade-Insecure-Requests",
      "Content-Type",
    ],
    allowMethods: ["POST", "GET", "PATCH", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
    credentials: true,
  })
);

app.post("/build-block", async (c) => {
  const { prompt } = await c.req.json();

  const chatStream = await c.get("openai").chat.completions.create({
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
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

app.patch("/build-block", async (c) => {
  const { prompt } = await c.req.json();

  const chat = await c.get("openai").chat.completions.create({
    messages: [
      {
        role: "system",
        content: SYSTEM_PATCH_PROMPT,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "gpt-3.5-turbo",
  });

  const messageContent = chat.choices[0].message.content;

  console.info(messageContent);

  // 正規表現を使用して、Markdownのコードブロックを抽出
  const codeRegex = /```(?:[a-zA-Z]*\n)?([\s\S]*?)```/g;
  if (messageContent) {
    const matches = codeRegex.exec(messageContent);

    if (matches?.[1]) {
      // 最初のコードブロックの内容を返す
      return c.json({ code: matches[1].trim() });
    }
  }
  // エラーコードを返す
  return c.json({ error: "No code block found in the response." });
});

app.post("blockly-insight", async (c) => {
  // TODO: 画像を受け取る

  const vision = await c.get("openai").chat.completions.create({
    model: "gpt-4-vision-preview",
    stream: true,
    messages: [
      {
        role: "system",
        content: INSIGHT_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "このBlocklyブロックは何を行っているか説明してください。",
          },
          {
            type: "image_url",
            image_url: {
              url: "data:image/jpeg;base64,{base64_image}",
            },
          },
        ],
      },
    ],
  });

  return c.streamText(async (stream) => {
    for await (const message of vision) {
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

export default app;
