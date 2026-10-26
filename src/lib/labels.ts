import type {
  Availability,
  EnquiryStatus,
  EnquiryType,
  ImageKind,
  ProjectStatus,
  PropertyType,
  Role,
  SiteVisitStatus,
  TimeSlot,
} from "@prisma/client";

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  RESIDENTIAL_PLOT: "Residential plot",
  LAND: "Land",
  HOUSE: "House",
  VILLA: "Villa",
};

export const LAND_TYPES: PropertyType[] = ["RESIDENTIAL_PLOT", "LAND"];
export const HOME_TYPES: PropertyType[] = ["HOUSE", "VILLA"];

export function isHomeType(type: PropertyType) {
  return HOME_TYPES.includes(type);
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
  UNAVAILABLE: "Unavailable",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  UPCOMING: "Upcoming",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
};

export const ENQUIRY_TYPE_LABEL: Record<EnquiryType, string> = {
  GENERAL: "General enquiry",
  PROPERTY: "Property enquiry",
  PLOT: "Plot enquiry",
  HOUSE: "House enquiry",
  CONSTRUCTION: "Construction project",
  PROJECT: "Project enquiry",
};

export const ENQUIRY_STATUS_LABEL: Record<EnquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  IN_PROGRESS: "In progress",
  CLOSED: "Closed",
  SPAM: "Spam",
};

export const SITE_VISIT_STATUS_LABEL: Record<SiteVisitStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const TIME_SLOT_LABEL: Record<TimeSlot, string> = {
  MORNING: "Morning (9 am – 11 am)",
  MIDDAY: "Midday (11 am – 1 pm)",
  AFTERNOON: "Afternoon (2 pm – 4 pm)",
  EVENING: "Evening (4 pm – 6 pm)",
};

export const IMAGE_KIND_LABEL: Record<ImageKind, string> = {
  PHOTO: "Photograph",
  FLOOR_PLAN: "Floor plan",
  SITE_PLAN: "Site plan",
};

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  PROPERTY_MANAGER: "Property Manager",
  ENQUIRY_MANAGER: "Enquiry Manager",
  PROJECT_MANAGER: "Project Manager",
  CUSTOMER: "Customer",
};
