const UNITS = [
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

export const timeAgo = (iso) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 1000));

  for (const [name, size] of UNITS) {
    if (seconds >= size) {
      const count = Math.floor(seconds / size);
      return `${count} ${name}${count > 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
};