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
import "./BlocklyComponent.css";
import { useEffect, useRef } from "react";

import Blockly from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";
import locale from "blockly/msg/ja";
import "blockly/blocks";
import SyntaxHighlighter from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Play, Code } from "lucide-react";

Blockly.setLocale(locale);

function BlocklyComponent(props) {
  const [code, setCode] = React.useState(null);
  const [input, setInput] = React.useState("");

  const blocklyDiv = useRef();
  const toolbox = useRef();
  let primaryWorkspace = useRef<Blockly.WorkspaceSvg | null>(null);

  const addConnectedBlocks = (blockTypes) => {
    let blocksXml = blockTypes.reduce((acc, blockType) => {
      return `<block type="${blockType}"><next>${acc}</next></block>`;
    }, "");
    const xmlText = `<xml xmlns="http://www.w3.org/1999/xhtml">
  <block type="controls_if" x="10" y="10">
    <mutation else="0"></mutation>
    <value name="IF0">
      <block type="logic_compare">
        <field name="OP">GTE</field>
        <value name="A">
          <block type="math_number">
            <field name="NUM">5</field>
          </block>
        </value>
        <value name="B">
          <block type="math_number">
            <field name="NUM">3</field>
          </block>
        </value>
      </block>
    </value>
    <statement name="DO0">
      <block type="text_print">
        <value name="TEXT">
          <shadow type="text">
            <field name="TEXT">5</field>
          </shadow>
        </value>
      </block>
    </statement>
  </block>
</xml>
`;
    const xml = stringToXml(xmlText);
    Blockly.Xml.domToWorkspace(xml, primaryWorkspace.current);
  };

  function stringToXml(str) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(str, "application/xml");
    return doc.documentElement; // This should return an Element type
  }

  const generateCode = () => {
    var code = javascriptGenerator.workspaceToCode(primaryWorkspace.current);
    setCode(code);
  };

  useEffect(() => {
    const { initialXml, children, ...rest } = props;
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
  }, [primaryWorkspace, toolbox, blocklyDiv, props]);

  return (
    <React.Fragment>
      <div className="flex items-center gap-x-3">
        <button
          className="px-3 py-2 flex items-center bg-blue-400 text-white"
          onClick={generateCode}
        >
          <Code />
          コードに変換
        </button>
        <button
          onClick={() => {
            // eslint-disable-next-line no-eval
            eval(code);
          }}
          className="px-3 py-2 flex items-center bg-red-400 text-white"
        >
          <Play />
          コードを実行
        </button>
        <button
          onClick={() => addConnectedBlocks(["text_print", "controls_if"])}
        >
          Add Block
        </button>
        <input
          type="text"
          value={input}
          className="border"
          placeholder="やりたいことを入力しよう"
          onChange={(event) => setInput(event.target.value)}
        />
        <button>AIにブロック配置を手伝ってもらう</button>
      </div>
      {code && (
        <SyntaxHighlighter language="javascript" style={docco}>
          {code}
        </SyntaxHighlighter>
      )}
      <div className="flex">
        <div ref={blocklyDiv} id="blocklyDiv" />
        <div style={{ display: "none" }} ref={toolbox}>
          {props.children}
        </div>
      </div>
    </React.Fragment>
  );
}

export default BlocklyComponent;
