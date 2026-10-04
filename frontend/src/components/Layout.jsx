import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";

const Layout = () => {
  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <Outlet />
    </div>
  );
};

export default Layout;