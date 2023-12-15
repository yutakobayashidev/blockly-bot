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
 * @fileoverview Main React component that includes the Blockly component.
 * @author samelh@google.com (Sam El-Husseini)
 */

import React from "react";
import BlocklyComponent, {
  Block,
  Category,
  Value,
  Field,
  Shadow,
} from "./Blockly";
import "./blocks/customblocks";
import "./generator/generator";

export default function App() {
  return (
    <BlocklyComponent
      readOnly={false}
      trashcan={true}
      media={"media/"}
      move={{
        scrollbars: true,
        drag: true,
        wheel: true,
      }}
      initialXml={`
<xml xmlns="http://www.w3.org/1999/xhtml">
<block type="controls_ifelse" x="0" y="0"></block>
</xml>
      `}
    >
      <Category name="Logic" categorystyle="logic_category">
        <Block type="controls_if" />
        <Block type="logic_compare" />
        <Block type="logic_operation" />
        <Block type="logic_negate" />
        <Block type="logic_boolean" />
        <Block type="logic_ternary" />
      </Category>
      <Category name="Loops" categorystyle="loop_category">
        <Block type="controls_repeat" />
        <Block type="controls_whileUntil" />
        <Block type="controls_forEach" />
      </Category>
      <Category name="Text" colour="#5C68A6">
        <Block type="text_charAt">
          <Value name="VALUE">
            <Block type="variables_get">
              <Field name="VAR">text</Field>
            </Block>
          </Value>
        </Block>
        <Block is="block" type="text_print">
          <Value name="VALUE">
            <Field is="field" name="TEXT">
              abc
            </Field>
          </Value>
        </Block>
      </Category>
      <Category name="Math">
        <Block type="math_number"></Block>
        <Block type="math_arithmetic"></Block>
        <Block type="math_single"></Block>
      </Category>
      <Category name="Text">
        <Block type="text"></Block>
        <Block type="text_length"></Block>
        <Block type="text_print"></Block>
        <Block type="text_prompt_ext"></Block>
      </Category>
      <Category name="Lists">
        <Block type="lists_create_with"></Block>
        <Block type="lists_repeat">
          <Value name="NUM">
            <Shadow type="math_number">
              <Field name="NUM">5</Field>
            </Shadow>
          </Value>
        </Block>
        <Block type="lists_indexOf">
          <Value name="VALUE">
            <Block type="variables_get">
              <Field name="VAR">{"{listVariable}"}</Field>
            </Block>
          </Value>
        </Block>
      </Category>
      <Category name="Variables" custom="VARIABLE" />
      <Category name="Functions" custom="PROCEDURE" />
      <Category name="Values">
        <Block type="math_number" />
        <Block type="text" />
      </Category>
      <Category name="Custom Blocks" colour="#4F6272">
        <Block type="test_react_field" />
        <Block type="test_react_date_field" />
      </Category>
    </BlocklyComponent>
  );
}
