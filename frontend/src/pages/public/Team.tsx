import React, { useState, useEffect } from 'react';
import { Mail, Phone, Instagram, Briefcase, Award, Loader, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

interface Employee {
  id: number;
  full_name: string;
  position: string;
  experience?: string;
  photo?: string;
  bio?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  is_active: boolean;
}

export default function Team() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/employees?active_only=true');
      const data = await response.json();

      setEmployees(data.employees || []);
    } catch (err: any) {
      console.error('Error loading employees:', err);
      setError(err.message || 'Ошибка загрузки сотрудников');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">Загрузка команды...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">Ошибка загрузки</p>
          </div>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Наша <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">Команда</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Познакомьтесь с профессионалами, которые сделают вас красивыми
          </p>
        </div>

        {/* Employee Cards Grid */}
        {employees.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Сотрудники скоро появятся</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
              >
                {/* Photo */}
                <div className="relative h-80 bg-gradient-to-br from-pink-400 to-purple-500">
                  {employee.photo ? (
                    <img
                      src={employee.photo}
                      alt={employee.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-40 h-40 rounded-full bg-white/20 flex items-center justify-center text-white text-6xl font-bold">
                        {employee.full_name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}

                  {/* Position Badge */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2 text-pink-600">
                        <Briefcase className="w-4 h-4" />
                        <span className="font-semibold text-sm uppercase">
                          {employee.position}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {employee.full_name}
                  </h3>

                  {employee.experience && (
                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <Award className="w-4 h-4" />
                      <span className="text-sm">Опыт: {employee.experience}</span>
                    </div>
                  )}

                  {employee.bio && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {employee.bio}
                    </p>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-2 pt-4 border-t border-gray-100">
                    {employee.phone && (
                      <a
                        href={`tel:${employee.phone}`}
                        className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{employee.phone}</span>
                      </a>
                    )}

                    {employee.email && (
                      <a
                        href={`mailto:${employee.email}`}
                        className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{employee.email}</span>
                      </a>
                    )}

                    {employee.instagram && (
                      <a
                        href={`https://instagram.com/${employee.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors"
                      >
                        <Instagram className="w-4 h-4" />
                        <span className="text-sm">{employee.instagram}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
