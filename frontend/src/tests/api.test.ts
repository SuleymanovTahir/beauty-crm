/**
 * Тесты API клиента
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIClient } from '../services/api';

describe('APIClient', () => {
  let apiClient: APIClient;

  beforeEach(() => {
    apiClient = new APIClient('http://localhost:8000');
    global.fetch = vi.fn();
  });

  describe('Authentication', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        user: {
          id: 1,
          username: 'testuser',
          full_name: 'Test User',
          role: 'admin'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const formData = new FormData();
      formData.append('username', 'testuser');
      formData.append('password', 'password');

      const result = await apiClient.login(formData);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/login',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should throw error on failed login', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const formData = new FormData();
      formData.append('username', 'wronguser');
      formData.append('password', 'wrongpass');

      await expect(apiClient.login(formData)).rejects.toThrow();
    });
  });

  describe('Salon Info', () => {
    it('should fetch salon info successfully', async () => {
      const mockSalonInfo = {
        name: 'Test Salon',
        address: 'Test Address',
        phone: '+971501234567',
        email: 'test@salon.com',
        google_maps: 'https://maps.google.com/test',
        booking_url: '/public/booking'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSalonInfo,
      });

      const result = await apiClient.getSalonInfo();

      expect(result).toEqual(mockSalonInfo);
      expect(result.booking_url).toBe('/public/booking');
      expect(result.google_maps).toBeTruthy();
    });
  });

  describe('Employees', () => {
    it('should fetch employees list', async () => {
      const mockEmployees = {
        employees: [
          { id: 1, full_name: 'Simo', position: 'Hair Stylist' },
          { id: 2, full_name: 'Mestan', position: 'Hair Stylist' },
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees,
      });

      const result = await apiClient.getEmployees();

      expect(result.employees).toHaveLength(2);
      expect(result.employees[0].position).toBe('Hair Stylist');
      // Проверяем что должность не в ALL CAPS
      expect(result.employees[0].position).not.toBe('HAIR STYLIST');
    });

    it('should verify all employees have positions', async () => {
      const mockEmployees = {
        employees: [
          { id: 1, full_name: 'Simo', position: 'Hair Stylist' },
          { id: 2, full_name: 'Lyazzat', position: 'Nail Master' },
          { id: 3, full_name: 'Gulya', position: 'Nail/Waxing' },
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees,
      });

      const result = await apiClient.getEmployees();

      // Проверяем что у всех есть должности
      result.employees.forEach(emp => {
        expect(emp.position).toBeTruthy();
        expect(emp.position).not.toBe('');
        expect(emp.position).not.toBeNull();
        // Проверяем формат (не ALL CAPS)
        expect(emp.position).not.toBe(emp.position.toUpperCase());
      });

      console.log('✅ Все сотрудники имеют должности в правильном формате:');
      result.employees.forEach(emp => {
        console.log(`   ${emp.full_name}: ${emp.position}`);
      });
    });
  });

  describe('Positions', () => {
    it('should fetch positions list', async () => {
      const mockPositions = {
        positions: [
          { id: 1, name: 'Hair Stylist', name_en: 'Hair Stylist' },
          { id: 2, name: 'Nail Master', name_en: 'Nail Master' },
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPositions,
      });

      const result = await apiClient.getPositions(true);

      expect(result.positions).toHaveLength(2);
      // Проверяем формат должностей
      result.positions.forEach(pos => {
        expect(pos.name).not.toBe(pos.name.toUpperCase());
        expect(pos.name[0]).toBe(pos.name[0].toUpperCase());
      });
    });
  });

  describe('Services', () => {
    it('should fetch services list', async () => {
      const mockServices = {
        services: [
          { id: 1, name: 'Haircut', category: 'Hair', price: 150, duration: 60 },
          { id: 2, name: 'Manicure', category: 'Nails', price: 130, duration: 90 },
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockServices,
      });

      const result = await apiClient.getServices();

      expect(result.services).toHaveLength(2);
      result.services.forEach(service => {
        expect(service.price).toBeGreaterThan(0);
        expect(service.duration).toBeGreaterThan(0);
      });
    });
  });

  describe('Bookings', () => {
    it('should create booking successfully', async () => {
      const mockBooking = {
        id: 1,
        client_id: 1,
        service_id: 1,
        employee_id: 1,
        date: '2025-01-15',
        time: '14:00',
        status: 'confirmed'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBooking,
      });

      const bookingData = {
        service_id: 1,
        employee_id: 1,
        date: '2025-01-15',
        time: '14:00',
        name: 'John Doe',
        phone: '+971501234567',
      };

      const result = await apiClient.createPublicBooking(bookingData);

      expect(result.id).toBe(1);
      expect(result.status).toBe('confirmed');
    });
  });
});


describe('API Integration Tests', () => {
  it('should handle network errors gracefully', async () => {
    const apiClient = new APIClient('http://localhost:8000');

    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(apiClient.getSalonInfo()).rejects.toThrow();
  });

  it('should handle 404 errors', async () => {
    const apiClient = new APIClient('http://localhost:8000');

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(apiClient.getEmployees()).rejects.toThrow();
  });

  it('should handle 500 errors', async () => {
    const apiClient = new APIClient('http://localhost:8000');

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(apiClient.getServices()).rejects.toThrow();
  });
});
