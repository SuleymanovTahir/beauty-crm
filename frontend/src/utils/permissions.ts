/**
 * Централизованная система проверки прав доступа для frontend
 *
 * Используйте эти функции везде, где нужно проверить права пользователя.
 * Это обеспечивает единообразие и облегчает поддержку.
 *
 * Пример использования:
 * ```tsx
 * import { RoleHierarchy, PermissionChecker } from '@/utils/permissions';
 *
 * // Проверка иерархии
 * if (RoleHierarchy.canManageRole(currentUserRole, targetRole)) {
 *   // Показать кнопку изменения роли
 * }
 *
 * // Проверка конкретного права
 * if (PermissionChecker.canEditUsers(userRole)) {
 *   // Показать кнопку редактирования
 * }
 * ```
 */

export interface Role {
  name: string;
  permissions: string[] | '*';
  can_manage_roles: string[];
  hierarchy_level: number;
}

/**
 * Определение всех ролей в системе
 * ВАЖНО: Эта структура должна совпадать с backend/core/config.py ROLES
 */
export const ROLES: Record<string, Role> = {
  director: {
    name: 'Директор',
    permissions: '*',
    can_manage_roles: ['admin', 'manager', 'sales', 'marketer', 'employee'],
    hierarchy_level: 100,
  },
  admin: {
    name: 'Администратор',
    permissions: [
      'clients_view',
      'clients_create',
      'clients_edit',
      'clients_delete',
      'bookings_view',
      'bookings_create',
      'bookings_edit',
      'bookings_delete',
      'services_view',
      'services_edit',
      'users_view',
      'users_create',
      'users_edit',
      'analytics_view_anonymized',
      'staff_chat_own',
      'calendar_view_all',
      'bot_settings_view',
      'broadcasts_send',
    ],
    can_manage_roles: ['manager', 'sales', 'marketer', 'employee'],
    hierarchy_level: 80,
  },
  manager: {
    name: 'Менеджер',
    permissions: [
      'clients_view',
      'clients_create',
      'clients_edit',
      'bookings_view',
      'bookings_create',
      'bookings_edit',
      'services_view',
      'analytics_view_anonymized',
      'staff_chat_own',
      'calendar_view_all',
    ],
    can_manage_roles: [],
    hierarchy_level: 60,
  },
  sales: {
    name: 'Продажник',
    permissions: [
      'instagram_chat_view',
      'clients_view_limited',
      'analytics_view_stats_only',
      'staff_chat_own',
      'calendar_view_all',           // Полный доступ к календарю (для просмотра и записи)
      'bot_settings_view',
      'bookings_create',             // Право создавать записи
      'bookings_view',               // Право просматривать записи
      'telephony_access',            // Доступ к телефонии для звонков
    ],
    can_manage_roles: [],
    hierarchy_level: 40,
  },
  marketer: {
    name: 'Таргетолог',
    permissions: [
      'analytics_view_anonymized',
      'clients_view_stats_only',
      'staff_chat_own',
    ],
    can_manage_roles: [],
    hierarchy_level: 30,
  },
  employee: {
    name: 'Сотрудник (мастер)',
    permissions: [
      'bookings_view_own',
      'calendar_view_own',
      'clients_view_own',
      'staff_chat_own',
      'tasks_view_own',        // Просмотр своих задач
      'services_view',         // Просмотр каталога услуг (readonly)
    ],
    can_manage_roles: [],
    hierarchy_level: 20,
  },
};

/**
 * Класс для работы с иерархией ролей
 */
export class RoleHierarchy {
  /**
   * Получить числовой уровень роли
   */
  static getHierarchyLevel(role: string): number {
    return ROLES[role]?.hierarchy_level || 0;
  }

  /**
   * Проверить, может ли manager_role управлять target_role
   *
   * Правила:
   * - Директор может управлять всеми ролями
   * - Админ может управлять только ролями из своего списка (НЕ director)
   * - Другие роли не могут управлять никем
   */
  static canManageRole(managerRole: string, targetRole: string): boolean {
    // Директор может управлять всеми (включая других директоров)
    if (managerRole === 'director') {
      return true;
    }

    // Получаем список ролей, которыми может управлять manager
    const managerData = ROLES[managerRole];
    if (!managerData) return false;

    return managerData.can_manage_roles.includes(targetRole);
  }

  /**
   * Проверить, не пытается ли пользователь назначить роль выше своей
   */
  static canAssignHigherRole(currentRole: string, targetRole: string): boolean {
    const currentLevel = this.getHierarchyLevel(currentRole);
    const targetLevel = this.getHierarchyLevel(targetRole);

    // Можно назначить роль только если она не выше текущей
    return targetLevel <= currentLevel;
  }

