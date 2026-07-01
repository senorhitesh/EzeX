"use client";

import { Check, X } from "lucide-react";
import { DiffEditor } from "@monaco-editor/react";

interface DiffEditorProp {
  original: string;
  modified: string;
  language: string;
  onAccept: () => void;
  onReject: () => void;
}

const EditorDiff = ({
  original,
  modified,
  language,
  onAccept,
  onReject,
}: DiffEditorProp) => {
  return (
    <div style={{ height: "1005", display: "flex", flexDirection: "column" }}>
      <div className="flex items-center justify-between py-2 px-4 bg-[#0d0d0d] border-b border-[#1a1a1a] shrink-0">
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#28c840",
            }}
          ></div>
          <span className="text-[12px] text-[#aaa]">Refactored Code</span>
          <span className="text-[11px] text-[#555]">Review your changes</span>
        </div>
        <div>
          <button className="flex items-center gap-0.5 text-red-400">
            {" "}
            <X size={13} /> Reject
          </button>
          <button className="flex items-center gap-0.5 text-green-400">
            {" "}
            <Check size={13} /> Accept
          </button>
        </div>

        <div>
          <DiffEditor
            original={original}
            modified={modified}
            language={language}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              lineNumbers: "on",
              renderLineHighlight: "line",
              automaticLayout: true,
              padding: { top: 20, bottom: 20 },
              fontFamily: '"JetBrains Mono", monospace',
              fontLigatures: true,
              cursorBlinking: "smooth",
              smoothScrolling: true,
              contexmenu: true,
              lineDecorationsWidth: 8,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorDiff;
