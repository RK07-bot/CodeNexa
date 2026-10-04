import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Video, Target } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI code review",
    description: "Complexity, edge cases, and a score on every run.",
  },
  {
    icon: Video,
    title: "Live collaboration",
    description: "Video, chat, and a synced editor with a partner.",
  },
  {
    icon: Target,
    title: "Real interview feel",
    description: "Timed, two-person rooms that feel like the real thing.",
  },
];

const steps = [
  { number: "1", label: "Pick a problem" },
  { number: "2", label: "Join or create a room" },
  { number: "3", label: "Get AI feedback" },
];

const stats = [
  { value: "180+", label: "Problems available" },
  { value: "2,400+", label: "Sessions completed" },
  { value: "900+", label: "Users practicing" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08 },
  }),
};

const HomePage = () => {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary-start/10 blur-3xl" />
      <div className="pointer-events-none absolute top-60 -right-20 h-72 w-72 rounded-full bg-primary-end/10 blur-3xl" />

      <section className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-4xl font-bold tracking-tight sm:text-5xl"
        >
          Practice technical interviews,
          <br />
          <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
            live, with a partner.
          </span>
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="mx-auto mt-4 max-w-xl text-white/45"
        >
          Solve problems together in a real editor, on video, with AI feedback on every run.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/register"
            className="rounded-xl bg-linear-to-r from-primary-start to-primary-end px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-start/25"
          >
            Start practicing
          </Link>
          <Link
            to="/problems"
            className="rounded-xl border border-white/8 px-6 py-3 text-sm font-medium text-white/75 transition-all duration-200 hover:border-white/15 hover:text-white"
          >
            Browse problems
          </Link>
        </motion.div>
      </section>

      <section className="relative mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              custom={i}
              className="rounded-2xl border border-white/8 bg-card p-6 text-center backdrop-blur-xl transition-all duration-200 hover:border-white/15"
            >
              <feature.icon className="mx-auto mb-3 text-primary-start" size={22} />
              <p className="text-sm font-medium text-white">{feature.title}</p>
              <p className="mt-1 text-xs text-white/45">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-3xl px-4 pb-20">
        <p className="mb-8 text-center text-sm font-medium text-white/65">How it works</p>
        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="text-center"
            >
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-r from-primary-start to-primary-end text-xs font-semibold text-white">
                {step.number}
              </div>
              <p className="text-sm text-white/75">{step.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-3xl border-t border-white/8 px-4 py-14">
        <div className="grid grid-cols-3 gap-4 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-semibold text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-white/45">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;