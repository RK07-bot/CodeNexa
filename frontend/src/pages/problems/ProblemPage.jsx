import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CircleAlert, SearchX } from "lucide-react";
import { getProblem } from "../../api/problems.api.js";
import { LANGUAGES } from "../../lib/languages.js";
import { readStorage, writeStorage } from "../../lib/storage.js";
import useProblemCode from "../../hooks/useProblemCode.js";
import ProblemDescription from "./components/ProblemDescription.jsx";
import CodeEditor from "./components/CodeEditor.jsx";
import TestPanel from "./components/TestPanel.jsx";

const LANGUAGE_KEY = "codenexa:language";

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

  const changeLanguage = (id) => {
    setLanguage(id);
    writeStorage(LANGUAGE_KEY, id);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await getProblem(slug);
        if (!cancelled) setProblem(res.data.problem);
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

  return (
    <div className="grid gap-3 p-3 lg:h-[calc(100dvh-4rem)] lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-card backdrop-blur-xl">
        <div className="lg:h-full lg:overflow-y-auto">
          <ProblemDescription problem={problem} />
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
          />
        </div>

        <TestPanel key={problem.slug} examples={problem.examples} />
      </div>
    </div>
  );
};

export default ProblemPage;