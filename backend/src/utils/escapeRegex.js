// the search text goes into a regex, so special characters have to be escaped first
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export default escapeRegex;