import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';

interface TimeSlot {
  time: string;
  appointments?: {
    title: string;
    client: string;
    duration: number;
  }[];
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 30)); // 30 октября 2025

  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  
  const timeSlots: TimeSlot[] = [
    { time: '09:00' },
    { time: '09:30' },
    { time: '10:00' },
    { time: '10:30' },
    { time: '11:00' },
    { time: '11:30' },
    { time: '12:00' },
    { time: '12:30' },
    { time: '13:00' },
    { time: '13:30' },
    { time: '14:00' },
    { time: '14:30' },
    { time: '15:00' },
    { time: '15:30' },
    { time: '16:00' },
    { time: '16:30' },
    { time: '17:00' },
    { time: '17:30' },
    { time: '18:00' },
    { time: '18:30' },
    { time: '19:00' },
  ];

  // Получаем дни текущей недели
  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.getDate() === currentDate.getDate() &&
           date.getMonth() === currentDate.getMonth() &&
           date.getFullYear() === currentDate.getFullYear();
  };

  const formatMonth = (date: Date) => {
    const months = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return months[date.getMonth()];
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-900">Календарь</span>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm text-purple-600 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
            >
              Сегодня
            </button>
            <button className="px-4 py-2 text-sm text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:shadow-lg transition-all flex items-center gap-2">
              <Plus size={16} />
              Запись
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-purple-500">
            <CalendarIcon size={18} />
            <span className="text-sm">
              {currentDate.getDate()} {formatMonth(currentDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-2">
        <div className="grid grid-cols-8 gap-2">
          <div className="text-xs text-gray-500"></div>
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`
                text-center py-3 rounded-lg transition-colors
                ${isSelected(day) ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : ''}
              `}
            >
              <div className="text-xs text-gray-500 mb-1">
                {isSelected(day) ? (
                  <span className="text-white/80">{daysOfWeek[index]}</span>
                ) : (
                  daysOfWeek[index]
                )}
              </div>
              <div className={`text-sm ${isSelected(day) ? 'text-white' : 'text-gray-900'}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="space-y-2">
          {timeSlots.map((slot, index) => (
            <div
              key={index}
              className="grid grid-cols-8 gap-2 items-start"
            >
              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                <CalendarIcon size={14} className="text-gray-400" />
                {slot.time}
              </div>
              {weekDays.map((day, dayIndex) => (
                <button
                  key={dayIndex}
                  className={`
                    min-h-[60px] p-2 rounded-lg border-2 border-dashed border-gray-200
                    hover:border-purple-300 hover:bg-purple-50 transition-all
                    text-left
                    ${isSelected(day) ? 'bg-purple-50/50' : 'bg-white'}
                  `}
                >
                  <div className="text-xs text-gray-400">
                    {/* Пустой слот для записи */}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
