export interface StatusConfig {
    label: string;
    color: string;
    is_system?: boolean;
  }
  
  export const DEFAULT_CLIENT_STATUSES: Record<string, StatusConfig> = {
    new: { label: "Новый", color: "bg-green-100 text-green-800" },
    contacted: { label: "Связались", color: "bg-blue-100 text-blue-800" },
    interested: { label: "Заинтересован", color: "bg-yellow-100 text-yellow-800" },
    lead: { label: "Лид", color: "bg-orange-100 text-orange-800" },
    customer: { label: "Клиент", color: "bg-purple-100 text-purple-800" },
    vip: { label: "VIP", color: "bg-pink-100 text-pink-800" },
    inactive: { label: "Неактивен", color: "bg-gray-100 text-gray-800" },
    blocked: { label: "Заблокирован", color: "bg-red-100 text-red-800" },
  };
  
  export const DEFAULT_BOOKING_STATUSES: Record<string, StatusConfig> = {
    pending: { label: "Ожидает", color: "bg-yellow-100 text-yellow-800" },
    confirmed: { label: "Подтверждена", color: "bg-green-100 text-green-800" },
    completed: { label: "Завершена", color: "bg-blue-100 text-blue-800" },
    cancelled: { label: "Отменена", color: "bg-red-100 text-red-800" },
    new: { label: "Новая", color: "bg-purple-100 text-purple-800" },
  };