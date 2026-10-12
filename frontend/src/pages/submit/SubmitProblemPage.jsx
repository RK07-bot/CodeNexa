import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FilePlus, ArrowRight } from "lucide-react";

const SubmitProblemPage = () => (
  <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-2xl items-center justify-center px-4 py-16">
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full rounded-2xl border border-white/8 bg-card p-8 text-center shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-10"
    >
      <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary-start/10 text-primary-start">
        <FilePlus className="size-7" />
      </div>

      <span className="inline-flex items-center rounded-full border border-primary-start/20 bg-primary-start/10 px-3 py-1 text-xs font-medium text-primary-start">
        Coming soon
      </span>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Problem submissions are on the way
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/45">
        For now, every problem on CodeNexa is written and reviewed by our team. Soon you will
        be able to contribute problems of your own.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/problems"
          className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-primary-start to-primary-end px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-start/25"
        >
          Browse problems <ArrowRight className="size-4" />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center rounded-full border border-white/8 px-6 py-2.5 text-sm font-medium text-white/75 transition-all duration-200 hover:border-white/15 hover:text-white"
        >
          Back to home
        </Link>
      </div>
    </motion.div>
  </div>
);

export default SubmitProblemPage;