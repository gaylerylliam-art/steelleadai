import { Lead, LeadInput } from "@/lib/types";

type LeadRow = {
  id: string;
  company_name: string;
  contact_person: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  emirate: Lead["emirate"];
  industry: Lead["industry"];
  project_type: string | null;
  project_size: Lead["projectSize"];
  products_required: Lead["productsRequired"];
  lead_source: string | null;
  status: Lead["status"];
  notes: string | null;
  urgency: Lead["urgency"];
  past_inquiry: boolean;
  next_follow_up: string | null;
  score: number;
  created_at: string;
  created_by?: string;
};

export function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    companyName: row.company_name,
    contactPerson: row.contact_person || "",
    jobTitle: row.job_title || "",
    email: row.email || "",
    phone: row.phone || "",
    emirate: row.emirate,
    industry: row.industry,
    projectType: row.project_type || "",
    projectSize: row.project_size,
    productsRequired: row.products_required || [],
    leadSource: row.lead_source || "",
    status: row.status,
    notes: row.notes || "",
    urgency: row.urgency,
    pastInquiry: row.past_inquiry,
    nextFollowUp: row.next_follow_up || "",
    score: row.score,
    createdAt: row.created_at.slice(0, 10)
  };
}

export function leadToInsert(lead: LeadInput, userId: string, score: number) {
  return {
    company_name: lead.companyName,
    contact_person: lead.contactPerson,
    job_title: lead.jobTitle,
    email: lead.email,
    phone: lead.phone,
    emirate: lead.emirate,
    industry: lead.industry,
    project_type: lead.projectType,
    project_size: lead.projectSize,
    products_required: lead.productsRequired,
    lead_source: lead.leadSource,
    status: lead.status,
    notes: lead.notes,
    urgency: lead.urgency,
    past_inquiry: lead.pastInquiry,
    next_follow_up: lead.nextFollowUp || null,
    score,
    created_by: userId
  };
}
