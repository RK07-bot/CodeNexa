
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  SearchX,
  CircleAlert,
  CircleCheck,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { getUsers, updateUserRole } from "../../../api/admin.api.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import useDebounce from "../../../hooks/useDebounce.js";
import Pills from "../../../components/Pills.jsx";
import Pagination from "../../../components/Pagination.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";

const roleOptions = [
  { value: "", label: "All" },
  { value: "user", label: "Users" },
  { value: "admin", label: "Admins" },
];

const inputStyles =
  "w-full rounded-xl border border-white/8 bg-recessed text-sm text-white outline-none transition-all duration-200 hover:border-white/12 focus:border-primary-start/50 focus:bg-editor focus:ring-2 focus:ring-primary-start/10";

const USER_GRID =
  "md:grid-cols-[minmax(0,2.4fr)_90px_120px_70px_100px_130px]";

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const RoleBadge = ({ role }) => (
  <span
    className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
      role === "admin"
        ? "border-primary-start/30 bg-primary-start/10 text-primary-start"
        : "border-white/10 bg-white/5 text-white/55"
    }`}
  >
    {role}
  </span>
);

const UserRowSkeleton = () => (
  <div className="border-b border-white/8 px-5 py-4 last:border-b-0">
    <div className="h-4 w-40 animate-pulse rounded bg-white/5" />
    <div className="mt-2 h-3 w-56 animate-pulse rounded bg-white/5" />
  </div>
);

const UsersTab = () => {
  const { user: me } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "";
  const page = Math.max(Math.floor(Number(searchParams.get("page"))) || 1, 1);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 10, 1),
    50,
  );

  // the input keeps what the admin is typing, the URL only gets the settled value
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput);

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // the role change waiting for confirmation: { user, role }
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [notice, setNotice] = useState("");

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });

    // changing a filter or the page size always starts again from page 1
    if (!("page" in changes)) next.delete("page");

    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (debouncedSearch.trim() !== search) {
      updateParams({ search: debouncedSearch.trim() });
    }
    // runs when the typed text settles, everything else is read fresh each time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await getUsers({ search, role, page, limit });
        if (cancelled) return;
        setUsers(res.data.users);
        setPagination(res.data.pagination);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Could not load users.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // a newer request has started, ignore this one's result
    return () => {
      cancelled = true;
    };
  }, [search, role, page, limit, reloadKey]);

  // the success message disappears by itself
  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  const hasFilters = Boolean(search || role);

  const clearFilters = () => {
    setSearchInput("");
    setSearchParams({}, { replace: true });
  };

  const openDialog = (user, nextRole) => {
    setDialogError("");
    setPending({ user, role: nextRole });
  };

  const closeDialog = () => {
    if (!saving) setPending(null);
  };

  const confirmRoleChange = async () => {
    setSaving(true);
    setDialogError("");

    try {
      const res = await updateUserRole(pending.user._id, pending.role);
      setNotice(res.data.message);
      setPending(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      // the server explains why (last admin, changed by someone else, ...)
      setDialogError(
        err.response?.data?.message || "Could not change the role.",
      );
    } finally {
      setSaving(false);
    }
  };

  const promoting = pending?.role === "admin";

  return (
    <div>
      <div className="space-y-3 rounded-2xl border border-white/8 bg-card p-3 backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by username or email"
              className={`${inputStyles} py-2.5 pl-10 pr-3.5 placeholder:text-white/25`}
            />
          </div>

          <Pills
            options={roleOptions}
            value={role}
            onChange={(value) => updateParams({ role: value })}
            layoutId="users-role-pill"
          />
        </div>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-400"
        >
          <CircleCheck className="size-4 shrink-0" />
          {notice}
        </p>
      )}

      <p className="mb-3 mt-6">
        <span className="text-2xl font-semibold text-primary-start">
          {pagination.total}
        </span>{" "}
        <span className="text-sm text-white/45">users</span>
      </p>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-card backdrop-blur-xl">
        <div
          className={`hidden grid-cols-1 gap-3 border-b border-white/8 px-5 py-3 text-xs font-medium uppercase tracking-wider text-white/35 md:grid ${USER_GRID}`}
        >
          <span>User</span>
          <span>Role</span>
          <span>Joined</span>
          <span>Solved</span>
          <span>Submissions</span>
          <span />
        </div>

        {loading &&
          Array.from({ length: Math.min(limit, 8) }, (_, i) => (
            <UserRowSkeleton key={i} />
          ))}

        {!loading && error && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <CircleAlert className="size-8 text-red-400" />
            <p className="mt-3 text-sm text-white/65">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <SearchX className="size-8 text-white/30" />
            <p className="mt-3 text-sm font-medium text-white">
              {hasFilters ? "No users match your filters" : "No users yet"}
            </p>
            {hasFilters && (
              <>
                <p className="mt-1 text-sm text-white/45">
                  Try a different search or remove a filter.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        )}

        {!loading &&
          !error &&
          users.map((user) => {
            const isMe = String(user._id) === String(me?._id);
            const isAdmin = user.role === "admin";

            return (
              <div
                key={user._id}
                className={`grid grid-cols-1 items-center gap-3 border-b border-white/8 px-5 py-4 transition-colors duration-200 last:border-b-0 hover:bg-white/3 ${USER_GRID}`}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-white">
                    <span className="truncate">{user.username}</span>
                    {isMe && (
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/55">
                        You
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-white/45">
                    {user.email}
                  </p>
                </div>

                <RoleBadge role={user.role} />

                <span className="text-sm text-white/55">
                  {formatDate(user.createdAt)}
                </span>

                <span className="hidden text-sm text-white/75 md:block">
                  {user.solved}
                </span>
                <span className="hidden text-sm text-white/75 md:block">
                  {user.submissions}
                </span>
                <p className="text-sm text-white/45 md:hidden">
                  {user.solved} solved · {user.submissions} submissions
                </p>

                <div className="md:text-right">
                  <button
                    type="button"
                    disabled={isMe}
                    title={isMe ? "You cannot change your own role" : undefined}
                    onClick={() =>
                      openDialog(user, isAdmin ? "user" : "admin")
                    }
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40 ${
                      isAdmin
                        ? "border-red-400/30 bg-red-400/10 text-red-400 hover:bg-red-400/15"
                        : "border-white/8 text-white/75 hover:border-white/15 hover:text-white"
                    }`}
                  >
                    {isAdmin ? (
                      <ShieldOff className="size-3.5" />
                    ) : (
                      <ShieldCheck className="size-3.5" />
                    )}
                    {isAdmin ? "Remove admin" : "Make admin"}
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {!loading && !error && pagination.total > 0 && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={limit}
          noun="users"
          onPageChange={(nextPage) => {
            updateParams({ page: nextPage });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onLimitChange={(value) => updateParams({ limit: value })}
        />
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        danger={!promoting}
        busy={saving}
        error={dialogError}
        title={promoting ? "Make this user an admin?" : "Remove admin rights?"}
        message={
          pending
            ? promoting
              ? `${pending.user.username} will be able to manage problems, users and rooms.`
              : `${pending.user.username} will lose access to the admin pages straight away.`
            : ""
        }
        confirmLabel={promoting ? "Make admin" : "Remove admin"}
        onConfirm={confirmRoleChange}
        onCancel={closeDialog}
      />
    </div>
  );
};

export default UsersTab;