import apiClient from './client';
import { Service, Employee, EmployeeSchedule } from '../types';

interface ServicesResponse {
  services: Service[];
}

interface EmployeesResponse {
  employees: Employee[];
}

export const servicesApi = {
  getAll: async (language?: string): Promise<Service[]> => {
    const params = language ? { language } : undefined;
    const response = await apiClient.get<ServicesResponse>('/api/public/services', params);
    return response.data.services || [];
  },

  getByCategory: async (category: string, language?: string): Promise<Service[]> => {
    const params: Record<string, unknown> = { category };
    if (language) params.language = language;

    const response = await apiClient.get<ServicesResponse>('/api/public/services', params);
    return response.data.services || [];
  },

  getPrice: async (serviceKey: string): Promise<{ price: number; currency: string }> => {
    const response = await apiClient.get<{ price: number; currency: string }>(
      `/api/services/${serviceKey}/price`
    );
    return response.data;
  },
};

export const employeesApi = {
  getAll: async (): Promise<Employee[]> => {
    const response = await apiClient.get<EmployeesResponse>('/api/public/employees');
    return response.data.employees || [];
  },

  getById: async (id: number): Promise<Employee> => {
    const response = await apiClient.get<Employee>(`/api/public/employees/${id}`);
    return response.data;
  },

  getByService: async (serviceKey: string): Promise<Employee[]> => {
    const response = await apiClient.get<EmployeesResponse>(
      '/api/public/employees',
      { service_key: serviceKey }
    );
    return response.data.employees || [];
  },

  getSchedule: async (employeeId: number, date: string): Promise<EmployeeSchedule> => {
    const response = await apiClient.get<EmployeeSchedule>(
      `/api/public/employees/${employeeId}/schedule`,
      { date }
    );
    return response.data;
  },
};
