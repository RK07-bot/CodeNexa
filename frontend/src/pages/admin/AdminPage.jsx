import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Pills from "../../components/Pills.jsx";
import OverviewTab from "./components/OverviewTab.jsx";
import UsersTab from "./components/UsersTab.jsx";
import ProblemsTab from "./components/ProblemsTab.jsx";
import ActivityTab from "./components/ActivityTab.jsx";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "users", label: "Users" },
  { value: "problems", label: "Problems" },
  { value: "activity", label: "Activity" },
];

const AdminPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // /admin/users -> "users"
  const active = location.pathname.split("/")[2] || "overview";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">
        Admin
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        Control{" "}
        <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
          room
        </span>
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-white/45 sm:text-base">
        Manage problems and users, and see how the platform is doing.
      </p>

      <div className="mt-8">
        <Pills
          options={TABS}
          value={active}
          onChange={(value) => navigate(`/admin/${value}`)}
          layoutId="admin-tabs"
        />
      </div>

      <div className="mt-6">
        <Routes>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewTab />} />
          <Route path="users" element={<UsersTab />} />
          <Route path="problems" element={<ProblemsTab />} />
          <Route path="activity" element={<ActivityTab />} />
          <Route path="*" element={<Navigate to="/admin/overview" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminPage;