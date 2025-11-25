export interface StatusConfig {
  label: string;
  color: string;
  is_system?: boolean;
}

export const DEFAULT_CLIENT_STATUSES: Record<string, StatusConfig> = {
  new: { label: "status_new", color: "bg-green-100 text-green-800" },
  contacted: { label: "status_contacted", color: "bg-blue-100 text-blue-800" },
  interested: { label: "status_interested", color: "bg-yellow-100 text-yellow-800" },
  lead: { label: "status_lead", color: "bg-orange-100 text-orange-800" },
  customer: { label: "status_customer", color: "bg-purple-100 text-purple-800" },
  vip: { label: "status_vip", color: "bg-pink-100 text-pink-800" },
  inactive: { label: "status_inactive", color: "bg-gray-100 text-gray-800" },
  blocked: { label: "status_blocked", color: "bg-red-100 text-red-800" },
};

export const DEFAULT_BOOKING_STATUSES: Record<string, StatusConfig> = {
  pending: { label: "status_pending", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "status_confirmed", color: "bg-green-100 text-green-800" },
  completed: { label: "status_completed", color: "bg-blue-100 text-blue-800" },
  cancelled: { label: "status_cancelled", color: "bg-red-100 text-red-800" },
  new: { label: "status_new", color: "bg-purple-100 text-purple-800" },
};