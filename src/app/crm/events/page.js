"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  Clock,
  Tag,
  Users,
  Image as ImageIcon,
  Star,
  RefreshCw,
  X,
  Search,
  Settings,
  Layout,
  MessageSquare,
  Eye,
  EyeOff,
  Ticket,
  TrendingUp,
  SlidersHorizontal,
  Mail,
  Phone,
  FileSpreadsheet,
  UserCheck,
} from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";

export default function EventsManagerPage() {
  const [activeTab, setActiveTab] = useState("events"); // 'events' | 'reservations' | 'customization'
  const [siteId, setSiteId] = useState("");
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reservationSearch, setReservationSearch] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const [form, setForm] = useState({
    title: "Sunrise Nature Walk & Mindful Meditation",
    category: "OUTDOOR WELLNESS",
    description: "Join our expert wellness guides for a revitalizing morning walk through nature trails, followed by a guided 20-minute breathwork & meditation session.",
    imageUrl: "/images/hero_exercise.webp",
    eventDate: "Saturday, 15 Aug 2026",
    eventTime: "7:30 AM – 9:30 AM",
    location: "Botanical Nature Park, West Trailhead",
    tags: "Mindfulness, Fresh Air, Group Walk",
    reservedSeats: 42,
    totalSeats: 60,
    isFeatured: true,
    status: "active",
  });

  const [configForm, setConfigForm] = useState({
    forceComingSoon: false,
    comingSoonTitle: "Community & Events Coming Soon",
    comingSoonDesc: "We are preparing our next round of group nature walks, online yoga sessions, and wellness seminars. Check back soon for new dates!",
    subtitle: "COMMUNITY CONNECTION",
    title: "Our Community & Events",
    description: "We host regular group nature walks, online yoga sessions, and stress management seminars created by wellness experts to keep you connected and inspired.",
    feature1Title: "Nature Walks",
    feature1Sub: "Reconnect",
    feature2Title: "Yoga Sessions",
    feature2Sub: "Strengthen",
    feature3Title: "Wellness Talks",
    feature3Sub: "Learn",
    feature4Title: "Community",
    feature4Sub: "Support",
    communityTitle: "Our Community",
    communityBadge: "+ More Members",
    communityDesc: "Join a growing community focused on wellness, mindfulness and healthy living.",
    quoteText: "Being part of these sessions has helped me stay more mindful, active and positive.",
    quoteAuthor: "— A COMMUNITY MEMBER",
    btnPrimaryText: "Join Community",
    btnPrimaryLink: "/register",
    btnSecondaryText: "Explore All Events",
    btnSecondaryLink: "/events",
  });

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem("x-site-id") || process.env.NEXT_PUBLIC_SITE_ID || "";
    setSiteId(id);
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const [resEvents, resConfig, resReservations] = await Promise.all([
        fetch("/api/dashboard/events", { headers: { "x-site-id": siteId } }),
        fetch("/api/dashboard/events/config", { headers: { "x-site-id": siteId } }),
        fetch("/api/dashboard/events/reservations", { headers: { "x-site-id": siteId } }),
      ]);

      const dataEvents = await resEvents.json();
      if (dataEvents.success && dataEvents.data?.events) {
        setEvents(dataEvents.data.events);
      }

      const dataReservations = await resReservations.json();
      if (dataReservations.success && dataReservations.data?.reservations) {
        setReservations(dataReservations.data.reservations);
      }

      const dataConfig = await resConfig.json();
      if (dataConfig.success && dataConfig.data?.communityConfig) {
        const c = dataConfig.data.communityConfig;
        setConfigForm({
          forceComingSoon: c.forceComingSoon ?? false,
          comingSoonTitle: c.comingSoonTitle || "Community & Events Coming Soon",
          comingSoonDesc: c.comingSoonDesc || "We are preparing our next round of group nature walks, online yoga sessions, and wellness seminars. Check back soon for new dates!",
          subtitle: c.subtitle || "COMMUNITY CONNECTION",
          title: c.title || "Our Community & Events",
          description: c.description || "",
          feature1Title: c.features?.[0]?.title || "Nature Walks",
          feature1Sub: c.features?.[0]?.sub || "Reconnect",
          feature2Title: c.features?.[1]?.title || "Yoga Sessions",
          feature2Sub: c.features?.[1]?.sub || "Strengthen",
          feature3Title: c.features?.[2]?.title || "Wellness Talks",
          feature3Sub: c.features?.[2]?.sub || "Learn",
          feature4Title: c.features?.[3]?.title || "Community",
          feature4Sub: c.features?.[3]?.sub || "Support",
          communityTitle: c.communityBox?.title || "Our Community",
          communityBadge: c.communityBox?.badgeText || "+ More Members",
          communityDesc: c.communityBox?.description || "",
          quoteText: c.testimonialBox?.quote || "",
          quoteAuthor: c.testimonialBox?.author || "— A COMMUNITY MEMBER",
          btnPrimaryText: c.ctaButtons?.primaryText || "Join Community",
          btnPrimaryLink: c.ctaButtons?.primaryLink || "/register",
          btnSecondaryText: c.ctaButtons?.secondaryText || "Explore All Events",
          btnSecondaryLink: c.ctaButtons?.secondaryLink || "/events",
        });
      }
    } catch (e) {
      console.error("Failed to load events/config:", e);
      showToast("Error loading events configuration", "error");
    } finally {
      setLoading(false);
    }
  }, [siteId, showToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleToggleForceComingSoon = async (newValue) => {
    try {
      const payload = {
        forceComingSoon: newValue,
        comingSoonTitle: configForm.comingSoonTitle,
        comingSoonDesc: configForm.comingSoonDesc,
        subtitle: configForm.subtitle,
        title: configForm.title,
        description: configForm.description,
        features: [
          { title: configForm.feature1Title, sub: configForm.feature1Sub, icon: "sun" },
          { title: configForm.feature2Title, sub: configForm.feature2Sub, icon: "user" },
          { title: configForm.feature3Title, sub: configForm.feature3Sub, icon: "globe" },
          { title: configForm.feature4Title, sub: configForm.feature4Sub, icon: "users" },
        ],
        communityBox: {
          title: configForm.communityTitle,
          badgeText: configForm.communityBadge,
          description: configForm.communityDesc,
        },
        testimonialBox: {
          quote: configForm.quoteText,
          author: configForm.quoteAuthor,
        },
        ctaButtons: {
          primaryText: configForm.btnPrimaryText,
          primaryLink: configForm.btnPrimaryLink,
          secondaryText: configForm.btnSecondaryText,
          secondaryLink: configForm.btnSecondaryLink,
        },
      };

      const res = await fetch("/api/dashboard/events/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setConfigForm((prev) => ({ ...prev, forceComingSoon: newValue }));
        showToast(
          newValue
            ? "🔴 Event Card Closed — Website now displays 'Coming Soon' placeholder"
            : "🟢 Event Card Opened — Website displays active featured event card"
        );
      }
    } catch (e) {
      showToast("Failed to update status", "error");
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm({
      title: "Sunrise Nature Walk & Mindful Meditation",
      category: "OUTDOOR WELLNESS",
      description: "Join our expert wellness guides for a revitalizing morning walk through nature trails, followed by a guided 20-minute breathwork & meditation session.",
      imageUrl: "/images/hero_exercise.webp",
      eventDate: "Saturday, 15 Aug 2026",
      eventTime: "7:30 AM – 9:30 AM",
      location: "Botanical Nature Park, West Trailhead",
      tags: "Mindfulness, Fresh Air, Group Walk",
      reservedSeats: 42,
      totalSeats: 60,
      isFeatured: true,
      status: "active",
    });
    setPanelOpen(true);
  };

  const openEdit = (ev) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title || "",
      category: ev.category || "OUTDOOR WELLNESS",
      description: ev.description || "",
      imageUrl: ev.imageUrl || "",
      eventDate: ev.eventDate || "",
      eventTime: ev.eventTime || "",
      location: ev.location || "",
      tags: ev.tags || "",
      reservedSeats: ev.reservedSeats ?? 42,
      totalSeats: ev.totalSeats ?? 60,
      isFeatured: ev.isFeatured ?? true,
      status: ev.status || "active",
    });
    setPanelOpen(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res;
      if (editingId) {
        res = await fetch(`/api/dashboard/events/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-site-id": siteId },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch("/api/dashboard/events", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-site-id": siteId },
          body: JSON.stringify(form),
        });
      }

      const data = await res.json();
      if (data.success) {
        showToast(editingId ? "Event updated successfully!" : "Featured event published!");
        setPanelOpen(false);
        fetchEvents();
      } else {
        showToast(data.error || "Failed to save event", "error");
      }
    } catch (err) {
      showToast("Error saving event details", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const payload = {
        forceComingSoon: configForm.forceComingSoon,
        comingSoonTitle: configForm.comingSoonTitle,
        comingSoonDesc: configForm.comingSoonDesc,
        subtitle: configForm.subtitle,
        title: configForm.title,
        description: configForm.description,
        features: [
          { title: configForm.feature1Title, sub: configForm.feature1Sub, icon: "sun" },
          { title: configForm.feature2Title, sub: configForm.feature2Sub, icon: "user" },
          { title: configForm.feature3Title, sub: configForm.feature3Sub, icon: "globe" },
          { title: configForm.feature4Title, sub: configForm.feature4Sub, icon: "users" },
        ],
        communityBox: {
          title: configForm.communityTitle,
          badgeText: configForm.communityBadge,
          description: configForm.communityDesc,
        },
        testimonialBox: {
          quote: configForm.quoteText,
          author: configForm.quoteAuthor,
        },
        ctaButtons: {
          primaryText: configForm.btnPrimaryText,
          primaryLink: configForm.btnPrimaryLink,
          secondaryText: configForm.btnSecondaryText,
          secondaryLink: configForm.btnSecondaryLink,
        },
      };

      const res = await fetch("/api/dashboard/events/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Left-side Community Section updated successfully!");
        fetchEvents();
      } else {
        showToast(data.error || "Failed to save configuration", "error");
      }
    } catch (err) {
      showToast("Error saving section configuration", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const res = await fetch(`/api/dashboard/events/${id}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId },
      });
      if (res.ok) {
        showToast("Event removed.");
        fetchEvents();
      }
    } catch (err) {
      showToast("Failed to delete event", "error");
    }
  };

  const toggleFeatured = async (ev) => {
    try {
      const res = await fetch(`/api/dashboard/events/${ev.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify({ isFeatured: !ev.isFeatured }),
      });
      if (res.ok) {
        showToast(`Event set as ${!ev.isFeatured ? 'Featured on Homepage' : 'Standard'}`);
        fetchEvents();
      }
    } catch (err) {
      showToast("Failed to update featured status", "error");
    }
  };

  const filtered = events.filter((ev) =>
    ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ev.location || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReservations = reservations.filter((r) =>
    (r.name || "").toLowerCase().includes(reservationSearch.toLowerCase()) ||
    (r.email || "").toLowerCase().includes(reservationSearch.toLowerCase()) ||
    (r.serviceInterest || "").toLowerCase().includes(reservationSearch.toLowerCase())
  );

  const activeFeaturedEvent = events.find(e => e.isFeatured) || events[0];

  return (
    <div className="space-y-6 w-full relative pb-16">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-extrabold text-white transition-all ${toast.type === "error" ? "bg-rose-600" : "bg-[#0f7c85]"
          }`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0f7c85]/10 text-[#0f7c85] flex items-center justify-center font-bold">
            <Calendar size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Community &amp; Events Manager
              </h1>
              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Live CRM
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Manage community event schedules, seat reservations, and form submission attendees.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {activeTab === "events" && (
            <button
              onClick={openNew}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-[#0f7c85] hover:bg-[#0c6b73] text-white rounded-2xl text-xs font-extrabold transition shadow-lg shadow-[#0f7c85]/20 cursor-pointer"
            >
              <Plus size={16} /> Create Community Event
            </button>
          )}
        </div>
      </div>

      {/* Stats Quick Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Display Status</span>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${configForm.forceComingSoon ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {configForm.forceComingSoon ? "Coming Soon Mode" : "Active Event Live"}
              </span>
            </div>
          </div>
          <button
            onClick={() => handleToggleForceComingSoon(!configForm.forceComingSoon)}
            className={`p-2.5 rounded-2xl transition cursor-pointer ${configForm.forceComingSoon
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              }`}
            title="Toggle Website Mode"
          >
            {configForm.forceComingSoon ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Total Published</span>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">
              {events.length} {events.length === 1 ? 'Event' : 'Events'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center font-bold">
            <Ticket size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Form Submissions / Registrations</span>
            <div className="text-lg font-extrabold text-[#0f7c85]">
              {reservations.length} Attendees ({activeFeaturedEvent ? activeFeaturedEvent.reservedSeats : 0} Seats)
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Featured Event</span>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-1">
              {activeFeaturedEvent ? activeFeaturedEvent.title : 'None Selected'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
            <Star size={18} />
          </div>
        </div>
      </div>

      {/* Website Display Status Control Switch */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${configForm.forceComingSoon ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
            {configForm.forceComingSoon ? <EyeOff size={24} /> : <Eye size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-teal-300">Website Display Control</span>
              <span className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${configForm.forceComingSoon ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40' : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'}`}>
                {configForm.forceComingSoon ? "🔴 Section Closed ('Coming Soon' Mode Active)" : "🟢 Live Event Card Active"}
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              {configForm.forceComingSoon
                ? "The homepage section is currently closed. Visitors see a single full-width 'Community & Events Coming Soon' banner."
                : "The homepage displays your active featured event card along with dynamic left-side community features and interactive spot reservation."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleToggleForceComingSoon(!configForm.forceComingSoon)}
          className={`w-full md:w-auto px-6 py-3.5 rounded-2xl text-xs font-extrabold transition shadow-lg cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${configForm.forceComingSoon
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
        >
          {configForm.forceComingSoon ? (
            <>
              <Eye size={16} /> Open Featured Event Card
            </>
          ) : (
            <>
              <EyeOff size={16} /> Close &amp; Show &quot;Coming Soon&quot;
            </>
          )}
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 md:gap-8 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab("events")}
          className={`pb-4 text-xs font-extrabold flex items-center gap-2 transition border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${activeTab === "events"
              ? "border-[#0f7c85] text-[#0f7c85]"
              : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
        >
          <Calendar size={16} /> Events List ({events.length})
        </button>
        <button
          onClick={() => setActiveTab("reservations")}
          className={`pb-4 text-xs font-extrabold flex items-center gap-2 transition border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${activeTab === "reservations"
              ? "border-[#0f7c85] text-[#0f7c85]"
              : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
        >
          <Ticket size={16} /> 🎟️ Event Form Submissions &amp; Attendees ({reservations.length})
        </button>
        <button
          onClick={() => setActiveTab("customization")}
          className={`pb-4 text-xs font-extrabold flex items-center gap-2 transition border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${activeTab === "customization"
              ? "border-[#0f7c85] text-[#0f7c85]"
              : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
        >
          <SlidersHorizontal size={16} /> ⚙️ Left-Side Section Customization
        </button>
      </div>

      {/* TAB 1: EVENTS MANAGER */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search events by title, category, or venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={openNew}
                className="px-3.5 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles size={14} /> + Pre-fill Sample Event
              </button>
              <button
                onClick={fetchEvents}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                title="Refresh Events"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw size={18} className="animate-spin text-[#0f7c85]" /> Loading community events...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 bg-[#0f7c85]/10 rounded-3xl flex items-center justify-center mx-auto text-[#0f7c85]">
                  <Calendar size={28} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No community events found</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Click below to pre-fill and publish a realistic sample community event on your homepage.
                  </p>
                </div>
                <button
                  onClick={openNew}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#0f7c85] hover:bg-[#0c6b73] text-white rounded-2xl text-xs font-extrabold transition shadow-lg shadow-[#0f7c85]/20 cursor-pointer"
                >
                  <Plus size={16} /> Add Realistic Community Event
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="p-4 pl-6">Event Details</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Date &amp; Time</th>
                      <th className="p-4">Venue Location</th>
                      <th className="p-4 text-center">Seats Filled (Form)</th>
                      <th className="p-4 text-center">Homepage Card</th>
                      <th className="p-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {filtered.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <img
                              src={ev.imageUrl || "/images/hero_exercise.webp"}
                              alt={ev.title}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                            />
                            <div>
                              <div className="font-extrabold text-slate-900 dark:text-white text-xs">{ev.title}</div>
                              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{ev.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-3 py-1 bg-[#0f7c85]/10 text-[#0f7c85] font-extrabold text-[10px] rounded-full uppercase tracking-wider">
                            {ev.category}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                          <div className="font-extrabold text-xs">{ev.eventDate || "TBA"}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{ev.eventTime}</div>
                        </td>
                        <td className="p-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={13} className="text-slate-400" /> {ev.location || "Online"}
                          </div>
                        </td>
                        <td className="p-4 text-center whitespace-nowrap font-bold">
                          <span className="text-[#0f7c85] font-extrabold">{ev.reservedSeats}</span> / {ev.totalSeats}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => toggleFeatured(ev)}
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer ${ev.isFeatured
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800"
                              }`}
                          >
                            {ev.isFeatured ? "⭐ Featured" : "Standard"}
                          </button>
                        </td>
                        <td className="p-4 text-right pr-6 whitespace-nowrap space-x-1">
                          <button
                            onClick={() => openEdit(ev)}
                            className="p-2 text-slate-400 hover:text-[#0f7c85] hover:bg-[#0f7c85]/10 rounded-xl transition cursor-pointer"
                            title="Edit Event"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(ev.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EVENT FORM SUBMISSIONS & ATTENDEES */}
      {activeTab === "reservations" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search attendees by name, email, or event title..."
                value={reservationSearch}
                onChange={(e) => setReservationSearch(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-500">Total Submissions: {reservations.length}</span>
              <button
                onClick={fetchEvents}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-slate-700 transition"
                title="Refresh Submissions"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw size={18} className="animate-spin text-[#0f7c85]" /> Loading form submissions...
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="p-16 text-center space-y-3 max-w-md mx-auto">
                <div className="w-14 h-14 bg-[#0f7c85]/10 rounded-3xl flex items-center justify-center mx-auto text-[#0f7c85]">
                  <Ticket size={24} />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">No Event Form Submissions Yet</h3>
                <p className="text-xs text-slate-500">
                  When visitors reserve a spot on your homepage event card form, their registration details and seat choices will appear in this dedicated table.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="p-4 pl-6">Attendee Name</th>
                      <th className="p-4">Contact Info</th>
                      <th className="p-4">Event Title</th>
                      <th className="p-4 text-center">Seats Choice</th>
                      <th className="p-4 text-right pr-6">Date Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {filteredReservations.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="p-4 pl-6 font-extrabold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#0f7c85]/10 text-[#0f7c85] font-bold text-xs flex items-center justify-center">
                              {r.name ? r.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <span>{r.name || 'Anonymous Visitor'}</span>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5 text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5 font-semibold text-xs">
                              <Mail size={12} className="text-slate-400" /> {r.email}
                            </div>
                            {r.phone && (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <Phone size={10} /> {r.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="font-extrabold text-xs text-[#0f7c85]">
                            {r.serviceInterest ? r.serviceInterest.replace("Event Reservation: ", "") : "Community Event"}
                          </span>
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-extrabold text-xs rounded-full">
                            🎟️ {r.notes ? (r.notes.match(/\d+/) || [1])[0] : 1} Seat(s)
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6 whitespace-nowrap text-slate-400 text-[11px]">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LEFT-SIDE SECTION CUSTOMIZATION */}
      {activeTab === "customization" && (
        <form onSubmit={handleSaveConfig} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-8 shadow-xs">
          <div>
            <h2 className="text-xs font-extrabold text-[#0f7c85] uppercase tracking-widest mb-1">
              Main Section Titles &amp; Header
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Edit the main subtitle, heading, and description displayed on the left side of your homepage.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5">Badge Subtitle</label>
                <input
                  type="text"
                  value={configForm.subtitle}
                  onChange={(e) => setConfigForm({ ...configForm, subtitle: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none focus:border-[#0f7c85]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5">Main Heading</label>
                <input
                  type="text"
                  value={configForm.title}
                  onChange={(e) => setConfigForm({ ...configForm, title: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none focus:border-[#0f7c85]"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5">Header Description</label>
              <textarea
                rows={2}
                value={configForm.description}
                onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none focus:border-[#0f7c85]"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            <h2 className="text-xs font-extrabold text-[#0f7c85] uppercase tracking-widest mb-1">
              4 Feature Icons / Pills Row
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Customize the titles and subtitles for the 4 feature items.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <span className="text-[10px] font-extrabold text-[#0f7c85] uppercase">Item #1</span>
                <input
                  type="text"
                  placeholder="Title (e.g. Nature Walks)"
                  value={configForm.feature1Title}
                  onChange={(e) => setConfigForm({ ...configForm, feature1Title: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-800 outline-none"
                />
                <input
                  type="text"
                  placeholder="Sub (e.g. Reconnect)"
                  value={configForm.feature1Sub}
                  onChange={(e) => setConfigForm({ ...configForm, feature1Sub: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <span className="text-[10px] font-extrabold text-[#0f7c85] uppercase">Item #2</span>
                <input
                  type="text"
                  placeholder="Title (e.g. Yoga Sessions)"
                  value={configForm.feature2Title}
                  onChange={(e) => setConfigForm({ ...configForm, feature2Title: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-800 outline-none"
                />
                <input
                  type="text"
                  placeholder="Sub (e.g. Strengthen)"
                  value={configForm.feature2Sub}
                  onChange={(e) => setConfigForm({ ...configForm, feature2Sub: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <span className="text-[10px] font-extrabold text-[#0f7c85] uppercase">Item #3</span>
                <input
                  type="text"
                  placeholder="Title (e.g. Wellness Talks)"
                  value={configForm.feature3Title}
                  onChange={(e) => setConfigForm({ ...configForm, feature3Title: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-800 outline-none"
                />
                <input
                  type="text"
                  placeholder="Sub (e.g. Learn)"
                  value={configForm.feature3Sub}
                  onChange={(e) => setConfigForm({ ...configForm, feature3Sub: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <span className="text-[10px] font-extrabold text-[#0f7c85] uppercase">Item #4</span>
                <input
                  type="text"
                  placeholder="Title (e.g. Community)"
                  value={configForm.feature4Title}
                  onChange={(e) => setConfigForm({ ...configForm, feature4Title: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-800 outline-none"
                />
                <input
                  type="text"
                  placeholder="Sub (e.g. Support)"
                  value={configForm.feature4Sub}
                  onChange={(e) => setConfigForm({ ...configForm, feature4Sub: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xs font-extrabold text-[#0f7c85] uppercase tracking-widest mb-1">
                &quot;Our Community&quot; Widget Box
              </h2>
              <p className="text-xs text-slate-400 mb-3">Member avatar box text and badge.</p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Box Title (e.g. Our Community)"
                  value={configForm.communityTitle}
                  onChange={(e) => setConfigForm({ ...configForm, communityTitle: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                />
                <input
                  type="text"
                  placeholder="Badge Text (e.g. + More Members)"
                  value={configForm.communityBadge}
                  onChange={(e) => setConfigForm({ ...configForm, communityBadge: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                />
                <textarea
                  rows={2}
                  placeholder="Description..."
                  value={configForm.communityDesc}
                  onChange={(e) => setConfigForm({ ...configForm, communityDesc: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                />
              </div>
            </div>

            <div>
              <h2 className="text-xs font-extrabold text-[#0f7c85] uppercase tracking-widest mb-1">
                Testimonial Quote Box
              </h2>
              <p className="text-xs text-slate-400 mb-3">Quote statement and author name.</p>
              <div className="space-y-3">
                <textarea
                  rows={3}
                  placeholder="Quote statement..."
                  value={configForm.quoteText}
                  onChange={(e) => setConfigForm({ ...configForm, quoteText: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                />
                <input
                  type="text"
                  placeholder="Author (e.g. — A COMMUNITY MEMBER)"
                  value={configForm.quoteAuthor}
                  onChange={(e) => setConfigForm({ ...configForm, quoteAuthor: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            <h2 className="text-xs font-extrabold text-[#0f7c85] uppercase tracking-widest mb-1">
              CTA Action Buttons
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400">Primary Button</label>
                <input
                  type="text"
                  placeholder="Text (e.g. Join Community)"
                  value={configForm.btnPrimaryText}
                  onChange={(e) => setConfigForm({ ...configForm, btnPrimaryText: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                />
                <input
                  type="text"
                  placeholder="Link (e.g. /register)"
                  value={configForm.btnPrimaryLink}
                  onChange={(e) => setConfigForm({ ...configForm, btnPrimaryLink: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400">Secondary Button</label>
                <input
                  type="text"
                  placeholder="Text (e.g. Explore All Events)"
                  value={configForm.btnSecondaryText}
                  onChange={(e) => setConfigForm({ ...configForm, btnSecondaryText: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                />
                <input
                  type="text"
                  placeholder="Link (e.g. /events)"
                  value={configForm.btnSecondaryLink}
                  onChange={(e) => setConfigForm({ ...configForm, btnSecondaryLink: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-6 py-3.5 bg-[#0f7c85] hover:bg-[#0c6b73] text-white rounded-2xl text-xs font-extrabold transition shadow-lg shadow-[#0f7c85]/20 cursor-pointer disabled:opacity-50"
            >
              {savingConfig ? "Saving Customization..." : "Save Section Customization"}
            </button>
          </div>
        </form>
      )}

      {/* Slide-over Form Panel for Events */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {editingId ? "Edit Event Details" : "Create New Community Event"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Update event card title, image, date, time, venue, and seat capacity.
                </p>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form id="event-form" onSubmit={handleSaveEvent} className="p-6 space-y-4 flex-1">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunrise Nature Walk & Mindful Meditation"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Category Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. OUTDOOR WELLNESS"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Venue / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Botanical Nature Park, West Trailhead"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400">Featured Image URL</label>
                  <button
                    type="button"
                    onClick={() => setMediaPickerOpen(true)}
                    className="text-[10px] font-bold text-[#0f7c85] hover:underline cursor-pointer"
                  >
                    Choose from Media Library
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. /images/hero_exercise.webp or image URL"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Event Description</label>
                <textarea
                  rows={3}
                  placeholder="Short, engaging description of the event..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Event Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Saturday, 15 Aug 2026"
                    value={form.eventDate}
                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                    className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Event Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 7:30 AM – 9:30 AM"
                    value={form.eventTime}
                    onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                    className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Event Tags <span className="normal-case font-normal">(comma-separated)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Mindfulness, Fresh Air, Group Walk"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                    Reserved Seats <span className="text-[#0f7c85] font-normal">(Auto-calculated)</span>
                  </label>
                  <input
                    type="number"
                    value={form.reservedSeats}
                    onChange={(e) => setForm({ ...form, reservedSeats: e.target.value })}
                    className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">
                    Calculated from visitor form submissions ({reservations.length} form entries filled)
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Total Seats Capacity</label>
                  <input
                    type="number"
                    value={form.totalSeats}
                    onChange={(e) => setForm({ ...form, totalSeats: e.target.value })}
                    className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="rounded text-[#0f7c85] h-4 w-4 border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Feature on Homepage Card</span>
                    <span className="text-[10px] text-slate-400 block">Set this event as the primary featured card in &quot;Our Community &amp; Events&quot;</span>
                  </div>
                </label>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-500 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                form="event-form"
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-xs font-extrabold bg-[#0f7c85] hover:bg-[#0c6b73] text-white rounded-2xl disabled:opacity-50 transition shadow-lg shadow-[#0f7c85]/20"
              >
                {saving ? "Publishing..." : "Save Event Details"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {mediaPickerOpen && (
        <MediaPickerModal
          isOpen={mediaPickerOpen}
          onClose={() => setMediaPickerOpen(false)}
          onSelect={(media) => {
            setForm((prev) => ({ ...prev, imageUrl: media.url }));
            setMediaPickerOpen(false);
          }}
          title="Select Event Banner Image"
        />
      )}
    </div>
  );
}
