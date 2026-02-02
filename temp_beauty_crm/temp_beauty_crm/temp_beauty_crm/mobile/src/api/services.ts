import apiClient from './client';
import { API_ENDPOINTS } from '@beauty-crm/shared/api';
import type { Service, Employee, EmployeeSchedule } from '@beauty-crm/shared/types';

interface ServicesResponse {
  services: Service[];
}

interface EmployeesResponse {
  employees: Employee[];
}

export const servicesApi = {
  getAll: async (language?: string): Promise<Service[]> => {
    const params = language ? { language } : undefined;
    const response = await apiClient.get<ServicesResponse>(API_ENDPOINTS.SERVICES.PUBLIC, params);
    return response.data.services || [];
  },

  getByCategory: async (category: string, language?: string): Promise<Service[]> => {
    const params: Record<string, unknown> = { category };
    if (language) params.language = language;

    const response = await apiClient.get<ServicesResponse>(API_ENDPOINTS.SERVICES.PUBLIC, params);
    return response.data.services || [];
  },

  getByKey: async (key: string): Promise<Service> => {
    const response = await apiClient.get<Service>(API_ENDPOINTS.SERVICES.BY_KEY(key));
    return response.data;
  },

  getPrice: async (serviceKey: string): Promise<{ price: number; currency: string }> => {
    const response = await apiClient.get<{ price: number; currency: string }>(
      `${API_ENDPOINTS.SERVICES.BY_KEY(serviceKey)}/price`
    );
    return response.data;
  },
};

export const employeesApi = {
  getAll: async (): Promise<Employee[]> => {
    const response = await apiClient.get<EmployeesResponse>(API_ENDPOINTS.EMPLOYEES.LIST);
    return response.data.employees || [];
  },

  getById: async (id: number): Promise<Employee> => {
    const response = await apiClient.get<Employee>(API_ENDPOINTS.EMPLOYEES.DETAIL(id));
    return response.data;
  },

  getByService: async (serviceKey: string): Promise<Employee[]> => {
    const response = await apiClient.get<EmployeesResponse>(
      API_ENDPOINTS.EMPLOYEES.LIST,
      { service_key: serviceKey }
    );
    return response.data.employees || [];
  },

  getSchedule: async (employeeId: number, date: string): Promise<EmployeeSchedule> => {
    const response = await apiClient.get<EmployeeSchedule>(
      API_ENDPOINTS.EMPLOYEES.SCHEDULE(employeeId),
      { date }
    );
    return response.data;
  },

  getServices: async (employeeId: number): Promise<Service[]> => {
    const response = await apiClient.get<{ services: Service[] }>(
      API_ENDPOINTS.EMPLOYEES.SERVICES(employeeId)
    );
    return response.data.services || [];
  },
};
