
import Editor from "@monaco-editor/react";
import {
  ChevronDown,
  Play,
  RotateCcw,
  Send,
} from "lucide-react";
import { LANGUAGES } from "../../../lib/languages.js";

const handleBeforeMount = (monaco) => {
  monaco.editor.defineTheme("codenexa", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#020614",
      "editorGutter.background": "#030819",
      "editor.lineHighlightBackground": "#070d24",
      "editor.selectionBackground": "#26325f",
      "editorCursor.foreground": "#6683ff",
      "editorLineNumber.foreground": "#3d4668",
      "editorLineNumber.activeForeground": "#8b93b8",
    },
  });
};

const handleMount = (_editor, monaco) => {
  document.fonts.ready.then(() => monaco.editor.remeasureFonts());
};

const ButtonSpinner = () => (
  <span className="size-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
);

const CodeEditor = ({
  modelPath,
  language,
  onLanguageChange,
  code,
  onCodeChange,
  onReset,
  onRun,
  onSubmit,
  running,
}) => {
  const current = LANGUAGES.find(
    (item) => item.id === language
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/8 bg-editor">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/8 bg-recessed px-3 py-2">
        <div className="relative">
          <select
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value)
            }
            className="appearance-none rounded-lg border border-white/8 bg-editor py-1.5 pl-3 pr-8 text-sm text-white outline-none transition-colors duration-200 hover:border-white/15 focus:border-primary-start/50 [&>option]:bg-background"
          >
            {LANGUAGES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-white/35" />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            title="Reset to the starter code"
            aria-label="Reset code"
            className="grid size-8 place-items-center rounded-lg border border-white/8 text-white/55 transition-colors duration-200 hover:border-white/15 hover:text-white"
          >
            <RotateCcw className="size-4" />
          </button>

          <button
            type="button"
            onClick={onRun}
            disabled={Boolean(running)}
            className="flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-1.5 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running === "run" ? (
              <ButtonSpinner />
            ) : (
              <Play className="size-3.5" />
            )}
            Run
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={Boolean(running)}
            className="flex items-center gap-1.5 rounded-lg bg-linear-to-r from-primary-start to-primary-end px-3.5 py-1.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {running === "submit" ? (
              <ButtonSpinner />
            ) : (
              <Send className="size-3.5" />
            )}
            Submit
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          path={modelPath}
          language={current?.monaco ?? "plaintext"}
          value={code}
          onChange={(value) => onCodeChange(value ?? "")}
          theme="codenexa"
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          loading={
            <div className="size-6 animate-spin rounded-full border-2 border-white/10 border-t-primary-start" />
          }
          options={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            padding: { top: 12 },
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              useShadows: false,
            },
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
