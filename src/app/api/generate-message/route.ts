import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { lead, messageType, objective } = body;

  if (!lead || !messageType) {
    return NextResponse.json({ error: "Lead and message type are required." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      message: fallbackMessage(lead, messageType)
    });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await client.responses.create({
    model,
    instructions:
      "You write concise, professional UAE B2B sales outreach for a structural steel trading company. Avoid claims of exclusive access, avoid scraping language, and do not invent certifications, stock, or prices.",
    input: `Create a ${messageType} for this lead.
Company: ${lead.companyName}
Contact: ${lead.contactPerson}, ${lead.jobTitle}
Emirate: ${lead.emirate}
Industry: ${lead.industry}
Project type: ${lead.projectType}
Products required: ${lead.productsRequired?.join(", ")}
Lead status: ${lead.status}
Notes: ${lead.notes}
Objective: ${objective || "Book a call and ask for RFQ details."}`
  });

  return NextResponse.json({ message: response.output_text });
}

function fallbackMessage(lead: any, messageType: string) {
  const products = Array.isArray(lead.productsRequired) ? lead.productsRequired.join(", ") : "structural steel";
  if (messageType === "WhatsApp message") {
    return `Hello ${lead.contactPerson}, this is from SteelLead AI Demo. We support UAE projects with ${products}. Can I confirm your current requirement for ${lead.projectType} and share availability for your review?`;
  }
  if (messageType === "LinkedIn message") {
    return `Hi ${lead.contactPerson}, I noticed ${lead.companyName} is active in ${lead.industry} projects in ${lead.emirate}. We supply structural steel including ${products}. Would it be useful to connect and discuss upcoming RFQs?`;
  }
  if (messageType === "Follow-up message") {
    return `Dear ${lead.contactPerson}, following up on ${lead.companyName}'s requirement for ${products}. Please let me know if you would like us to prepare an updated quotation, delivery schedule, or technical documents for ${lead.projectType}.`;
  }
  return `Subject: Structural steel supply support for ${lead.companyName}

Dear ${lead.contactPerson},

I hope you are well. We support UAE contractors and fabricators with structural steel supply, including ${products}.

For your ${lead.projectType} requirement in ${lead.emirate}, we would be glad to review the specifications, quantities, and required delivery schedule so our team can prepare a suitable quotation.

Would you be available for a short call this week?

Regards,
SteelLead AI Demo`;
}
