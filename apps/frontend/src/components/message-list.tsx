import type { Message } from "@/types";
import {
  Bot,
  UserRoundSearch,
  AlertCircle,
  UserPlus,
  Plus,
} from "lucide-react";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";

export default function MessageList({
  messages,
  onAddToWorkspace,
}: {
  messages: Message[];
  onAddToWorkspace: (xml: string | undefined) => void;
}) {
  return (
    <div className="space-y-6">
      {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation> */}
      {messages.map((message, index) => (
        /* biome-ignore lint/suspicious/noArrayIndexKey: <explanation> */
        <div key={index}>
          {message.role === "error" ? (
            <div className="text-red-500 flex items-center text-sm">
              <AlertCircle className="mr-3 h-5 w-5" />
              <p className="flex-1">{message.text}</p>
            </div>
          ) : (
            <div className="flex items-start">
              <div className="mr-3">
                {message.role === "bot" ? (
                  <div className="select-none rounded-sm bg-blue-500 text-white h-10 w-10 flex justify-center items-center">
                    <Bot className="h-7 w-7" />
                  </div>
                ) : message.role === "user" && message.type === "insight" ? (
                  <div className="select-none rounded-sm border text-white h-10 w-10 flex justify-center items-center">
                    <UserRoundSearch className="h-5 text-gray-800 w-5" />
                  </div>
                ) : message.role === "user" && message.type === "build" ? (
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
                    {message.image && message.role === "bot" && message.xml && (
                      <div className="flex mt-5 justify-end">
                        <Button
                          className="bg-orange-500 hover:bg-orange-600"
                          onClick={() => onAddToWorkspace(message.xml)}
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
          )}
        </div>
      ))}
    </div>
  );
}
