import { Lead, LeadInput } from "@/lib/types";

const preferredIndustries = new Set([
  "Construction",
  "Steel Fabrication",
  "EPC",
  "Oil & Gas",
  "Warehousing",
  "Industrial Projects"
]);

const priorityProducts = new Set([
  "Universal beams",
  "Universal columns",
  "I-beams",
  "H-beams",
  "Plates",
  "Hollow sections"
]);

export function scoreLead(lead: LeadInput | Lead): number {
  let score = 0;

  score += preferredIndustries.has(lead.industry) ? 20 : 12;

  const sizePoints = {
    Small: 6,
    Medium: 12,
    Large: 18,
    Mega: 22
  }[lead.projectSize];
  score += sizePoints;

  const urgencyPoints = {
    Low: 4,
    Medium: 10,
    High: 16,
    Immediate: 20
  }[lead.urgency];
  score += urgencyPoints;

  score += ["Dubai", "Abu Dhabi", "Sharjah"].includes(lead.emirate) ? 14 : 9;
  score += lead.pastInquiry ? 12 : 0;

  const matchingProducts = lead.productsRequired.filter((product) => priorityProducts.has(product));
  score += Math.min(12, matchingProducts.length * 4 + lead.productsRequired.length);

  if (lead.status === "Quotation Sent" || lead.status === "Negotiation") score += 5;
  if (lead.status === "Won" || lead.status === "Lost") score -= 10;

  return Math.max(0, Math.min(100, score));
}

export function scoreBand(score: number) {
  if (score >= 80) return { label: "Hot", color: "bg-red-100 text-red-700" };
  if (score >= 50) return { label: "Warm", color: "bg-orange-100 text-orange-700" };
  return { label: "Cold", color: "bg-slate-100 text-slate-700" };
}
