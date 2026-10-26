import { handleSiteVisit } from "@/lib/leads";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    return await handleSiteVisit(req);
  } catch (err) {
    console.error("Site visit submission failed", err);
    return Response.json({ ok: false, message: "Something went wrong on our side and your request was not saved. Please try again, or call us." }, { status: 500 });
  }
}
