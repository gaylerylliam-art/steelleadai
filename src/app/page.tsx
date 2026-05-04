"use client";

import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarClock,
  ChevronDown,
  Clock,
  FileText,
  Filter,
  Flame,
  HelpCircle,
  LayoutDashboard,
  ListPlus,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings,
  Trash2,
  Upload,
  UserCircle,
  Users,
  X
} from "lucide-react";
import { AuthPanel } from "@/components/AuthPanel";
import { leadToInsert, rowToLead } from "@/lib/leads-db";
import {
  emirates,
  Filters,
  industries,
  Lead,
  LeadInput,
  leadStatuses,
  messageTypes,
  products,
  projectSizes,
  urgencies
} from "@/lib/types";
import { scoreLead } from "@/lib/scoring";
import { supabase } from "@/lib/supabase";

const blankLead: LeadInput = {
  companyName: "",
  contactPerson: "",
  jobTitle: "",
  email: "",
  phone: "",
  emirate: "Dubai",
  industry: "Construction",
  projectType: "",
  projectSize: "Medium",
  productsRequired: ["Universal beams"],
  leadSource: "Manual entry",
  status: "New Lead",
  notes: "",
  urgency: "Medium",
  pastInquiry: false,
  nextFollowUp: ""
};

const defaultFilters: Filters = {
  emirate: "",
  industry: "",
  status: "",
  minScore: 0,
  product: "",
  search: ""
};

type ImportHistoryItem = {
  id: string;
  timestamp: string;
  totalRows: number;
  imported: number;
  skipped: number;
  duplicates: number;
};

