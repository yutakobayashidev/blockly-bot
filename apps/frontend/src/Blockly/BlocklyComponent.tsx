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
import { pythonGenerator } from "blockly/python";
import { phpGenerator } from "blockly/php";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, ChangeEvent } from "react";
import { Bot, Play, Code, Plus, FileUp, FileDown, Send } from "lucide-react";
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
import { blockToPngBase64, readStreamData } from "@/lib/helper";
import { BlocklyComponentProps, Message } from "@/types";
import { toast } from "sonner";
import MessageList from "@/components/message-list";
import Cookies from "js-cookie";

Blockly.setLocale(locale);

function BlocklyComponent(props: BlocklyComponentProps) {
  const [code, setCode] = useState(null);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [chengeprompt, setChengeprompt] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<Blockly.BlockSvg | null>(
    null
  );
  const [isLoading, setLoading] = useState(false);
  const [onbording, setOnbording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onbording = Cookies.get("onbording");
    if (!onbording) {
      setOnbording(true);
    }
  }, []);

  const hiddenWorkspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const primaryWorkspace = useRef<Blockly.WorkspaceSvg | null>(null);

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

      await readStreamData(
        `${import.meta.env.VITE_API_URL}/build-block`,
        { prompt: input },
        "POST",
        (chunk) => {
          res += chunk;

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
      );
    } catch {
      toast.error("ブロックの生成に失敗しました");
    } finally {
      try {
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
              image: base64Image,
              xml: JSON.parse(res).xml,
            };
            // 最後のメッセージを更新した配列を作成します
            const updatedMessages = prevMessages
              .slice(0, -1)
              .concat(lastMessage);
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
      } catch {
        setMessages((prevMessages) => {
          return [
            ...prevMessages,
            {
              text: "ブロックの生成にエラーが発生しました。プロンプトをより具体的にしてみてください。",
              role: "error",
              type: "build",
            },
          ];
        });
        setLoading(false);
      }
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
        callback: async (scope) => {
          try {
            setLoading(true);

            if (!scope.block) return console.error("No block selected");

            const image = await blockToPngBase64(scope.block);

            setMessages((prevMessages) => [
              ...prevMessages,
              {
                text: "このBlocklyブロックが何を行っているか説明してください。",
                role: "user",
                type: "insight",
                image,
              },
            ]);

            let res = "";

            await readStreamData(
              `${import.meta.env.VITE_API_URL}/blockly-insight`,
              {
                image: `data:image/png;base64,${image}`,
                xml: Blockly.Xml.domToPrettyText(
                  Blockly.Xml.blockToDom(scope.block)
                ),
              },
              "POST",
              (chunk) => {
                res += chunk;

                setMessages((prevMessages) => {
                  let lastMessage = prevMessages[prevMessages.length - 1];

                  if (lastMessage && lastMessage.role === "bot") {
                    lastMessage = { ...lastMessage, text: res };
                    const updatedMessages = prevMessages
                      .slice(0, -1)
                      .concat(lastMessage);
                    return updatedMessages;
                  }
                  return [...prevMessages, { text: res, role: "bot" }];
                });
              }
            );
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

  const handleOnbording = () => {
    Cookies.set("onbording", "true");
    setOnbording(false);
  };

  const handleDialogSubmit = async () => {
    setOpen(false);
    setLoading(true);

    let res = "";

    if (primaryWorkspace.current && selectedBlock) {
      try {
        const image = await blockToPngBase64(selectedBlock);

        setMessages((prevMessages) => [
          ...prevMessages,
          {
            text: chengeprompt,
            role: "user",
            type: "patch",
            image,
          },
        ]);

        await readStreamData(
          `${import.meta.env.VITE_API_URL}/build-block`,
          {
            prompt: `${chengeprompt}\n子どもが入力したXML\n\n${Blockly.Xml.domToPrettyText(
              Blockly.Xml.blockToDom(selectedBlock)
            )}`,
          },
          "PATCH",
          (chunk) => {
            res += chunk;

            setMessages((prevMessages) => {
              let lastMessage = prevMessages[prevMessages.length - 1];

              if (lastMessage && lastMessage.role === "bot") {
                lastMessage = { ...lastMessage, text: res };
                const updatedMessages = prevMessages
                  .slice(0, -1)
                  .concat(lastMessage);
                return updatedMessages;
              }
              return [...prevMessages, { text: res, role: "bot" }];
            });
          }
        );
      } catch {
        toast.error("ブロックの生成に失敗しました");
      } finally {
        try {
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
                image: base64Image,
                xml: JSON.parse(res).xml,
              };
              // 最後のメッセージを更新した配列を作成します
              const updatedMessages = prevMessages
                .slice(0, -1)
                .concat(lastMessage);
              return updatedMessages;
            }
            return [
              ...prevMessages,
              {
                text: res,
                role: "bot",
                type: "patch",
                image: base64Image,
                xml: JSON.parse(res).xml,
              },
            ];
          });
          setSelectedBlock(null);
          setLoading(false);
        } catch {
          setMessages((prevMessages) => {
            return [
              ...prevMessages,
              {
                text: "ブロックの生成にエラーが発生しました。プロンプトをより具体的にしてみてください。",
                role: "error",
                type: "patch",
              },
            ];
          });
          setLoading(false);
        }
      }
    }
  };

  const handleAddToWorkspace = (xml: string | undefined) => {
    if (!(primaryWorkspace.current && xml)) return;
    Blockly.Xml.domToWorkspace(
      Blockly.utils.xml.textToDom(xml),
      primaryWorkspace.current
    );
  };

  const handleFileRead = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const xmlText = e.target?.result;
      if (typeof xmlText === "string" && primaryWorkspace.current) {
        const xml = Blockly.utils.xml.textToDom(xmlText);
        primaryWorkspace.current.clear();
        Blockly.Xml.domToWorkspace(xml, primaryWorkspace.current);
      }
    };
    reader.readAsText(file);
  };

  const disabled = isLoading || input.length === 0;

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
            <div className="grid grid-cols-2 mb-5 gap-2 items-center w-full">
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
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-orange-400 hover:bg-orange-500"
              >
                <FileUp className="mr-1.5 h-5 w-5" />
                インポート
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileRead}
                accept=".xml"
              />
              <Button
                onClick={() => {
                  if (!primaryWorkspace.current) return;

                  const xmlDom = Blockly.Xml.workspaceToDom(
                    primaryWorkspace.current
                  );
                  const xml = Blockly.Xml.domToPrettyText(xmlDom);
                  const link = document.createElement("a");

                  const blob = new Blob([xml], { type: "text/xml" });
                  const url = URL.createObjectURL(blob);

                  link.setAttribute("href", url);
                  link.setAttribute("download", "blockly.xml");
                  link.click();
                  link.remove();
                  URL.revokeObjectURL(url);
                }}
                className="bg-green-500 hover:bg-green-600"
              >
                <FileDown className="mr-1.5 h-5 w-5" />
                エクスポート
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
              <CardTitle className="flex items-center font-bold justify-between">
                AIとチャットする
                <button
                  type="button"
                  className="text-sm"
                  onClick={() => setMessages([])}
                >
                  <Plus />
                </button>
              </CardTitle>
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
                <MessageList
                  messages={messages}
                  onAddToWorkspace={handleAddToWorkspace}
                />
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
                  disabled={disabled}
                  onClick={() => handleBlockGenerate()}
                >
                  {isLoading ? (
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin fill-stone-600 text-stone-200"
                      viewBox="0 0 100 101"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor"
                      />
                      <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentFill"
                      />
                    </svg>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
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
      <Dialog open={onbording} onOpenChange={handleOnbording}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-3xl text-center">
              BlocklyBOTの紹介
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-gray-500 space-y-5">
              <p>
                BlocklyBOTは、OpenAIの技術を活用して、Google
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
            <Button onClick={handleOnbording}>早速試す</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BlocklyComponent;
