const styles = {
  easy: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  hard: "border-red-400/30 bg-red-400/10 text-red-400",
};

const DifficultyBadge = ({ difficulty }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${styles[difficulty]}`}
  >
    {difficulty}
  </span>
);

export default DifficultyBadge;