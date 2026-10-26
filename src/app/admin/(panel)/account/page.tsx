import { AccountForm } from "@/components/admin/AccountForm";
import { Panel } from "@/components/admin/kit";
import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";

export const metadata = { title: "My account" };

export default async function Account() {
  const me = await requirePage();
  return (
    <>
      <PageHeader title="My account" description={`${me.email} · ${ROLE_LABEL[me.role]}`} />
      <div className="max-w-xl"><Panel title="Change password"><AccountForm /></Panel></div>
    </>
  );
}
