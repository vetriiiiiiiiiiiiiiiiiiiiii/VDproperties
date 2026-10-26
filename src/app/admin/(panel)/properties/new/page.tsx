import { PageHeader } from "@/components/admin/PageHeader";
import { EMPTY_PROPERTY, PropertyForm } from "@/components/admin/PropertyForm";
import { requirePage } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { propertyFormOptions } from "../form-data";

export const metadata = { title: "Add property" };

export default async function NewProperty() {
  const user = await requirePage("properties:manage");
  const options = await propertyFormOptions();
  return (
    <>
      <PageHeader title="Add property" description="Save as a draft first; you can add photographs and publish on the next screen." back={{ href: "/admin/properties", label: "Properties" }} />
      <PropertyForm id={null} values={EMPTY_PROPERTY} {...options} canPublish={can(user.role, "properties:publish")} />
    </>
  );
}
