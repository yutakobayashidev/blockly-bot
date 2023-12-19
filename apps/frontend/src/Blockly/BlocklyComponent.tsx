/**
 * @license
 *
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Blockly React Component.
 * @author samelh@google.com (Sam El-Husseini)
 */

import { useEffect, useRef } from "react";
import Blockly from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";
import { dartGenerator } from "blockly/dart";
import locale from "blockly/msg/ja";
import "blockly/blocks";
import SyntaxHighlighter from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Play, Code, UserPlus, Plus } from "lucide-react";
import { pythonGenerator } from "blockly/python";
import { phpGenerator } from "blockly/php";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Bot, UserRoundSearch } from "lucide-react";
import { luaGenerator } from "blockly/lua";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RegistryItem } from "blockly/core/contextmenu_registry";
import Markdown from "react-markdown";
import { blockToPngBase64 } from "@/lib/helper";
import { BlocklyComponentProps, Message } from "@/types";
import { toast } from "sonner";

Blockly.setLocale(locale);

function BlocklyComponent(props: BlocklyComponentProps) {
  const [code, setCode] = useState(null);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [chengeprompt, setChengeprompt] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<Blockly.Block | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [onbording, setOnbording] = useState(false);

  useEffect(() => {
    setOnbording(true);
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);

  const [open, setOpen] = useState(false);

  const hiddenWorkspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  const generateCode = () => {
    let generatedCode;
    switch (language) {
      case "javascript":
        generatedCode = javascriptGenerator.workspaceToCode(
          primaryWorkspace.current
        );
        break;
      case "dart":
        generatedCode = dartGenerator.workspaceToCode(primaryWorkspace.current);
        break;
      case "lua":
        generatedCode = luaGenerator.workspaceToCode(primaryWorkspace.current);
        break;
      case "python":
        generatedCode = pythonGenerator.workspaceToCode(
          primaryWorkspace.current
        );
        break;
      case "php":
        generatedCode = phpGenerator.workspaceToCode(primaryWorkspace.current);
        break;
      default:
        generatedCode = "";
        break;
    }
    setCode(generatedCode);
  };

  const blocklyDiv = useRef<HTMLDivElement>(null);
  const toolbox = useRef<HTMLDivElement>(null);

  let primaryWorkspace = useRef<Blockly.WorkspaceSvg | null>(null);

  const handleBlockGenerate = async () => {
    setInput("");
    setLoading(true);
    let res = "";
    try {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          text: input,
          role: "user",
          type: "build",
        },
      ]);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/build-block`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: input }),
        }
      );

      if (!response.ok) {
        toast.error("APIとの通信に失敗しました。");
        return;
      }

      const data = response.body;
      if (!data) {
        return;
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        res += decoder.decode(value);

        setMessages((prevMessages) => {
          // 最後のメッセージを取得します
          let lastMessage = prevMessages[prevMessages.length - 1];

          if (lastMessage && lastMessage.role === "bot") {
            lastMessage = { ...lastMessage, text: res };
            // 最後のメッセージを更新した配列を作成します
            const updatedMessages = prevMessages
              .slice(0, -1)
              .concat(lastMessage);
            return updatedMessages;
          }
          return [...prevMessages, { text: res, role: "bot", type: "build" }];
        });
      }
    } catch {
      toast.error("ブロックの生成に失敗しました");
    } finally {
      if (!hiddenWorkspaceRef.current) {
        hiddenWorkspaceRef.current = Blockly.inject(
          document.createElement("div"),
          {
            readOnly: true,
          }
        );
      }

      const workspaceSvg = hiddenWorkspaceRef.current;
      Blockly.Xml.domToWorkspace(
        Blockly.utils.xml.textToDom(JSON.parse(res).xml),
        workspaceSvg
      );
      const block = hiddenWorkspaceRef.current.getTopBlocks()[0];

      workspaceSvg.clear();

      const base64Image = await blockToPngBase64(block);

      setMessages((prevMessages) => {
        // 最後のメッセージを取得します
        let lastMessage = prevMessages[prevMessages.length - 1];

        if (lastMessage && lastMessage.role === "bot") {
          lastMessage = {
            ...lastMessage,
            text: res,
            image: base64Image,
            xml: JSON.parse(res).xml,
          };
          // 最後のメッセージを更新した配列を作成します
          const updatedMessages = prevMessages.slice(0, -1).concat(lastMessage);
          return updatedMessages;
        }
        return [
          ...prevMessages,
          {
            text: res,
            role: "bot",
            type: "build",
            image: base64Image,
            xml: JSON.parse(res).xml,
          },
        ];
      });

      setLoading(false);
    }
  };

  useEffect(() => {
    const { initialXml, ...rest } = props;

    // Check if blocklyDiv.current and toolbox.current are not null
    if (blocklyDiv.current && toolbox.current) {
      primaryWorkspace.current = Blockly.inject(blocklyDiv.current, {
        toolbox: toolbox.current,
        ...rest,
      });

      if (initialXml) {
        Blockly.Xml.domToWorkspace(
          Blockly.utils.xml.textToDom(initialXml),
          primaryWorkspace.current
        );
      }

      const patch_blockly_block: RegistryItem = {
        displayText: "AIで変更を加える",
        preconditionFn: () => "enabled",
        callback: async (scope) => {
          const selectedBlock = scope.block;

          if (selectedBlock) {
            setSelectedBlock(selectedBlock);
            setOpen(true);
          } else {
            console.info(
              "No block selected or primary workspace is not initialized."
            );
          }
        },
        scopeType: Blockly.ContextMenuRegistry.ScopeType.BLOCK,
        id: "ai_correction",
        weight: 0,
      };

      const blockly_insight: RegistryItem = {
        displayText: "Blockly BOTに質問する",
        preconditionFn: () => "enabled",
        scopeType: Blockly.ContextMenuRegistry.ScopeType.BLOCK,
        weight: 0,
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
        callback: async (scope) => {
          try {
            setLoading(true);

            if (!scope.block) return console.error("No block selected");

            const base64Image = await blockToPngBase64(scope.block);

            const xmlDom = Blockly.Xml.blockToDom(scope.block);
            const xmlText = new XMLSerializer().serializeToString(xmlDom);

            setMessages((prevMessages) => [
              ...prevMessages,
              {
                text: "このBlocklyブロックが何を行っているか説明してください。",
                role: "user",
                type: "insight",
                image: base64Image,
              },
            ]);

            const response = await fetch(
              `${import.meta.env.VITE_API_URL}/blockly-insight`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  image: `data:image/png;base64,${base64Image}`,
                  xml: xmlText,
                }),
              }
            );

            if (!response.ok) {
              toast.error("APIとの通信に失敗しました。");
            }

            const data = response.body;
            if (!data) {
              return;
            }

            const reader = data.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let res = "";

            while (!done) {
              const { value, done: doneReading } = await reader.read();
              done = doneReading;
              res += decoder.decode(value);

              setMessages((prevMessages) => {
                // 最後のメッセージを取得します
                let lastMessage = prevMessages[prevMessages.length - 1];

                if (lastMessage && lastMessage.role === "bot") {
                  lastMessage = { ...lastMessage, text: res };
                  // 最後のメッセージを更新した配列を作成します
                  const updatedMessages = prevMessages
                    .slice(0, -1)
                    .concat(lastMessage);
                  return updatedMessages;
                }
                return [...prevMessages, { text: res, role: "bot" }];
              });
            }
          } catch {
            toast.error("ブロックとの対話に失敗しました");
          } finally {
            setLoading(false);
          }
        },
        id: "ai_insight",
      };

      Blockly.ContextMenuRegistry.registry.register(patch_blockly_block);
      Blockly.ContextMenuRegistry.registry.register(blockly_insight);
    }

    // Cleanup function
    return () => {
      Blockly.ContextMenuRegistry.registry.unregister("ai_correction");
      Blockly.ContextMenuRegistry.registry.unregister("ai_insight");
    };
  }, [props]);

  const handleDialogSubmit = async () => {
    setOpen(false);

    if (primaryWorkspace.current && selectedBlock) {
      const blockPosition = selectedBlock.getRelativeToSurfaceXY();
      const xmlDom = Blockly.Xml.blockToDom(selectedBlock);
      const xmlText = new XMLSerializer().serializeToString(xmlDom);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/build-block`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: `${chengeprompt}\n子どもが入力したXML\n\n${xmlText}`,
          }),
        }
      );

      const json = await response.json();

      const oldBlocks = primaryWorkspace.current.getAllBlocks();
      Blockly.Xml.domToWorkspace(
        Blockly.utils.xml.textToDom(json.code),
        primaryWorkspace.current
      );

      const allBlocks = primaryWorkspace.current.getAllBlocks();
      const newBlocks = allBlocks.filter((block) => !oldBlocks.includes(block));

      // @ts-ignore
      selectedBlock.dispose();
      if (newBlocks.length > 0) {
        newBlocks[0].moveBy(blockPosition.x, blockPosition.y);
      }

      setSelectedBlock(null);
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          overflow: "hidden",
          height: "100vh",
          width: "100vw",
          background: "rgb(228, 228, 228)",
        }}
      >
        <div style={{ flex: "2.8 1 0px", overflow: "hidden" }}>
          <div ref={blocklyDiv} className="h-full w-full max-h-full relative" />
          <div style={{ display: "none" }} ref={toolbox}>
            {props.children}
          </div>
        </div>
        <div
          className="flex py-4 flex-col justify-between h-full px-3"
          style={{ flex: "1.2 1 0px", overflow: "hidden", userSelect: "text" }}
        >
          <div>
            <div className="flex mb-5 gap-2 items-center w-full">
              <Button className="w-full" onClick={generateCode}>
                <Code className="mr-1.5 h-5 w-5" />
                コードに変換
              </Button>
              <Button
                className="w-full"
                onClick={() => {
                  const jsCode = javascriptGenerator.workspaceToCode(
                    primaryWorkspace.current
                  );
                  // eslint-disable-next-line no-eval
                  eval(jsCode);
                }}
                variant="destructive"
              >
                <Play className="mr-1.5 h-5 w-5" />
                コードを実行
              </Button>
            </div>
            <div>
              <Tabs
                defaultValue="javascript"
                onValueChange={(value) => setLanguage(value)}
                value={language}
                className="w-[400px]"
              >
                <TabsList>
                  <TabsTrigger value="javascript">🌐 JavaScript</TabsTrigger>
                  <TabsTrigger value="python">🐍 Python</TabsTrigger>
                  <TabsTrigger value="php">🐘 PHP</TabsTrigger>
                  <TabsTrigger value="dart">🎯 Dart</TabsTrigger>
                  <TabsTrigger value="lua">🌙 Lua</TabsTrigger>
                </TabsList>
              </Tabs>
              {code && (
                <SyntaxHighlighter
                  className="mt-3"
                  language={language}
                  style={docco}
                >
                  {code}
                </SyntaxHighlighter>
              )}
            </div>
          </div>
          <Card className="my-5 overflow-y-scroll">
            <CardHeader>
              <CardTitle>AIとチャットする</CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="flex flex-col justify-center items-center">
                  <Bot className="h-28 mb-5 w-28 text-gray-400" />
                  <p className="text-gray-500">
                    AIとチャットして、ブロックの作成を手伝ったもらったり、ワークスペースで既存のブロックを右クリックして、AIに質問したり、改善してみましょう。
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation> */}
                  {messages.map((message, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    <div key={index} className="flex items-start">
                      <div className="mr-3">
                        {message.role === "bot" ? (
                          <div className="select-none rounded-sm bg-blue-500 text-white h-10 w-10 flex justify-center items-center">
                            <Bot className="h-7 w-7" />
                          </div>
                        ) : message.role === "user" &&
                          message.type === "insight" ? (
                          <div className="select-none rounded-sm border text-white h-10 w-10 flex justify-center items-center">
                            <UserRoundSearch className="h-5 text-gray-800 w-5" />
                          </div>
                        ) : message.role === "user" &&
                          message.type === "build" ? (
                          <div className="select-none rounded-sm border text-white h-10 w-10 flex justify-center items-center">
                            <UserPlus className="h-5 text-gray-800 w-5" />
                          </div>
                        ) : null}
                      </div>
                      <div className="prose break-words overflow-wrap whitespace-pre-wrap">
                        <Markdown>{message.text}</Markdown>
                        {message.image && (
                          <>
                            <div className="border px-4">
                              <img
                                src={`data:image/png;base64,${message.image}`}
                                alt="Blockly Block Preview"
                              />
                            </div>
                            {message.image &&
                              message.role === "bot" &&
                              message.xml && (
                                <div className="flex mt-5 justify-end">
                                  <Button
                                    className="bg-orange-500 hover:bg-orange-600"
                                    onClick={() => {
                                      if (
                                        !(
                                          primaryWorkspace.current &&
                                          message.xml
                                        )
                                      )
                                        return;
                                      Blockly.Xml.domToWorkspace(
                                        Blockly.utils.xml.textToDom(
                                          message.xml
                                        ),
                                        primaryWorkspace.current
                                      );
                                    }}
                                  >
                                    <Plus className="h-5 w-5 mr-2" />
                                    ワークスペースに追加
                                  </Button>
                                </div>
                              )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex mt-5 items-center">
                <Input
                  type="text"
                  value={input}
                  className="flex-grow mr-3"
                  placeholder="for文を三回して、Hello World!を5回表示したい"
                  onChange={(event) => setInput(event.target.value)}
                />
                <Button
                  disabled={loading}
                  onClick={() => handleBlockGenerate()}
                >
                  {loading ? "生成中..." : "生成"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="space-y-5">
            <DialogTitle className="text-center text-xl">
              AIでどのように変更を加えたいですか？
            </DialogTitle>
            <DialogDescription>
              具体的になにをしたいのかを入力すると、精度が高いブロックを提案します。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-right">
                プロンプト
              </Label>
              <Input
                id="name"
                onChange={(event) => setChengeprompt(event.target.value)}
                placeholder="繰り返しの回数を3回にして"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-center justify-center">
            <Button onClick={handleDialogSubmit}>生成する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={onbording} onOpenChange={setOnbording}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-3xl text-center">
              BlocklyGPTの紹介
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-gray-500 space-y-5">
              <p>
                BlocklyGPTは、OpenAIの技術を活用して、Google
                Blocklyのブロックを自然言語で操作する実験プロジェクトです。
              </p>
              <p>
                自然言語から既存のブロックの原理を説明したり、新しくブロックを作成したりしてくれます。このプロジェクトの目的は、プログラミング学習をAI技術でより簡単にすることです。
              </p>
              <p>
                <a
                  className="text-blue-600"
                  href="https://github.com/yutakobayashidev/blockly-gpt/tree/main"
                >
                  GitHub
                </a>
                でOSSプロジェクトとして取り組んでいます。
              </p>
            </div>
          </div>
          <DialogFooter className="flex sm:justify-center">
            <Button onClick={() => setOnbording(false)}>早速試す</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BlocklyComponent;
