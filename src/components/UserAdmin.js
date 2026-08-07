import { useCallback, useEffect, useState } from "react";

import classes from "./UserAdmin.module.scss";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminDistricts,
  fetchAdminUsers,
} from "./ApiService";

const EMPTY_FORM = {
  user_email: "",
  display_name: "",
  district_id: "",
};

const formatDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
};

const UserAdmin = () => {
  const [users, setUsers] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyEmail, setBusyEmail] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersData, districtsData] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminDistricts(),
      ]);
      setUsers(usersData.users || []);
      setDistricts(districtsData.districts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setNotice("");
    setError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setForm(EMPTY_FORM);
  };

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const selected = districts.find((d) => d.district_id === form.district_id);
    if (!selected) {
      setError("Select a school district");
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
      const warnings = (result.warnings || []).join(" ");
      setNotice(
        `${result.user_email} created with the default password "${result.default_password}". ${warnings}`.trim()
      );
      closeForm();
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (
      // eslint-disable-next-line no-alert
      !window.confirm(
        `Delete ${user.user_email} from the portal and set them to Unlicensed in Tableau?`
      )
    ) {
      return;
    }

    setBusyEmail(user.user_email);
    setError("");
    setNotice("");
    try {
      const result = await deleteAdminUser(user.user_email);
      const warnings = (result.warnings || []).join(" ");
      setNotice(`${user.user_email} deleted. ${warnings}`.trim());
      await loadUsers();
    } catch (err) {
      setError(`Could not delete ${user.user_email}: ${err.message}`);
    } finally {
      setBusyEmail("");
    }
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
          <button type="button" className={classes.secondaryBtn} onClick={loadUsers}>
            Refresh
          </button>
          <button type="button" className={classes.primaryBtn} onClick={openCreateForm}>
            New user
          </button>
        </div>
      </div>

      {error && <div className={classes.error}>{error}</div>}
      {notice && <div className={classes.notice}>{notice}</div>}

      {formOpen && (
        <form className={classes.form} onSubmit={submitForm}>
          <div className={classes.formGrid}>
            <label className={classes.field}>
              <span>Email</span>
              <input
                type="email"
                value={form.user_email}
                onChange={updateField("user_email")}
                required
              />
            </label>
            <label className={classes.field}>
              <span>Display name</span>
              <input
                type="text"
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
            <button type="button" className={classes.secondaryBtn} onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" className={classes.primaryBtn} disabled={saving}>
              {saving ? "Saving…" : "Create user"}
            </button>
          </div>
        </form>
      )}

      <div className={classes.tableWrapper}>
        {loading ? (
          <div className={classes.placeholder}>Loading users…</div>
        ) : users.length === 0 ? (
          <div className={classes.placeholder}>No portal users yet.</div>
        ) : (
          <table className={classes.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Display name</th>
                <th>District</th>
                <th>Created</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_email}>
                  <td>{user.user_email}</td>
                  <td>{user.display_name}</td>
                  <td>
                    {user.district_name || (
                      <span className={classes.muted}>None</span>
                    )}
                  </td>
                  <td>{formatDate(user.create_time)}</td>
                  <td>
                    <div className={classes.rowActions}>
                      <button
                        type="button"
                        className={classes.linkBtn}
                        onClick={() => handleDelete(user)}
                        disabled={busyEmail === user.user_email}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserAdmin;
