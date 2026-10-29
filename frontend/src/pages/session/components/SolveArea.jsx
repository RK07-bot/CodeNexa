import { useEffect, useState } from "react";
import { CircleAlert } from "lucide-react";
import { getProblem } from "../../../api/problems.api.js";
import { LANGUAGE_KEY, getSavedLanguage } from "../../../lib/languages.js";
import { writeStorage } from "../../../lib/storage.js";
import useProblemCode from "../../../hooks/useProblemCode.js";
import useProblemRunner from "../../../hooks/useProblemRunner.js";
import useWorkspaceResize from "../../../hooks/useWorkspaceResize.js";
import ProblemDescription from "../../problems/components/ProblemDescription.jsx";
import SubmissionsList from "../../problems/components/SubmissionsList.jsx";
import CodeEditor from "../../problems/components/CodeEditor.jsx";
import TestPanel from "../../problems/components/TestPanel.jsx";

const LEFT_TABS = [
  { id: "description", label: "Description" },
  { id: "submissions", label: "Submissions" },
];

const SolveArea = ({ session }) => {
  const slug = session.problem.slug;

  const [problem, setProblem] = useState(null);
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const [language, setLanguage] = useState(getSavedLanguage);
  const [code, setCode, resetCode] = useProblemCode(slug, language);
  const [leftTab, setLeftTab] = useState("description");

  const runner = useProblemRunner({
    slug,
    problem,
    language,
    code,
    sessionCode: session.roomCode,
  });
  const resize = useWorkspaceResize();

  const changeLanguage = (id) => {
    setLanguage(id);
    writeStorage(LANGUAGE_KEY, id);
  };

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    getProblem(slug)
      .then((res) => {
        if (cancelled) return;
        setProblem(res.data.problem);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  if (status === "loading") {
    return <div className="min-h-80 flex-1 animate-pulse rounded-2xl border border-white/8 bg-card" />;
  }

  if (status === "error") {
    return (
      <div className="flex min-h-80 flex-1 flex-col items-center justify-center rounded-2xl border border-white/8 bg-card px-4 text-center">
        <CircleAlert className="size-8 text-red-400" />
        <p className="mt-3 text-sm text-white/65">Could not load this problem.</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="mt-4 rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      ref={resize.workspaceRef}
      className={`flex min-h-0 min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-0 ${
        resize.isResizing ? "select-none" : ""
      }`}
    >
      <section
        style={{ "--left-w": `calc((100% - 0.75rem) * ${resize.leftWidth} / 100)` }}
        className="flex max-h-[75vh] min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-card lg:max-h-none lg:w-(--left-w) lg:flex-none"
      >
        <div className="flex shrink-0 items-center gap-5 overflow-x border-b border-white/8 px-5">
          {LEFT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setLeftTab(t.id)}
              className={`-mb-px whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors duration-200 ${
                leftTab === t.id
                  ? "border-primary-start text-white"
                  : "border-transparent text-white/45 hover:text-white/75"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--color-primary-start) var(--color-recessed)" }}
        >
          {leftTab === "description" ? (
            <ProblemDescription problem={problem} solved={runner.solved} showBack={false} />
          ) : (
            <SubmissionsList submissions={runner.submissions} />
          )}
        </div>
      </section>

      <div
        role="separator"
        aria-label="Resize problem description panel"
        aria-orientation="vertical"
        tabIndex={0}
        onPointerDown={(e) => resize.startResize("horizontal", e)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") resize.adjustLeft(-2);
          if (e.key === "ArrowRight") resize.adjustLeft(2);
        }}
        className="group hidden w-3 shrink-0 cursor-col-resize touch-none items-center justify-center lg:flex"
      >
        <span className="h-12 w-1 rounded-full bg-white/10 transition-colors group-hover:bg-primary-start/70 group-focus:bg-primary-start" />
      </div>

      <section
        ref={resize.rightPanelRef}
        style={{ "--right-w": `calc((100% - 0.75rem) * ${100 - resize.leftWidth} / 100)` }}
        className="flex min-h-0 min-w-0 flex-col lg:w-(--right-w) lg:flex-none"
      >
        <div
          style={{ "--editor-h": `${resize.editorHeight}%` }}
          className="flex h-[480px] min-h-0 flex-col pb-1.5 lg:h-(--editor-h)"
        >
          <CodeEditor
            modelPath={`${problem.slug}.${language}`}
            language={language}
            onLanguageChange={changeLanguage}
            code={code}
            onCodeChange={setCode}
            onReset={resetCode}
            onRun={() => runner.execute("run")}
            onSubmit={() => runner.execute("submit")}
            running={runner.running}
          />
        </div>

        <div
          role="separator"
          aria-label="Resize editor and test results"
          aria-orientation="horizontal"
          tabIndex={0}
          onPointerDown={(e) => resize.startResize("vertical", e)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") resize.adjustEditor(-2);
            if (e.key === "ArrowDown") resize.adjustEditor(2);
          }}
          className="group hidden h-3 shrink-0 cursor-row-resize touch-none items-center justify-center lg:flex"
        >
          <span className="h-1 w-12 rounded-full bg-white/10 transition-colors group-hover:bg-primary-start/70 group-focus:bg-primary-start" />
        </div>

        <div className="h-72 pt-1.5 lg:h-auto lg:min-h-0 lg:flex-1">
          <TestPanel
            key={problem.slug}
            inputs={runner.inputs}
            onInputChange={runner.changeInput}
            execution={runner.execution}
          />
        </div>
      </section>
    </div>
  );
};

export default SolveArea;