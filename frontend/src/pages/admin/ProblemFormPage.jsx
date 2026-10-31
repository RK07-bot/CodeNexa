import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CircleAlert,
  Lock,
  Plus,
  SearchX,
  Trash2,
  X,
} from "lucide-react";
import {
  createProblem,
  getAdminProblem,
  getAdminTopics,
  updateProblem,
} from "../../api/admin.api.js";
import { LANGUAGES } from "../../lib/languages.js";
import Pills from "../../components/Pills.jsx";
import Spinner from "../../components/Spinner.jsx";

// the same limits the server enforces
const MAX_EXAMPLES = 5;
const MAX_TESTS = 50;
const MAX_HINTS = 5;
const MAX_TOPICS = 8;

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const MEMORY_OPTIONS = [64, 128, 256, 512];

const inputStyles =
  "w-full rounded-xl border border-white/8 bg-recessed text-sm text-white outline-none transition-all duration-200 placeholder:text-white/25 hover:border-white/12 focus:border-primary-start/50 focus:bg-editor focus:ring-2 focus:ring-primary-start/10";

const textareaStyles = `${inputStyles} px-3.5 py-2.5 resize-y`;
const codeStyles = `${textareaStyles} font-mono leading-6`;

const smallButton =
  "inline-flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-1.5 text-xs font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white disabled:pointer-events-none disabled:opacity-40";

const blankExample = () => ({ input: "", output: "", explanation: "" });
const blankTest = () => ({ input: "", expectedOutput: "", source: "author" });

const BLANK = {
  title: "",
  difficulty: "",
  topics: [],
  description: "",
  constraints: "",
  inputFormat: "",
  outputFormat: "",
  hints: [],
  timeLimit: 2,
  memoryLimit: 256,
  examples: [blankExample()],
  testCases: [blankTest()],
  solutionLanguage: "python",
  solutionCode: "",
  solutionSource: "author",
};

// what the server sends -> what the form edits
const toForm = (problem) => ({
  title: problem.title ?? "",
  difficulty: problem.difficulty ?? "",
  topics: problem.topics ?? [],
  description: problem.description ?? "",
  constraints: problem.constraints ?? "",
  inputFormat: problem.inputFormat ?? "",
  outputFormat: problem.outputFormat ?? "",
  hints: problem.hints ?? [],
  timeLimit: problem.timeLimit ?? 2,
  memoryLimit: problem.memoryLimit ?? 256,
  examples: problem.examples?.length
    ? problem.examples.map((e) => ({
        input: e.input ?? "",
        output: e.output ?? "",
        explanation: e.explanation ?? "",
      }))
    : [blankExample()],
  testCases: problem.testCases?.length
    ? problem.testCases.map((t) => ({
        input: t.input ?? "",
        expectedOutput: t.expectedOutput ?? "",
        source: t.source ?? "author",
      }))
    : [blankTest()],
  solutionLanguage: problem.referenceSolution?.language ?? "python",
  solutionCode: problem.referenceSolution?.code ?? "",
  solutionSource: problem.referenceSolution?.source ?? "author",
});

const isBlank = (value) => !value || !value.trim();

// what the form holds -> what the server expects, empty rows are left out
const toPayload = (form) => ({
  title: form.title,
  difficulty: form.difficulty || undefined,
  topics: form.topics,
  description: form.description,
  constraints: form.constraints,
  inputFormat: form.inputFormat,
  outputFormat: form.outputFormat,
  hints: form.hints.filter((h) => !isBlank(h)),
  timeLimit: form.timeLimit,
  memoryLimit: form.memoryLimit,
  examples: form.examples.filter(
    (e) => !(isBlank(e.input) && isBlank(e.output) && isBlank(e.explanation)),
  ),
  testCases: form.testCases.filter(
    (t) => !(isBlank(t.input) && isBlank(t.expectedOutput)),
  ),
  referenceSolution: isBlank(form.solutionCode)
    ? null
    : {
        language: form.solutionLanguage,
        code: form.solutionCode,
        source: form.solutionSource,
      },
});

