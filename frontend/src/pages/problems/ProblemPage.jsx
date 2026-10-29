import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CircleAlert, SearchX } from "lucide-react";
import {
  getProblem,
  getSubmissions,
  runCode,
  submitCode,
} from "../../api/problems.api.js";
import { LANGUAGES } from "../../lib/languages.js";
import { readStorage, writeStorage } from "../../lib/storage.js";
import useProblemCode from "../../hooks/useProblemCode.js";
import ProblemDescription from "./components/ProblemDescription.jsx";
import SubmissionsList from "./components/SubmissionsList.jsx";
import CodeEditor from "./components/CodeEditor.jsx";
import TestPanel from "./components/TestPanel.jsx";
import PartnerPractice from "./components/PartnerPractice.jsx";



const LANGUAGE_KEY = "codenexa:language";

const LEFT_TABS = [
  { id: "description", label: "Description" },
  { id: "submissions", label: "Submissions" },
  { id: "partner", label: "Practice with a partner" },
];

const IDLE = {
  runId: 0,
  kind: null,
  status: "idle",
  data: null,
  message: "",
};

const getSavedLanguage = () => {
  const saved = readStorage(LANGUAGE_KEY);
  return LANGUAGES.some((l) => l.id === saved) ? saved : "python";
};

const PageSkeleton = () => (
  <div className="min-h-[calc(100dvh-1rem)] animate-pulse p-3 lg:h-[calc(100dvh-1rem)] lg:min-h-0">
    <div className="mb-3 flex h-11 items-center gap-4">
      <div className="h-6 w-28 rounded bg-white/8" />
      <div className="h-9 w-32 rounded-lg bg-white/5" />
    </div>

    <div className="grid gap-3 lg:h-[calc(100%-3.75rem)] lg:min-h-0 lg:grid-cols-2">
      <div className="min-h-80 space-y-4 overflow-hidden rounded-2xl border border-white/8 bg-card p-6">
        <div className="h-6 w-1/2 rounded bg-white/8" />
        <div className="h-4 w-1/3 rounded bg-white/5" />
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-5/6 rounded bg-white/5" />
        <div className="h-3 w-2/3 rounded bg-white/5" />
      </div>

      <div className="min-h-80 rounded-2xl border border-white/8 bg-editor" />
    </div>
  </div>
);