  /**
   * Получить список ролей, которыми может управлять данная роль
   */
  static getManageableRoles(role: string): string[] {
    // Директор видит все роли (включая director)
    if (role === 'director') {
      return Object.keys(ROLES);
    }

    // Остальные видят только те роли, которыми могут управлять
    const roleData = ROLES[role];
    return roleData?.can_manage_roles || [];
  }

  /**
   * Проверить, есть ли у роли конкретное право
   */
  static hasPermission(role: string, permission: string): boolean {
    const roleData = ROLES[role];
    if (!roleData) return false;

    if (roleData.permissions === '*') {
      return true;
    }

    return (roleData.permissions as string[]).includes(permission);
  }

  /**
   * Получить все права роли
   */
  static getAllPermissions(role: string): string[] | '*' {
    const roleData = ROLES[role];
    return roleData?.permissions || [];
  }

  /**
   * Комплексная проверка возможности назначения роли
   *
   * Проверяет:
   * 1. Нельзя менять свою собственную роль
   * 2. Новая роль существует в системе
   * 3. У assigner есть право управлять этой ролью
   * 4. Новая роль не выше роли assigner
   *
   * @returns {success: boolean, error: string}
   */
  static validateRoleAssignment(
    assignerRole: string,
    assignerId: number,
    targetUserId: number,
    newRole: string
  ): { success: boolean; error: string } {
    // 1. Нельзя менять свою роль
    if (assignerId === targetUserId) {
      return { success: false, error: 'Нельзя изменить свою собственную роль' };
    }

    // 2. Проверка существования роли
    if (!ROLES[newRole]) {
      return { success: false, error: `Роль '${newRole}' не существует` };
    }

    // 3. Проверка права управлять этой ролью
    if (!this.canManageRole(assignerRole, newRole)) {
      return {
        success: false,
        error: `У вас нет прав для назначения роли '${ROLES[newRole].name}'`,
      };
    }

    // 4. Проверка, что не назначаем роль выше своей
    if (!this.canAssignHigherRole(assignerRole, newRole)) {
      return { success: false, error: 'Нельзя назначать роль выше своей' };
    }

    return { success: true, error: '' };
  }
}

/**
 * Класс для проверки конкретных прав пользователей
 */
export class PermissionChecker {
  // === ПОЛЬЗОВАТЕЛИ ===

  static canViewAllUsers(role: string): boolean {
    return ['director', 'admin'].includes(role);
  }

  static canCreateUsers(role: string): boolean {
    return (
      ['director', 'admin'].includes(role) ||
      RoleHierarchy.hasPermission(role, 'users_create')
    );
  }

  static canEditUsers(role: string): boolean {
    return (
      ['director', 'admin'].includes(role) ||
      RoleHierarchy.hasPermission(role, 'users_edit')
    );
  }

  static canDeleteUsers(role: string): boolean {
    return (
      ['director', 'admin'].includes(role) ||
      RoleHierarchy.hasPermission(role, 'users_delete')
    );
  }

  static canChangeUserRole(assignerRole: string, targetRole: string): boolean {
    return RoleHierarchy.canManageRole(assignerRole, targetRole);
  }

  // === КЛИЕНТЫ ===

  static canViewAllClients(role: string): boolean {
    return RoleHierarchy.hasPermission(role, 'clients_view');
  }

  static canViewClientContacts(role: string): boolean {
    // Только director, admin, manager имеют полный доступ к контактам
    return ['director', 'admin', 'manager'].includes(role);
  }

  static canCreateClients(role: string): boolean {
    return RoleHierarchy.hasPermission(role, 'clients_create');
  }

  static canEditClients(role: string): boolean {
    return RoleHierarchy.hasPermission(role, 'clients_edit');
  }

  static canDeleteClients(role: string): boolean {
    return (
      role === 'director' || RoleHierarchy.hasPermission(role, 'clients_delete')
    );
  }

  // === ЗАПИСИ ===

  static canViewAllBookings(role: string): boolean {
    return RoleHierarchy.hasPermission(role, 'bookings_view');
  }

  static canCreateBookings(role: string): boolean {
    return RoleHierarchy.hasPermission(role, 'bookings_create');
  }

  static canEditBookings(role: string): boolean {
    return RoleHierarchy.hasPermission(role, 'bookings_edit');
  }

  static canDeleteBookings(role: string): boolean {
    return (
      role === 'director' || RoleHierarchy.hasPermission(role, 'bookings_delete')
    );
  }

  // === КАЛЕНДАРЬ ===

  static canViewAllCalendars(role: string): boolean {
    return RoleHierarchy.hasPermission(role, 'calendar_view_all');
  }

  // === АНАЛИТИКА ===

