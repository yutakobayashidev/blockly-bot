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

import React from "react";
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

Blockly.setLocale(locale);

const blockly_xml = `
<xml xmlns="http://www.w3.org/1999/xhtml">
<block type="controls_ifelse" x="0" y="0"></block>
</xml>
      `;

function BlocklyComponent(props) {
  const [code, setCode] = React.useState(null);
  const [input, setInput] = React.useState("");
  const [language, setLanguage] = React.useState("javascript");

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

  const blocklyDiv = useRef();
  const toolbox = useRef();
  let primaryWorkspace = useRef<Blockly.WorkspaceSvg | null>(null);

  const handleAIBlockPlacement = async () => {
    const response = await fetch("http://localhost:53770/build-block", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: input }),
    });

    const json = await response.json();

    Blockly.Xml.domToWorkspace(
      Blockly.utils.xml.textToDom(json.code),
      primaryWorkspace.current
    );
  };
  useEffect(() => {
    const { initialXml, children, ...rest } = props;
    primaryWorkspace.current = Blockly.inject(blocklyDiv.current, {
      toolbox: toolbox.current,
      ...rest,
    });

    primaryWorkspace.current.getParentSvg();

    if (initialXml) {
      Blockly.Xml.domToWorkspace(
        Blockly.utils.xml.textToDom(initialXml),
        primaryWorkspace.current
      );
    }

    const aiCorrectionItem = {
      displayText: "AIで変更を加える",
      preconditionFn: function (scope) {
        return "enabled";
      },
      callback: async function (scope) {
        const selectedBlock = scope.block;
        if (selectedBlock) {
          const blockPosition = selectedBlock.getRelativeToSurfaceXY();

          const xmlDom = Blockly.Xml.blockToDom(selectedBlock);
          const xmlText = new XMLSerializer().serializeToString(xmlDom);

          const userInput = prompt("変更を加えたい内容を入力してください");
          if (userInput === null || userInput.trim() === "") {
            return;
          }

          const response = await fetch("http://127.0.0.1:8787/build-block", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: userInput + "\n子供が入力したXML\n\n" + xmlText,
            }),
          });

          const json = await response.json();

          const oldBlocks = primaryWorkspace.current.getAllBlocks();

          Blockly.Xml.domToWorkspace(
            Blockly.utils.xml.textToDom(json.code),
            primaryWorkspace.current
          );

          const allBlocks = primaryWorkspace.current.getAllBlocks();
          const newBlocks = allBlocks.filter(
            (block) => !oldBlocks.includes(block)
          );

          selectedBlock.dispose();

          if (newBlocks.length > 0) {
            newBlocks[0].moveBy(blockPosition.x, blockPosition.y);
          }
        } else {
          console.log("No block selected.");
        }
      },
      scopeType: Blockly.ContextMenuRegistry.ScopeType.BLOCK,
      id: "ai_correction",
      weight: 0,
    };

    Blockly.ContextMenuRegistry.registry.register(aiCorrectionItem);
    return () => {
      Blockly.ContextMenuRegistry.registry.unregister("ai_correction");
    };
  }, [primaryWorkspace, toolbox, blocklyDiv, props]);

  return (
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
            <span className="font-bold mb-2 block">コード：</span>
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
        <div className="flex items-center">
          <Input
            type="text"
            value={input}
            className="flex-grow mr-3"
            placeholder="for文を三回して、Hello World!を5回表示したい"
            onChange={(event) => setInput(event.target.value)}
          />
          <Button onClick={() => handleAIBlockPlacement()}>作る</Button>
        </div>
      </div>
    </div>
  );
}

export default BlocklyComponent;
