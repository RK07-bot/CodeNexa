import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Code2,
  ChevronDown,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  Play,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";

const heroBadges = [
  { icon: Code2, label: "Real coding\nenvironment" },
  { icon: Users, label: "Live collaboration" },
  { icon: Sparkles, label: "AI feedback" },
];

const whyCodeNexa = [
  {
    icon: Code2,
    title: "Solve",
    body: "Work through coding problems in an environment that feels closer to a real technical interview.",
  },
  {
    icon: MessageCircle,
    title: "Communicate",
    body: "Practice explaining your approach, discussing your solution, and collaborating with another developer.",
  },
  {
    icon: BarChart3,
    title: "Improve",
    body: "Understand your mistakes and get feedback that helps you become better prepared for the real interview.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08 },
  }),
};

const HeroMockup = () => {
  const code = `vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> map;
    vector<int> answer(2);

    for (int i = 0; i < nums.size(); i++) {
        int num = target - nums[i];
        if (map.find(num) != map.end()) {
            answer[0] = map[num];
            answer[1] = i;
        }
        else {
            map[nums[i]] = i;
        }
    }

    return answer;
}`;

  const [displayedCode, setDisplayedCode] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Types the code, pauses when complete, then deletes it before restarting.
  useEffect(() => {
    let timeout;

    if (!isDeleting && displayedCode.length < code.length) {
      timeout = setTimeout(() => {
        setDisplayedCode(code.slice(0, displayedCode.length + 1));
      }, 32);
    } else if (!isDeleting && displayedCode.length === code.length) {
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 1800);
    } else if (isDeleting && displayedCode.length > 0) {
      timeout = setTimeout(() => {
        setDisplayedCode(code.slice(0, displayedCode.length - 1));
      }, 16);
    } else if (isDeleting && displayedCode.length === 0) {
      timeout = setTimeout(() => {
        setIsDeleting(false);
      }, 700);
    }

    return () => clearTimeout(timeout);
  }, [displayedCode, isDeleting, code]);

  // Keeps the mock interview session timer running.
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="relative">
      <motion.div
        animate={{ opacity: [0.2, 0.38, 0.2] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -inset-5 rounded-3xl bg-linear-to-r from-primary-start/25 to-primary-end/25 blur-3xl"
      />

      <div className="relative h-[430px] overflow-hidden rounded-2xl border border-white/8 bg-card shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between border-b border-white/8 bg-recessed px-3 sm:px-4">
          <p className="text-sm font-bold tracking-tight text-white">
            Code
            <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
              Nexa
            </span>
          </p>

          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              <span className="grid size-8 place-items-center rounded-full border-2 border-background bg-primary-start/20 text-[10px] font-semibold text-primary-start">
                R
              </span>

              <span className="grid size-8 place-items-center rounded-full border-2 border-background bg-primary-end/20 text-[10px] font-semibold text-primary-end">
                K
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-editor px-3 py-1.5">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />

              <span className="font-mono text-[11px] font-medium tabular-nums text-white/75">
                {minutes}:{seconds}
              </span>
            </div>

            <button className="hidden rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-[10px] font-medium text-red-400 sm:block">
              End session
            </button>
          </div>
        </div>

        <div className="grid h-[376px] min-h-0 gap-2 p-2 lg:grid-cols-[0.82fr_1.45fr_0.72fr]">
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-white/8 bg-recessed/70">
            <div className="shrink-0 border-b border-white/8 p-3">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="rounded-md border border-primary-start/30 bg-primary-start/10 px-2 py-1 font-medium text-primary-start">
                  Problem
                </span>

                <span className="text-white/30">Discussion</span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  Two Sum
                </h3>

                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] font-medium text-amber-400">
                  Medium
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden p-3">
              <p className="text-[10px] leading-[1.7] text-white/45">
                Given an array of integers nums and an integer target, return
                indices of the two numbers such that they add up to target.
              </p>

              <p className="mt-3 text-[10px] font-semibold text-white">
                Example 1:
              </p>

              <div className="mt-2 rounded-lg border border-white/8 bg-editor p-2.5 font-mono text-[9px] leading-[1.7] text-white/45">
                <p>Input: nums = [2,7,11,15]</p>
                <p>target = 9</p>
                <p className="text-white/65">Output: [0,1]</p>
              </div>

              <div className="mt-2 border-t border-white/8 pt-2 text-[10px] text-white/35">
                Example 2
              </div>

              <div className="mt-2 border-t border-white/8 pt-2 text-[10px] text-white/35">
                Constraints
              </div>
            </div>
          </div>

          <div className="grid h-full min-h-0 min-w-0 grid-rows-[1fr_82px] gap-2">
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-white/8 bg-editor">
              <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/8 px-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-4 place-items-center rounded bg-primary-start/15 font-mono text-[7px] font-bold text-primary-start">
                    C++
                  </span>

                  <span className="text-[11px] text-white">C++</span>

                  <ChevronDown className="size-3 text-white/35" />
                </div>

                <div className="flex items-center gap-1.5">
                  <button className="flex items-center gap-1.5 rounded-lg border border-white/8 px-2.5 py-1.5 text-[10px] font-medium text-white/65">
                    <Play className="size-3" />
                    Run
                  </button>

                  <button className="rounded-lg bg-linear-to-r from-primary-start to-primary-end px-3 py-1.5 text-[10px] font-medium text-white">
                    Submit
                  </button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden p-3">
                <div className="pointer-events-none absolute left-3 top-3 select-none font-mono text-[8px] leading-[1.65] text-white/15">
                  {Array.from(
                    {
                      length: Math.max(
                        8,
                        displayedCode.split("\n").length
                      ),
                    },
                    (_, i) => (
                      <div key={i}>{i + 1}</div>
                    )
                  )}
                </div>

                <pre className="ml-7 whitespace-pre-wrap break-words font-mono text-[8px] leading-[1.65] text-white/55">
                  {displayedCode}

                  <span className="ml-0.5 inline-block h-3 w-px translate-y-0.5 animate-pulse bg-primary-start" />
                </pre>
              </div>
            </div>

            <div className="h-[82px] overflow-hidden rounded-xl border border-white/8 bg-recessed/70">
              <div className="flex h-8 items-center gap-5 border-b border-white/8 px-3">
                <div className="h-full border-b-2 border-primary-start pt-2 text-[10px] font-medium text-white">
                  Test Result
                </div>

                <div className="pt-2 text-[10px] text-white/35">
                  Testcase
                </div>
              </div>

              <div className="p-3">
                <p className="text-[10px] text-white/40">
                  Run your code to see test results.
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-white/8 bg-recessed/70">
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/8 px-3">
              <Video className="size-3.5 text-primary-start" />

              <span className="text-[11px] font-semibold text-white">
                Video call
              </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-white/8 bg-linear-to-br from-recessed to-card">
                <div className="grid size-10 place-items-center rounded-full bg-primary-start/20 text-xs font-semibold text-primary-start">
                  R
                </div>

                <div className="absolute bottom-2 left-2 text-[9px] font-medium text-white/70">
                  You
                </div>

                <Mic className="absolute bottom-2 right-2 size-3 text-emerald-400" />
              </div>

              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-white/8 bg-linear-to-br from-recessed to-card">
                <div className="grid size-10 place-items-center rounded-full bg-primary-end/20 text-xs font-semibold text-primary-end">
                  K
                </div>

                <div className="absolute bottom-2 left-2 text-[9px] font-medium text-white/70">
                  Partner
                </div>

                <MicOff className="absolute bottom-2 right-2 size-3 text-red-400" />
              </div>
            </div>

            <div className="flex h-10 shrink-0 items-center justify-center gap-2 border-t border-white/8">
              <button className="grid size-7 place-items-center rounded-lg border border-white/8 text-white/50 transition-colors hover:border-white/15 hover:text-white">
                <Mic className="size-3" />
              </button>

              <button className="grid size-7 place-items-center rounded-lg border border-white/8 text-white/50 transition-colors hover:border-white/15 hover:text-white">
                <Video className="size-3" />
              </button>

              <button className="grid size-7 place-items-center rounded-lg border border-white/8 text-white/50 transition-colors hover:border-white/15 hover:text-white">
                <MonitorUp className="size-3" />
              </button>

              <button className="relative grid size-7 place-items-center rounded-lg border border-white/8 text-white/50 transition-colors hover:border-white/15 hover:text-white">
                <MessageCircle className="size-3" />

                <span className="absolute -right-1 -top-1 grid size-3.5 place-items-center rounded-full bg-primary-start text-[7px] font-bold text-white">
                  2
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  return (
    <div className="mx-auto max-w-6xl space-y-24 px-4 sm:space-y-32 sm:px-6">
      <section className="grid items-center gap-12 pt-6 lg:grid-cols-[0.92fr_1.08fr] lg:pt-12">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">
            Practice · Collaborate · Improve
          </p>

          <h1 className="mt-6 text-4xl font-semibold leading-[1.06] text-white sm:text-5xl lg:text-6xl">
            Practice technical interviews like{" "}
            <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
              they're real.
            </span>
          </h1>

          <p className="mt-6 max-w-md text-base text-white/45 sm:text-lg">
            Solve coding problems with peers, collaborate in real time, and get
            AI feedback on your solutions.
          </p>

          <div className="mt-9">
            <Link
              to="/problems"
              className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-primary-start to-primary-end px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-start/25"
            >
              Start practicing <ArrowRight className="size-4" />
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            {heroBadges.map((b) => (
              <li
                key={b.label}
                className="flex items-center gap-2.5 text-xs text-white/45"
              >
                <b.icon className="size-4 text-primary-start" />

                <span className="whitespace-pre-line leading-tight">
                  {b.label}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="hidden lg:block"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
        >
          <HeroMockup />
        </motion.div>
      </section>

      <section>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
        >
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">
            Why CodeNexa
          </p>

          <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Coding practice isn't enough.
          </h2>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/45">
            Real technical interviews are about more than solving a problem.
            You need to think clearly, explain your approach, communicate with
            another person, and improve from your mistakes.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {whyCodeNexa.map((item, i) => (
            <motion.div
              key={item.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              custom={i}
              className="rounded-2xl border border-white/8 bg-card p-7 transition-all duration-200 hover:-translate-y-1 hover:border-white/15 hover:shadow-xl hover:shadow-black/20"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-start/10 text-primary-start">
                <item.icon className="size-6" />
              </span>

              <h3 className="mt-6 text-xl font-semibold text-white">
                {item.title}
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-white/45">
                {item.body}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          custom={1}
          className="mt-10 rounded-2xl border border-white/8 bg-recessed/50 p-6 sm:p-8"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary-start">
            The real interview experience
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm font-semibold text-white">Solve</p>

              <p className="mt-1 text-xs leading-relaxed text-white/40">
                Work through a real coding problem.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Explain</p>

              <p className="mt-1 text-xs leading-relaxed text-white/40">
                Communicate your thinking and approach.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Collaborate
              </p>

              <p className="mt-1 text-xs leading-relaxed text-white/40">
                Practice with another developer in real time.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Improve</p>

              <p className="mt-1 text-xs leading-relaxed text-white/40">
                Learn from feedback and become better prepared.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="border-t border-white/8 pb-20 pt-20 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-primary-start">
          Same problems. Higher confidence.
        </p>

        <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">
          Ready to practice for the real interview?
        </h2>

        <p className="mt-4 text-base text-white/45">
          Build your skills. Practice with peers. Get better with AI.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-primary-start to-primary-end px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-start/25"
          >
            Get started <ArrowRight className="size-4" />
          </Link>

          <Link
            to="/problems"
            className="inline-flex items-center gap-2 rounded-full border border-white/8 px-7 py-3 text-sm font-medium text-white/75 transition-all duration-200 hover:border-white/15 hover:text-white"
          >
            Browse problems
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;