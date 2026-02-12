import { useState } from 'react';
import { Home, Filter, Calendar, MessageSquare, MoreHorizontal, X, ChevronDown, ChevronRight, LayoutDashboard, Users, ShoppingBag, TrendingUp, Wallet, Wrench, Plug, Settings, Bell, LogOut, Instagram, Phone, MessagesSquare, Sparkles, Box, BarChart3, UserCircle, FileText, HandshakeIcon, ListTodo, Mail, PhoneCall, CreditCard, Store, UserCog, Globe, Bot, History, Trash2 } from 'lucide-react';

interface MenuItem {
  label: string;
  icon?: any;
  items?: { label: string; icon?: any }[];
}

export function FinalVariant() {
  const [showMore, setShowMore] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [currentLanguage, setCurrentLanguage] = useState('🇷🇺 Русский');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [unreadMessages] = useState(12);
  const [unreadNotifications] = useState(3);

  const mainTabs = [
    { icon: Home, label: 'Главная' },
    { icon: Filter, label: 'Воронка' },
    { icon: Calendar, label: 'Записи' },
    { icon: MessageSquare, label: 'Чат' },
    { icon: MoreHorizontal, label: 'Ещё' },
  ];

  const moreMenuItems: MenuItem[] = [
    { label: 'Дашборд', icon: LayoutDashboard },
    { label: 'Клиенты', icon: Users },
    { 
      label: 'Чат', 
      icon: MessageSquare,
      items: [
        { label: 'Instagram', icon: Instagram },
        { label: 'WhatsApp', icon: Phone },
        { label: 'Внутренняя связь', icon: MessagesSquare },
      ]
    },
    { 
      label: 'Каталог', 
      icon: ShoppingBag,
      items: [
        { label: 'Услуги', icon: Sparkles },
        { label: 'Товары', icon: Box },
      ]
    },
    { 
      label: 'Аналитика', 
      icon: TrendingUp,
      items: [
        { label: 'Аналитика', icon: BarChart3 },
        { label: 'Посетители', icon: UserCircle },
      ]
    },
    { 
      label: 'Финансы', 
      icon: Wallet,
      items: [
        { label: 'Счета', icon: FileText },
        { label: 'Договоры', icon: HandshakeIcon },
      ]
    },
    { 
      label: 'Инструменты', 
      icon: Wrench,
      items: [
        { label: 'Задачи', icon: ListTodo },
        { label: 'Рассылки', icon: Mail },
        { label: 'Телефония', icon: PhoneCall },
      ]
    },
    { 
      label: 'Интеграции', 
      icon: Plug,
      items: [
        { label: 'Мессенджеры', icon: MessagesSquare },
        { label: 'Платежные системы', icon: CreditCard },
        { label: 'Маркетплейсы', icon: Store },
      ]
    },
    { 
      label: 'Настройки', 
      icon: Settings,
      items: [
        { label: 'Настройки', icon: Settings },
        { label: 'Пользователи', icon: UserCog },
        { label: 'Публичный контент', icon: Globe },
        { label: 'Настройки бота', icon: Bot },
        { label: 'Логи аудита', icon: History },
        { label: 'Корзина', icon: Trash2 },
      ]
    },
    { label: 'Уведомления', icon: Bell },
  ];

  const languages = [
    { code: '🇷🇺', name: 'Русский' },
    { code: '🇬🇧', name: 'English' },
    { code: '🇺🇿', name: 'O\'zbek' },
    { code: '🇹🇷', name: 'Türkçe' },
    { code: '🇩🇪', name: 'Deutsch' },
    { code: '🇫🇷', name: 'Français' },
    { code: '🇪🇸', name: 'Español' },
    { code: '🇨🇳', name: '中文' },
    { code: '🇦🇪', name: 'العربية' },
  ];

  const chatTypes = [
    { label: 'Instagram', icon: Instagram, unread: 5 },
    { label: 'WhatsApp', icon: Phone, unread: 7 },
    { label: 'Внутренняя связь', icon: MessagesSquare, unread: 0 },
  ];

  const toggleGroup = (label: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className="relative h-full flex flex-col bg-white">
      {/* Основной контент */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl mb-2">Мобильное приложение</h1>
          <p className="text-gray-600 mb-6">CRM система для управления бизнесом</p>
          
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">💬 Чат:</span> Нажмите на кнопку "Чат" внизу для выбора мессенджера<br />
              <span className="font-semibold">☰ Ещё:</span> Откройте меню для доступа ко всем функциям<br />
              <span className="font-semibold">🔔 Уведомления:</span> Красные бейджи показывают непрочитанные
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">Непрочитанные</div>
              <div className="text-2xl font-bold text-blue-600">{unreadMessages}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">Уведомления</div>
              <div className="text-2xl font-bold text-orange-600">{unreadNotifications}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно "Ещё" */}
      {showMore && (
        <div className="absolute inset-0 bg-black/50 z-20 flex items-end animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-3xl max-h-[85%] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <h2 className="font-semibold text-lg">Все разделы</h2>
              <button onClick={() => setShowMore(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                {moreMenuItems.map((item, index) => (
                  <div key={index}>
                    {item.items ? (
                      // Группа с подпунктами
                      <div className="mb-1">
                        <button
                          onClick={() => toggleGroup(item.label)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg text-left"
                        >
                          <div className="flex items-center gap-3">
                            {item.icon && <item.icon className="w-5 h-5 text-gray-700" />}
                            <span className="text-gray-700 font-medium">{item.label}</span>
                          </div>
                          {expandedGroups.has(item.label) ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        
                        {/* Подпункты */}
                        {expandedGroups.has(item.label) && (
                          <div className="ml-6 mt-1 space-y-1">
                            {item.items.map((subItem, subIndex) => (
                              <button
                                key={subIndex}
                                onClick={() => setShowMore(false)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-600 text-sm flex items-center gap-3"
                              >
                                {subItem.icon && <subItem.icon className="w-4 h-4 text-gray-500" />}
                                {subItem.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Обычный пункт меню
                      <button
                        onClick={() => setShowMore(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg text-left mb-1"
                      >
                        {item.icon && <item.icon className="w-5 h-5 text-gray-700" />}
                        <span className="text-gray-700">{item.label}</span>
                      </button>
                    )}
                  </div>
                ))}

                {/* Профиль пользователя */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {/* Смена языка - выпадающий список */}
                  <div className="px-4 mb-3">
                    <div className="text-xs text-gray-500 mb-2">Язык / Language</div>
                    <div className="relative">
                      <button
                        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                        className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-between transition-colors"
                      >
                        <span className="text-sm">{currentLanguage}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showLanguageMenu && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                          {languages.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                setCurrentLanguage(`${lang.code} ${lang.name}`);
                                setShowLanguageMenu(false);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm"
                            >
                              {lang.code} {lang.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowMore(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      T
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-700">Tahir</div>
                      <div className="text-sm text-gray-500">@admin</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setShowMore(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-lg text-red-500 mt-2 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Выйти</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно выбора типа чата */}
      {showChatMenu && (
        <div className="absolute inset-0 bg-black/50 z-20 flex items-end animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-lg">Выберите чат</h2>
              <button onClick={() => setShowChatMenu(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3">
              {chatTypes.map((chat, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setShowChatMenu(false);
                    setActiveTab(3);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 rounded-xl mb-2 transition-colors relative"
                >
                  <chat.icon className="w-6 h-6 text-gray-700" />
                  <span className="text-gray-700 font-medium">{chat.label}</span>
                  {chat.unread > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                      {chat.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Нижняя навигация */}
      <div className="border-t border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {mainTabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => {
                if (index === 4) {
                  setShowMore(true);
                } else if (index === 3) {
                  setShowChatMenu(true);
                } else {
                  setActiveTab(index);
                }
              }}
              className={`flex-1 flex flex-col items-center gap-1 py-3 relative transition-all ${
                activeTab === index && index !== 4 && index !== 3 ? 'text-blue-500 scale-105' : 'text-gray-600'
              }`}
            >
              <div className="relative">
                <tab.icon className="w-6 h-6" />
                {/* Badge для чата */}
                {index === 3 && unreadMessages > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
                {/* Badge для меню "Ещё" (уведомления) */}
                {index === 4 && unreadNotifications > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadNotifications}
                  </span>
                )}
              </div>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
