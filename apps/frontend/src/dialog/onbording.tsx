import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Cookies from "js-cookie";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import Square from "./square.svg?react";
import Circle from "./circle.svg?react";
import Triangle from "./triangle.svg?react";

type Level = "beginner" | "intermediate" | "advanced";

export default function Onboarding() {
  const [onbording, setOnbording] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [level, setLevel] = useState<Level>("beginner");

  useEffect(() => {
    const onbording = Cookies.get("level");
    if (!onbording) {
      setOnbording(true);
    }
  }, []);

  const handleOnbording = () => {
    Cookies.set("level", level);
    setOnbording(false);
  };

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleLevelSelect = (selectedLevel: Level) => {
    setLevel(selectedLevel);
  };

  return (
    <Dialog open={onbording} onOpenChange={handleOnbording}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-3xl text-center">
            {currentStep === 1
              ? "BlocklyBOTへようこそ"
              : "レベルを選択してください"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="text-gray-500 space-y-5">
            {currentStep === 1 ? (
              <>
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
              </>
            ) : (
              <>
                <p className="text-sm">
                  プログラミングレベルに合わせて、AIが説明やブロックの作成を行います。
                </p>
                <div className="flex gap-5 justify-center">
                  {(["beginner", "intermediate", "advanced"] as Level[]).map(
                    (lvl) => (
                      <button
                        key={lvl}
                        className={clsx(
                          "px-4 text-xl rounded py-2 items-center flex border",
                          {
                            "border-blue-400 border-2": level === lvl,
                          }
                        )}
                        type="button"
                        onClick={() => handleLevelSelect(lvl)}
                      >
                        {lvl === "beginner" ? (
                          <Square className="w-5 h-5 mr-2" />
                        ) : lvl === "intermediate" ? (
                          <Triangle className="w-5 h-5 mr-2" />
                        ) : (
                          <Circle className="w-5 h-5 mr-2" />
                        )}
                        {lvl === "beginner"
                          ? "初級"
                          : lvl === "intermediate"
                          ? "中級"
                          : "上級"}
                      </button>
                    )
                  )}
                </div>
                <p>
                  {level === "beginner" ? (
                    <>
                      AIがひらがなとカタカナで
                      <ruby>
                        何か<rt>なにか</rt>
                      </ruby>
                      に
                      <ruby>
                        例え<rt>たと</rt>
                      </ruby>
                      ながら
                      <ruby>
                        ブロック<rt>ブロック</rt>
                      </ruby>
                      の
                      <ruby>
                        説明<rt>せつめい</rt>
                      </ruby>
                      や
                      <ruby>
                        作成<rt>さくせい</rt>
                      </ruby>
                      を行ってくれます。
                    </>
                  ) : level === "intermediate" ? (
                    "AIが分かりやすく詳細にブロックの説明や作成を行ってくれます。"
                  ) : (
                    "上級者向け。AIが専門的にブロックの説明や作成を行います。"
                  )}
                </p>
              </>
            )}
          </div>
        </div>
        {currentStep !== 1 ? (
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleOnbording}>早速試してみる</Button>
          </DialogFooter>
        ) : (
          <DialogFooter>
            <Button onClick={handleNext}>次へ進む</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