const ProblemPage = () => {
  const { slug } = useParams();

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [language, setLanguage] = useState(getSavedLanguage);
  const [code, setCode, resetCode] = useProblemCode(slug, language);

  const [leftTab, setLeftTab] = useState("description");
  const [inputs, setInputs] = useState([]);
  const [execution, setExecution] = useState(IDLE);
  const [solved, setSolved] = useState(false);
  const [submissions, setSubmissions] = useState({
    status: "loading",
    items: [],
  });

  // Resizable workspace panels.
  const [leftWidth, setLeftWidth] = useState(32);
  const [editorHeight, setEditorHeight] = useState(66);
  const [isResizing, setIsResizing] = useState(false);

  const workspaceRef = useRef(null);
  const rightPanelRef = useRef(null);
  const resizeState = useRef(null);

  // Every run gets a number, so stale results can be ignored.
  const runCounter = useRef(0);

  const changeLanguage = (id) => {
    setLanguage(id);
    writeStorage(LANGUAGE_KEY, id);
  };

  const changeInput = (index, value) =>
    setInputs((prev) => prev.map((v, i) => (i === index ? value : v)));

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      runCounter.current++;
      setExecution(IDLE);
      setLeftTab("description");

      try {
        const res = await getProblem(slug);
        if (cancelled) return;

        const loaded = res.data.problem;
        setProblem(loaded);
        setInputs(loaded.examples.map((e) => e.input));
        setSolved(loaded.solved);
      } catch (err) {
        if (cancelled) return;

        setError({
          notFound: err.response?.status === 404,
          message:
            err.response?.data?.message || "Could not load this problem.",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  useEffect(() => {
    let cancelled = false;

    setSubmissions({ status: "loading", items: [] });

    getSubmissions(slug)
      .then((res) => {
        if (!cancelled) {
          setSubmissions({
            status: "ready",
            items: res.data.submissions,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSubmissions({ status: "failed", items: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const execute = async (kind) => {
    const runId = ++runCounter.current;

    setExecution({
      runId,
      kind,
      status: "running",
      data: null,
      message: "",
    });

    try {
      const res =
        kind === "run"
          ? await runCode(slug, {
              language,
              code,
              inputs: inputs.slice(0, 5),
            })
          : await submitCode(slug, { language, code });

      if (runId !== runCounter.current) return;

      setExecution({
        runId,
        kind,
        status: "done",
        data: res.data,
        message: "",
      });

      if (kind === "submit") {
        const { submissionId, verdict, passed, total } = res.data;

        if (verdict === "accepted") setSolved(true);

        // Update the Submissions tab without another request.
        setSubmissions((prev) => ({
          status: "ready",
          items: [
            {
              _id: submissionId,
              language,
              verdict,
              passed,
              total,
              createdAt: new Date().toISOString(),
            },
            ...prev.items,
          ],
        }));
      }
    } catch (err) {
      if (runId !== runCounter.current) return;

      const data = err.response?.data;

      setExecution({
        runId,
        kind,
        status: "error",
        data: null,
        message:
          data?.errors?.code?.[0] ||
          data?.message ||
          "Something went wrong. Please try again.",
      });
    }
  };

  const startResize = useCallback(
    (type, event) => {
      if (window.matchMedia("(max-width: 1023px)").matches) return;

      event.preventDefault();

      resizeState.current = {
        type,
        leftWidth,
        editorHeight,
      };

      setIsResizing(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [leftWidth, editorHeight],
  );

  useEffect(() => {
    if (!isResizing) return undefined;

    const handlePointerMove = (event) => {
      const state = resizeState.current;
      if (!state) return;

      if (state.type === "horizontal" && workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect();
        const usableWidth = rect.width - 12;
        const next = ((event.clientX - rect.left - 6) / usableWidth) * 100;

        setLeftWidth(Math.max(24, Math.min(55, next)));
      }

      if (state.type === "vertical" && rightPanelRef.current) {
        const rect = rightPanelRef.current.getBoundingClientRect();
        const next = ((event.clientY - rect.top) / rect.height) * 100;

        setEditorHeight(Math.max(30, Math.min(82, next)));
      }
    };

    const stopResize = () => {
      resizeState.current = null;
      setIsResizing(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
  }, [isResizing]);

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="flex min-h-[calc(100dvh-1rem)] flex-col items-center justify-center px-4 py-8 text-center lg:h-[calc(100dvh-1rem)] lg:min-h-0">
        {error.notFound ? (
          <SearchX className="size-10 text-white/30" />
        ) : (
          <CircleAlert className="size-10 text-red-400" />
        )}

        <h1 className="mt-4 text-xl font-semibold text-white">
          {error.notFound ? "Problem not found" : "Something went wrong"}
        </h1>

        <p className="mt-2 text-sm text-white/45">
          {error.notFound
            ? "This problem does not exist or is not available."
            : error.message}
        </p>

        <div className="mt-5 flex gap-3">
          {!error.notFound && (
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
            >
              Try again
            </button>
          )}

          <Link
            to="/problems"
            className="rounded-lg bg-linear-to-r from-primary-start to-primary-end px-4 py-2 text-sm font-semibold text-white"
          >
            Back to problems
          </Link>
        </div>
      </div>
    );
  }

  const running = execution.status === "running" ? execution.kind : null;

  return (
    <div
      className={`flex min-h-[calc(100dvh-1rem)] flex-col gap-3 px-3 pt-3 pb-3 lg:h-[calc(100dvh-1rem)] lg:min-h-0 lg:overflow-hidden lg:pb-0 ${
        isResizing ? "select-none" : ""
      }`}
    >
      <header className="flex h-11 shrink-0 items-center gap-4">
        <Link
          to="/"
          className="text-xl font-bold tracking-tight text-white transition-opacity hover:opacity-85"
        >
          Code
          <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
            Nexa
          </span>
        </Link>

        <Link
          to="/problems"
          className="inline-flex items-center gap-2 rounded-lg border border-white/8 bg-card px-3.5 py-2 text-sm font-medium text-white/75 transition-colors hover:border-white/15 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          All problems
        </Link>
      </header>

      <div
        ref={workspaceRef}
        className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-0"
      >
        <section
          style={{ "--panel": `${leftWidth}%` }}
          className="flex w-full min-h-0 min-w-0 max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-white/8 bg-card lg:max-h-none lg:w-(--panel) lg:flex-none"
        >
          <div className="flex shrink-0 items-center gap-5 border-b border-white/8 px-5">
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
            style={{
              scrollbarWidth: "thin",
              scrollbarColor:
                "var(--color-primary-start) var(--color-recessed)",
            }}
          >
            {leftTab === "description" && (
              <ProblemDescription problem={problem} solved={solved} />
            )}

            {leftTab === "partner" && <PartnerPractice problem={problem} />}

            {leftTab === "submissions" && (
              <SubmissionsList submissions={submissions} />
            )}
          </div>
        </section>

        <div
          role="separator"
          aria-label="Resize problem description panel"
          aria-orientation="vertical"
          tabIndex={0}
          onPointerDown={(event) => startResize("horizontal", event)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              setLeftWidth((width) => Math.max(24, width - 2));
            }

            if (event.key === "ArrowRight") {
              setLeftWidth((width) => Math.min(55, width + 2));
            }
          }}
          className="group hidden w-3 shrink-0 cursor-col-resize touch-none items-center justify-center lg:flex"
        >
          <span className="h-12 w-1 rounded-full bg-white/10 transition-colors group-hover:bg-primary-start/70 group-focus:bg-primary-start" />
        </div>

        <section
          ref={rightPanelRef}
          style={{ "--panel": `${100 - leftWidth}%` }}
          className="flex w-full min-h-0 min-w-0 flex-col gap-0 lg:w-(--panel) lg:flex-none"
        >
          <div
            style={{ "--editor": `${editorHeight}%` }}
            className="flex h-[480px] min-h-0 flex-col pb-1.5 lg:h-(--editor)"
          >
            <CodeEditor
              modelPath={`${problem.slug}.${language}`}
              language={language}
              onLanguageChange={changeLanguage}
              code={code}
              onCodeChange={setCode}
              onReset={resetCode}
              onRun={() => execute("run")}
              onSubmit={() => execute("submit")}
              running={running}
            />
          </div>

          <div
            role="separator"
            aria-label="Resize editor and test results"
            aria-orientation="horizontal"
            tabIndex={0}
            onPointerDown={(event) => startResize("vertical", event)}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp") {
                setEditorHeight((height) => Math.max(30, height - 2));
              }

              if (event.key === "ArrowDown") {
                setEditorHeight((height) => Math.min(82, height + 2));
              }
            }}
            className="group hidden h-3 shrink-0 cursor-row-resize touch-none items-center justify-center lg:flex"
          >
            <span className="h-1 w-12 rounded-full bg-white/10 transition-colors group-hover:bg-primary-start/70 group-focus:bg-primary-start" />
          </div>

          <div className="h-72 min-h-0 pt-1.5 lg:h-auto lg:flex-1">
            <TestPanel
              key={problem.slug}
              inputs={inputs}
              onInputChange={changeInput}
              execution={execution}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProblemPage;
