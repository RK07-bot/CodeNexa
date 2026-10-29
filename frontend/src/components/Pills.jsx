import { motion } from "framer-motion";

const Pills = ({ options, value, onChange, layoutId }) => (
  <div className="flex flex-wrap items-center gap-2">
    {options.map((o) => {
      const active = value === o.value;

      return (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative rounded-full border border-white/8 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            active ? "text-white" : "text-white/55 hover:text-white"
          }`}
        >
          {active && (
            // one shared highlight that slides between pills
            <motion.span
              layoutId={layoutId}
              className="absolute -inset-px rounded-full bg-linear-to-r from-primary-start to-primary-end"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      );
    })}
  </div>
);

export default Pills;