type ActivityItem = {
  id: string;
  date: string;
  text: string;
};

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [form, setForm] = useState<LeadInput>(blankLead);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [messageType, setMessageType] = useState<(typeof messageTypes)[number]>("Cold email");
  const [objective, setObjective] = useState("Introduce steel supply capability and request RFQ details.");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [dataMessage, setDataMessage] = useState("");
  const [toast, setToast] = useState("");
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [importHistoryOpen, setImportHistoryOpen] = useState(false);
  const [messagesSentToday, setMessagesSentToday] = useState(0);
  const [lastOutreach, setLastOutreach] = useState<{ company: string; time: Date } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileLeadModalOpen, setMobileLeadModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<Lead["status"]>("Contacted");
  const [activityLeadId, setActivityLeadId] = useState("");
  const [activityNote, setActivityNote] = useState("");
  const [activityLogs, setActivityLogs] = useState<Record<string, ActivityItem[]>>({});
  const [duplicateCheckTouched, setDuplicateCheckTouched] = useState({ companyName: false, email: false });

  useEffect(() => {
    if (!supabase) {
      setIsCheckingAuth(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsCheckingAuth(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setLeads([]);
        setSelectedLeadId("");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;
    loadLeads();
  }, [session?.user.id]);

  async function loadLeads() {
    if (!supabase || !session?.user.id) return;
    setDataMessage("");
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("created_by", session.user.id)
      .order("score", { ascending: false });

    if (error) {
      setDataMessage(error.message);
      return;
    }

    const nextLeads = (data || []).map(rowToLead);
    setLeads(nextLeads);
    setSelectedLeadId(nextLeads[0]?.id || "");
  }

  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => !filters.emirate || lead.emirate === filters.emirate)
      .filter((lead) => !filters.industry || lead.industry === filters.industry)
      .filter((lead) => !filters.status || lead.status === filters.status)
      .filter((lead) => !filters.product || lead.productsRequired.includes(filters.product as never))
      .filter((lead) => lead.score >= filters.minScore)
      .filter((lead) => {
        const query = filters.search.toLowerCase();
        return (
          !query ||
          [lead.companyName, lead.contactPerson, lead.email, lead.phone, lead.projectType, lead.notes]
            .join(" ")
            .toLowerCase()
            .includes(query)
        );
      })
      .sort((a, b) => b.score - a.score);
  }, [filters, leads]);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) || filteredLeads[0] || leads[0] || null;
  const activeActivityLead = leads.find((lead) => lead.id === activityLeadId) || null;
  const duplicateLead = getDuplicateLead(form, leads, duplicateCheckTouched);

  const metrics = useMemo(() => {
    return {
      total: leads.length,
      hot: leads.filter((lead) => lead.score >= 80).length,
      quotations: leads.filter((lead) => lead.status === "Quotation Sent").length,
      won: leads.filter((lead) => lead.status === "Won").length
    };
  }, [leads]);

  async function addLead(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !session?.user.id || duplicateLead) return;
    const score = scoreLead(form);
    const { data, error } = await supabase
      .from("leads")
      .insert(leadToInsert(form, session.user.id, score))
      .select()
      .single();

    if (error) {
      setDataMessage(error.message);
      return;
    }

    const nextLead = rowToLead(data);
    setLeads((current) => [nextLead, ...current]);
    setSelectedLeadId(nextLead.id);
    addActivity(nextLead.id, "Lead created");
    setForm(blankLead);
    setDuplicateCheckTouched({ companyName: false, email: false });
    setMobileLeadModalOpen(false);
  }

  async function updateStatus(id: string, status: Lead["status"]) {
    if (!supabase) return;
    const currentLead = leads.find((lead) => lead.id === id);
    if (!currentLead) return;
    const score = scoreLead({ ...currentLead, status });
    const { error } = await supabase.from("leads").update({ status, score }).eq("id", id);
    if (error) {
      setDataMessage(error.message);
      return;
    }
    setLeads((current) =>
      current.map((lead) => {
        if (lead.id !== id) return lead;
        const updated = { ...lead, status };
        return { ...updated, score: scoreLead(updated) };
      })
    );
    addActivity(id, `Status updated to ${status}`);
  }

  async function updateFollowUp(id: string, nextFollowUp: string) {
    if (!supabase) return;
    const { error } = await supabase.from("leads").update({ next_follow_up: nextFollowUp || null }).eq("id", id);
    if (error) {
      setDataMessage(error.message);
      return;
    }
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, nextFollowUp } : lead)));
    addActivity(id, nextFollowUp ? `Follow-up set for ${nextFollowUp}` : "Follow-up cleared");
  }

  async function bulkUpdateStatus() {
    if (!supabase || !selectedRows.length) return;
    const client = supabase;
    const updates = leads
      .filter((lead) => selectedRows.includes(lead.id))
      .map((lead) => ({ id: lead.id, score: scoreLead({ ...lead, status: bulkStatus }) }));

    await Promise.all(
      updates.map((item) => client.from("leads").update({ status: bulkStatus, score: item.score }).eq("id", item.id))
    );

    setLeads((current) =>
      current.map((lead) => {
        if (!selectedRows.includes(lead.id)) return lead;
        const updated = { ...lead, status: bulkStatus };
        return { ...updated, score: scoreLead(updated) };
      })
    );
    selectedRows.forEach((id) => addActivity(id, `Bulk status updated to ${bulkStatus}`));
    setSelectedRows([]);
  }

  async function deleteSelected() {
    if (!supabase || !selectedRows.length) return;
    const confirmed = window.confirm(`Delete ${selectedRows.length} selected lead(s)?`);
    if (!confirmed) return;
    const { error } = await supabase.from("leads").delete().in("id", selectedRows);
    if (error) {
      setDataMessage(error.message);
      return;
    }
    setLeads((current) => current.filter((lead) => !selectedRows.includes(lead.id)));
    setSelectedRows([]);
  }

  function toggleProduct(product: (typeof products)[number]) {
    setForm((current) => ({
      ...current,
      productsRequired: current.productsRequired.includes(product)
        ? current.productsRequired.filter((item) => item !== product)
        : [...current.productsRequired, product]
    }));
  }

  function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result: Papa.ParseResult<Record<string, string>>) => {
        if (!supabase || !session?.user.id) return;

        let skipped = 0;
        let duplicates = 0;
        const seen = new Set(leads.map((lead) => `${lead.companyName.toLowerCase()}|${lead.email.toLowerCase()}`));

        const totalRows = result.data.length;
        const importedInputs = result.data.flatMap((row) => {
          const companyName = row.companyName || row.company || "";
          const projectType = row.projectType || "";
          const email = row.email || "";
          const key = `${companyName.toLowerCase()}|${email.toLowerCase()}`;
          if (!companyName.trim() || !projectType.trim()) {
            skipped += 1;
            return [];
          }
          if (seen.has(key)) {
            duplicates += 1;
            return [];
          }
          seen.add(key);

          const productsRequired = (row.productsRequired || row.products || "Universal beams")
            .split(",")
            .map((item) => item.trim())
            .filter((item) => products.includes(item as never)) as Lead["productsRequired"];

          const lead: LeadInput = {
            companyName,
            contactPerson: row.contactPerson || row.contact || "",
            jobTitle: row.jobTitle || "",
            email,
            phone: row.phone || row.whatsapp || "",
            emirate: emirates.includes(row.emirate as never) ? (row.emirate as Lead["emirate"]) : "Dubai",
            industry: industries.includes(row.industry as never) ? (row.industry as Lead["industry"]) : "Construction",
            projectType,
            projectSize: projectSizes.includes(row.projectSize as never) ? (row.projectSize as Lead["projectSize"]) : "Medium",
            productsRequired: productsRequired.length ? productsRequired : ["Universal beams"],
            leadSource: row.leadSource || "CSV import",
            status: leadStatuses.includes(row.status as never) ? (row.status as Lead["status"]) : "New Lead",
            notes: row.notes || "",
            urgency: urgencies.includes(row.urgency as never) ? (row.urgency as Lead["urgency"]) : "Medium",
            pastInquiry: ["true", "yes", "1"].includes((row.pastInquiry || "").toLowerCase()),
            nextFollowUp: row.nextFollowUp || ""
          };
          return [lead];
        });

        const rows = importedInputs.map((lead) => leadToInsert(lead, session.user.id, scoreLead(lead)));
        if (!rows.length) {
          showToast(`CSV import: 0 imported, ${skipped} skipped, ${duplicates} duplicates ignored.`);
          setImportHistory((current) => [
            { id: `${Date.now()}`, timestamp: new Date().toISOString(), totalRows, imported: 0, skipped, duplicates },
            ...current
          ].slice(0, 5));
          setImportHistoryOpen(true);
          return;
        }

        supabase
          .from("leads")
          .insert(rows)
          .select()
          .then(({ data, error }) => {
            if (error) {
              setDataMessage(error.message);
              return;
            }
            const imported = (data || []).map(rowToLead);
            setLeads((current) => [...imported, ...current]);
            imported.forEach((lead) => addActivity(lead.id, "Imported from CSV"));
            showToast(`CSV import: ${imported.length} imported, ${skipped} skipped, ${duplicates} duplicates ignored.`);
            setImportHistory((current) => [
              { id: `${Date.now()}`, timestamp: new Date().toISOString(), totalRows, imported: imported.length, skipped, duplicates },
              ...current
            ].slice(0, 5));
            setImportHistoryOpen(true);
          });
      }
    });
    event.target.value = "";
  }

  async function generateMessage() {
    if (!selectedLead) {
      setGeneratedMessage("Add or import a lead before generating outreach.");
      return;
    }
    setIsGenerating(true);
    setGeneratedMessage("");
    const response = await fetch("/api/generate-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead: selectedLead, messageType, objective })
    });
    const data = await response.json();
    setGeneratedMessage(data.message || data.error || "Unable to generate message.");
    setMessagesSentToday((count) => count + 1);
    setLastOutreach({ company: selectedLead.companyName, time: new Date() });
    addActivity(selectedLead.id, `${messageType} generated`);
    setIsGenerating(false);
  }

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date().toLocaleDateString();
    const activeFilters = [
      filters.search ? `Search: ${filters.search}` : "",
      filters.emirate ? `Emirate: ${filters.emirate}` : "",
      filters.industry ? `Industry: ${filters.industry}` : "",
      filters.status ? `Status: ${filters.status}` : "",
      filters.product ? `Product: ${filters.product}` : "",
      filters.minScore ? `Min score: ${filters.minScore}` : ""
    ].filter(Boolean);

    doc.setFillColor(31, 122, 140);
    doc.rect(0, 0, 297, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("SteelLead AI", 12, 14);
    doc.setFontSize(10);
    doc.text(`Filtered Leads Export - ${today}`, 220, 14);
    doc.setTextColor(23, 32, 51);
    doc.setFontSize(11);
    doc.text("Company: SteelLead AI", 12, 31);
    doc.setFontSize(9);
    doc.text(`Active filters: ${activeFilters.length ? activeFilters.join(" | ") : "None"}`, 12, 38);

    autoTable(doc, {
      startY: 46,
      head: [["Company", "Contact", "Emirate", "Products", "Score", "Status", "Follow-up date"]],
      body: filteredLeads.map((lead) => [
        lead.companyName,
        lead.contactPerson || "-",
        lead.emirate,
        lead.productsRequired.join(", "),
        `${lead.score} ${getScoreStyle(lead.score).label}`,
        lead.status,
        lead.nextFollowUp || "-"
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [31, 122, 140], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    doc.save(`steellead-ai-leads-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 5000);
  }

  function clearFilters() {
    setFilters(defaultFilters);
    setSelectedRows([]);
  }

  function addActivity(leadId: string, text: string) {
    setActivityLogs((current) => ({
      ...current,
      [leadId]: [
        { id: `${Date.now()}-${Math.random()}`, date: new Date().toISOString(), text },
        ...(current[leadId] || [])
      ]
    }));
  }

  function saveActivityNote() {
    if (!activityLeadId || !activityNote.trim()) return;
    addActivity(activityLeadId, activityNote.trim());
    setActivityNote("");
  }

  function viewExistingLead(leadId: string) {
    setSelectedLeadId(leadId);
    setActivityLeadId(leadId);
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  if (isCheckingAuth) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">Loading SteelLead AI...</div>
      </main>
    );
  }

  if (!session) {
    return <AuthPanel onAuthenticated={loadLeads} />;
  }

  return (
    <main className="min-h-screen">
      {toast ? (
        <div className="fixed right-4 top-4 z-50 max-w-sm rounded-lg border border-teal-200 bg-white p-4 text-sm shadow-panel">
          {toast}
        </div>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <button className="focus-ring rounded-md border border-slate-200 p-2 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <span className="grid h-11 w-11 place-items-center rounded-md bg-ink text-white">
              <Building2 size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">SteelLead AI</h1>
              <p className="hidden text-sm text-steel sm:block">Structural steel lead generation for Dubai and UAE sales teams</p>
            </div>
          </div>
          <div className="relative">
            <button className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" onClick={() => setProfileOpen((open) => !open)}>
              <UserCircle size={20} />
              <span className="hidden sm:inline">{session.user.email}</span>
              <ChevronDown size={16} />
            </button>
            {profileOpen ? (
              <div className="absolute right-0 mt-2 w-56 rounded-md border border-slate-200 bg-white p-2 text-sm shadow-panel">
                <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-slate-50">
                  <UserCircle size={16} /> Profile
                </button>
                <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-slate-50">
                  <Settings size={16} /> Settings
                </button>
                <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-red-600 hover:bg-red-50" onClick={logout}>
                  <X size={16} /> Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <section className="grid gap-6">
          {dataMessage ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{dataMessage}</div> : null}

          <section id="dashboard" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Total leads" value={metrics.total} trend="up 20 percent this week" color="teal" icon={<Users size={20} />} />
            <Metric label="Hot leads" value={metrics.hot} trend="up 12 percent this week" color="amber" icon={<Flame size={20} />} />
            <Metric label="Quotations sent" value={metrics.quotations} trend="up 8 percent this week" color="purple" icon={<Send size={20} />} />
            <Metric label="Won deals" value={metrics.won} trend="up 5 percent this week" color="green" icon={<BarChart3 size={20} />} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <Filter size={20} /> Search and filters
                </h2>
                <div className="flex flex-wrap gap-2">
                  <div>
                    <label className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium">
                      <Upload size={17} />
                      CSV import
                      <input className="hidden" type="file" accept=".csv" onChange={importCsv} />
                    </label>
                    {importHistory.length ? (
                      <div className="mt-2">
                        <button className="text-xs font-semibold text-alloy" onClick={() => setImportHistoryOpen((open) => !open)}>
                          {importHistoryOpen ? "Hide" : "Show"} Import History
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <button className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium" onClick={exportPdf}>
                    <FileText size={17} /> Export PDF
                  </button>
                </div>
              </div>
              {importHistoryOpen && importHistory.length ? (
                <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <h3 className="text-sm font-semibold">Import History</h3>
                  <div className="mt-3 grid gap-2 md:grid-cols-5">
                    {importHistory.map((item) => (
                      <div key={item.id} className="rounded-md bg-white p-3 text-sm">
                        <div className="font-semibold">{item.imported} imported</div>
                        <div className="mt-1 text-xs text-steel">{new Date(item.timestamp).toLocaleString()}</div>
                        <div className="mt-2 text-xs text-steel">{item.totalRows} total | {item.skipped} skipped | {item.duplicates} duplicates</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <TextInput icon={<Search size={16} />} placeholder="Search leads" value={filters.search} onChange={(value) => setFilters({ ...filters, search: value })} />
                <Select value={filters.emirate} onChange={(value) => setFilters({ ...filters, emirate: value })} options={["", ...emirates]} label="All emirates" />
                <Select value={filters.industry} onChange={(value) => setFilters({ ...filters, industry: value })} options={["", ...industries]} label="All industries" />
                <Select value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={["", ...leadStatuses]} label="All statuses" />
                <Select value={filters.product} onChange={(value) => setFilters({ ...filters, product: value })} options={["", ...products]} label="All products" />
                <label className="text-xs font-medium text-steel">
                  Min score
                  <input className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-alloy focus:outline-none focus:ring-2 focus:ring-alloy/20" type="number" min={0} max={100} value={filters.minScore} onChange={(event) => setFilters({ ...filters, minScore: Number(event.target.value) })} />
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              <OutreachSummary sentToday={messagesSentToday} lastOutreach={lastOutreach} />
              <Breakdown title="Leads by emirate" labels={emirates} leads={leads} field="emirate" />
              <Breakdown title="Leads by industry" labels={industries} leads={leads} field="industry" />
            </div>
          </section>

          <BulkActionBar
            count={selectedRows.length}
            status={bulkStatus}
            onStatusChange={(value) => setBulkStatus(value as Lead["status"])}
            onApply={bulkUpdateStatus}
            onDelete={deleteSelected}
          />

          <section id="lead-database" className="grid gap-6 xl:grid-cols-[1fr_390px]">
            <div className="rounded-lg border border-slate-200 bg-white shadow-panel">
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <h2 className="text-xl font-semibold">Lead database</h2>
                <span className="text-sm text-steel">{filteredLeads.length} shown</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-steel">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={Boolean(filteredLeads.length) && filteredLeads.every((lead) => selectedRows.includes(lead.id))}
                          onChange={(event) =>
                            setSelectedRows(event.target.checked ? filteredLeads.map((lead) => lead.id) : [])
                          }
                        />
                      </th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Emirate</th>
                      <th className="px-4 py-3">Products</th>
                      <th className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          Score
                          <button type="button" className="group relative rounded-full p-0.5 text-steel hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-alloy/20" aria-label="Score guide">
                            <HelpCircle size={14} />
                            <span className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-72 -translate-x-1/2 rounded-md bg-ink p-3 text-left text-xs normal-case leading-relaxed text-white shadow-panel group-hover:block group-focus-visible:block">
                              80 to 100 equals Hot shown as red badge, 50 to 79 equals Warm shown as orange badge, below 50 equals Cold shown as grey badge.
                            </span>
                          </button>
                        </span>
                      </th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Follow-up</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!filteredLeads.length ? (
                      <tr>
                        <td className="px-4 py-12" colSpan={9}>
                          <div className="mx-auto max-w-md text-center">
                            <Search className="mx-auto text-steel" size={40} />
                            <h3 className="mt-3 text-lg font-semibold">No leads match your filters</h3>
                            <p className="mt-1 text-sm text-steel">No leads match your filters, try adjusting the search or filters above.</p>
                            <button className="focus-ring mt-4 rounded-md bg-alloy px-4 py-2 font-semibold text-white" onClick={clearFilters}>
                              Clear Filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    {filteredLeads.map((lead) => {
                      return (
                        <tr key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(lead.id)}
                              onChange={(event) =>
                                setSelectedRows((current) =>
                                  event.target.checked ? [...current, lead.id] : current.filter((id) => id !== lead.id)
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold">{lead.companyName}</div>
                            <div className="text-xs text-steel">{lead.industry} | {lead.projectType}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div>{lead.contactPerson}</div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-steel">
                              <span>{lead.email}</span>
                              <button
                                className="rounded-md border border-slate-200 p-1 text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={!lead.phone}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openWhatsApp(lead.phone);
                                }}
                                title={lead.phone ? "Open WhatsApp" : "No phone number on record"}
                                type="button"
                              >
                                <MessageCircle size={14} />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">{lead.emirate}</td>
                          <td className="px-4 py-3">{lead.productsRequired.join(", ")}</td>
                          <td className="px-4 py-3">
                            <ScoreBadge score={lead.score} />
                          </td>
                          <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                            <select className="rounded-md border border-slate-200 px-2 py-1 focus:border-alloy focus:outline-none focus:ring-2 focus:ring-alloy/20" value={lead.status} onChange={(event) => updateStatus(lead.id, event.target.value as Lead["status"])}>
                              {leadStatuses.map((status) => <option key={status}>{status}</option>)}
                            </select>
                          </td>
                          <td className={`px-4 py-3 ${getFollowUpUrgency(lead.nextFollowUp).cellClass}`} title={getFollowUpUrgency(lead.nextFollowUp).tooltip} onClick={(event) => event.stopPropagation()}>
                            <FollowUpInput lead={lead} onChange={updateFollowUp} />
                          </td>
                          <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <button className="rounded-md border border-slate-200 p-2 text-alloy hover:bg-slate-50" onClick={() => setActivityLeadId(lead.id)} title="View activity log">
                                <Clock size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="hidden md:block">
              <LeadForm
                form={form}
                setForm={setForm}
                onSubmit={addLead}
                onClear={() => setForm(blankLead)}
                onToggleProduct={toggleProduct}
                duplicateLead={duplicateLead}
                onDuplicateBlur={(field) => setDuplicateCheckTouched((current) => ({ ...current, [field]: true }))}
                onViewExisting={viewExistingLead}
                onResetDuplicateCheck={() => setDuplicateCheckTouched({ companyName: false, email: false })}
              />
            </div>
          </section>

          <section id="ai-outreach" className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
              <h2 className="flex items-center gap-2 text-xl font-semibold"><Bot size={21} /> AI outreach generator</h2>
              <div className="mt-4 grid gap-3">
                <Select value={selectedLead?.id || ""} onChange={setSelectedLeadId} options={leads.map((lead) => lead.id)} label="Lead" display={(id) => leads.find((lead) => lead.id === id)?.companyName || id} />
                <Select value={messageType} onChange={(value) => setMessageType(value as never)} options={messageTypes} label="Message type" />
                <label className="text-xs font-medium text-steel">
                  Objective
                  <textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-ink focus:border-alloy focus:outline-none focus:ring-2 focus:ring-alloy/20" value={objective} onChange={(event) => setObjective(event.target.value)} />
                </label>
                <button onClick={generateMessage} type="button" className="focus-ring flex items-center justify-center gap-2 rounded-md bg-alloy px-4 py-3 font-semibold text-white">
                  <Send size={18} /> {isGenerating ? "Generating..." : "Generate message"}
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
              <h3 className="font-semibold">Generated outreach</h3>
              <pre className="mt-4 min-h-64 whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm leading-6 text-ink">{generatedMessage || "Select a lead and generate a cold email, LinkedIn message, WhatsApp message, or follow-up."}</pre>
            </div>
          </section>

          <section id="sales-pipeline" className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
            <h2 className="text-xl font-semibold">Sales pipeline</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {leadStatuses.map((status) => (
                <div key={status} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold">{status}</div>
                  <div className="mt-3 grid gap-2">
                    {leads.filter((lead) => lead.status === status).slice(0, 4).map((lead) => (
                      <button key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className="rounded-md bg-white p-2 text-left text-xs shadow-sm">
                        <span className="font-semibold">{lead.companyName}</span>
                        <ScoreBadge score={lead.score} className="mt-2" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="follow-ups" className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
            <h2 className="flex items-center gap-2 text-xl font-semibold"><CalendarClock size={20} /> Follow-up reminders</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {leads
                .filter((lead) => lead.nextFollowUp)
                .sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp))
                .map((lead) => (
                  <div key={lead.id} className="rounded-md border border-slate-200 p-3">
                    <div className="font-semibold">{lead.companyName}</div>
                    <div className="mt-1 text-sm text-steel">{lead.contactPerson} | {lead.phone}</div>
                    <div className="mt-3 text-sm font-medium">Next follow-up: {lead.nextFollowUp}</div>
                  </div>
                ))}
            </div>
          </section>
        </section>
      </div>

      <button className="focus-ring fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-alloy text-white shadow-panel md:hidden" onClick={() => setMobileLeadModalOpen(true)} aria-label="Add lead">
        <Plus size={24} />
      </button>

      {mobileLeadModalOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white p-4 md:hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Add lead</h2>
            <button className="rounded-md border border-slate-200 p-2" onClick={() => setMobileLeadModalOpen(false)} aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <LeadForm
            form={form}
            setForm={setForm}
            onSubmit={addLead}
            onClear={() => setForm(blankLead)}
            onToggleProduct={toggleProduct}
            duplicateLead={duplicateLead}
            onDuplicateBlur={(field) => setDuplicateCheckTouched((current) => ({ ...current, [field]: true }))}
            onViewExisting={viewExistingLead}
            onResetDuplicateCheck={() => setDuplicateCheckTouched({ companyName: false, email: false })}
          />
        </div>
      ) : null}

      {activeActivityLead ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={() => setActivityLeadId("")}>
          <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-panel" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Activity log</h2>
                <p className="text-sm text-steel">{activeActivityLead.companyName}</p>
              </div>
              <button className="rounded-md border border-slate-200 p-2" onClick={() => setActivityLeadId("")} aria-label="Close activity log">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 flex gap-2">
              <input className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 focus:border-alloy focus:outline-none focus:ring-2 focus:ring-alloy/20" placeholder="Add note" value={activityNote} onChange={(event) => setActivityNote(event.target.value)} />
              <button className="rounded-md bg-alloy px-4 py-2 font-semibold text-white" onClick={saveActivityNote}>Add</button>
            </div>
            <div className="mt-6 grid gap-4">
              {(activityLogs[activeActivityLead.id] || [{ id: "created", date: activeActivityLead.createdAt, text: "Lead created" }]).map((item) => (
                <div key={item.id} className="border-l-2 border-alloy pl-4">
                  <div className="text-sm font-semibold">{item.text}</div>
                  <div className="mt-1 text-xs text-steel">{formatDateTime(item.date)}</div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const content = (
    <>
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <span className="font-semibold">Navigation</span>
        <button className="rounded-md border border-slate-200 p-2" onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>
      <nav className="grid gap-2 text-sm font-medium">
        {([
          ["Dashboard", LayoutDashboard],
          ["Lead database", Users],
          ["AI outreach", Bot],
          ["Sales pipeline", BarChart3],
          ["Follow-ups", Bell]
        ] as const).map(([label, Icon]) => (
          <a key={label} className="flex items-center gap-3 rounded-md px-3 py-2 text-ink hover:bg-slate-100" href={`#${String(label).toLowerCase().replaceAll(" ", "-")}`} onClick={onClose}>
            <Icon size={18} />
            {label}
          </a>
        ))}
      </nav>
      <div className="mt-6 rounded-md bg-slate-50 p-3 text-xs leading-5 text-steel">
        Manual entry, CSV import, and compliant public-source enrichment only. No illegal scraping workflows are included.
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-panel lg:block">{content}</aside>
      {open ? (
        <div className="fixed inset-0 z-40 bg-ink/30 lg:hidden" onClick={onClose}>
          <aside className="h-full w-72 bg-white p-4 shadow-panel" onClick={(event) => event.stopPropagation()}>{content}</aside>
        </div>
      ) : null}
    </>
  );
}

function Metric({ label, value, trend, color, icon }: { label: string; value: number; trend: string; color: "teal" | "amber" | "purple" | "green"; icon: ReactNode }) {
  const styles = {
    teal: "text-teal-700 bg-teal-500 border-l-teal-500",
    amber: "text-amber-700 bg-amber-500 border-l-amber-500",
    purple: "text-purple-700 bg-purple-500 border-l-purple-500",
    green: "text-green-700 bg-green-500 border-l-green-500"
  }[color];
  const [textClass, barClass, borderClass] = styles.split(" ");
  const progress = Math.min(100, Math.max(value > 0 ? 12 : 0, value * 10));

  return (
    <div className={`rounded-lg border border-l-4 border-slate-200 bg-white p-4 shadow-panel ${borderClass}`}>
      <div className="flex items-center justify-between text-steel">
        <span className="text-sm font-medium">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
      <div className={`mt-1 text-xs font-semibold ${textClass}`}>{trend}</div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function OutreachSummary({ sentToday, lastOutreach }: { sentToday: number; lastOutreach: { company: string; time: Date } | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><Bot size={17} /> AI Outreach Summary</h3>
      <div className="mt-3 text-3xl font-semibold">{sentToday}</div>
      <p className="text-xs font-semibold text-teal-700">outreach messages sent today</p>
      <p className="mt-3 text-sm text-steel">
        {lastOutreach ? `Last outreach: ${lastOutreach.company} - ${timeAgo(lastOutreach.time)}` : "Last outreach: no activity yet"}
      </p>
      <a className="focus-ring mt-4 inline-flex rounded-md bg-alloy px-3 py-2 text-sm font-semibold text-white" href="#ai-outreach">
        Go to AI Outreach
      </a>
    </div>
  );
}

function LeadForm({
  form,
  setForm,
  onSubmit,
  onClear,
  onToggleProduct,
  duplicateLead,
  onDuplicateBlur,
  onViewExisting,
  onResetDuplicateCheck
}: {
  form: LeadInput;
  setForm: (form: LeadInput) => void;
  onSubmit: (event: FormEvent) => void;
  onClear: () => void;
  onToggleProduct: (product: (typeof products)[number]) => void;
  duplicateLead: Lead | null;
  onDuplicateBlur: (field: "companyName" | "email") => void;
  onViewExisting: (leadId: string) => void;
  onResetDuplicateCheck: () => void;
}) {
  function clearForm() {
    onClear();
    onResetDuplicateCheck();
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white shadow-panel">
      <div className="p-4 pb-0">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><ListPlus size={20} /> Add lead</h2>
      {duplicateLead ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          A lead with this company name already exists.
          <button type="button" className="ml-2 font-semibold text-alloy underline" onClick={() => onViewExisting(duplicateLead.id)}>
            View existing lead
          </button>
        </div>
      ) : null}
      <div className="mt-5 grid gap-5">
        <FormSection title="Company Info">
          <Field label="Company name" required value={form.companyName} onBlur={() => onDuplicateBlur("companyName")} onChange={(value) => setForm({ ...form, companyName: value })} />
          <Field label="Project type" required value={form.projectType} onChange={(value) => setForm({ ...form, projectType: value })} />
          <Select value={form.industry} onChange={(value) => setForm({ ...form, industry: value as Lead["industry"] })} options={industries} label="Industry" required />
        </FormSection>

        <FormSection title="Contact Info">
          <Field label="Contact person" value={form.contactPerson} onChange={(value) => setForm({ ...form, contactPerson: value })} />
          <Field label="Job title" value={form.jobTitle} onChange={(value) => setForm({ ...form, jobTitle: value })} />
          <Field label="Email" type="email" value={form.email} onBlur={() => onDuplicateBlur("email")} onChange={(value) => setForm({ ...form, email: value })} />
          <Field label="Phone / WhatsApp" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
        </FormSection>

        <FormSection title="Lead Details">
          <Select value={form.emirate} onChange={(value) => setForm({ ...form, emirate: value as Lead["emirate"] })} options={emirates} label="Emirate" required />
          <div>
            <p className="text-xs font-medium text-steel">Products <span className="text-red-500">*</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {products.map((product) => (
                <button key={product} type="button" onClick={() => onToggleProduct(product)} className={`rounded-full border px-3 py-1 text-xs font-medium ${form.productsRequired.includes(product) ? "border-alloy bg-alloy text-white" : "border-slate-200 bg-white text-ink"}`}>
                  {product}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.projectSize} onChange={(value) => setForm({ ...form, projectSize: value as Lead["projectSize"] })} options={projectSizes} label="Project size" />
            <Select value={form.urgency} onChange={(value) => setForm({ ...form, urgency: value as Lead["urgency"] })} options={urgencies} label="Urgency" />
            <Select value={form.status} onChange={(value) => setForm({ ...form, status: value as Lead["status"] })} options={leadStatuses} label="Status" />
            <Field label="Follow-up date" type="date" value={form.nextFollowUp} onChange={(value) => setForm({ ...form, nextFollowUp: value })} />
          </div>
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <span className="font-semibold">Score:</span> {scoreLead(form)}/100
          </div>
          <Field label="Lead source" value={form.leadSource} onChange={(value) => setForm({ ...form, leadSource: value })} />
          <label className="text-xs font-medium text-steel">
            Notes
            <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-ink focus:border-alloy focus:outline-none focus:ring-2 focus:ring-alloy/20" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.pastInquiry} onChange={(event) => setForm({ ...form, pastInquiry: event.target.checked })} />
            Past inquiry
          </label>
        </FormSection>
      </div>
      </div>
      <div className="sticky bottom-0 mt-5 flex gap-3 border-t border-slate-200 bg-white p-4">
        <button className="focus-ring flex-1 rounded-md bg-alloy px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={Boolean(duplicateLead)}>Save Lead</button>
        <button type="button" className="focus-ring rounded-md border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-ink" onClick={clearForm}>Clear</button>
      </div>
    </form>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-slate-100 pt-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, onBlur, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; onBlur?: () => void; type?: string; required?: boolean }) {
  return (
    <label className="text-xs font-medium text-steel">
      {label} {required ? <span className="text-red-500">*</span> : null}
      <input required={required} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-ink focus:border-alloy focus:outline-none focus:ring-2 focus:ring-alloy/20" type={type} value={value} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select<T extends readonly string[] | string[]>({
  value,
  onChange,
  options,
  label,
  display,
  required = false
}: {
  value: string;
  onChange: (value: string) => void;
  options: T;
  label: string;
  display?: (value: string) => string;
  required?: boolean;
}) {
  return (
    <label className="text-xs font-medium text-steel">
      {label} {required ? <span className="text-red-500">*</span> : null}
      <select className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-ink focus:border-alloy focus:outline-none focus:ring-2 focus:ring-alloy/20" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option ? display?.(option) || option : label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextInput({ icon, placeholder, value, onChange }: { icon: ReactNode; placeholder: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-medium text-steel">
      Search
      <span className="mt-1 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 focus-within:border-alloy focus-within:ring-2 focus-within:ring-alloy/20">
        {icon}
        <input className="w-full py-2 outline-none" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

function Breakdown({
  title,
  labels,
  leads,
  field
}: {
  title: string;
  labels: readonly string[];
  leads: Lead[];
  field: "emirate" | "industry";
}) {
  const max = Math.max(1, ...labels.map((label) => leads.filter((lead) => lead[field] === label).length));
  const isIndustry = field === "industry";
  return (
    <div className={`h-auto rounded-lg border border-slate-200 bg-white p-4 shadow-panel ${isIndustry ? "max-h-none overflow-auto" : "overflow-auto"}`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 grid min-w-0 gap-2">
        {labels.map((label) => {
          const count = leads.filter((lead) => lead[field] === label).length;
          return (
            <div key={label}>
              <div className="flex min-w-0 justify-between gap-3 text-xs text-steel">
                <span className="min-w-0 whitespace-normal">{label}</span>
                <span>{count}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-alloy" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BulkActionBar({ count, status, onStatusChange, onApply, onDelete }: { count: number; status: string; onStatusChange: (value: string) => void; onApply: () => void; onDelete: () => void }) {
  if (!count) return null;
  return (
    <div className="sticky top-20 z-20 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-panel md:flex-row md:items-center md:justify-between">
      <span className="text-sm font-semibold">Update status for selected leads ({count})</span>
      <div className="flex flex-wrap gap-2">
        <select className="rounded-md border border-slate-200 px-3 py-2 text-sm" value={status} onChange={(event) => onStatusChange(event.target.value)}>
          {leadStatuses.map((item) => <option key={item}>{item}</option>)}
        </select>
        <button className="rounded-md bg-alloy px-3 py-2 text-sm font-semibold text-white" onClick={onApply}>Update Status</button>
        <button className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white" onClick={onDelete}>
          <Trash2 size={16} /> Delete Selected
        </button>
      </div>
    </div>
  );
}

function FollowUpInput({ lead, onChange }: { lead: Lead; onChange: (id: string, value: string) => void }) {
  const urgency = getFollowUpUrgency(lead.nextFollowUp);
  return (
    <input
      className={`rounded-md border border-slate-200 bg-transparent px-2 py-1 ${urgency.inputClass}`}
      title={urgency.tooltip}
      type="date"
      value={lead.nextFollowUp}
      onChange={(event) => onChange(lead.id, event.target.value)}
    />
  );
}

function getScoreStyle(score: number) {
  if (score >= 80) return { label: "Hot", bg: "bg-[#EF4444]" };
  if (score >= 50) return { label: "Warm", bg: "bg-[#F97316]" };
  return { label: "Cold", bg: "bg-[#9CA3AF]" };
}

function ScoreBadge({ score, className = "" }: { score: number; className?: string }) {
  const scoreStyle = getScoreStyle(score);
  return (
    <span className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold text-white ${scoreStyle.bg} ${className}`}>
      {score} {scoreStyle.label}
    </span>
  );
}

function getFollowUpUrgency(date: string) {
  if (!date) return { cellClass: "bg-white", inputClass: "bg-white", tooltip: "No follow-up date set" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { cellClass: "bg-red-600 text-white", inputClass: "border-white text-white", tooltip: `${Math.abs(days)} day(s) overdue` };
  if (days === 0) return { cellClass: "bg-amber-400 text-ink", inputClass: "border-amber-600", tooltip: "Due today" };
  if (days <= 3) return { cellClass: "bg-orange-100 text-orange-800", inputClass: "border-orange-200", tooltip: `${days} day(s) remaining` };
  return { cellClass: "bg-white", inputClass: "bg-white", tooltip: `${days} day(s) remaining` };
}

function getDuplicateLead(form: LeadInput, leads: Lead[], touched: { companyName: boolean; email: boolean }) {
  const company = form.companyName.trim().toLowerCase();
  const email = form.email.trim().toLowerCase();
  if ((!touched.companyName || !company) && (!touched.email || !email)) return null;
  return leads.find((lead) => {
    const sameCompany = touched.companyName && company && lead.companyName.trim().toLowerCase() === company;
    const sameEmail = touched.email && email && lead.email.trim().toLowerCase() === email;
    return sameCompany || sameEmail;
  }) || null;
}

function openWhatsApp(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return;
  window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
}

function timeAgo(date: Date) {
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute(s) ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour(s) ago`;
}

function formatDateTime(value: string) {
  const parsed = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  return parsed.toLocaleString();
}
