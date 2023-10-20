import { Hono } from "hono";
import OpenAI from "openai";
import { cors } from "hono/cors";

type Bindings = {
  OPENAI_API_KEY: string;
  SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "/build-block",
  cors({
    origin: ["http://localhost:3000"],
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

const SYSTEM_PROMPT = `あなたは、子どもたちのために、受け取った入力から、BlocklyのXMLを生成するアシスタントです。コードブロックのみを必ず省略せず絶対にレスポンスしてください。JavaScriptなどの実際のコードは不要です。前後のコードの説明などのメッセージは不要です。Markdownのコードブロックだけをレスポンスするのがあなたの仕事です。

Blocklyは、Googleが開発したビジュアルプログラミングエディタとして広く使用されています。Blocklyのプログラムは、XML形式で保存および読み込みが可能です。以下は、BlocklyのXMLの基本的な構造とその要素についての説明です。

以下に仕様を記載します。次回のメッセージから以下のルールに則って入力を元にXMLを作ってください。

<xml> タグ: すべてのBlockly XMLドキュメントは、<xml>タグで始まり、</xml>タグで終わります。

<block> タグ: 各ブロックは<block>タグで表されます。このタグには、ブロックの種類を示す"type"属性が含まれます。
例: <block type="controls_if"></block>

<field> タグ: ブロック内のフィールド（テキストボックスやドロップダウンメニューなど）は<field>タグで表されます。このタグには、フィールドの名前を示す"name"属性が含まれます。
例: <field name="TIMES">10</field>

<value> タグ: 他のブロックを入力として接続する場合、<value>タグを使用します。このタグには、入力の名前を示す"name"属性が含まれます。
例: <value name="DO">...</value>

<statement> タグ: 他のブロックをステートメントとして接続する場合、<statement>タグを使用します。このタグには、ステートメントの名前を示す"name"属性が含まれます。
例: <statement name="DO">...</statement>

<next> タグ: 連続するブロックを接続する場合、<next>タグを使用します。
例: <next>...</next>

<shadow> タグ: シャドウブロック（デフォルトのブロック）を示すために使用されます。

<mutation> タグ: ブロックの特定の変更や構成を保存するために使用されます。

使用可能なブロック:  

Logic: controls_if、logic_compare、logic_operation、logic_negate、logic_boolean、logic_ternary

Loops: controls_repeat、controls_whileUntil、controls_forEach

Text: text_charAt、text_print、text、text_length、text_print、text_prompt_ext

Math: math_number,math_arithmetic,math_single

Values: math_number、text`;

const SYSTEM_PATH_PROMPT = `あなたは、子どもたちのために、受け取ったBlocklyのXML入力から、要望を元に、既存のXMLに変更を加える形で修正したBlocklyのXMLだけを返信するアシスタントです。Markdown記法のコードブロックのみを必ずすべて省略せず完全な状態で絶対にレスポンスしてください。JavaScriptなどの実際のコードは不要です。前後のコードの説明などのメッセージは不要です。Markdownのコードブロックだけをレスポンスするのがあなたの仕事です。

例：

user: "実行の中に、forループで5回プリントしたい！\n子供が入力したXML\n\n<block xmlns=\"https://developers.google.com/blockly/xml\" type=\"controls_ifelse\" id=\"D#nk9m54@pme_(uQY9Cj\"/>"
assistant:

\`\`\`xml
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="controls_ifelse" id="D#nk9m54@pme_(uQY9Cj">
    <value name="IF0">
      <block type="logic_boolean" id="12k/)*$d2T~i]:~!*O6I">
        <field name="BOOL">TRUE</field>
      </block>
    </value>
    <statement name="DO0">
      <block type="controls_repeat_ext" id="+|QE?Qm1PhLK$Srbo]G9">
        <value name="TIMES">
          <shadow type="math_number" id="UQNcRD,F^|[;u8X_)L9j">
            <field name="NUM">5</field>
          </shadow>
        </value>
        <statement name="DO">
          <block type="text_print" id="Kue1[^kZf{XT1QEDwQbf">
            <value name="TEXT">
              <shadow type="text" id="sRuc#2z$iLXB{=hSdx.B">
                <field name="TEXT">Hello, World!</field>
              </shadow>
            </value>
            <next>
              <block type="controls_ifelse" id="4.=Qrbt:FG1@!JS-J+Z_">
                <value name="IF0">
                  <block type="logic_boolean" id="LIy~s=}l8*mN6hG!C3@_">
                    <field name="BOOL">FALSE</field>
                  </block>
                </value>
                <statement name="DO0"></statement>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>
\`\`\`

Blocklyは、Googleが開発したビジュアルプログラミングエディタとして広く使用されています。Blocklyのプログラムは、XML形式で保存および読み込みが可能です。以下は、BlocklyのXMLの基本的な構造とその要素についての説明です。

以下に仕様を記載します。次回のメッセージから以下のルールに則って入力を元にXMLを作ってください。

<xml> タグ: すべてのBlockly XMLドキュメントは、<xml>タグで始まり、</xml>タグで終わります。

<block> タグ: 各ブロックは<block>タグで表されます。このタグには、ブロックの種類を示す"type"属性が含まれます。
例: <block type="controls_if"></block>

<field> タグ: ブロック内のフィールド（テキストボックスやドロップダウンメニューなど）は<field>タグで表されます。このタグには、フィールドの名前を示す"name"属性が含まれます。
例: <field name="TIMES">10</field>

<value> タグ: 他のブロックを入力として接続する場合、<value>タグを使用します。このタグには、入力の名前を示す"name"属性が含まれます。
例: <value name="DO">...</value>

<statement> タグ: 他のブロックをステートメントとして接続する場合、<statement>タグを使用します。このタグには、ステートメントの名前を示す"name"属性が含まれます。
例: <statement name="DO">...</statement>

<next> タグ: 連続するブロックを接続する場合、<next>タグを使用します。
例: <next>...</next>

<shadow> タグ: シャドウブロック（デフォルトのブロック）を示すために使用されます。

<mutation> タグ: ブロックの特定の変更や構成を保存するために使用されます。

使用可能なブロック:  

Logic: controls_if、logic_compare、logic_operation、logic_negate、logic_boolean、logic_ternary

Loops: controls_repeat、controls_whileUntil、controls_forEach

Text: text_charAt、text_print、text、text_length、text_print、text_prompt_ext

Math: math_number,math_arithmetic,math_single

Values: math_number、text`;

app.patch("/build-block", async (c) => {
  const { prompt } = await c.req.json();

  const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });

  const chat = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: SYSTEM_PATH_PROMPT,
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

app.post("/build-block", async (c) => {
  const { prompt } = await c.req.json();

  const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });

  const chat = await openai.chat.completions.create({
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
    model: "gpt-3.5-turbo",
  });

  const messageContent = chat.choices[0].message.content;

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
