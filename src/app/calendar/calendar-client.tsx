"use client";

import { useRef, useState } from "react";
import { Plus, X, Calendar, Globe, Edit2, Trash2, Clock, Share2, Rss, AtSign, ImagePlus, XCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { sq } from "date-fns/locale";

interface Post {
  id: number;
  title: string;
  content?: string | null;
  platform: string;
  status: string;
  scheduledAt?: string;
  clientId?: number | null;
  tags?: string | null;
  imageUrl?: string | null;
  client?: { id: number; name: string } | null;
}

interface Client {
  id: number;
  name: string;
}

const platforms = [
  { value: "instagram", label: "Instagram", icon: AtSign, color: "bg-pink-500" },
  { value: "facebook", label: "Facebook", icon: Share2, color: "bg-blue-600" },
  { value: "tiktok", label: "TikTok", icon: Rss, color: "bg-slate-900" },
  { value: "linkedin", label: "LinkedIn", icon: Globe, color: "bg-blue-700" },
  { value: "website", label: "Website", icon: Globe, color: "bg-indigo-600" },
  { value: "other", label: "Tjetër", icon: Globe, color: "bg-slate-500" },
];

const platformColors: Record<string, string> = {
  instagram: "bg-gradient-to-r from-pink-500 to-orange-400",
  facebook: "bg-blue-600",
  tiktok: "bg-slate-900",
  linkedin: "bg-blue-700",
  website: "bg-indigo-600",
  other: "bg-slate-500",
};

const statusColors: Record<string, string> = { draft: "bg-slate-100 text-slate-600", scheduled: "bg-amber-100 text-amber-700", published: "bg-emerald-100 text-emerald-700" };
const statusLabel: Record<string, string> = { draft: "Draft", scheduled: "Planifikuar", published: "Publikuar" };

export default function CalendarClient({ initialPosts, initialClients }: { initialPosts: Post[]; initialClients: Client[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [posts, setPosts] = useState(initialPosts);
  const [clients] = useState(initialClients);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [form, setForm] = useState({ title: "", content: "", platform: "instagram", status: "draft", scheduledAt: "", clientId: "", tags: "" });
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setForm({ title: "", content: "", platform: "instagram", status: "draft", scheduledAt: "", clientId: "", tags: "" });
    setEditPost(null);
    setShowForm(false);
    setSelectedDate(null);
    setImageFile(null);
    setImagePreview(null);
    setImageError("");
  };

  const openNewPost = (date?: Date) => {
    resetForm();
    if (date) {
      const nextDate = new Date(date);
      nextDate.setHours(10, 0, 0, 0);
      setForm((current) => ({ ...current, scheduledAt: nextDate.toISOString().slice(0, 16), status: "scheduled" }));
      setSelectedDate(date);
    }
    setShowForm(true);
  };

  const openEditPost = (post: Post) => {
    setEditPost(post);
    setForm({ title: post.title, content: post.content || "", platform: post.platform, status: post.status, scheduledAt: post.scheduledAt ? post.scheduledAt.slice(0, 16) : "", clientId: post.clientId ? String(post.clientId) : "", tags: post.tags || "" });
    setImageFile(null);
    setImagePreview(post.imageUrl || null);
    setImageError("");
    setSelectedPost(null);
    setShowForm(true);
  };

  const handleImageSelect = (file: File) => {
    setImageError("");
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setImageError("Vetëm JPG dhe PNG lejohen");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (image.width > 4000 || image.height > 4000) {
        setImageError(`Imazhi është ${image.width}×${image.height}px — maksimumi i lejuar është 4000×4000px`);
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setImagePreview(event.target?.result as string);
      reader.readAsDataURL(file);
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); setImageError("Skedari nuk është imazh i vlefshëm"); };
    image.src = objectUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let imageUrl: string | undefined = editPost?.imageUrl ?? undefined;

    if (imageFile) {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", imageFile);
      const uploadResponse = await fetch("/api/upload", { method: "POST", body: fd });
      setUploading(false);
      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      } else {
        const uploadData = await uploadResponse.json();
        setImageError(uploadData.error || "Gabim gjatë ngarkimit");
        setSaving(false);
        return;
      }
    }

    const payload = { ...form, imageUrl };
    const response = await fetch(editPost ? `/api/posts/${editPost.id}` : "/api/posts", { method: editPost ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (response.ok) {
      const saved = await response.json();
      const normalized = { ...saved, scheduledAt: saved.scheduledAt ? new Date(saved.scheduledAt).toISOString() : undefined };
      setPosts((current) => (editPost ? current.map((post) => (post.id === editPost.id ? normalized : post)) : [normalized, ...current]));
      resetForm();
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Fshij postimin?")) return;
    const response = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (response.ok) {
      setPosts((current) => current.filter((post) => post.id !== id));
      setSelectedPost(null);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const getPostsForDay = (day: Date) => posts.filter((post) => post.scheduledAt && isSameDay(new Date(post.scheduledAt), day));
  const dayNames = ["Hën", "Mar", "Mër", "Enj", "Pre", "Sht", "Diel"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Kalendar Postimesh</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{posts.length} postime gjithsej</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button onClick={() => setView("calendar")} className={`px-3 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${view === "calendar" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`} title="Pamja Kalendar"><Calendar className="w-4 h-4" /></button>
            <button onClick={() => setView("list")} className={`px-3 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${view === "list" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`} title="Pamja Listë"><Clock className="w-4 h-4" /></button>
          </div>
          <button onClick={() => openNewPost()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 cursor-pointer"><Plus className="w-4 h-4" /> Post i Ri</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {platforms.map(({ value, label, color }) => {
          const count = posts.filter((post) => post.platform === value).length;
          if (!count) return null;
          return (
            <div key={value} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-xs font-semibold shadow-sm ${color}`}>
              <span>{label}</span>
              <span className="bg-white/25 rounded-full px-1.5 py-0.2 text-[11px]">{count}</span>
            </div>
          );
        })}
      </div>

      {view === "calendar" ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 text-lg cursor-pointer">‹</button>
            <h2 className="font-bold text-slate-900 text-base sm:text-lg capitalize">{format(currentMonth, "MMMM yyyy", { locale: sq })}</h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 text-lg cursor-pointer">›</button>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70">
            {dayNames.map((day) => (
              <div key={day} className="px-1 sm:px-2 py-2 text-center text-[11px] sm:text-xs font-bold text-slate-500 uppercase">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {days.map((day) => {
              const dayPosts = getPostsForDay(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentMonth);
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => openNewPost(day)}
                  className={`min-h-[72px] sm:min-h-[100px] p-1 sm:p-2 cursor-pointer hover:bg-indigo-50/40 transition-colors ${!isCurrentMonth ? "opacity-35 bg-slate-50/50" : ""}`}
                >
                  <div className={`text-xs sm:text-sm font-bold mb-1 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${isToday ? "bg-indigo-600 text-white shadow-sm" : "text-slate-700"}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 2).map((post) => (
                      <div
                        key={post.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedPost(post);
                        }}
                        className={`px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs text-white truncate cursor-pointer font-medium ${platformColors[post.platform] || "bg-indigo-500"}`}
                        title={post.title}
                      >
                        {post.title}
                      </div>
                    ))}
                    {dayPosts.length > 2 && (
                      <p className="text-[10px] text-slate-400 pl-0.5 font-medium">+{dayPosts.length - 2} më shumë</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 text-left border-b border-slate-100">
                  {["Data/Ora", "Foto", "Titulli", "Platforma", "Klienti", "Statusi", "Veprime"].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">Nuk ka postime ende.</td></tr>
                ) : (
                  posts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-slate-500">{post.scheduledAt ? format(new Date(post.scheduledAt), "d MMM yyyy HH:mm", { locale: sq }) : "—"}</td>
                      <td className="px-5 py-3.5">{post.imageUrl ? <img src={post.imageUrl} alt={post.title} className="w-10 h-10 rounded-lg object-cover border border-slate-100" /> : <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><ImagePlus className="w-4 h-4 text-slate-300" /></div>}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">{post.title}</td>
                      <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-medium text-white ${platformColors[post.platform] || "bg-slate-500"}`}>{platforms.find((platform) => platform.value === post.platform)?.label || post.platform}</span></td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{post.client?.name || "—"}</td>
                      <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[post.status]}`}>{statusLabel[post.status]}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditPost(post)} className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors" title="Ndrysho"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => void handleDelete(post.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Fshij"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedPost(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-150" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium text-white ${platformColors[selectedPost.platform]}`}>{platforms.find((platform) => platform.value === selectedPost.platform)?.label}</span>
                <h3 className="font-bold text-slate-900 text-lg mt-2">{selectedPost.title}</h3>
              </div>
              <button onClick={() => setSelectedPost(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            {selectedPost.imageUrl && (
              <div className="mb-4 rounded-xl overflow-hidden border border-slate-100">
                <img src={selectedPost.imageUrl} alt={selectedPost.title} className="w-full object-contain max-h-72 bg-slate-50" />
              </div>
            )}
            {selectedPost.content && <p className="text-sm text-slate-600 mb-4 bg-slate-50 rounded-xl p-3">{selectedPost.content}</p>}
            <div className="space-y-2 text-sm">
              {selectedPost.scheduledAt && <p className="text-slate-500">📅 {format(new Date(selectedPost.scheduledAt), "d MMMM yyyy, HH:mm", { locale: sq })}</p>}
              {selectedPost.client && <p className="text-slate-500">👤 {selectedPost.client.name}</p>}
              {selectedPost.tags && <p className="text-slate-500">🏷️ {selectedPost.tags}</p>}
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[selectedPost.status]}`}>{statusLabel[selectedPost.status]}</span>
            </div>
            <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
              <button onClick={() => openEditPost(selectedPost)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">Edito</button>
              <button onClick={() => void handleDelete(selectedPost.id)} className="py-2.5 px-4 border border-red-200 text-red-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-red-50 transition-colors cursor-pointer">Fshij</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={resetForm}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-150" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-900 text-base sm:text-lg">{editPost ? "Edito Postimin" : selectedDate ? `Post për ${format(selectedDate, "d MMMM", { locale: sq })}` : "Post i Ri"}</h2>
              <button onClick={resetForm} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Titulli *</label>
                <input type="text" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Platforma *</label>
                  <select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
                    {platforms.map((platform) => <option key={platform.value} value={platform.value}>{platform.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Statusi</label>
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
                    <option value="draft">Draft</option>
                    <option value="scheduled">Planifikuar</option>
                    <option value="published">Publikuar</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Data & Ora</label>
                  <input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Klienti</label>
                  <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
                    <option value="">— Asnjë —</option>
                    {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Përmbajtja</label>
                <textarea rows={3} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Tags (me presje)</label>
                <input type="text" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="p.sh. promo, verë, zbritje" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Imazhi i Postimit <span className="text-slate-400 font-normal">(JPG / PNG · max 4000×4000px)</span></label>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleImageSelect(file); event.target.value = ""; }} />
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={imagePreview} alt="preview" className="w-full max-h-52 object-contain" />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); setImageError(""); }} className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md text-slate-500 hover:text-red-600 transition-colors" title="Hiq imazhin"><XCircle className="w-5 h-5" /></button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white shadow-sm transition-colors">Ndrysho</button>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file) handleImageSelect(file); }} className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors group">
                    <ImagePlus className="w-7 h-7 text-slate-300 group-hover:text-indigo-400 mx-auto mb-1.5 transition-colors" />
                    <p className="text-xs sm:text-sm text-slate-500 group-hover:text-indigo-600 transition-colors">Klikoni ose tërhiqni imazhin këtu</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG · deri 4000×4000px</p>
                  </div>
                )}
                {imageError && <p className="mt-1.5 text-xs text-red-600">{imageError}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50">Anulo</button>
                <button type="submit" disabled={saving || uploading} className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20">{uploading ? "Duke ngarkuar..." : saving ? "Duke ruajtur..." : editPost ? "Ruaj" : "Krijo Postimin"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}