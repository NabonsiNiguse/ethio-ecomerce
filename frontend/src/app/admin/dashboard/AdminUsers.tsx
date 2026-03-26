"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/axios";

interface AdminUser {
  id: number; username: string; email: string; phone_number: string;
  role: string; is_active: boolean; is_verified: boolean; date_joined: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700", seller: "bg-brand-100 text-brand-700", customer: "bg-green-100 text-green-700",
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (search) params.set("search", search);
    api.get<AdminUser[]>(`/api/admin/users?${params}`)
      .then(r => setUsers(r.data))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [roleFilter, search]);

  const toggleActive = async (user: AdminUser) => {
    setUpdating(user.id);
    try {
      await api.patch(`/api/admin/users/${user.id}`, { is_active: !user.is_active });
      toast.success(`User ${user.is_active ? "blocked" : "unblocked"}`);
      load();
    } catch { toast.error("Update failed"); }
    finally { setUpdating(null); }
  };

  const changeRole = async (user: AdminUser, role: string) => {
    setUpdating(user.id);
    try {
      await api.patch(`/api/admin/users/${user.id}`, { role });
      toast.success(`Role changed to ${role}`);
      load();
    } catch { toast.error("Update failed"); }
    finally { setUpdating(null); }
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Delete this user permanently?")) return;
    try {
      await api.delete(`/api/admin/users/${id}`);
      toast.success("User deleted");
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch { toast.error("Delete failed"); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">User Management</h2>
        <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          {users.length} users
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Search username or email..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-orange-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
        {["all", "customer", "seller", "admin"].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
              roleFilter === r ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}>
            {r}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />)}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-800">
                  {["User", "Role", "Status", "Joined", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {users.map((user, i) => (
                  <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-black text-orange-600 dark:bg-orange-900/30">
                          {user.username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{user.username}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select value={user.role} onChange={e => changeRole(user, e.target.value)}
                        disabled={updating === user.id}
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold border-0 cursor-pointer ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                        <option value="customer">customer</option>
                        <option value="seller">seller</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {user.is_active ? "Active" : "Blocked"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(user.date_joined).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => toggleActive(user)} disabled={updating === user.id}
                          className={`rounded-lg px-2 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                            user.is_active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"
                          }`}>
                          {user.is_active ? "Block" : "Unblock"}
                        </button>
                        <button onClick={() => deleteUser(user.id)}
                          className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600 transition dark:bg-gray-800">
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
