"use client";

import { useEffect, useState, useMemo } from "react";
import {
  UserPlus,
  Pencil,
  Trash2,
  ShieldCheck,
  UserCircle,
  Users,
  CheckCircle,
  XCircle,
  X,
  Search,
  KeyRound,
  Mail,
  User as UserIcon,
  Shield,
  Briefcase,
  UserCheck,
} from "lucide-react";

interface Client { id: number; name: string }

interface User {
  id:        number;
  name:      string;
  username:  string | null;
  email:     string;
  role:      string;
  active:    boolean;
  clientId:  number | null;
  client:    { id: number; name: string } | null;
  createdAt: string;
}

const EMPTY_FORM = {
  name:     "",
  username: "",
  email:    "",
  password: "",
  role:     "staff",
  clientId: "",
  active:   true,
};

const roleLabels: Record<string, string> = {
  admin:  "Administrator",
  staff:  "Staf",
  client: "Klient",
};

const roleBadge: Record<string, string> = {
  admin:  "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  staff:  "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  client: "bg-amber-50 text-amber-700 border-amber-200/80",
};

const roleIcons: Record<string, typeof ShieldCheck> = {
  admin:  ShieldCheck,
  staff:  Briefcase,
  client: UserCheck,
};

export default function UsersPage() {
  const [users,        setUsers]        = useState<User[]>([]);
  const [clients,      setClients]      = useState<Client[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState<"create" | "edit" | null>(null);
  const [editUser,     setEditUser]     = useState<User | null>(null);
  const [form,         setForm]         = useState({ ...EMPTY_FORM });
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [uRes, cRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/clients"),
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (cRes.ok) setClients(await cRes.json());
    } catch (err) {
      console.error("Failed to load users/clients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = selectedRole === "all" || u.role === selectedRole;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q) ||
        (u.client?.name && u.client.name.toLowerCase().includes(q));
      return matchesRole && matchesSearch;
    });
  }, [users, selectedRole, searchQuery]);

  const openCreate = () => {
    setEditUser(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setModal("create");
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({
      name:     u.name,
      username: u.username ?? "",
      email:    u.email,
      password: "",
      role:     u.role,
      clientId: u.clientId ? String(u.clientId) : "",
      active:   u.active,
    });
    setError("");
    setModal("edit");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      username: form.username.trim() || null,
      clientId: form.role === "client" && form.clientId ? Number(form.clientId) : null,
    };

    let res: Response;
    try {
      if (modal === "create") {
        res = await fetch("/api/users", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/users/${editUser!.id}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setModal(null);
        fetchAll();
      } else {
        setError(data.error ?? "Gabim gjatë ruajtjes");
      }
    } catch {
      setError("Dështoi lidhja me serverin gjatë ruajtjes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`Fshi përdoruesin "${u.name}" (@${u.username || u.email})? Ky veprim nuk mund të kthehet.`)) return;
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Dështoi fshirja e përdoruesit");
      } else {
        fetchAll();
      }
    } catch {
      alert("Gabim gjatë fshirjes");
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await fetch(`/api/users/${u.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...u, active: !u.active }),
      });
      fetchAll();
    } catch (err) {
      console.error("Failed to toggle user status:", err);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Menaxhimi i Përdoruesve</h1>
            <p className="text-xs sm:text-sm text-slate-500">Krijoni llogari, caktoni role dhe menaxhoni të drejtat e hyrjes</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Përdorues i Ri
        </button>
      </div>

      {/* Role Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: "admin",  label: "Administratorë", desc: "Akses i plotë në të gjithë sistemin", icon: ShieldCheck, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
          { key: "staff",  label: "Staf",           desc: "Menaxhim ofertash, faturash & postimesh", icon: Briefcase,   color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { key: "client", label: "Klientë",        desc: "Portal i dedikuar për fatura & oferta", icon: UserCheck,   color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
        ].map((item) => {
          const Icon = item.icon;
          const count = users.filter((u) => u.role === item.key && u.active).length;
          const total = users.filter((u) => u.role === item.key).length;
          return (
            <div
              key={item.key}
              onClick={() => setSelectedRole(selectedRole === item.key ? "all" : item.key)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                selectedRole === item.key
                  ? "ring-2 ring-indigo-600 shadow-md bg-white border-indigo-200"
                  : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.bg}`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                </div>
                <span className="text-xl font-bold text-slate-900">{count}</span>
              </div>
              <p className="text-xs text-slate-500">{item.desc}</p>
              <div className="mt-2.5 text-[11px] text-slate-400">
                Gjithsej: {total} ({count} aktivë)
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Kërko me emër, username, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: "all",    label: "Të gjithë" },
            { id: "admin",  label: "Admin" },
            { id: "staff",  label: "Staf" },
            { id: "client", label: "Klientë" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRole(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedRole === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Duke ngarkuar përdoruesit...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center">
            <UserCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-800">Nuk u gjet asnjë përdorues</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Nuk ka përdorues që përputhen me kriteret e kërkimit ose filtrit të zgjedhur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[620px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-3.5 px-4">Përdoruesi</th>
                  <th className="py-3.5 px-4">Username / Email</th>
                  <th className="py-3.5 px-4">Roli</th>
                  <th className="py-3.5 px-4">Klienti i Lidhur</th>
                  <th className="py-3.5 px-4">Statusi</th>
                  <th className="py-3.5 px-4 text-right">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const RoleIcon = roleIcons[u.role] ?? UserCircle;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            u.role === "admin"
                              ? "bg-indigo-100 text-indigo-700"
                              : u.role === "staff"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">{u.name}</p>
                            {u.username && (
                              <p className="text-xs text-slate-500 font-mono mt-0.5">@{u.username}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Username / Email */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="text-slate-800 font-medium text-xs flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {u.email}
                          </p>
                          {u.username && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{u.username}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleBadge[u.role] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          {roleLabels[u.role] ?? u.role}
                        </span>
                      </td>

                      {/* Linked Client */}
                      <td className="py-3.5 px-4">
                        {u.client ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            🏢 {u.client.name}
                          </span>
                        ) : u.role === "client" ? (
                          <span className="text-xs text-amber-600 font-medium">⚠️ Pa lidhur</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleActive(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            u.active
                              ? "bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                          title="Kliko për të ndryshuar statusin"
                        >
                          {u.active ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Aktiv
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              Joaktiv
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Ndrysho"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Fshi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  {modal === "create" ? <UserPlus className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {modal === "create" ? "Krijo Përdorues të Ri" : "Ndrysho Përdoruesin"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {modal === "create" ? "Plotësoni të dhënat për llogarinë e re" : `Duke modifikuar llogarinë: ${editUser?.name}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-start gap-2">
                  <span className="text-base leading-none">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Emri i plotë <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    placeholder="p.sh. Emri Mbiemri"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Përdoruesi (Username)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono">@</span>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono transition"
                      placeholder="axemedia"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    placeholder="email@axemedia.al"
                  />
                </div>

                {/* Password */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>
                      Fjalëkalimi {modal === "create" && <span className="text-red-500">*</span>}
                    </span>
                    {modal === "edit" && (
                      <span className="text-[11px] text-slate-400 font-normal">Lëreni bosh për ta mbajtur të pandryshuar</span>
                    )}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required={modal === "create"}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                      placeholder={modal === "create" ? "••••••••••••" : "Vendosni fjalëkalim të ri vetëm nëse doni ta ndryshoni"}
                    />
                  </div>
                </div>

                {/* Role selection */}
                <div className={form.role === "client" ? "sm:col-span-1" : "sm:col-span-2"}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    Roli në Sistem <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  >
                    <option value="admin">Administrator (Akses i plotë)</option>
                    <option value="staff">Staf (Fatura, Oferta, Kalendar, Shërbime)</option>
                    <option value="client">Klient (Vetëm fatura & oferta të veta)</option>
                  </select>
                </div>

                {/* Linked client if role === 'client' */}
                {form.role === "client" && (
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Lidh me Klientin ekzistues
                    </label>
                    <select
                      value={form.clientId}
                      onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    >
                      <option value="">— Zgjidh klientin —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Active Checkbox */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <label htmlFor="active-toggle" className="text-sm font-semibold text-slate-800 cursor-pointer">
                      Llogari Aktive
                    </label>
                    <p className="text-xs text-slate-500">Përdoruesit joaktivë nuk mund të kyçen në sistem</p>
                  </div>
                  <input
                    type="checkbox"
                    id="active-toggle"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Anulo
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? "Duke ruajtur..." : modal === "create" ? "Krijo Përdoruesin" : "Ruaj Ndryshimet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

