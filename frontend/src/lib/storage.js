// localStorage can throw (private mode, storage full), so every access is wrapped
export const readStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // nothing important is lost if this fails
  }
};