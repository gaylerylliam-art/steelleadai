"use client";

import { ChangeEvent, FormEvent, ReactNode, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarClock,
  Filter,
  Flame,
  LayoutDashboard,
  ListPlus,
  Search,
  Send,
  Upload,
  Users
} from "lucide-react";
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
import { sampleLeads } from "@/lib/sample-data";
import { scoreBand, scoreLead } from "@/lib/scoring";

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

export default function HomePage() {
  const [leads, setLeads] = useState<Lead[]>(sampleLeads);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [form, setForm] = useState<LeadInput>(blankLead);
  const [selectedLeadId, setSelectedLeadId] = useState(sampleLeads[0].id);
  const [messageType, setMessageType] = useState<(typeof messageTypes)[number]>("Cold email");
  const [objective, setObjective] = useState("Introduce steel supply capability and request RFQ details.");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) || filteredLeads[0] || leads[0];

  const metrics = useMemo(() => {
    return {
      total: leads.length,
      hot: leads.filter((lead) => lead.score >= 75).length,
      quotations: leads.filter((lead) => lead.status === "Quotation Sent").length,
      won: leads.filter((lead) => lead.status === "Won").length
    };
  }, [leads]);

  function addLead(event: FormEvent) {
    event.preventDefault();
    const nextLead: Lead = {
      ...form,
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      score: scoreLead(form)
    };
    setLeads((current) => [nextLead, ...current]);
    setSelectedLeadId(nextLead.id);
    setForm(blankLead);
  }

  function updateStatus(id: string, status: Lead["status"]) {
    setLeads((current) =>
      current.map((lead) => {
        if (lead.id !== id) return lead;
        const updated = { ...lead, status };
        return { ...updated, score: scoreLead(updated) };
      })
    );
  }

  function updateFollowUp(id: string, nextFollowUp: string) {
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, nextFollowUp } : lead)));
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
        const imported = result.data.map((row, index) => {
          const productsRequired = (row.productsRequired || row.products || "Universal beams")
            .split(",")
            .map((item) => item.trim())
            .filter((item) => products.includes(item as never)) as Lead["productsRequired"];
          const lead: LeadInput = {
            companyName: row.companyName || row.company || `Imported Lead ${index + 1}`,
            contactPerson: row.contactPerson || row.contact || "",
            jobTitle: row.jobTitle || "",
            email: row.email || "",
            phone: row.phone || row.whatsapp || "",
            emirate: emirates.includes(row.emirate as never) ? (row.emirate as Lead["emirate"]) : "Dubai",
            industry: industries.includes(row.industry as never) ? (row.industry as Lead["industry"]) : "Construction",
            projectType: row.projectType || "Structural steel requirement",
            projectSize: projectSizes.includes(row.projectSize as never) ? (row.projectSize as Lead["projectSize"]) : "Medium",
            productsRequired: productsRequired.length ? productsRequired : ["Universal beams"],
            leadSource: row.leadSource || "CSV import",
            status: leadStatuses.includes(row.status as never) ? (row.status as Lead["status"]) : "New Lead",
            notes: row.notes || "",
            urgency: urgencies.includes(row.urgency as never) ? (row.urgency as Lead["urgency"]) : "Medium",
            pastInquiry: ["true", "yes", "1"].includes((row.pastInquiry || "").toLowerCase()),
            nextFollowUp: row.nextFollowUp || ""
          };
          return {
            ...lead,
            id: `csv-${Date.now()}-${index}`,
            createdAt: new Date().toISOString().slice(0, 10),
            score: scoreLead(lead)
          };
        });
        setLeads((current) => [...imported, ...current]);
      }
    });
  }

  async function generateMessage() {
    setIsGenerating(true);
    setGeneratedMessage("");
    const response = await fetch("/api/generate-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead: selectedLead, messageType, objective })
    });
    const data = await response.json();
    setGeneratedMessage(data.message || data.error || "Unable to generate message.");
    setIsGenerating(false);
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-ink text-white">
              <Building2 size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">SteelLead AI</h1>
              <p className="text-sm text-steel">Structural steel lead generation for Dubai and UAE sales teams</p>
            </div>
          </div>
          <a className="focus-ring rounded-md bg-alloy px-4 py-2 text-center font-semibold text-white" href="/login">
            Login
          </a>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
          <nav className="grid gap-2 text-sm font-medium">
            {([
              ["Dashboard", LayoutDashboard],
              ["Lead database", Users],
              ["AI outreach", Bot],
              ["Sales pipeline", BarChart3],
              ["Follow-ups", Bell]
            ] as const).map(([label, Icon]) => (
              <a key={label as string} className="flex items-center gap-3 rounded-md px-3 py-2 text-ink hover:bg-slate-100" href={`#${String(label).toLowerCase().replaceAll(" ", "-")}`}>
                <Icon size={18} />
                {label as string}
              </a>
            ))}
          </nav>
          <div className="mt-6 rounded-md bg-slate-50 p-3 text-xs leading-5 text-steel">
            Manual entry, CSV import, and compliant public-source enrichment only. No illegal scraping workflows are included.
          </div>
        </aside>

        <section className="grid gap-6">
          <section id="dashboard" className="grid gap-4 md:grid-cols-4">
            <Metric label="Total leads" value={metrics.total} icon={<Users size={20} />} />
            <Metric label="Hot leads" value={metrics.hot} icon={<Flame size={20} />} />
            <Metric label="Quotations sent" value={metrics.quotations} icon={<Send size={20} />} />
            <Metric label="Won deals" value={metrics.won} icon={<BarChart3 size={20} />} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <Filter size={20} /> Search and filters
                </h2>
                <label className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium">
                  <Upload size={17} />
                  CSV import
                  <input className="hidden" type="file" accept=".csv" onChange={importCsv} />
                </label>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <TextInput icon={<Search size={16} />} placeholder="Search leads" value={filters.search} onChange={(value) => setFilters({ ...filters, search: value })} />
                <Select value={filters.emirate} onChange={(value) => setFilters({ ...filters, emirate: value })} options={["", ...emirates]} label="All emirates" />
                <Select value={filters.industry} onChange={(value) => setFilters({ ...filters, industry: value })} options={["", ...industries]} label="All industries" />
                <Select value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={["", ...leadStatuses]} label="All statuses" />
                <Select value={filters.product} onChange={(value) => setFilters({ ...filters, product: value })} options={["", ...products]} label="All products" />
                <label className="text-xs font-medium text-steel">
                  Min score
                  <input className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2" type="number" min={0} max={100} value={filters.minScore} onChange={(event) => setFilters({ ...filters, minScore: Number(event.target.value) })} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Breakdown title="Leads by emirate" labels={emirates} leads={leads} field="emirate" />
              <Breakdown title="Leads by industry" labels={industries} leads={leads} field="industry" />
            </div>
          </section>

          <section id="lead-database" className="grid gap-6 xl:grid-cols-[1fr_390px]">
            <div className="rounded-lg border border-slate-200 bg-white shadow-panel">
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <h2 className="text-xl font-semibold">Lead database</h2>
                <span className="text-sm text-steel">{filteredLeads.length} shown</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-steel">
                    <tr>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Emirate</th>
                      <th className="px-4 py-3">Products</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => {
                      const band = scoreBand(lead.score);
                      return (
                        <tr key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold">{lead.companyName}</div>
                            <div className="text-xs text-steel">{lead.industry} | {lead.projectType}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div>{lead.contactPerson}</div>
                            <div className="text-xs text-steel">{lead.email}</div>
                          </td>
                          <td className="px-4 py-3">{lead.emirate}</td>
                          <td className="px-4 py-3">{lead.productsRequired.join(", ")}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${band.color}`}>{lead.score} {band.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <select className="rounded-md border border-slate-200 px-2 py-1" value={lead.status} onChange={(event) => updateStatus(lead.id, event.target.value as Lead["status"])}>
                              {leadStatuses.map((status) => <option key={status}>{status}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input className="rounded-md border border-slate-200 px-2 py-1" type="date" value={lead.nextFollowUp} onChange={(event) => updateFollowUp(lead.id, event.target.value)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <form onSubmit={addLead} className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
              <h2 className="flex items-center gap-2 text-xl font-semibold"><ListPlus size={20} /> Add lead</h2>
              <div className="mt-4 grid gap-3">
                {[
                  ["Company name", "companyName"],
                  ["Contact person", "contactPerson"],
                  ["Job title", "jobTitle"],
                  ["Email", "email"],
                  ["Phone / WhatsApp", "phone"],
                  ["Project type", "projectType"],
                  ["Lead source", "leadSource"]
                ].map(([label, key]) => (
                  <label key={key} className="text-xs font-medium text-steel">
                    {label}
                    <input required={key === "companyName"} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-ink" value={String(form[key as keyof LeadInput])} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
                  </label>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <Select value={form.emirate} onChange={(value) => setForm({ ...form, emirate: value as Lead["emirate"] })} options={emirates} label="Emirate" />
                  <Select value={form.industry} onChange={(value) => setForm({ ...form, industry: value as Lead["industry"] })} options={industries} label="Industry" />
                  <Select value={form.projectSize} onChange={(value) => setForm({ ...form, projectSize: value as Lead["projectSize"] })} options={projectSizes} label="Project size" />
                  <Select value={form.urgency} onChange={(value) => setForm({ ...form, urgency: value as Lead["urgency"] })} options={urgencies} label="Urgency" />
                </div>
                <div>
                  <p className="text-xs font-medium text-steel">Products required</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {products.map((product) => (
                      <button key={product} type="button" onClick={() => toggleProduct(product)} className={`rounded-full border px-3 py-1 text-xs font-medium ${form.productsRequired.includes(product) ? "border-alloy bg-alloy text-white" : "border-slate-200 bg-white text-ink"}`}>
                        {product}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="text-xs font-medium text-steel">
                  Notes
                  <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-ink" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.pastInquiry} onChange={(event) => setForm({ ...form, pastInquiry: event.target.checked })} />
                  Past inquiry
                </label>
                <button className="focus-ring rounded-md bg-ink px-4 py-3 font-semibold text-white">Add lead</button>
              </div>
            </form>
          </section>

          <section id="ai-outreach" className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
              <h2 className="flex items-center gap-2 text-xl font-semibold"><Bot size={21} /> AI outreach generator</h2>
              <div className="mt-4 grid gap-3">
                <Select value={selectedLead?.id || ""} onChange={setSelectedLeadId} options={leads.map((lead) => lead.id)} label="Lead" display={(id) => leads.find((lead) => lead.id === id)?.companyName || id} />
                <Select value={messageType} onChange={(value) => setMessageType(value as never)} options={messageTypes} label="Message type" />
                <label className="text-xs font-medium text-steel">
                  Objective
                  <textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-ink" value={objective} onChange={(event) => setObjective(event.target.value)} />
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
                        <span className="mt-1 block text-steel">{lead.score}/100</span>
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
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between text-steel">
        <span className="text-sm font-medium">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function Select<T extends readonly string[] | string[]>({
  value,
  onChange,
  options,
  label,
  display
}: {
  value: string;
  onChange: (value: string) => void;
  options: T;
  label: string;
  display?: (value: string) => string;
}) {
  return (
    <label className="text-xs font-medium text-steel">
      {label}
      <select className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-ink" value={value} onChange={(event) => onChange(event.target.value)}>
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
      <span className="mt-1 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3">
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
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 grid gap-2">
        {labels.slice(0, 5).map((label) => {
          const count = leads.filter((lead) => lead[field] === label).length;
          return (
            <div key={label}>
              <div className="flex justify-between text-xs text-steel">
                <span>{label}</span>
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
