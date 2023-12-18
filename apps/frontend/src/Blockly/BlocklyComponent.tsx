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
import locale from "blockly/msg/ja";
import "blockly/blocks";
import SyntaxHighlighter from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Play, Code } from "lucide-react";
import { pythonGenerator } from "blockly/python";
import { phpGenerator } from "blockly/php";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReactNode, useState } from "react";
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

Blockly.setLocale(locale);

const blockly_xml = `
<xml xmlns="http://www.w3.org/1999/xhtml">
<block type="controls_ifelse" x="0" y="0"></block>
</xml>
      `;

// see https://github.com/jollytoad/blockly/blob/jollytoad/download-block/tests/playgrounds/screenshot.js

/**
 * Convert an SVG of a block to a PNG data URI.
 * @param {Blockly.BlockSvg} block The block.
 * @returns {Promise<string>} A promise that resolves with the data URI.
 */
async function blockToPngBase64(block: Blockly.BlockSvg): Promise<string> {
  try {
    // Calculate block dimensions and create an SVG element.
    const bBox = block.getBoundingRectangle();
    const width = bBox.right - bBox.left;
    const height = bBox.bottom - bBox.top;

    const blockCanvas = block.getSvgRoot();
    let clone = blockCanvas.cloneNode(true) as SVGSVGElement;

    console.debug(clone);

    clone.removeAttribute("transform");
    Blockly.utils.dom.removeClass(clone, "blocklySelected");

    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.appendChild(clone);
    console.debug(clone);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width.toString());
    svg.setAttribute("height", height.toString());

    // Include styles.
    const css = Array.from(document.head.querySelectorAll("style")).find((el) =>
      /\.blocklySvg/.test(el.textContent || "")
    ) as HTMLStyleElement;
    let style = document.createElement("style");
    style.textContent = css.textContent || "";
    svg.insertBefore(style, svg.firstChild);

    // Serialize SVG and convert to PNG.
    let svgAsXML = new XMLSerializer().serializeToString(svg);
    svgAsXML = svgAsXML.replace(/&nbsp/g, "&#160");
    const data = `data:image/svg+xml,${encodeURIComponent(svgAsXML)}`;

    return new Promise<string>((resolve, reject) => {
      let img = new Image();
      img.onload = () => {
        let canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        let context = canvas.getContext("2d");
        if (context) {
          context.drawImage(img, 0, 0, width, height);
          // PNGデータURIではなく、base64エンコードされたPNGを返す
          const dataUri = canvas.toDataURL("image/png");
          const base64Data = dataUri.split(",")[1]; // データURIからbase64部分を抽出
          resolve(base64Data);
        } else {
          reject(new Error("Failed to get canvas context"));
        }
      };
      img.onerror = reject;
      img.src = data;
    });
  } catch (error) {
    console.error("Error in blockToPng:", error);
    throw error;
  }
}

interface BlocklyComponentProps {
  initialXml?: string;
  children?: ReactNode;
  readOnly?: boolean;
  trashcan?: boolean;
  media?: string;
  move?: {
    scrollbars?: boolean;
    drag?: boolean;
    wheel?: boolean;
  };
}

function BlocklyComponent(props: BlocklyComponentProps) {
  const [code, setCode] = useState(null);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [chengeprompt, setChengeprompt] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<Blockly.Block | null>(
    null
  );
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  console.debug(output);

  const [open, setOpen] = useState(false);

  const svgRef = useRef<HTMLDivElement>(null);
  const hiddenWorkspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  const renderXmlAsSvg = (xmlText: string) => {
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
      Blockly.utils.xml.textToDom(xmlText),
      workspaceSvg
    );

    const svgElement = workspaceSvg.getParentSvg();

    if (svgElement && svgRef.current) {
      svgRef.current.innerHTML = svgElement.outerHTML;
    }

    // Cleanup: Clear the workspace for next render
    workspaceSvg.clear();
  };

  useEffect(() => {
    renderXmlAsSvg(blockly_xml);
  }, []);

  const generateCode = () => {
    let generatedCode;
    switch (language) {
      case "javascript":
        generatedCode = javascriptGenerator.workspaceToCode(
          primaryWorkspace.current
        );
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

  const handleAIBlockPlacement = async () => {
    setLoading(true);
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
      throw new Error(response.statusText);
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
      const chunkValue = decoder.decode(value);
      setOutput((prev) => prev + chunkValue);
    }

    setLoading(false);
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
            if (!scope.block) return console.error("No block selected");

            const base64Image = await blockToPngBase64(scope.block);

            const xmlDom = Blockly.Xml.blockToDom(scope.block);
            const xmlText = new XMLSerializer().serializeToString(xmlDom);

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
              throw new Error(response.statusText);
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
              const chunkValue = decoder.decode(value);
              setOutput((prev) => prev + chunkValue);
            }
          } catch (error) {
            console.error("Error saving block as PNG:", error);
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
  }, [primaryWorkspace, toolbox, blocklyDiv, props]); // Dependencies array

  const get_svg = () => {
    const json = JSON.parse(output);

    renderXmlAsSvg(json.xml);
  };

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

      console.debug(json);

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
              <Button className="w-full" onClick={get_svg}>
                <Code className="mr-1.5 h-5 w-5" />
                JSON
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
          <div
            ref={svgRef}
            className="injectionDiv mt-5 geras-renderer classic-theme"
          />
          <Card className="mb-5">
            <CardHeader>
              <CardTitle>LLM Response: (Debug)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{output}</p>
            </CardContent>
          </Card>
          <div className="flex items-center">
            <Input
              type="text"
              value={input}
              className="flex-grow mr-3"
              placeholder="for文を三回して、Hello World!を5回表示したい"
              onChange={(event) => setInput(event.target.value)}
            />
            <Button disabled={loading} onClick={() => handleAIBlockPlacement()}>
              {loading ? "生成中..." : "生成"}
            </Button>
          </div>
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
    </>
  );
}

export default BlocklyComponent;
