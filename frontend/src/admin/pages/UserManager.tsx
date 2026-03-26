import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AdminRole, AdminUser, createAdminUser, listAdminUsers } from "../api";
import { useAdminAuth } from "../auth";

interface CreateUserFormState {
  email: string;
  password: string;
  role: AdminRole;
  fullName: string;
  phone: string;
  isActive: boolean;
}

const ROLE_OPTIONS: Array<{ value: AdminRole; label: string }> = [
  { value: "author", label: "Author" },
  { value: "department_reviewer", label: "Department Reviewer" },
  { value: "editor", label: "Editor" },
  { value: "publishing_officer", label: "Publishing Officer" },
  { value: "admin", label: "Administrator" },
  { value: "superadmin", label: "Super Administrator" }
];

const initialForm: CreateUserFormState = {
  email: "",
  password: "",
  role: "author",
  fullName: "",
  phone: "",
  isActive: true
};

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

const UserManager: React.FC = () => {
  const { user } = useAdminAuth();
  const [form, setForm] = useState<CreateUserFormState>(initialForm);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManageUsers = useMemo(
    () => user?.role === "superadmin" || user?.role === "admin",
    [user]
  );

  const roleOptions = useMemo(() => {
    if (user?.role === "superadmin") {
      return ROLE_OPTIONS;
    }
    return ROLE_OPTIONS.filter((option) => option.value !== "superadmin");
  }, [user]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminUsers();
      setUsers(data);
    } catch (err: any) {
      const message = err.response?.data?.error || "Unable to load users";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManageUsers) {
      loadUsers();
    }
  }, [canManageUsers, loadUsers]);

  useEffect(() => {
    if (!roleOptions.some((option) => option.value === form.role) && roleOptions.length) {
      setForm((prev) => ({ ...prev, role: roleOptions[0].value }));
    }
  }, [roleOptions, form.role]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const field = name as keyof CreateUserFormState;
    const nextValue =
      type === "checkbox" && event.target instanceof HTMLInputElement
        ? event.target.checked
        : value;
    setForm((prev) => ({
      ...prev,
      [field]: nextValue as CreateUserFormState[keyof CreateUserFormState]
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        fullName: form.fullName.trim() ? form.fullName.trim() : undefined,
        phone: form.phone.trim() ? form.phone.trim() : undefined,
        isActive: form.isActive
      };
      await createAdminUser(payload);
      setSuccess("User created successfully.");
      setForm((prev) => ({ ...initialForm, role: prev.role }));
      await loadUsers();
    } catch (err: any) {
      const message = err.response?.data?.error || "Unable to create user";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  if (!canManageUsers) {
    return (
      <div className="admin-panel">
        <h1>User Management</h1>
        <p>You do not have permission to manage CMS users.</p>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <header className="admin-page-header">
        <div>
          <h1>User Management</h1>
          <p>Create CMS accounts, assign editorial roles, and review admin access status.</p>
        </div>
      </header>

      <div className="admin-grid">
      <section className="admin-card">
        <div className="admin-card-header">
          <h2>Create CMS User</h2>
          <span className="menu-chip subtle">{roleOptions.length} roles</span>
        </div>
        <form onSubmit={handleSubmit} className="admin-form">
          <label htmlFor="admin-user-email">Email</label>
          <input
            id="admin-user-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="admin-user-password">Temporary Password</label>
          <input
            id="admin-user-password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
          />

          <label htmlFor="admin-user-fullName">Full Name</label>
          <input
            id="admin-user-fullName"
            name="fullName"
            type="text"
            value={form.fullName}
            onChange={handleChange}
            placeholder="Optional"
          />

          <label htmlFor="admin-user-role">Role</label>
          <select id="admin-user-role" name="role" value={form.role} onChange={handleChange}>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label htmlFor="admin-user-phone">Phone (for OTP recovery)</label>
          <input
            id="admin-user-phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="Digits only"
          />

          <label className="admin-checkbox">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
            />
            <span>Enable account immediately</span>
          </label>

          {error ? (
            <p className="admin-error" role="alert">
              {error}
            </p>
          ) : null}
          {success ? <p className="admin-success">{success}</p> : null}

          <button type="submit" className="btn" disabled={creating}>
            {creating ? "Creating…" : "Create user"}
          </button>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <h2>Existing Users</h2>
          <button type="button" className="btn secondary" onClick={loadUsers} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {loading ? (
          <p>Loading users…</p>
        ) : users.length === 0 ? (
          <p>No CMS users found yet.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.email}</td>
                    <td>{item.role.replace(/_/g, " ")}</td>
                    <td>{item.fullName || "—"}</td>
                    <td>{item.phone || "—"}</td>
                    <td>{item.isActive ? "Active" : "Disabled"}</td>
                    <td>{formatDate(item.lastLoginAt)}</td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </div>
  );
};

export default UserManager;
