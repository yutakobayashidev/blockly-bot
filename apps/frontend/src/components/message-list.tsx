import type { Message } from "@/types";
import {
  Bot,
  UserRoundSearch,
  AlertCircle,
  UserPlus,
  Plus,
  UserCog,
} from "lucide-react";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

function MessageIcon({ role, type }: { role: string; type: Message["type"] }) {
  const iconClass = clsx(
    "select-none rounded-sm h-10 w-10 flex justify-center items-center",
    {
      "bg-blue-500 text-white": role === "bot",
      "border text-gray-800": role === "user",
    }
  );

  const icons = {
    bot: <Bot className="h-7 w-7" />,
    user: {
      insight: <UserRoundSearch className="h-5 w-5" />,
      build: <UserPlus className="h-5 w-5" />,
      patch: <UserCog className="h-5 w-5" />,
    },
  };

  const userIcon = type ? icons.user[type] : null;

  return (
    <div className={iconClass}>{role === "bot" ? icons.bot : userIcon}</div>
  );
}

function MessageContent({
  message,
  onAddToWorkspace,
}: {
  message: Message;
  onAddToWorkspace: (xml: string | undefined) => void;
}) {
  return (
    <div className="flex items-start">
      <div className="mr-3">
        <MessageIcon role={message.role} type={message.type} />
      </div>
      <div className="prose break-all break-words overflow-wrap whitespace-pre-wrap">
        <Markdown>{message.text}</Markdown>
        {message.image && (
          <ImageWithWorkspaceAddition
            message={message}
            onAddToWorkspace={onAddToWorkspace}
          />
        )}
      </div>
    </div>
  );
}

function ImageWithWorkspaceAddition({
  message,
  onAddToWorkspace,
}: {
  message: Message;
  onAddToWorkspace: (xml: string | undefined) => void;
}) {
  return (
    <>
      <div className="border px-4">
        <img
          src={`data:image/png;base64,${message.image}`}
          alt="Blockly Block Preview"
        />
      </div>
      {message.role === "bot" && message.xml && (
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
  );
}

export default function MessageList({
  messages,
  onAddToWorkspace,
}: {
  messages: Message[];
  onAddToWorkspace: (xml: string | undefined) => void;
}) {
  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <>
          {/* biome-ignore lint/suspicious/noArrayIndexKey: <explanation> */}
          <div key={index}>
            {message.role === "error" ? (
              <div className="text-red-500 flex items-center text-sm">
                <AlertCircle className="mr-3 h-5 w-5" />
                <p className="flex-1">{message.text}</p>
              </div>
            ) : (
              <MessageContent
                message={message}
                onAddToWorkspace={onAddToWorkspace}
              />
            )}
          </div>
        </>
      ))}
    </div>
  );
}
