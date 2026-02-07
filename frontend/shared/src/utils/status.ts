// Shared status utilities for web and mobile
import type { BookingStatus, ClientStatus, ClientTemperature, TaskStatus, TaskPriority } from '../types';

// Booking status helpers
export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  new: '#3b82f6',      // blue
  confirmed: '#22c55e', // green
  completed: '#6b7280', // gray
  cancelled: '#ef4444', // red
  'no-show': '#f97316', // orange
  in_progress: '#8b5cf6', // purple
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'no-show': 'No Show',
  in_progress: 'In Progress',
};

export function getBookingStatusColor(status: BookingStatus): string {
  return BOOKING_STATUS_COLORS[status] || '#6b7280';
}

// Client status helpers
export const CLIENT_STATUS_COLORS: Record<ClientStatus, string> = {
  new: '#3b82f6',       // blue
  contacted: '#8b5cf6', // purple
  interested: '#f59e0b', // amber
  lead: '#ec4899',      // pink
  booked: '#22c55e',    // green
  customer: '#10b981',  // emerald
  vip: '#f59e0b',       // amber (gold)
  inactive: '#6b7280',  // gray
  blocked: '#ef4444',   // red
};

export function getClientStatusColor(status: ClientStatus): string {
  return CLIENT_STATUS_COLORS[status] || '#6b7280';
}

// Temperature helpers
export const TEMPERATURE_COLORS: Record<ClientTemperature, string> = {
  cold: '#3b82f6',  // blue
  warm: '#f59e0b',  // amber
  hot: '#ef4444',   // red
};

export function getTemperatureColor(temp: ClientTemperature): string {
  return TEMPERATURE_COLORS[temp] || '#6b7280';
}

// Task status helpers
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#f59e0b',    // amber
  in_progress: '#3b82f6', // blue
  completed: '#22c55e',   // green
  cancelled: '#6b7280',   // gray
};

export function getTaskStatusColor(status: TaskStatus): string {
  return TASK_STATUS_COLORS[status] || '#6b7280';
}

// Task priority helpers
export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#22c55e',     // green
  medium: '#f59e0b',  // amber
  high: '#f97316',    // orange
  urgent: '#ef4444',  // red
};

export function getTaskPriorityColor(priority: TaskPriority): string {
  return TASK_PRIORITY_COLORS[priority] || '#6b7280';
}

// Generic status badge helper
export interface StatusBadgeConfig {
  label: string;
  color: string;
  bgColor?: string;
  textColor?: string;
}

export function getStatusBadgeConfig(
  type: 'booking' | 'client' | 'task' | 'priority' | 'temperature',
  value: string
): StatusBadgeConfig {
  let color: string;
  let label: string;

  switch (type) {
    case 'booking':
      color = BOOKING_STATUS_COLORS[value as BookingStatus] || '#6b7280';
      label = BOOKING_STATUS_LABELS[value as BookingStatus] || value;
      break;
    case 'client':
      color = CLIENT_STATUS_COLORS[value as ClientStatus] || '#6b7280';
      label = value.charAt(0).toUpperCase() + value.slice(1);
      break;
    case 'task':
      color = TASK_STATUS_COLORS[value as TaskStatus] || '#6b7280';
      label = value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      break;
    case 'priority':
      color = TASK_PRIORITY_COLORS[value as TaskPriority] || '#6b7280';
      label = value.charAt(0).toUpperCase() + value.slice(1);
      break;
    case 'temperature':
      color = TEMPERATURE_COLORS[value as ClientTemperature] || '#6b7280';
      label = value.charAt(0).toUpperCase() + value.slice(1);
      break;
    default:
      color = '#6b7280';
      label = value;
  }

  // Generate background and text colors based on main color
  const bgColor = `${color}20`; // 20% opacity
  const textColor = color;

  return { label, color, bgColor, textColor };
}
