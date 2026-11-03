
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "./Spinner.jsx";

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Wait until the authentication status is determined.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  // Already authenticated users should go to the homepage.
  if (user) {
    return <Navigate to="/" replace />;
  }

  // Allow unauthenticated users to access guest pages.
  return children;
};

export default GuestRoute;
