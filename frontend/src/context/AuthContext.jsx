import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // null user means logged out — every page can just check `user` directly
  const value = { user, setUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// small wrapper so components don't need to import useContext + AuthContext separately every time
export function useAuth() {
  return useContext(AuthContext);
}