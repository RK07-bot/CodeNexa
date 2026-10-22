import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CircleAlert, SearchX } from "lucide-react";
import { getProblem, getSubmissions, runCode, submitCode } from "../../api/problems.api.js";
import { LANGUAGES } from "../../lib/languages.js";
import { readStorage, writeStorage } from "../../lib/storage.js";
import useProblemCode from "../../hooks/useProblemCode.js";
import ProblemDescription from "./components/ProblemDescription.jsx";
import SubmissionsList from "./components/SubmissionsList.jsx";
import CodeEditor from "./components/CodeEditor.jsx";
import TestPanel from "./components/TestPanel.jsx";

const LANGUAGE_KEY = "codenexa:language";

const LEFT_TABS = [
  { id: "description", label: "Description" },
  { id: "submissions", label: "Submissions" },
];

const IDLE = { runId: 0, kind: null, status: "idle", data: null, message: "" };

const getSavedLanguage = () => {
  const saved = readStorage(LANGUAGE_KEY);
  return LANGUAGES.some((l) => l.id === saved) ? saved : "python";
};

const PageSkeleton = () => (
  <div className="grid animate-pulse gap-3 p-3 lg:h-[calc(100dvh-4rem)] lg:grid-cols-2">
    <div className="space-y-4 rounded-2xl border border-white/8 bg-card p-6">
      <div className="h-6 w-1/2 rounded bg-white/8" />
      <div className="h-4 w-1/3 rounded bg-white/5" />
      <div className="h-3 w-full rounded bg-white/5" />
      <div className="h-3 w-5/6 rounded bg-white/5" />
      <div className="h-3 w-2/3 rounded bg-white/5" />
    </div>
    <div className="min-h-80 rounded-2xl border border-white/8 bg-editor" />
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
  const [submissions, setSubmissions] = useState({ status: "loading", items: [] });

  // every run gets a number, so a result that arrives after the user left can be ignored
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
          message: err.response?.data?.message || "Could not load this problem.",
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
        if (!cancelled) setSubmissions({ status: "ready", items: res.data.submissions });
      })
      .catch(() => {
        if (!cancelled) setSubmissions({ status: "failed", items: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const execute = async (kind) => {
    const runId = ++runCounter.current;
    setExecution({ runId, kind, status: "running", data: null, message: "" });

    try {
      const res =
        kind === "run"
          ? await runCode(slug, { language, code, inputs: inputs.slice(0, 5) })
          : await submitCode(slug, { language, code });

      if (runId !== runCounter.current) return;

      setExecution({ runId, kind, status: "done", data: res.data, message: "" });

      if (kind === "submit") {
        const { submissionId, verdict, passed, total } = res.data;

        if (verdict === "accepted") setSolved(true);

        // added locally so the Submissions tab is up to date without another request
        setSubmissions((prev) => ({
          status: "ready",
          items: [
            { _id: submissionId, language, verdict, passed, total, createdAt: new Date().toISOString() },
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
        message: data?.errors?.code?.[0] || data?.message || "Something went wrong. Please try again.",
      });
    }
  };

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 text-center">
        {error.notFound ? (
          <SearchX className="size-10 text-white/30" />
        ) : (
          <CircleAlert className="size-10 text-red-400" />
        )}
        <h1 className="mt-4 text-xl font-semibold text-white">
          {error.notFound ? "Problem not found" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-white/45">
          {error.notFound ? "This problem does not exist or is not available." : error.message}
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
    <div className="grid gap-3 p-3 lg:h-[calc(100dvh-4rem)] lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-card backdrop-blur-xl">
        <div className="flex shrink-0 items-center gap-5 border-b border-white/8 px-5">
          {LEFT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setLeftTab(t.id)}
              className={`-mb-px border-b-2 py-3 text-sm font-medium transition-colors duration-200 ${
                leftTab === t.id
                  ? "border-primary-start text-white"
                  : "border-transparent text-white/45 hover:text-white/75"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 lg:overflow-y-auto">
          {leftTab === "description" ? (
            <ProblemDescription problem={problem} solved={solved} />
          ) : (
            <SubmissionsList submissions={submissions} />
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex h-[460px] min-h-0 flex-col lg:h-auto lg:flex-1">
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

        <TestPanel
          key={problem.slug}
          inputs={inputs}
          onInputChange={changeInput}
          execution={execution}
        />
      </div>
    </div>
  );
};

export default ProblemPage;