// the server explains what is wrong, show every distinct message
const describeError = (err) => {
  const data = err.response?.data;

  if (data?.errors) {
    const messages = [...new Set(Object.values(data.errors).flat())];
    if (messages.length) return messages.join(". ");
  }

  return data?.message || "Something went wrong. Please try again.";
};

const Section = ({ title, hint, action, children }) => (
  <section className="rounded-2xl border border-white/8 bg-card p-5 backdrop-blur-xl sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {hint && <p className="mt-1 text-sm text-white/45">{hint}</p>}
      </div>
      {action}
    </div>

    <div className="mt-5 space-y-5">{children}</div>
  </section>
);

const Field = ({ label, hint, htmlFor, children }) => (
  <div>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-white/75">
      {label}
    </label>
    {hint && <p className="mt-0.5 text-xs text-white/35">{hint}</p>}
    <div className="mt-2">{children}</div>
  </div>
);

const SourceBadge = ({ source }) =>
  source === "ai" ? (
    <span className="rounded-full border border-primary-start/30 bg-primary-start/10 px-2 py-0.5 text-[11px] font-medium text-primary-start">
      AI
    </span>
  ) : null;

// chips for the topics, Enter or a comma adds one
const TopicInput = ({ topics, onChange, suggestions }) => {
  const [draft, setDraft] = useState("");

  // a comma splits, so a pasted "array, hash table" becomes two topics
  const add = (raw) => {
    setDraft("");

    const next = [...topics];

    for (const part of raw.split(",")) {
      const value = part.trim().toLowerCase().slice(0, 40);
      if (value && !next.includes(value) && next.length < MAX_TOPICS) next.push(value);
    }

    if (next.length !== topics.length) onChange(next);
  };

  return (
    <div className={`${inputStyles} flex flex-wrap items-center gap-2 px-3 py-2`}>
      {topics.map((topic) => (
        <span
          key={topic}
          className="inline-flex items-center gap-1 rounded-full border border-primary-start/30 bg-primary-start/10 py-0.5 pl-2.5 pr-1 text-xs capitalize text-primary-start"
        >
          {topic}
          <button
            type="button"
            aria-label={`Remove ${topic}`}
            onClick={() => onChange(topics.filter((t) => t !== topic))}
            className="grid size-4 place-items-center rounded-full hover:bg-primary-start/20"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <input
        type="text"
        list="topic-suggestions"
        value={draft}
        disabled={topics.length >= MAX_TOPICS}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => add(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && topics.length) {
            onChange(topics.slice(0, -1));
          }
        }}
        placeholder={topics.length ? "" : "Type a topic and press Enter"}
        className="min-w-32 flex-1 bg-transparent py-0.5 text-sm text-white outline-none placeholder:text-white/25"
      />

      <datalist id="topic-suggestions">
        {suggestions
          .filter((s) => !topics.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  );
};

const PageHeader = ({ isEdit }) => (
  <div>
    <Link
      to="/admin/problems"
      className="inline-flex items-center gap-1.5 text-sm text-white/45 transition-colors duration-200 hover:text-white"
    >
      <ArrowLeft className="size-4" /> All problems
    </Link>

    <p className="mt-6 text-xs font-medium uppercase tracking-[0.28em] text-white/45">
      Admin
    </p>
    <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
      {isEdit ? "Edit" : "Add"}{" "}
      <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
        problem
      </span>
    </h1>
  </div>
);

const ProblemFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(BLANK);
  const [baseline, setBaseline] = useState(() => JSON.stringify(BLANK));
  const [meta, setMeta] = useState(null); // status and validation of the loaded problem
  const [topics, setTopics] = useState([]);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const titleRef = useRef(null);

  useEffect(() => {
    // if this fails the topic suggestions are just empty
    getAdminTopics()
      .then((res) => setTopics(res.data.topics))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return undefined;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError("");
      setNotFound(false);

      try {
        const res = await getAdminProblem(id);
        if (cancelled) return;

        const loaded = toForm(res.data.problem);
        setForm(loaded);
        setBaseline(JSON.stringify(loaded));
        setMeta({
          status: res.data.problem.status,
          validatedAt: res.data.problem.validatedAt,
          title: res.data.problem.title,
        });
      } catch (err) {
        if (cancelled) return;

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
  }, [id, isEdit, reloadKey]);

  // the browser warns before a refresh or tab close throws unsaved work away
  const dirty = JSON.stringify(form) !== baseline;

  useEffect(() => {
    if (!dirty) return undefined;

    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setRow = (key, index, changes) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((row, i) => (i === index ? { ...row, ...changes } : row)),
    }));

  const addRow = (key, row) =>
    setForm((prev) => ({ ...prev, [key]: [...prev[key], row] }));

  const removeRow = (key, index) =>
    setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));

  const handleSave = async (e) => {
    e.preventDefault();

    if (isBlank(form.title)) {
      setError("Give the problem a title");
      titleRef.current?.focus();
      return;
    }

    setSaving(true);
    setError("");

    try {
      const body = toPayload(form);
      const res = isEdit ? await updateProblem(id, body) : await createProblem(body);

      navigate("/admin/problems", { state: { notice: res.data.message } });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const shell = (children) => (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader isEdit={isEdit} />
      <div className="mt-8">{children}</div>
    </div>
  );

  if (loading) {
    return shell(
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>,
    );
  }

  if (notFound) {
    return shell(
      <div className="flex flex-col items-center rounded-2xl border border-white/8 bg-card px-6 py-14 text-center backdrop-blur-xl">
        <SearchX className="size-8 text-white/30" />
        <p className="mt-3 text-sm font-medium text-white">Problem not found</p>
        <p className="mt-1 text-sm text-white/45">It may have been deleted.</p>
        <Link
          to="/admin/problems"
          className="mt-4 rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
        >
          Back to problems
        </Link>
      </div>,
    );
  }

  if (loadError) {
    return shell(
      <div className="flex flex-col items-center rounded-2xl border border-white/8 bg-card px-6 py-14 text-center backdrop-blur-xl">
        <CircleAlert className="size-8 text-red-400" />
        <p className="mt-3 text-sm text-white/65">{loadError}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="mt-4 rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
        >
          Try again
        </button>
      </div>,
    );
  }

  // published problems keep receiving submissions, so they are edited only after unpublishing
  if (meta && ["approved", "processing"].includes(meta.status)) {
    const published = meta.status === "approved";

    return shell(
      <div className="flex flex-col items-center rounded-2xl border border-white/8 bg-card px-6 py-14 text-center backdrop-blur-xl">
        <span className="grid size-11 place-items-center rounded-xl bg-amber-400/10 text-amber-400">
          <Lock className="size-5" />
        </span>
        <p className="mt-4 text-sm font-medium text-white">
          {published ? "This problem is published" : "This problem is being processed"}
        </p>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/45">
          {published
            ? "Unpublish it from the Problems tab before editing, so the results people already got stay accurate."
            : "Wait until processing finishes, then you can edit it."}
        </p>
        <Link
          to="/admin/problems"
          className="mt-5 rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
        >
          Back to problems
        </Link>
      </div>,
    );
  }

  return shell(
    <form onSubmit={handleSave} className="space-y-5" noValidate>
      {isEdit && meta?.validatedAt && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-400">
          This problem was validated. Changing its tests or solution clears the
          validation, so run it again before publishing.
        </p>
      )}

      <Section title="Basics">
        <Field label="Title" htmlFor="title">
          <input
            id="title"
            ref={titleRef}
            type="text"
            value={form.title}
            maxLength={100}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Two Sum"
            className={`${inputStyles} px-3.5 py-2.5`}
          />
        </Field>

        <Field label="Difficulty">
          <Pills
            options={DIFFICULTIES}
            value={form.difficulty}
            onChange={(value) => set("difficulty", value)}
            layoutId="problem-form-difficulty"
          />
        </Field>

        <Field label="Topics" hint={`Up to ${MAX_TOPICS}. Press Enter or a comma to add one.`}>
          <TopicInput
            topics={form.topics}
            suggestions={topics}
            onChange={(value) => set("topics", value)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Time limit" htmlFor="timeLimit" hint="Seconds per test, 1 to 10">
            <input
              id="timeLimit"
              type="number"
              min={1}
              max={10}
              value={form.timeLimit}
              onChange={(e) => set("timeLimit", e.target.value)}
              className={`${inputStyles} px-3.5 py-2.5`}
            />
          </Field>

          <Field label="Memory limit" htmlFor="memoryLimit" hint="In megabytes">
            <select
              id="memoryLimit"
              value={form.memoryLimit}
              onChange={(e) => set("memoryLimit", Number(e.target.value))}
              className={`${inputStyles} px-3.5 py-2.5 [&>option]:bg-background`}
            >
              {MEMORY_OPTIONS.map((mb) => (
                <option key={mb} value={mb}>
                  {mb} MB
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Statement" hint="Plain text. Line breaks are kept as you type them.">
        <Field label="Description" htmlFor="description">
          <textarea
            id="description"
            rows={9}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Explain the task, what is given and what must be found."
            className={textareaStyles}
          />
        </Field>

        <Field label="Constraints" htmlFor="constraints" hint="One constraint per line">
          <textarea
            id="constraints"
            rows={4}
            value={form.constraints}
            onChange={(e) => set("constraints", e.target.value)}
            placeholder={"2 <= n <= 10^4\n-10^9 <= nums[i] <= 10^9"}
            className={`${textareaStyles} font-mono`}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Input format" htmlFor="inputFormat" hint="What the program reads from stdin">
            <textarea
              id="inputFormat"
              rows={4}
              value={form.inputFormat}
              onChange={(e) => set("inputFormat", e.target.value)}
              placeholder={"Line 1: n\nLine 2: n integers"}
              className={textareaStyles}
            />
          </Field>

          <Field label="Output format" htmlFor="outputFormat" hint="What the program prints to stdout">
            <textarea
              id="outputFormat"
              rows={4}
              value={form.outputFormat}
              onChange={(e) => set("outputFormat", e.target.value)}
              placeholder="Two indices separated by a space"
              className={textareaStyles}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Examples"
        hint="Shown to everyone. They are also run against your solution when you validate."
        action={
          <button
            type="button"
            onClick={() => addRow("examples", blankExample())}
            disabled={form.examples.length >= MAX_EXAMPLES}
            className={smallButton}
          >
            <Plus className="size-3.5" /> Add example
          </button>
        }
      >
        {form.examples.length === 0 && (
          <p className="text-sm text-white/40">No examples yet.</p>
        )}

        {form.examples.map((example, index) => (
          <div key={index} className="rounded-xl border border-white/8 bg-recessed/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white/75">Example {index + 1}</p>
              <button
                type="button"
                aria-label={`Remove example ${index + 1}`}
                onClick={() => removeRow("examples", index)}
                className="grid size-7 place-items-center rounded-lg text-white/40 transition-colors duration-200 hover:bg-red-400/10 hover:text-red-400"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <textarea
                rows={3}
                value={example.input}
                onChange={(e) => setRow("examples", index, { input: e.target.value })}
                placeholder="Input"
                aria-label={`Example ${index + 1} input`}
                className={codeStyles}
              />
              <textarea
                rows={3}
                value={example.output}
                onChange={(e) => setRow("examples", index, { output: e.target.value })}
                placeholder="Output"
                aria-label={`Example ${index + 1} output`}
                className={codeStyles}
              />
            </div>

            <input
              type="text"
              value={example.explanation}
              maxLength={1000}
              onChange={(e) => setRow("examples", index, { explanation: e.target.value })}
              placeholder="Explanation (optional)"
              aria-label={`Example ${index + 1} explanation`}
              className={`${inputStyles} mt-3 px-3.5 py-2.5`}
            />
          </div>
        ))}
      </Section>

      <Section
        title="Hints"
        hint="Optional. Shown one by one, from the gentlest to the most direct."
        action={
          <button
            type="button"
            onClick={() => set("hints", [...form.hints, ""])}
            disabled={form.hints.length >= MAX_HINTS}
            className={smallButton}
          >
            <Plus className="size-3.5" /> Add hint
          </button>
        }
      >
        {form.hints.length === 0 && <p className="text-sm text-white/40">No hints.</p>}

        {form.hints.map((hint, index) => (
          <div key={index} className="flex items-start gap-2">
            <textarea
              rows={2}
              value={hint}
              maxLength={500}
              onChange={(e) =>
                set(
                  "hints",
                  form.hints.map((h, i) => (i === index ? e.target.value : h)),
                )
              }
              placeholder={`Hint ${index + 1}`}
              aria-label={`Hint ${index + 1}`}
              className={textareaStyles}
            />
            <button
              type="button"
              aria-label={`Remove hint ${index + 1}`}
              onClick={() =>
                set(
                  "hints",
                  form.hints.filter((_, i) => i !== index),
                )
              }
              className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-white/40 transition-colors duration-200 hover:bg-red-400/10 hover:text-red-400"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </Section>

      <Section
        title="Hidden tests"
        hint="Used to judge submissions and never shown to users. Each input is sent to the program on stdin."
        action={
          <button
            type="button"
            onClick={() => addRow("testCases", blankTest())}
            disabled={form.testCases.length >= MAX_TESTS}
            className={smallButton}
          >
            <Plus className="size-3.5" /> Add test
          </button>
        }
      >
        <p className="text-xs text-white/35">
          {form.testCases.filter((t) => !(isBlank(t.input) && isBlank(t.expectedOutput))).length}{" "}
          of {MAX_TESTS} tests
        </p>

        {form.testCases.map((test, index) => (
          <div key={index} className="rounded-xl border border-white/8 bg-recessed/50 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium text-white/75">
                Test {index + 1} <SourceBadge source={test.source} />
              </p>
              <button
                type="button"
                aria-label={`Remove test ${index + 1}`}
                onClick={() => removeRow("testCases", index)}
                className="grid size-7 place-items-center rounded-lg text-white/40 transition-colors duration-200 hover:bg-red-400/10 hover:text-red-400"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <textarea
                rows={3}
                value={test.input}
                onChange={(e) => setRow("testCases", index, { input: e.target.value })}
                placeholder="Input"
                aria-label={`Test ${index + 1} input`}
                className={codeStyles}
              />
              <textarea
                rows={3}
                value={test.expectedOutput}
                onChange={(e) => setRow("testCases", index, { expectedOutput: e.target.value })}
                placeholder="Expected output"
                aria-label={`Test ${index + 1} expected output`}
                className={codeStyles}
              />
            </div>
          </div>
        ))}
      </Section>

      <Section
        title="Reference solution"
        hint="A correct solution. Validation runs it against every test, it is never shown to users."
      >
        <Field label="Language" htmlFor="solutionLanguage">
          <select
            id="solutionLanguage"
            value={form.solutionLanguage}
            onChange={(e) => set("solutionLanguage", e.target.value)}
            className={`${inputStyles} px-3.5 py-2.5 sm:w-60 [&>option]:bg-background`}
          >
            {LANGUAGES.map((language) => (
              <option key={language.id} value={language.id}>
                {language.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Code" htmlFor="solutionCode">
          <textarea
            id="solutionCode"
            rows={14}
            value={form.solutionCode}
            onChange={(e) => set("solutionCode", e.target.value)}
            spellCheck={false}
            placeholder="Read the input from stdin and print the answer."
            className={codeStyles}
          />
        </Field>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-white/8 bg-background/85 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
        {error && (
          <p
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-400"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-xs text-white/35 sm:block">
            {isEdit
              ? "Saving keeps the problem's status. Validate and publish from the Problems tab."
              : "Saved as a draft. Validate and publish it from the Problems tab."}
          </p>

          <div className="ml-auto flex gap-3">
            <Link
              to="/admin/problems"
              className="rounded-xl border border-white/8 px-4 py-2.5 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-primary-start to-primary-end px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
            >
              {saving && <Spinner />}
              {isEdit ? "Save changes" : "Save draft"}
            </button>
          </div>
        </div>
      </div>
    </form>,
  );
};

export default ProblemFormPage;