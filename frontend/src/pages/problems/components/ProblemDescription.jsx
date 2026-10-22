import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  Clock,
  Cpu,
  Lightbulb,
  CircleCheck,
} from "lucide-react";
import DifficultyBadge from "../../../components/DifficultyBadge.jsx";
import CopyButton from "../../../components/CopyButton.jsx";

const Section = ({ title, children }) => (
  <section className="mt-7">
    <h2 className="text-sm font-semibold text-white">{title}</h2>
    <div className="mt-2.5">{children}</div>
  </section>
);

const CodeBlock = ({ label, text }) => (
  <div className="min-w-0 rounded-xl border border-white/8 bg-editor">
    <div className="flex items-center justify-between border-b border-white/8 px-3 py-1.5">
      <span className="text-xs text-white/45">{label}</span>
      <CopyButton text={text} />
    </div>
    <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-white/75">
      {text}
    </pre>
  </div>
);

const Hint = ({ index, text }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-white/8 bg-recessed/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white/75 transition-colors duration-200 hover:text-white"
      >
        <span className="flex items-center gap-2">
          <Lightbulb className="size-4 text-amber-400" /> Hint {index + 1}
        </span>
        <ChevronDown
          className={`size-4 text-white/35 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-3 text-sm leading-6 text-white/55">{text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProblemDescription = ({ problem, solved }) => {
  const constraints = problem.constraints.split("\n").filter(Boolean);

  return (
    <div className="p-5 sm:p-6">
      <Link
        to="/problems"
        className="inline-flex items-center gap-1.5 text-xs text-white/45 transition-colors duration-200 hover:text-white"
      >
        <ArrowLeft className="size-3.5" /> All problems
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {problem.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <DifficultyBadge difficulty={problem.difficulty} />
        {solved && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            <CircleCheck className="size-3.5" /> Solved
          </span>
        )}
        {problem.acceptanceRate !== null && (
          <span className="text-xs text-white/45">
            {problem.acceptanceRate}% acceptance
          </span>
        )}
        {problem.topics.map((t) => (
          <span
            key={t}
            className="rounded-full border border-white/8 bg-recessed px-2.5 py-0.5 text-xs capitalize text-white/60"
          >
            {t}
          </span>
        ))}
      </div>

      <p className="mt-5 whitespace-pre-line text-sm leading-7 text-white/65">
        {problem.description}
      </p>

      <Section title="Input format">
        <p className="whitespace-pre-line text-sm leading-7 text-white/65">
          {problem.inputFormat}
        </p>
      </Section>

      <Section title="Output format">
        <p className="whitespace-pre-line text-sm leading-7 text-white/65">
          {problem.outputFormat}
        </p>
      </Section>

      <Section title="Examples">
        <div className="space-y-4">
          {problem.examples.map((example, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/8 bg-recessed/40 p-3"
            >
              <p className="mb-2.5 text-xs font-medium text-white/65">
                Example {i + 1}
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <CodeBlock label="Input" text={example.input} />
                <CodeBlock label="Output" text={example.output} />
              </div>
              {example.explanation && (
                <p className="mt-2.5 text-xs leading-6 text-white/45">
                  {example.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      {constraints.length > 0 && (
        <Section title="Constraints">
          <ul className="space-y-1.5">
            {constraints.map((line) => (
              <li key={line}>
                <span className="inline-block rounded-md bg-recessed px-2.5 py-1 font-mono text-xs text-white/65">
                  {line}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Limits">
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-2 rounded-lg border border-white/8 bg-recessed px-3 py-2 text-xs text-white/65">
            <Clock className="size-3.5 text-primary-start" />{" "}
            {problem.timeLimit}s time limit
          </span>
          <span className="flex items-center gap-2 rounded-lg border border-white/8 bg-recessed px-3 py-2 text-xs text-white/65">
            <Cpu className="size-3.5 text-primary-start" />{" "}
            {problem.memoryLimit} MB memory
          </span>
        </div>
      </Section>

      {problem.hints.length > 0 && (
        <Section title="Hints">
          <div className="space-y-2">
            {problem.hints.map((hint, i) => (
              <Hint key={i} index={i} text={hint} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

export default ProblemDescription;
