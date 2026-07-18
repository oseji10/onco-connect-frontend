"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCog,
  Mail,
  Phone,
  Shield,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  EyeOff,
} from "lucide-react";
import api from "../../lib/api";
import RoleGuard from "../components/RoleGuard";
import Layout from "../containers/Layout";

interface StaffUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  role: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
}

interface RoleOption {
  value: string;
  label: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber: string;
  password: string; // only used on edit, to optionally reset
  role: string;
  status: "active" | "inactive";
}

const emptyForm: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  alternatePhoneNumber: "",
  password: "",
  role: "",
  status: "active",
};

function UsersManagementPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, byRole: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "add" | "edit">("view");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get("/users");
      if (data.success) {
        setUsers(data.data);
        setStats(data.stats);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function fetchRoles() {
    try {
      const { data } = await api.get("/users/roles");
      if (data.success) setRoles(data.data);
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        user.firstName.toLowerCase().includes(q) ||
        user.lastName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.phoneNumber.toLowerCase().includes(q);

      const matchesRole = filterRole === "all" || user.role === filterRole;
      const matchesStatus = filterStatus === "all" || user.status === filterStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, filterRole, filterStatus]);

  function openModal(mode: "view" | "add" | "edit", user?: StaffUser) {
    setModalMode(mode);
    setSelectedUser(user || null);

    if (mode === "add") {
      setFormData(emptyForm);
    } else if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        alternatePhoneNumber: user.alternatePhoneNumber || "",
        password: "",
        role: user.role,
        status: user.status,
      });
    }

    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedUser(null);
    setSubmitting(false);
    setShowPassword(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (modalMode === "add") {
        const { firstName, lastName, email, phoneNumber, alternatePhoneNumber, role, status } =
          formData;
        const { data } = await api.post("/users", {
          firstName,
          lastName,
          email,
          phoneNumber,
          alternatePhoneNumber,
          role,
          status,
        });
        if (data.success) {
          await fetchUsers();
          closeModal();
        }
      } else if (modalMode === "edit" && selectedUser) {
        const payload: Partial<FormData> = { ...formData };
        if (!payload.password) delete payload.password;

        const { data } = await api.put(`/users/${selectedUser.id}`, payload);
        if (data.success) {
          await fetchUsers();
          closeModal();
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: StaffUser) {
    if (!confirm(`Delete ${user.firstName} ${user.lastName}? This can't be undone.`)) return;

    try {
      const { data } = await api.delete(`/users/${user.id}`);
      if (data.success) await fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete user");
    }
  }

  function getRoleBadgeColor(role: string) {
    const colors: Record<string, string> = {
      super_admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      reviewer: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
      registration_desk_officer:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      abstract_committee_member:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    };
    return colors[role] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400";
  }

  function getRoleLabel(role: string) {
    return roles.find((r) => r.value === role)?.label || role;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 dark:text-white font-semibold mb-2">Error Loading Users</p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchUsers}
            className="px-6 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-green-600 shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Users Management</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Manage staff accounts and dashboard access — super_admin only
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</span>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Staff</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30">
              <UserCog className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</span>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.byRole?.super_admin || 0}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Super Admins</p>
        </div>
      </div>

      {/* Search / filters / add */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            <Filter className="w-5 h-5" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>

          <button
            onClick={() => openModal("add")}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 shadow-lg transition-all font-semibold"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>

        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  {user.firstName} {user.lastName}
                </h3>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${getRoleBadgeColor(
                    user.role
                  )}`}
                >
                  {getRoleLabel(user.role)}
                </span>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  user.status === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {user.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{user.phoneNumber}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openModal("view", user)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                onClick={() => openModal("edit", user)}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(user)}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-700">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No users found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Try adjusting your search or filters</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterRole("all");
              setFilterStatus("all");
            }}
            className="px-6 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {modalMode === "add" ? "Add New User" : modalMode === "edit" ? "Edit User" : "User Details"}
              </h2>
              <button
                onClick={closeModal}
                className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {modalMode === "view" && selectedUser ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                        selectedUser.role
                      )}`}
                    >
                      {getRoleLabel(selectedUser.role)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedUser.phoneNumber}</p>
                    </div>
                    {selectedUser.alternatePhoneNumber && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Alternate Phone
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {selectedUser.alternatePhoneNumber}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Status
                      </label>
                      <p className="text-gray-900 dark:text-white capitalize">{selectedUser.status}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {modalMode === "add" && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                      A temporary password will be generated automatically and emailed to the
                      address below — there's no password field to fill in here.
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Alternate Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.alternatePhoneNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, alternatePhoneNumber: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    {modalMode === "edit" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Reset Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Leave blank to keep current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Role *
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Role</option>
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value as "active" | "inactive" })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={submitting}
                      className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {submitting ? "Saving..." : modalMode === "add" ? "Add User" : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {modalMode === "view" && (
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={closeModal}
                  className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}

export default function ProtectedUsersPage() {
  return (
    <RoleGuard menuKey="users">
      <UsersManagementPage />
    </RoleGuard>
  );
}