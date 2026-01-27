from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import HTMLResponse
from db.connection import get_db_connection
from utils.utils import require_auth

router = APIRouter(tags=["Database Explorer"], prefix="/api/database")

def check_director_access(user: dict = Depends(require_auth)):
    if not user or user.get("role") != "director":
        raise HTTPException(status_code=403, detail="Доступ запрещен. Только для директоров.")
    return user

@router.get("/", response_class=HTMLResponse)
async def get_explorer_ui(user: dict = Depends(check_director_access)):
    html_content = """
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Управление Базой Данных | CRM</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <style>
            :root { --bg: #020617; --sidebar: #0f172a; --accent: #3b82f6; --card: #1e293b; --text: #f1f5f9; }
            body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); height: 100vh; overflow: hidden; margin: 0; }
            
            /* Разрешаем выделение текста */
            * { user-select: text !important; -webkit-user-select: text !important; }
            ::selection { background: #3b82f6; color: white; }
            
            .sidebar { width: 360px; background: var(--sidebar); border-right: 1px solid rgba(255,255,255,0.05); }
            
            .category-title { 
                font-size: 11px; font-weight: 800; text-transform: uppercase; 
                letter-spacing: 0.12em; color: var(--accent); opacity: 0.9;
                padding: 20px 20px 10px 20px;
            }
            
            .usage-text { color: #cbd5e1; font-weight: 700; font-size: 10px; }
            .tech-name-text { color: #64748b; font-size: 8px; }
            
            .table-item { 
                transition: all 0.2s; border-left: 3px solid transparent; 
                margin: 2px 14px; border-radius: 10px;
                color: #e2e8f0; 
            }
            .table-item.active { 
                background: linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, transparent 100%); 
                border-left-color: var(--accent); color: white; 
            }
            .table-item:hover:not(.active) { background: rgba(255,255,255,0.07); color: white; }
            
            th { 
                background: #1e293b !important; position: sticky; top: 0; z-index: 10; 
                font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; 
                padding: 16px 16px !important; border-bottom: 2px solid rgba(0,0,0,0.3); 
                color: #ffffff;
            }
            
            td { 
                padding: 12px 16px !important; border-bottom: 1px solid rgba(255,255,255,0.06); 
                font-size: 13px; max-width: 400px; word-break: break-word; vertical-align: middle;
            }
            
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.25); border-radius: 10px; }
            
            .loader { border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid var(--accent); border-radius: 50%; width: 32px; height: 32px; animation: spin 0.8s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            
            .modal-backdrop { background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); display: none; position: fixed; inset: 0; z-index: 100; align-items: center; justify-content: center; }
            .mono { font-family: 'JetBrains Mono', monospace; }

            .table-container { 
                background: #0f172a; 
                border: 1px solid rgba(255,255,255,0.12); 
                box-shadow: 0 15px 40px -10px rgba(0,0,0,0.6);
            }
        </style>
    </head>
    <body class="flex">
        <!-- Sidebar -->
        <aside class="sidebar flex flex-col">
            <div class="p-6 border-b border-white/10 flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
                    <i data-lucide="database" class="text-white w-6 h-6"></i>
                </div>
                <div>
                    <h1 class="font-black text-base leading-tight tracking-tight">Database Pro</h1>
                    <p class="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-0.5">Эволюция v8.2</p>
                </div>
            </div>
            
            <div class="p-5 border-b border-white/10 shadow-lg">
                <div class="relative">
                    <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"></i>
                    <input type="text" id="table-search" placeholder="Поиск по всем таблицам..." 
                        class="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-5 text-sm outline-none focus:border-blue-500 transition-all text-white placeholder:text-white/20 select-text">
                </div>
            </div>
            
            <div class="flex-1 overflow-y-auto pb-10" id="tables-list">
                <div class="flex justify-center p-20"><div class="loader"></div></div>
            </div>
            
            <div class="p-5 border-t border-white/10 text-[10px] text-white/50 flex justify-between font-black uppercase tracking-widest bg-black/20">
                <span>Ядро Beauty CRM</span>
                <span class="text-emerald-500 flex items-center gap-1.5"><div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Authorized</span>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col overflow-hidden bg-[#020617]">
            <header class="h-20 flex items-center justify-between px-10 border-b border-white/10 bg-[#0f172a]/40 backdrop-blur-md">
                <div class="flex items-center gap-5">
                    <div id="table-head-info" class="hidden flex items-center gap-4">
                        <div class="p-3 bg-blue-500/15 rounded-2xl border border-blue-500/20">
                            <i id="table-main-icon" data-lucide="table" class="text-blue-500 w-6 h-6"></i>
                        </div>
                        <div>
                            <h2 id="title-pretty" class="text-lg font-black text-white leading-none"></h2>
                            <p id="title-tech" class="text-[10px] text-blue-400 font-black mono uppercase tracking-widest mt-1.5"></p>
                        </div>
                    </div>
                </div>
                
                <div class="flex items-center gap-4">
                    <button id="add-btn" onclick="openCreateModal()" class="hidden bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2.5 transition-all shadow-xl shadow-blue-600/30 active:scale-95">
                        <i data-lucide="plus-square" class="w-4 h-4"></i> Добавить запись
                    </button>
                    <button onclick="refreshData()" class="p-3 hover:bg-white/10 rounded-xl text-white/50 transition-colors"><i data-lucide="refresh-cw" class="w-5 h-5"></i></button>
                </div>
            </header>

            <div class="px-10 py-3 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div class="flex items-center gap-6">
                    <div class="relative">
                        <i data-lucide="filter" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30"></i>
                        <input type="text" id="rows-filter" placeholder="Быстрый фильтр..." class="bg-transparent border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs w-72 focus:border-blue-500 outline-none text-white transition-all">
                    </div>
                    <span id="rows-total" class="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none border-l border-white/10 pl-6"></span>
                </div>
                
                <div class="flex items-center gap-4">
                    <button onclick="changePage(-1)" class="p-2 hover:bg-white/10 rounded-lg text-white/50"><i data-lucide="chevron-left" class="w-5 h-5"></i></button>
                    <div class="bg-blue-600/10 border border-blue-500/20 px-4 py-1 rounded-full">
                        <span class="text-[11px] font-black text-blue-400 uppercase tracking-widest">Страница <span id="page-cur">1</span></span>
                    </div>
                    <button onclick="changePage(1)" class="p-2 hover:bg-white/10 rounded-lg text-white/50"><i data-lucide="chevron-right" class="w-5 h-5"></i></button>
                </div>
            </div>

            <div class="flex-1 overflow-hidden p-8">
                <div class="h-full table-container rounded-2xl overflow-hidden flex flex-col">
                    <div class="flex-1 overflow-auto" id="data-area">
                        <div id="empty-view" class="h-full flex flex-col items-center justify-center text-white/10 italic">
                            <i data-lucide="layout-dashboard" class="w-20 h-20 mb-6 opacity-5"></i>
                            <span class="text-sm uppercase tracking-widest font-black">Выберите таблицу для инспекции данных</span>
                        </div>
                        
                        <table id="db-table" class="w-full text-left hidden border-collapse min-w-full">
                            <thead><tr id="tbl-head"></tr></thead>
                            <tbody id="tbl-body" class="text-slate-100 font-medium select-text"></tbody>
                        </table>
                        
                        <div id="loader" class="hidden h-full flex items-center justify-center">
                            <div class="loader"></div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Modal -->
        <div id="modal" class="modal-backdrop">
            <div class="bg-slate-900 border border-white/15 rounded-3xl w-[620px] max-h-[90vh] flex flex-col shadow-2xl scale-95 transition-all text-white overflow-hidden" id="modal-container">
                <div class="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 id="m-title" class="font-black text-sm uppercase tracking-widest text-blue-400">Форма записи</h3>
                    <button onclick="closeModal()" class="text-white/30 hover:text-white transition-colors"><i data-lucide="x-circle" class="w-6 h-6"></i></button>
                </div>
                <div class="flex-1 overflow-y-auto p-8 space-y-6" id="m-fields"></div>
                <div class="p-6 border-t border-white/10 flex justify-end gap-4 bg-black/40">
                    <button onclick="closeModal()" class="text-xs font-black text-white/50 hover:text-white uppercase transition-colors px-6 py-3">Отмена</button>
                    <button onclick="sendForm()" class="bg-blue-600 text-white px-10 py-3 rounded-2xl text-xs font-black hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/40 active:scale-95">Сохранить</button>
                </div>
            </div>
        </div>

        <script>
            let db = {
                tables: [], current: null, columns: [], rows: [], page: 1, pk: null, mode: null
            };

            const categories = [
                { id: 'bookings', title: 'Записи и Календарь', icon: 'calendar-days' },
                { id: 'clients', title: 'Клиентская база', icon: 'users' },
                { id: 'staff', title: 'Персонал и Доступы', icon: 'user-cog' },
                { id: 'marketing', title: 'Маркетинг и Челленджи', icon: 'zap' },
                { id: 'content', title: 'Контент и Сайт', icon: 'layout' },
                { id: 'finance', title: 'Финансы и Документы', icon: 'banknote' },
                { id: 'system', title: 'Система и Аналитика', icon: 'database' }
            ];

            const tableConfigs = {
                'bookings': { cat: 'bookings', title: 'Журнал записей', usage: '[CRM / Account] Календарь', icon: 'calendar' },
                'booking_statuses': { cat: 'bookings', title: 'Статусы визитов', usage: '[CRM] Настройки', icon: 'check-circle' },
                'booking_drafts': { cat: 'bookings', title: 'Черновики записей', usage: '[Online] Временный резерв времени', icon: 'clock' },
                'booking_temp': { cat: 'bookings', title: 'Временные брони', usage: '[Public] Процесс записи', icon: 'timer' },
                'schedule_breaks': { cat: 'bookings', title: 'Перерывы в графике', usage: '[CRM] Расписание', icon: 'coffee' },
                'booking_reminder_settings': { cat: 'system', title: 'Настройки напоминаний', usage: '[CRM] Автоматизация', icon: 'clock' },
                'booking_reminders_sent': { cat: 'system', title: 'История уведомлений', usage: '[Admin] Логи связи', icon: 'send' },
                'clients': { cat: 'clients', title: 'Все клиенты', usage: '[CRM] База данных', icon: 'contact' },
                'client_statuses': { cat: 'clients', title: 'Группы клиентов', usage: '[CRM] Сегментация', icon: 'tags' },
                'client_notes': { cat: 'clients', title: 'Заметки о клиентах', usage: '[CRM] Карточка клиента', icon: 'sticky-note' },
                'client_loyalty_points': { cat: 'clients', title: 'Баллы лояльности', usage: '[Account] Бонусы', icon: 'coins' },
                'client_achievements': { cat: 'clients', title: 'Достижения', usage: '[Account] Геймификация', icon: 'gem' },
                'client_preferences': { cat: 'clients', title: 'Предпочтения', usage: '[Account] Профиль', icon: 'fingerprint' },
                'users': { cat: 'staff', title: 'Аккаунты доступа', usage: '[Admin] Учетки', icon: 'lock' },
                'employees': { cat: 'staff', title: 'Профили мастеров', usage: '[CRM] Команда', icon: 'award' },
                'user_schedule': { cat: 'staff', title: 'Графики работы', usage: '[CRM] Расписание', icon: 'clock' },
                'user_services': { cat: 'staff', title: 'Услуги мастеров', usage: '[CRM] Связи', icon: 'link' },
                'positions': { cat: 'staff', title: 'Должности', usage: '[Admin] Штат', icon: 'briefcase' },
                'permissions': { cat: 'staff', title: 'Разрешения', usage: '[Admin] Роли', icon: 'key' },
                'active_challenges': { cat: 'marketing', title: 'Активные челленджи', usage: '[CRM] Маркетинг', icon: 'trophy' },
                'challenge_progress': { cat: 'marketing', title: 'Прогресс акций', usage: '[CRM / Account] Статистика', icon: 'trending-up' },
                'newsletter_subscribers': { cat: 'marketing', title: 'Подписчики рассылки', usage: '[CRM] Email база', icon: 'at-sign' },
                'broadcast_history': { cat: 'marketing', title: 'История рассылок', usage: '[Admin] Кампании', icon: 'messages-square' },
                'loyalty_tiers': { cat: 'marketing', title: 'Уровни программы', usage: '[CRM] Настройка лояльности', icon: 'crown' },
                'services': { cat: 'content', title: 'Прейскурант услуг', usage: '[CRM] Каталог', icon: 'sparkles' },
                'media_library': { cat: 'content', title: 'Галерея и Медиа', usage: '[Public/CRM] Медиатека', icon: 'images' },
                'public_faq': { cat: 'content', title: 'Вопросы и ответы', usage: '[Public] FAQ', icon: 'help-circle' },
                'public_reviews': { cat: 'content', title: 'Отзывы клиентов', usage: '[Public] Сайт', icon: 'star-half' },
                'public_banners': { cat: 'content', title: 'Рекламные баннеры', usage: '[Public] Главная', icon: 'presentation' },
                'invoices': { cat: 'finance', title: 'Счета на оплату', usage: '[CRM] Финансы', icon: 'receipt' },
                'currencies': { cat: 'finance', title: 'Валюты', usage: '[Admin] Деньги', icon: 'dollar-sign' },
                'contracts': { cat: 'finance', title: 'Договоры', usage: '[Admin] Юр. доки', icon: 'file-signature' },
                'payroll_payments': { cat: 'finance', title: 'Выплаты мастерам', usage: '[CRM] Касса', icon: 'wallet' },
                'visitor_tracking': { cat: 'system', title: 'Аналитика трафика', usage: '[Admin] Аналитика', icon: 'bar-chart' },
                'activity_log': { cat: 'system', title: 'Лог действий', usage: '[Admin] Аудит работы', icon: 'list' },
                'audit_log': { cat: 'system', title: 'Аудит безопасности', usage: '[Admin] Охрана', icon: 'shield' },
                'bot_settings': { cat: 'system', title: 'Настройки бота', usage: '[Бот] Конфиг', icon: 'bot' },
                'salon_settings': { cat: 'system', title: 'Настройки салона', usage: '[Admin] Глобал', icon: 'settings' },
                'deleted_items': { cat: 'system', title: 'Корзина объектов', usage: '[Admin] Корзина', icon: 'trash-2' },
                'client_beauty_metrics': { cat: 'system', title: 'Метрики красоты', usage: '[CRM] Карта клиента', icon: 'scissors' },
                'client_checkpoint_progress': { cat: 'system', title: 'Точки прогресса', usage: '[CRM] Лояльность', icon: 'map-pin' },
                'client_email_verifications': { cat: 'system', title: 'Верификации почты', usage: '[Account] Регистрация', icon: 'mail' },
                'client_favorite_masters': { cat: 'system', title: 'Любимые мастера', usage: '[Account] Мое', icon: 'star' },
                'client_gallery': { cat: 'system', title: 'Галерея клиента', usage: '[CRM / Account] Работы', icon: 'image' },
                'client_notifications': { cat: 'system', title: 'Уведомления клиента', usage: '[Account] События', icon: 'bell' },
                'client_interaction_patterns': { cat: 'system', title: 'Паттерны поведения', usage: '[Бот / AI] Аналитика', icon: 'brain' },
                'client_interactions': { cat: 'system', title: 'Взаимодействия', usage: '[CRM / Бот] События', icon: 'handshake' },
                'client_referral_usage': { cat: 'system', title: 'Использование бонусов', usage: '[CRM] Рефералка', icon: 'gift' },
                'client_referrals': { cat: 'system', title: 'Реферальные связи', usage: '[CRM] Маркетинг', icon: 'user-plus' },
                'user_status': { cat: 'system', title: 'Статусы мастеров', usage: '[CRM] Онлайн/Оффлайн', icon: 'signal' },
                'user_subscriptions': { cat: 'staff', title: 'Подписки персонала', usage: '[CRM] Уведомления', icon: 'bell-ring' },
                'user_time_off': { cat: 'staff', title: 'Отпуска и отгулы', usage: '[CRM] График', icon: 'plane' },
                'user_permissions': { cat: 'staff', title: 'Индивидуальные права', usage: '[Admin] Доступы', icon: 'user-check' },
                'loyalty_levels': { cat: 'marketing', title: 'Ступени лояльности', usage: '[CRM] Маркетинг', icon: 'layers' },
                'loyalty_category_rules': { cat: 'marketing', title: 'Правила категорий', usage: '[Admin] Финансы', icon: 'book-open' },
                'loyalty_transactions': { cat: 'marketing', title: 'Транзакции баллов', usage: '[CRM / Account] История', icon: 'history' },
                'referral_campaigns': { cat: 'marketing', title: 'Реф. кампании', usage: '[Admin / CRM]', icon: 'megaphone' },
                'referral_campaign_users': { cat: 'marketing', title: 'Участники кампаний', usage: '[CRM]', icon: 'users-2' },
                'broadcast_subscription_types': { cat: 'marketing', title: 'Типы рассылок', usage: '[System] Настройки', icon: 'settings' },
                'gallery_photos': { cat: 'content', title: 'Фото работ', usage: '[CRM] Медиатека', icon: 'camera' },
                'public_gallery': { cat: 'content', title: 'Общая галерея', usage: '[Public] Показ', icon: 'layout' },
                'menu_settings': { cat: 'content', title: 'Настройки меню', usage: '[Public] Навигация', icon: 'menu' },
                'invoice_stages': { cat: 'finance', title: 'Этапы счетов', usage: '[CRM] Финансы', icon: 'list-ordered' },
                'invoice_payments': { cat: 'finance', title: 'Платежи по счетам', usage: '[CRM] Транзакции', icon: 'credit-card' },
                'payment_providers': { cat: 'finance', title: 'Платежные шлюзы', usage: '[Admin] Эквайринг', icon: 'landmark' },
                'payment_transactions': { cat: 'finance', title: 'Все транзакции', usage: '[Admin] Логи оплат', icon: 'scroll-text' },
                'bot_analytics': { cat: 'system', title: 'Статистика бота', usage: '[Бот] Аналитика AI', icon: 'pie-chart' },
                'conversations': { cat: 'system', title: 'Диалоги (Бот)', usage: '[Бот] История чатов', icon: 'messages-square' },
                'chat_history': { cat: 'system', title: 'История сообщений', usage: '[Бот / CRM] Чаты', icon: 'message-square' },
                'conversation_context': { cat: 'system', title: 'Контекст диалогов', usage: '[Бот] Память AI', icon: 'brain-circuit' },
                'messenger_messages': { cat: 'system', title: 'Системные месседжи', usage: '[Бот] Шаблоны', icon: 'sticky-note' },
                'messenger_settings': { cat: 'system', title: 'Настройки API', usage: '[Admin] Связь', icon: 'share-2' },
                'sessions': { cat: 'system', title: 'Сессии входа', usage: '[Admin] Безопасность', icon: 'key' },
                'tasks': { cat: 'system', title: 'Задачи CRM', usage: '[CRM] Задачи', icon: 'clipboard-list' },
                'task_stages': { cat: 'system', title: 'Этапы задач', usage: '[CRM] Канбан', icon: 'layout-list' },
                'task_assignees': { cat: 'system', title: 'Исполнители', usage: '[CRM] Ответственные', icon: 'user-plus' },
                'critical_actions': { cat: 'system', title: 'Критичные действия', usage: '[Admin] Охрана', icon: 'alert-triangle' },
                'registration_audit': { cat: 'system', title: 'Лог регистраций', usage: '[Admin] Аудит', icon: 'user-plus' },
                'role_permissions': { cat: 'staff', title: 'Права ролей', usage: '[Admin] Доступы', icon: 'shield-check' },
                'contract_delivery_log': { cat: 'finance', title: 'Лог доставки договоров', usage: '[Admin] Финансы', icon: 'mail-check' },
                'contract_stages': { cat: 'finance', title: 'Этапы договоров', usage: '[Admin] Юр. блок', icon: 'list-checks' },
                'contract_types': { cat: 'finance', title: 'Типы договоров', usage: '[System] Шаблоны', icon: 'file-text' },
                'cookie_consents': { cat: 'system', title: 'Согласия Cookie', usage: '[Public] Безопасность', icon: 'cookie' },
                'custom_roles': { cat: 'staff', title: 'Пользовательские роли', usage: '[Admin] Роли', icon: 'user-cog' },
                'custom_statuses': { cat: 'bookings', title: 'Спец. статусы', usage: '[CRM] Настройки', icon: 'palette' },
                'director_approvals': { cat: 'finance', title: 'Одобрения директора', usage: '[Admin] Финансы', icon: 'check-square' },
                'funnel_checkpoints': { cat: 'marketing', title: 'Чекпоинты воронки', usage: '[CRM] Маркетинг', icon: 'map-pin' },
                'internal_chat': { cat: 'staff', title: 'Внутренний чат', usage: '[CRM] Команда', icon: 'message-square' },
                'marketplace_providers': { cat: 'marketing', title: 'Провайдеры маркетплейсов', usage: '[Admin] Интеграции', icon: 'shopping-bag' },
                'marketplace_bookings': { cat: 'bookings', title: 'Записи с маркетплейсов', usage: '[CRM] Интеграции', icon: 'external-link' },
                'marketplace_reviews': { cat: 'content', title: 'Отзывы маркетплейсов', usage: '[Public] Сайт', icon: 'star' },
                'message_templates': { cat: 'system', title: 'Шаблоны сообщений', usage: '[System] Бот', icon: 'file-type-2' },
                'notification_history': { cat: 'system', title: 'История уведомлений', usage: '[Admin] Логи', icon: 'history' },
                'notification_settings': { cat: 'system', title: 'Настройки оповещений', usage: '[Admin] Конфиг', icon: 'bell-ring' },
                'notification_templates': { cat: 'system', title: 'Шаблоны оповещений', usage: '[Admin] Конфиг', icon: 'layout-template' },
                'notifications': { cat: 'system', title: 'Все уведомления', usage: '[System] Очередь', icon: 'bell' },
                'pipeline_stages': { cat: 'marketing', title: 'Этапы воронки', usage: '[CRM] Продажи', icon: 'git-merge' },
                'plan_metrics': { cat: 'marketing', title: 'Метрики планов', usage: '[Admin] Аналитика', icon: 'line-chart' },
                'plans': { cat: 'marketing', title: 'Планы продаж', usage: '[Admin] Аналитика', icon: 'target' },
                'product_movements': { cat: 'finance', title: 'Движение товаров', usage: '[CRM] Склад', icon: 'arrow-left-right' },
                'products': { cat: 'finance', title: 'Товарный склад', usage: '[CRM] Склад', icon: 'package' },
                'ratings': { cat: 'content', title: 'Оценки и отзывы', usage: '[Public] Сайт', icon: 'star-off' },
                'recording_folders': { cat: 'system', title: 'Папки записей', usage: '[Admin] Медиа', icon: 'folder-open' },
                'service_positions': { cat: 'staff', title: 'Позиции услуг', usage: '[Admin] Настройки', icon: 'layers' },
                'settings': { cat: 'system', title: 'Системные настройки', usage: '[Admin] Глобал', icon: 'settings-2' },
                'special_packages': { cat: 'marketing', title: 'Спец. предложения', usage: '[CRM] Маркетинг', icon: 'gift' },
                'invoice_stage_log': { cat: 'finance', title: 'Лог этапов счетов', usage: '[Admin] Аналитика', icon: 'history' },
                'invoice_transaction_log': { cat: 'finance', title: 'Лог транзакций счетов', usage: '[Admin] Аналитика', icon: 'activity' },
                'workflow_stages': { cat: 'system', title: 'Стадии процессов', usage: '[Admin] Настройки', icon: 'route' }
            };

            function updateIcons() { if (window.lucide) window.lucide.createIcons(); }

            async function init() {
                try {
                    const res = await fetch('/api/database/tables');
                    db.tables = await res.json();
                    renderSidebar();
                } catch (e) { console.error('Init Error:', e); }
            }

            function renderSidebar(f = "") {
                const list = document.getElementById('tables-list');
                list.innerHTML = '';
                const search = f.toLowerCase();
                const filteredTables = db.tables.filter(t => t.tech_name.toLowerCase().includes(search) || (tableConfigs[t.tech_name]?.title || "").toLowerCase().includes(search));

                categories.forEach(cat => {
                    const catTables = filteredTables.filter(t => (tableConfigs[t.tech_name]?.cat || 'system') === cat.id);
                    if (catTables.length > 0 || search === "") {
                        const catHeader = document.createElement('div');
                        catHeader.className = 'category-title flex items-center gap-2';
                        catHeader.innerHTML = `<i data-lucide="${cat.icon}" class="w-3.5 h-3.5"></i> ${cat.title}`;
                        list.appendChild(catHeader);

                        catTables.forEach(t => {
                            const cfg = tableConfigs[t.tech_name] || { title: t.tech_name, usage: '[System] Внутренняя', icon: 'database' };
                            const active = db.current === t.tech_name;
                            const item = document.createElement('div');
                            item.className = `table-item p-3 px-5 flex items-center justify-between cursor-pointer ${active ? 'active shadow-lg' : ''}`;
                            item.innerHTML = `
                                <div class="flex items-center gap-4 min-w-0">
                                    <i data-lucide="${cfg.icon}" class="w-5 h-5 ${active ? 'text-blue-400' : 'opacity-30' }"></i>
                                    <div class="flex flex-col truncate">
                                        <span class="text-[13px] font-black leading-tight">${cfg.title}</span>
                                        <div class="flex items-center gap-1.5 mt-1">
                                            <span class="text-[10px] usage-text uppercase tracking-widest">${cfg.usage}</span>
                                        </div>
                                        <span class="text-[8px] tech-name-text font-mono lowercase mt-1 opacity-40">DB: ${t.tech_name}</span>
                                    </div>
                                </div>
                                <span class="text-[11px] font-black tabular-nums opacity-40">${t.rows}</span>
                            `;
                            item.onclick = () => loadTable(t.tech_name, cfg.title, cfg.icon, cfg.usage);
                            list.appendChild(item);
                        });
                    }
                });
                setTimeout(updateIcons, 50);
            }

            async function loadTable(tech, pretty, icon, usage) {
                db.current = tech; db.page = 1;
                document.getElementById('empty-view').classList.add('hidden');
                document.getElementById('table-head-info').classList.remove('hidden');
                document.getElementById('add-btn').classList.remove('hidden');
                document.getElementById('title-pretty').innerText = pretty;
                document.getElementById('title-tech').innerText = tech + ' • ' + usage;
                document.getElementById('table-main-icon').setAttribute('data-lucide', icon);
                renderSidebar(document.getElementById('table-search').value);
                await fetchData();
            }

            async function fetchData() {
                const area = document.getElementById('db-table');
                const loader = document.getElementById('loader');
                area.classList.add('hidden'); loader.classList.remove('hidden');
                try {
                const r = await fetch(`/api/database/data/${db.current}?page=${db.page}`);
                const data = await r.json();
                db.columns = data.columns; db.rows = data.data; db.pk = data.primary_key;
                document.getElementById('rows-total').innerText = `${data.total} РЯДОВ В БАЗЕ`;
                document.getElementById('page-cur').innerText = db.page;
                renderTable();
                loader.classList.add('hidden'); area.classList.remove('hidden');
                } catch (e) { alert('Ошибка загрузки данных'); }
                setTimeout(updateIcons, 50);
            }

            function renderTable(f = "") {
                const head = document.getElementById('tbl-head');
                const body = document.getElementById('tbl-body');
                let h = db.columns.map(c => `<th class="cursor-pointer hover:bg-slate-700 transition-colors" onclick="sortData('${c}')">
                    <div class="flex items-center justify-start gap-2"><span>${c}</span><i data-lucide="arrow-down-up" class="w-3 h-3 opacity-20"></i></div>
                </th>`).join('');
                h += '<th class="w-24 text-center sticky right-0 bg-slate-800 z-30 shadow-[-15px_0_30px_rgba(0,0,0,0.6)] border-l border-white/10 uppercase font-black text-[11px]">Действие</th>';
                head.innerHTML = h;
                body.innerHTML = '';
                const displayRows = db.rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(f.toLowerCase())));
                displayRows.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-blue-600/[0.12] border-b border-white/[0.08] group";
                    let dataCells = db.columns.map(col => {
                        let v = row[col];
                        if (v === null) return '<td class="text-white/10 italic font-light italic text-center">null</td>';
                        if (typeof v === 'boolean') return `<td class="text-center"><span class="${v ? 'text-emerald-400 bg-emerald-400/20' : 'text-rose-400 bg-rose-400/20'} px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter">${v}</span></td>`;
                        return `<td class="text-slate-200 group-hover:text-white select-text">${String(v)}</td>`;
                    }).join('');
                    let actions = `
                        <td class="sticky right-0 bg-[#0f172a]/95 backdrop-blur z-20 flex justify-center gap-1.5 border-l border-white/10 shadow-[-15px_0_30px_rgba(0,0,0,0.6)] group-hover:bg-slate-800 transition-all duration-300">
                            <button onclick='editRow(${JSON.stringify(row)})' class="p-2.5 hover:bg-blue-600/30 text-blue-400 rounded-xl transition-all active:scale-90"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                            <button onclick='delRow(${JSON.stringify(row)})' class="p-2.5 hover:bg-red-600/30 text-red-500 rounded-xl transition-all active:scale-90"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </td>
                    `;
                    tr.innerHTML = dataCells + actions; body.appendChild(tr);
                });
                setTimeout(updateIcons, 50);
            }

            function sortData(col) { db.rows.sort((a,b) => String(a[col]).localeCompare(String(b[col]))); renderTable(); }
            function openCreateModal() { db.mode = 'POST'; document.getElementById('m-title').innerText = "Создать новую запись"; renderFields({}); showOpen(); }
            function editRow(row) { db.mode = 'PUT'; db.editing = row; document.getElementById('m-title').innerText = "Редактирование записи"; renderFields(row); showOpen(); }

            function renderFields(row) {
                const container = document.getElementById('m-fields');
                container.innerHTML = db.columns.map(c => {
                    const val = row[c] ?? "";
                    const sys = (c === db.pk || ['id', 'created_at', 'updated_at'].includes(c));
                    return `<div class="flex flex-col gap-2">
                        <label class="text-[11px] font-black uppercase text-slate-500 tracking-widest px-1 flex justify-between">${c} <span>${sys ? 'СИСТЕМНОЕ' : ''}</span></label>
                        <input type="text" data-field="${c}" value="${val}" ${sys ? 'disabled class="bg-black/50 border-white/5 text-white/10 select-none cursor-not-allowed text-xs p-3 rounded-xl"' : 'class="bg-white/[0.04] border border-white/15 rounded-2xl p-4 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-white/5 shadow-inner"'} />
                    </div>`;
                }).join('');
            }

            async function sendForm() {
                const data = {};
                document.querySelectorAll('[data-field]').forEach(i => { if(!i.disabled) data[i.getAttribute('data-field')] = i.value; });
                try {
                const r = await fetch(`/api/database/data/${db.current}`, { method: db.mode, headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ data, condition: db.editing ? { [db.pk || 'id']: db.editing[db.pk || 'id'] } : null }) });
                if((await r.json()).success) { closeModal(); fetchData(); } else alert('Ошибка сохранения');
                } catch (e) { alert('Сетевая ошибка'); }
            }

            async function delRow(row) {
                const id = row[db.pk || 'id'];
                if(!confirm(`Удалить объект #${id} навсегда?`)) return;
                try {
                const r = await fetch(`/api/database/data/${db.current}`, { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ [db.pk || 'id']: id }) });
                if((await r.json()).success) fetchData();
                } catch (e) { alert('Ошибка при удалении'); }
            }

            function showOpen() { document.getElementById('modal').style.display = 'flex'; setTimeout(() => document.getElementById('modal-container').classList.replace('scale-95', 'scale-100'), 10); setTimeout(updateIcons, 50); }
            function closeModal() { document.getElementById('modal-container').classList.replace('scale-100', 'scale-95'); setTimeout(() => { document.getElementById('modal').style.display = 'none'; db.editing = null; }, 150); }

            function changePage(d) { if(db.page+d > 0) { db.page+=d; fetchData(); } }
            function refreshData() { if(db.current) fetchData(); init(); }

            document.addEventListener('DOMContentLoaded', init);
            document.getElementById('table-search').oninput = (e) => renderSidebar(e.target.value);
            document.getElementById('rows-filter').oninput = (e) => renderTable(e.target.value);
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@router.get("/tables")
async def list_tables(user: dict = Depends(check_director_access)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT table_name, 
            (xpath('/row/cnt/text()', query_to_xml(format('select count(*) as cnt from %I', table_name), false, true, '')))[1]::text::int as row_count
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        return [{"tech_name": r[0], "pretty_name": r[0], "rows": r[1] or 0} for r in c.fetchall()]
    finally: conn.close()

@router.get("/data/{table_name}")
async def get_table_data(table_name: str, page: int = 1, limit: int = 100, user: dict = Depends(check_director_access)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = %s::regclass AND i.indisprimary;", (table_name,))
        pk_res = c.fetchone()
        pk = pk_res[0] if pk_res else None
        c.execute(f'SELECT COUNT(*) FROM "{table_name}"')
        total = c.fetchone()[0]
        c.execute(f'SELECT * FROM "{table_name}" LIMIT 0')
        cols = [desc[0] for desc in c.description]
        offset = (page - 1) * limit
        order = f'ORDER BY "{pk}" DESC' if pk else ""
        c.execute(f'SELECT * FROM "{table_name}" {order} OFFSET %s LIMIT %s', (offset, limit))
        rows = [dict(zip(cols, r)) for r in c.fetchall()]
        for row in rows:
            for k, v in row.items():
                if hasattr(v, 'isoformat'): row[k] = v.isoformat()
                if isinstance(v, bytes): row[k] = "<Binary>"
        return {"columns": cols, "data": rows, "total": total, "primary_key": pk}
    finally: conn.close()

@router.post("/data/{table_name}")
async def add_record(table_name: str, body: dict = Body(...), user: dict = Depends(check_director_access)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        data = body.get("data", {})
        cols, vals = zip(*[(f'"{k}"', v) for k, v in data.items()])
        c.execute(f'INSERT INTO "{table_name}" ({", ".join(cols)}) VALUES ({", ".join(["%s"]*len(vals))})', vals)
        conn.commit(); return {"success": True}
    except Exception as e: return {"success": False, "error": str(e)}
    finally: conn.close()

@router.put("/data/{table_name}")
async def update_record(table_name: str, body: dict = Body(...), user: dict = Depends(check_director_access)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        data = body.get("data", {}); cond = body.get("condition", {})
        set_expr = ", ".join([f'"{k}" = %s' for k in data.keys()])
        cond_expr = " AND ".join([f'"{k}" = %s' for k in cond.keys()])
        c.execute(f'UPDATE "{table_name}" SET {set_expr} WHERE {cond_expr}', list(data.values()) + list(cond.values()))
        conn.commit(); return {"success": True}
    except Exception as e: return {"success": False, "error": str(e)}
    finally: conn.close()

@router.delete("/data/{table_name}")
async def delete_record(table_name: str, condition: dict = Body(...), user: dict = Depends(check_director_access)):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        expr = " AND ".join([f'"{k}" = %s' for k in condition.keys()])
        c.execute(f'DELETE FROM "{table_name}" WHERE {expr}', list(condition.values()))
        conn.commit(); return {"success": True}
    except Exception as e: return {"success": False, "error": str(e)}
    finally: conn.close()
