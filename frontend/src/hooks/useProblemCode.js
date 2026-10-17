import { useEffect, useState } from "react";
import { readStorage, writeStorage } from "../lib/storage.js";
import { STARTER_CODE } from "../lib/languages.js";

const useProblemCode = (slug, language) => {
  const key = `code:${slug}:${language}`;
  const [code, setCode] = useState(() => readStorage(key) ?? STARTER_CODE[language]);

  // a new problem or language loads whatever was saved for that combination
  useEffect(() => {
    setCode(readStorage(key) ?? STARTER_CODE[language]);
  }, [key, language]);

  // saved shortly after the user stops typing, not on every keystroke
  useEffect(() => {
    const id = setTimeout(() => writeStorage(key, code), 500);
    return () => clearTimeout(id);
  }, [key, code]);

  const reset = () => setCode(STARTER_CODE[language]);

  return [code, setCode, reset];
};

export default useProblemCode;