import { useCallback, useEffect, useMemo, useState } from "react";

import classes from "./UserAdmin.module.scss";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminDistricts,
  fetchAdminUsers,
} from "./ApiService";
import { useToast } from "./Toast/ToastProvider";
import { SkeletonRows } from "./ui/Skeleton";
import EmptyState from "./ui/EmptyState";
import ConfirmDialog from "./ui/ConfirmDialog";
import SecretValue from "./ui/SecretValue";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";

const EMPTY_FORM = {
  user_email: "",
  display_name: "",
  district_id: "",
};

const TABLE_COLUMNS = 5;
const PAGE_SIZE = 25;

const COLUMNS = [
  { key: "user_email", label: "Email" },
  { key: "display_name", label: "Display name" },
  { key: "district_name", label: "District" },
  { key: "create_time", label: "Created" },
];

const formatDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
};

const compareUsers = (a, b, key) => {
  if (key === "create_time") {
    return (new Date(a.create_time).getTime() || 0) -
      (new Date(b.create_time).getTime() || 0);
  }
  return String(a[key] || "").localeCompare(String(b[key] || ""), undefined, {
    sensitivity: "base",
  });
};

const UserAdmin = () => {
  const [users, setUsers] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [busyEmail, setBusyEmail] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [newCredential, setNewCredential] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "user_email", direction: "asc" });
  const [page, setPage] = useState(1);

  const { showToast } = useToast();

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? users.filter((user) =>
          [user.user_email, user.display_name, user.district_name]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(needle))
        )
      : users;

    const sorted = [...filtered].sort((a, b) => {
      const result = compareUsers(a, b, sort.key);
      return sort.direction === "asc" ? result : -result;
    });
    return sorted;
  }, [users, query, sort]);

  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = visibleUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Filtering can shrink the list under the current page.
  useEffect(() => {
    setPage(1);
  }, [query, sort]);

  const toggleSort = (key) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );

  const isFormDirty =
    formOpen &&
    (form.user_email !== "" || form.display_name !== "" || form.district_id !== "");
  const { confirmDiscard } = useUnsavedChanges(
    isFormDirty,
    "This new user has not been created yet."
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [usersData, districtsData] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminDistricts(),
      ]);
      setUsers(usersData.users || []);
      setDistricts(districtsData.districts || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setNewCredential(null);
    setFormOpen(true);
  };

  const closeForm = ({ force = false } = {}) => {
    if (!force && !confirmDiscard()) {
      return;
    }
    setFormOpen(false);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    const selected = districts.find((d) => d.district_id === form.district_id);
    if (!selected) {
      setFormError("Select a school district");
      setSaving(false);
      return;
    }

    const payload = {
      user_email: form.user_email,
      display_name: form.display_name,
      district_id: selected.district_id,
      district_name: selected.district_name,
    };

    try {
      const result = await createAdminUser(payload);
      setNewCredential({
        email: result.user_email,
        password: result.default_password,
        warnings: result.warnings || [],
      });
      showToast(`${result.user_email} was created.`, {
        variant: "success",
        title: "User created",
      });
      closeForm({ force: true });
      await loadUsers();
    } catch (err) {
      setFormError(err.message);
      showToast(err.message, { variant: "error", title: "Could not create user" });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    const user = pendingDelete;
    if (!user) {
      return;
    }
    setBusyEmail(user.user_email);
    try {
      const result = await deleteAdminUser(user.user_email);
      const warnings = (result.warnings || []).join(" ");
      showToast(`${user.user_email} was deleted. ${warnings}`.trim(), {
        variant: "success",
        title: "User deleted",
      });
      setPendingDelete(null);
      await loadUsers();
    } catch (err) {
      showToast(`Could not delete ${user.user_email}: ${err.message}`, {
        variant: "error",
        title: "Delete failed",
      });
      setPendingDelete(null);
    } finally {
      setBusyEmail("");
    }
  };

  const renderTableBody = () => {
    if (loading) {
      return (
        <SkeletonRows
          rows={5}
          columns={TABLE_COLUMNS}
          widths={["80%", "60%", "70%", "55%", "40%"]}
        />
      );
    }

    if (pagedUsers.length === 0) {
      return (
        <tr>
          <td colSpan={TABLE_COLUMNS} className={classes.placeholder}>
            No users match “{query}”.
          </td>
        </tr>
      );
    }

    return pagedUsers.map((user) => (
      <tr key={user.user_email}>
        <td>{user.user_email}</td>
        <td>{user.display_name}</td>
        <td>
          {user.district_name || <span className={classes.muted}>None</span>}
        </td>
        <td>{formatDate(user.create_time)}</td>
        <td>
          <div className={classes.rowActions}>
            <button
              type="button"
              className={classes.linkBtn}
              onClick={() => setPendingDelete(user)}
              disabled={busyEmail === user.user_email}
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className={classes.panel}>
      <div className={classes.panelHeader}>
        <div>
          <h2 className={classes.title}>User Management</h2>
          <p className={classes.subtitle}>
            Portal accounts, school district assignment, and Tableau access.
          </p>
        </div>
        <div className={classes.headerActions}>
          <div className={classes.searchField}>
            <label className={classes.visuallyHidden} htmlFor="user-search">
              Search users
            </label>
            <input
              id="user-search"
              type="search"
              placeholder="Search email, name or district"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <button
            type="button"
            className={classes.secondaryBtn}
            onClick={loadUsers}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button type="button" className={classes.primaryBtn} onClick={openCreateForm}>
            New user
          </button>
        </div>
      </div>

      {formError && <div className={classes.error}>{formError}</div>}

      {newCredential && (
        <div className={classes.notice}>
          <div>
            <strong>{newCredential.email}</strong> was created. Share this one-time
            password with them over a secure channel:
          </div>
          <SecretValue
            value={newCredential.password}
            label="default password"
            onCopied={() =>
              showToast("Default password copied to your clipboard.", {
                variant: "success",
              })
            }
          />
          {newCredential.warnings.length > 0 && (
            <div className={classes.noticeWarnings}>
              {newCredential.warnings.join(" ")}
            </div>
          )}
          <button
            type="button"
            className={classes.linkBtn}
            onClick={() => setNewCredential(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {formOpen && (
        <form className={classes.form} onSubmit={submitForm}>
          <div className={classes.formGrid}>
            <label className={classes.field}>
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={form.user_email}
                onChange={updateField("user_email")}
                required
              />
            </label>
            <label className={classes.field}>
              <span>Display name</span>
              <input
                type="text"
                autoComplete="name"
                value={form.display_name}
                onChange={updateField("display_name")}
              />
            </label>
            <label className={classes.field}>
              <span>School district</span>
              <select
                value={form.district_id}
                onChange={updateField("district_id")}
                required
              >
                <option value="">Select a district…</option>
                {districts.map((district) => (
                  <option key={district.district_id} value={district.district_id}>
                    {district.district_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={classes.formActions}>
            <button
              type="button"
              className={classes.secondaryBtn}
              onClick={() => closeForm()}
            >
              Cancel
            </button>
            <button type="submit" className={classes.primaryBtn} disabled={saving}>
              {saving ? "Saving…" : "Create user"}
            </button>
          </div>
        </form>
      )}

      <div className={classes.tableWrapper}>
        {loadError ? (
          <EmptyState
            variant="error"
            title="Could not load users"
            message={loadError}
            action={
              <button type="button" className={classes.secondaryBtn} onClick={loadUsers}>
                Try again
              </button>
            }
          />
        ) : !loading && users.length === 0 ? (
          <EmptyState
            title="No portal users yet"
            message="Create the first account with the New user button above."
          />
        ) : (
          <table className={classes.table}>
            <caption className={classes.tableCaption}>
              {loading
                ? "Loading portal users…"
                : `${visibleUsers.length} of ${users.length} portal user${
                    users.length === 1 ? "" : "s"
                  }${query ? ` matching “${query}”` : ""}`}
            </caption>
            <thead>
              <tr>
                {COLUMNS.map((column) => {
                  const active = sort.key === column.key;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        active
                          ? sort.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className={classes.sortBtn}
                        onClick={() => toggleSort(column.key)}
                      >
                        {column.label}
                        <span className={classes.sortArrow} aria-hidden="true">
                          {active ? (sort.direction === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      </button>
                    </th>
                  );
                })}
                <th scope="col">
                  <span className={classes.visuallyHidden}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>{renderTableBody()}</tbody>
          </table>
        )}
      </div>

      {!loading && !loadError && totalPages > 1 && (
        <div className={classes.pagination}>
          <button
            type="button"
            className={classes.secondaryBtn}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className={classes.pageStatus} role="status">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className={classes.secondaryBtn}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        destructive
        title="Delete this portal user?"
        message={
          pendingDelete
            ? `${pendingDelete.user_email} will lose portal access and be set to Unlicensed in Tableau. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete user"
        busy={Boolean(busyEmail)}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default UserAdmin;
