import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Globe,
  Info,
  ListChecks,
  Pencil,
  RotateCcw,
  SearchX,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  getAdminProblem,
  regenerateProblem,
  rejectProblem,
  setProblemStatus,
} from "../../api/admin.api.js";
import DifficultyBadge from "../../components/DifficultyBadge.jsx";
import Spinner from "../../components/Spinner.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import RejectDialog from "./components/RejectDialog.jsx";
import ValidationDialog from "./components/ValidationDialog.jsx";

const POLL_MS = 4000;
const TESTS_SHOWN = 6;
const CLIP = 300;

const STATUS = {
  approved: { label: "Published", style: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400" },
  draft: { label: "Draft", style: "border-white/10 bg-white/5 text-white/55" },
  pending_review: { label: "Pending review", style: "border-amber-400/30 bg-amber-400/10 text-amber-400" },
  processing: { label: "Processing", style: "border-amber-400/30 bg-amber-400/10 text-amber-400" },
  rejected: { label: "Rejected", style: "border-red-400/30 bg-red-400/10 text-red-400" },
};

const FLAG = {
  error: { Icon: CircleAlert, style: "border-red-400/30 bg-red-400/10 text-red-400" },
  warn: { Icon: TriangleAlert, style: "border-amber-400/30 bg-amber-400/10 text-amber-400" },
  info: { Icon: Info, style: "border-white/8 bg-recessed/60 text-white/60" },
};
const FLAG_ORDER = { error: 0, warn: 1, info: 2 };

const STAGE_LABELS = {
  queued: "Waiting its turn",
  drafting: "Writing the statement",
  solving: "Writing solutions",
  testing: "Generating tests",
  checking: "Running and cross-checking",
};

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const clip = (text = "") =>
  text.length > CLIP ? `${text.slice(0, CLIP)}\n... (${text.length} characters in total)` : text;

const Card = ({ title, hint, children }) => (
  <section className="rounded-2xl border border-white/8 bg-card p-5 backdrop-blur-xl sm:p-6">
    <h2 className="text-base font-semibold text-white">{title}</h2>
    {hint && <p className="mt-1 text-sm text-white/45">{hint}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

const Block = ({ label, text }) => (
  <div className="min-w-0">
    <p className="text-[11px] uppercase tracking-wider text-white/35">{label}</p>
    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/8 bg-editor p-2.5 font-mono text-xs leading-relaxed text-white/75">
      {text || "(empty)"}
    </pre>
  </div>
);

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-white/8 bg-recessed/50 px-3 py-2.5">
    <p className="text-lg font-semibold tabular-nums text-white">{value}</p>
    <p className="mt-0.5 text-xs text-white/45">{label}</p>
  </div>
);

const Shell = ({ children }) => (
  <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
    <Link
      to="/admin/problems?status=pending_review"
      className="inline-flex items-center gap-1.5 text-sm text-white/45 transition-colors duration-200 hover:text-white"
    >
      <ArrowLeft className="size-4" /> All problems
    </Link>

    <p className="mt-6 text-xs font-medium uppercase tracking-[0.28em] text-white/45">Admin</p>
    <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
      Review{" "}
      <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
        problem
      </span>
    </h1>

    <div className="mt-8">{children}</div>
  </div>
);

const Message = ({ icon: Icon, tone = "text-white/30", title, text, action }) => (
  <div className="flex flex-col items-center rounded-2xl border border-white/8 bg-card px-6 py-14 text-center backdrop-blur-xl">
    <Icon className={`size-8 ${tone}`} />
    <p className="mt-3 text-sm font-medium text-white">{title}</p>
    {text && <p className="mt-1 max-w-md text-sm leading-6 text-white/45">{text}</p>}
    {action}
  </div>
);

const ProblemReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const quietReload = useRef(false);

  const [showAllTests, setShowAllTests] = useState(false);
  const [validating, setValidating] = useState(false);
  const [dialog, setDialog] = useState(null); // "approve" | "reject" | "regenerate"
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const quiet = quietReload.current;
      quietReload.current = false;

      if (!quiet) {
        setLoading(true);
        setLoadError("");
        setNotFound(false);
      }

      try {
        const res = await getAdminProblem(id);
        if (!cancelled) setProblem(res.data.problem);
      } catch (err) {
        if (cancelled || quiet) return;

        if (err.response?.status === 404) setNotFound(true);
        else setLoadError(err.response?.data?.message || "Could not load this problem.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  // while the AI is still working the page keeps itself up to date
  const processing = problem?.status === "processing";

  useEffect(() => {
    if (!processing) return undefined;

    const timer = setTimeout(() => {
      quietReload.current = true;
      setReloadKey((k) => k + 1);
    }, POLL_MS);

    return () => clearTimeout(timer);
  }, [processing, problem]);

  const finish = (message) => navigate("/admin/problems", { state: { notice: message } });

  const openDialog = (type) => {
    setDialogError("");
    setDialog(type);
  };

  const closeDialog = () => {
    if (!busy) setDialog(null);
  };

  const runAction = async (task) => {
    setBusy(true);
    setDialogError("");

    try {
      const res = await task();
      finish(res.data.message);
    } catch (err) {
      setDialogError(err.response?.data?.message || "Something went wrong.");
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      </Shell>
    );
  }

  if (notFound) {
    return (
      <Shell>
        <Message icon={SearchX} title="Problem not found" text="It may have been deleted." />
      </Shell>
    );
  }

  if (loadError) {
    return (
      <Shell>
        <Message
          icon={CircleAlert}
          tone="text-red-400"
          title={loadError}
          action={
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
            >
              Try again
            </button>
          }
        />
      </Shell>
    );
  }

  const report = problem.ai?.report;
  const flags = [...(report?.flags ?? [])].sort((a, b) => FLAG_ORDER[a.level] - FLAG_ORDER[b.level]);
  const stats = report?.stats;
  const tests = problem.testCases ?? [];
  const shownTests = showAllTests ? tests : tests.slice(0, TESTS_SHOWN);
  const inReview = problem.status === "pending_review";
  const editable = ["draft", "pending_review", "rejected"].includes(problem.status);
  const validated = Boolean(problem.validatedAt);
  const status = STATUS[problem.status];

  if (processing) {
    return (
      <Shell>
        <Message
          icon={Sparkles}
          tone="text-primary-start"
          title="The AI is still working on this problem"
          text={`${STAGE_LABELS[problem.ai?.stage] ?? "Working"}... This page updates by itself.`}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-5">
        {!inReview && (
          <p className="rounded-xl border border-white/8 bg-recessed/60 px-4 py-2.5 text-sm text-white/60">
            This problem is {status?.label.toLowerCase()}, so it is shown for reference only.
            {problem.status === "rejected" && problem.rejectionReason
              ? ` Reason: ${problem.rejectionReason}`
              : ""}
          </p>
        )}

        <Card title={problem.title || "Untitled"}>
          <div className="flex flex-wrap items-center gap-2.5">
            {problem.difficulty && <DifficultyBadge difficulty={problem.difficulty} />}

            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${status?.style}`}
            >
              {status?.label}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 text-xs ${
                validated ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {validated ? <CircleCheck className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
              {validated ? `Validated ${formatDate(problem.validatedAt)}` : "Not validated yet"}
            </span>

            {problem.topics?.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-white/8 bg-recessed px-2.5 py-0.5 text-xs capitalize text-white/60"
              >
                {topic}
              </span>
            ))}
          </div>

          {problem.ai?.idea && (
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wider text-white/35">Original idea</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-white/65">
                {problem.ai.idea}
              </p>
            </div>
          )}
        </Card>

        {report && (
          <Card
            title="AI report"
            hint={`Written by ${report.model}. Everything below was confirmed by running the code, anything it could not confirm is listed here.`}
          >
            {flags.length > 0 && (
              <ul className="space-y-2">
                {flags.map((flag, index) => {
                  const { Icon, style } = FLAG[flag.level] ?? FLAG.info;

                  return (
                    <li
                      key={index}
                      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${style}`}
                    >
                      <Icon className="mt-0.5 size-4 shrink-0" />
                      {flag.message}
                    </li>
                  );
                })}
              </ul>
            )}

            {stats && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="Hidden tests" value={stats.hiddenTests} />
                <Stat label="Large tests" value={stats.largeTests} />
                <Stat label="Cross-checked" value={stats.crossChecked} />
                <Stat label="Inputs dropped" value={(stats.droppedFailed ?? 0) + (stats.droppedDisagree ?? 0)} />
                <Stat label="Examples fixed" value={stats.examplesCorrected} />
                <Stat label="Took" value={`${report.durationSeconds}s`} />
              </div>
            )}
          </Card>
        )}

        <Card title="Statement" hint="What people see on the problem page.">
          <div className="space-y-5">
            <p className="whitespace-pre-line text-sm leading-7 text-white/80">{problem.description}</p>

            {problem.constraints && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/35">Constraints</p>
                <ul className="mt-1.5 space-y-1 font-mono text-xs text-white/70">
                  {problem.constraints.split("\n").map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Block label="Input format" text={problem.inputFormat} />
              <Block label="Output format" text={problem.outputFormat} />
            </div>

            {problem.examples?.map((example, i) => (
              <div key={i} className="rounded-xl border border-white/8 bg-recessed/50 p-4">
                <p className="text-sm font-medium text-white/75">Example {i + 1}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Block label="Input" text={example.input} />
                  <Block label="Output" text={example.output} />
                </div>
                {example.explanation && (
                  <p className="mt-3 text-sm leading-6 text-white/55">{example.explanation}</p>
                )}
              </div>
            ))}

            {problem.hints?.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/35">Hints</p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm text-white/65">
                  {problem.hints.map((hint, i) => (
                    <li key={i}>{hint}</li>
                  ))}
                </ol>
              </div>
            )}

            <p className="text-xs text-white/35">
              Time limit {problem.timeLimit}s, memory limit {problem.memoryLimit} MB
            </p>
          </div>
        </Card>

        <Card
          title={`Hidden tests (${tests.length})`}
          hint="Used to judge submissions, never shown to users."
        >
          <div className="space-y-3">
            {shownTests.map((test, i) => (
              <div key={i} className="rounded-xl border border-white/8 bg-recessed/50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-white/75">
                  Test {i + 1}
                  {test.source === "ai" && (
                    <span className="rounded-full border border-primary-start/30 bg-primary-start/10 px-2 py-0.5 text-[11px] font-medium text-primary-start">
                      AI
                    </span>
                  )}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Block label="Input" text={clip(test.input)} />
                  <Block label="Expected output" text={clip(test.expectedOutput)} />
                </div>
              </div>
            ))}
          </div>

          {tests.length > TESTS_SHOWN && (
            <button
              type="button"
              onClick={() => setShowAllTests((v) => !v)}
              className="mt-4 rounded-lg border border-white/8 px-3 py-1.5 text-xs font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
            >
              {showAllTests ? "Show fewer" : `Show all ${tests.length} tests`}
            </button>
          )}
        </Card>

        {problem.referenceSolution?.code && (
          <Card
            title="Reference solution"
            hint={`Written in ${problem.referenceSolution.language}. Validation runs it against every test, it is never shown to users.`}
          >
            <pre className="max-h-96 overflow-auto rounded-lg border border-white/8 bg-editor p-3 font-mono text-xs leading-relaxed text-white/75">
              {problem.referenceSolution.code}
            </pre>
          </Card>
        )}

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-white/8 bg-background/85 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
          {inReview && !validated && (
            <p className="mb-3 flex items-center gap-2 text-sm text-amber-400">
              <TriangleAlert className="size-4 shrink-0" />
              This problem is not validated, so it cannot be published yet. Run the validation first.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {editable && !validated && (
              <button
                type="button"
                onClick={() => setValidating(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/8 px-4 py-2.5 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
              >
                <ListChecks className="size-4" /> Run validation
              </button>
            )}

            {editable && (
              <Link
                to={`/admin/problems/${problem._id}/edit`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/8 px-4 py-2.5 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
              >
                <Pencil className="size-4" /> Edit
              </Link>
            )}

            {editable && problem.ai?.idea && (
              <button
                type="button"
                onClick={() => openDialog("regenerate")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/8 px-4 py-2.5 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
              >
                <RotateCcw className="size-4" /> Generate again
              </button>
            )}

            {inReview && (
              <button
                type="button"
                onClick={() => openDialog("reject")}
                className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors duration-200 hover:bg-red-400/15"
              >
                Reject
              </button>
            )}

            {inReview && (
              <button
                type="button"
                disabled={!validated}
                title={validated ? undefined : "Validate the problem before publishing"}
                onClick={() => openDialog("approve")}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-primary-start to-primary-end px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
              >
                <Globe className="size-4" /> Approve and publish
              </button>
            )}
          </div>
        </div>
      </div>

      {validating && (
        <ValidationDialog
          problem={problem}
          onClose={() => {
            setValidating(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      <ConfirmDialog
        open={dialog === "approve"}
        busy={busy}
        error={dialogError}
        title="Approve and publish?"
        message={`"${problem.title}" becomes visible to everyone and can be solved straight away.`}
        confirmLabel="Publish"
        onConfirm={() => runAction(() => setProblemStatus(problem._id, "approved"))}
        onCancel={closeDialog}
      />

      <ConfirmDialog
        open={dialog === "regenerate"}
        busy={busy}
        error={dialogError}
        title="Generate this problem again?"
        message={`The AI starts over from the same idea and replaces the statement, solution and tests of "${problem.title}". Changes you made by hand are lost.`}
        confirmLabel="Generate again"
        onConfirm={() => runAction(() => regenerateProblem(problem._id))}
        onCancel={closeDialog}
      />

      <RejectDialog
        open={dialog === "reject"}
        title={problem.title}
        busy={busy}
        error={dialogError}
        onConfirm={(reason) => runAction(() => rejectProblem(problem._id, reason))}
        onCancel={closeDialog}
      />
    </Shell>
  );
};

export default ProblemReviewPage;