// the ids match the frontend's language list, compiler ids come from OnlineCompiler's docs
export const LANGUAGES = {
  python: { compiler: "python-3.14", compiled: false },
  cpp: { compiler: "g++-15", compiled: true },
  typescript: { compiler: "typescript-deno", compiled: false },
};

export const LANGUAGE_IDS = Object.keys(LANGUAGES);