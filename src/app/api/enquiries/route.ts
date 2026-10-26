import { handleEnquiry } from "@/lib/leads";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    return await handleEnquiry(req);
  } catch (err) {
    console.error("Enquiry submission failed", err);
    return Response.json({ ok: false, message: "Something went wrong on our side and your enquiry was not saved. Please try again, or call us." }, { status: 500 });
  }
}
