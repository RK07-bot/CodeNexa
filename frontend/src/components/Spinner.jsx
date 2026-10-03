function Spinner({ size = "sm" }) {
  const sizeClasses = size === "sm" ? "w-4 h-4 border-2" : "w-8 h-8 border-[3px]";

  return (
    <div
      className={`${sizeClasses} border-neutral-600 border-t-blue-500 rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}

export default Spinner;