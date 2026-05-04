export const emirates = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain"
] as const;

export const industries = [
  "Construction",
  "Steel Fabrication",
  "EPC",
  "MEP",
  "Oil & Gas",
  "Warehousing",
  "Industrial Projects",
  "Real Estate Development"
] as const;

export const leadStatuses = [
  "New Lead",
  "Contacted",
  "Quotation Sent",
  "Negotiation",
  "Won",
  "Lost"
] as const;

export const products = [
  "Universal beams",
  "Universal columns",
  "I-beams",
  "H-beams",
  "Angles",
  "Channels",
  "Plates",
  "Pipes",
  "Hollow sections",
  "Flat bars"
] as const;

export const projectSizes = ["Small", "Medium", "Large", "Mega"] as const;
export const urgencies = ["Low", "Medium", "High", "Immediate"] as const;
export const messageTypes = ["Cold email", "LinkedIn message", "WhatsApp message", "Follow-up message"] as const;

export type Emirate = (typeof emirates)[number];
export type Industry = (typeof industries)[number];
export type LeadStatus = (typeof leadStatuses)[number];
export type Product = (typeof products)[number];
export type ProjectSize = (typeof projectSizes)[number];
export type Urgency = (typeof urgencies)[number];
export type MessageType = (typeof messageTypes)[number];

export type Lead = {
  id: string;
  companyName: string;
  contactPerson: string;
  jobTitle: string;
  email: string;
  phone: string;
  emirate: Emirate;
  industry: Industry;
  projectType: string;
  projectSize: ProjectSize;
  productsRequired: Product[];
  leadSource: string;
  status: LeadStatus;
  notes: string;
  urgency: Urgency;
  pastInquiry: boolean;
  nextFollowUp: string;
  createdAt: string;
  score: number;
};

export type LeadInput = Omit<Lead, "id" | "createdAt" | "score">;

export type Filters = {
  emirate: string;
  industry: string;
  status: string;
  minScore: number;
  product: string;
  search: string;
};