  /**
   * Проверить доступ к аналитике (ОБНОВЛЕНО: только admin, director, manager)
   * 
   * ВАЖНО: Это соответствует backend/api/analytics.py ANALYTICS_ROLES
   */
  static canViewAnalytics(role: string): boolean {
    // Только admin, director, manager имеют доступ к финансовой аналитике
    return ['admin', 'director', 'manager'].includes(role);
  }

  static canViewFullAnalytics(role: string): boolean {
    // Только director видит полную аналитику без ограничений
    return role === 'director';
  }

  /**
   * Проверить доступ к дашборду (то же что и аналитика)
   */
  static canViewDashboard(role: string): boolean {
    return this.canViewAnalytics(role);
  }

  static canExportData(role: string): boolean {
    return ['director', 'admin'].includes(role);
  }

  // === УСЛУГИ ===

  static canViewServices(role: string): boolean {
    return RoleHierarchy.hasPermission(role, 'services_view');
  }

  static canEditServices(role: string): boolean {
    return (
      ['director', 'admin'].includes(role) ||
      RoleHierarchy.hasPermission(role, 'services_edit')
    );
  }

  // === НАСТРОЙКИ ===

  static canViewSettings(role: string): boolean {
    return ['director', 'admin'].includes(role);
  }

  static canEditSettings(role: string): boolean {
    return role === 'director';
  }

  static canViewBotSettings(role: string): boolean {
    return (
      ['director', 'admin', 'sales'].includes(role) ||
      RoleHierarchy.hasPermission(role, 'bot_settings_view')
    );
  }

  // === РАССЫЛКИ ===

  static canSendBroadcasts(role: string): boolean {
    return ['director', 'admin', 'sales'].includes(role);
  }

  // === INSTAGRAM ===

  static canViewInstagramChat(role: string): boolean {
    return RoleHierarchy.hasPermission(role, 'instagram_chat_view');
  }

  // === ЗАДАЧИ ===

  static canViewTasks(role: string): boolean {
    return ['director', 'admin', 'manager'].includes(role) ||
           RoleHierarchy.hasPermission(role, 'tasks_view') ||
           RoleHierarchy.hasPermission(role, 'tasks_view_own');
  }

  // === ВНУТРЕННЯЯ СВЯЗЬ ===

  static canUseStaffChat(role: string): boolean {
    return RoleHierarchy.hasPermission(role, 'staff_chat_own');
  }
}

/**
 * Хук для использования в React компонентах
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { role } = useAuth();
 *   const canEdit = PermissionChecker.canEditUsers(role);
 *
 *   return canEdit ? <EditButton /> : null;
 * }
 * ```
 */
export function usePermissions(role: string) {
  return {
    // Пользователи
    canViewAllUsers: PermissionChecker.canViewAllUsers(role),
    canCreateUsers: PermissionChecker.canCreateUsers(role),
    canEditUsers: PermissionChecker.canEditUsers(role),
    canDeleteUsers: PermissionChecker.canDeleteUsers(role),

    // Клиенты
    canViewAllClients: PermissionChecker.canViewAllClients(role),
    canViewClientContacts: PermissionChecker.canViewClientContacts(role),
    canCreateClients: PermissionChecker.canCreateClients(role),
    canEditClients: PermissionChecker.canEditClients(role),
    canDeleteClients: PermissionChecker.canDeleteClients(role),

    // Записи
    canViewAllBookings: PermissionChecker.canViewAllBookings(role),
    canCreateBookings: PermissionChecker.canCreateBookings(role),
    canEditBookings: PermissionChecker.canEditBookings(role),
    canDeleteBookings: PermissionChecker.canDeleteBookings(role),

    // Календарь
    canViewAllCalendars: PermissionChecker.canViewAllCalendars(role),

    // Аналитика
    canViewAnalytics: PermissionChecker.canViewAnalytics(role),
    canViewFullAnalytics: PermissionChecker.canViewFullAnalytics(role),
    canExportData: PermissionChecker.canExportData(role),

    // Услуги
    canViewServices: PermissionChecker.canViewServices(role),
    canEditServices: PermissionChecker.canEditServices(role),

    // Настройки
    canViewSettings: PermissionChecker.canViewSettings(role),
    canEditSettings: PermissionChecker.canEditSettings(role),
    canViewBotSettings: PermissionChecker.canViewBotSettings(role),

    // Рассылки
    canSendBroadcasts: PermissionChecker.canSendBroadcasts(role),

    // Instagram
    canViewInstagramChat: PermissionChecker.canViewInstagramChat(role),

    // Задачи
    canViewTasks: PermissionChecker.canViewTasks(role),

    // Внутренняя связь
    canUseStaffChat: PermissionChecker.canUseStaffChat(role),

    // Дополнительно
    roleLevel: ROLES[role]?.hierarchy_level || 0,
  };
}
