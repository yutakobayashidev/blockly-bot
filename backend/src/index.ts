import { Hono } from "hono";
import OpenAI from "openai";
import { cors } from "hono/cors";
import { SYSTEM_PROMPT, SYSTEM_PATCH_PROMPT } from "./prompts";

type Bindings = {
  OPENAI_API_KEY: string;
  SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

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

  const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });

  const chatStream = await openai.chat.completions.create({
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

  const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });

  const chat = await openai.chat.completions.create({
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

  console.log(messageContent);

  // 正規表現を使用して、Markdownのコードブロックを抽出
  const codeRegex = /```(?:[a-zA-Z]*\n)?([\s\S]*?)```/g;
  if (messageContent) {
    const matches = codeRegex.exec(messageContent);

    if (matches && matches[1]) {
      // 最初のコードブロックの内容を返す
      return c.json({ code: matches[1].trim() });
    }
  }
  // エラーコードを返す
  return c.json({ error: "No code block found in the response." });
});

export default app;
