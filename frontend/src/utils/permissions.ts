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

const ROLE_ALIASES: Record<string, string> = {
  saler: 'sales',
};

const normalizeRole = (role?: string): string => {
  if (!role) {
    return '';
  }
  const normalizedRole = ROLE_ALIASES[role];
  return normalizedRole ?? role;
};

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
      'clients_export',
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
      'settings_view',
      'settings_edit_branding',
      'settings_edit_finance',
      'settings_edit_integrations',
      'settings_edit_loyalty',
      'settings_edit_schedule',
      'broadcasts_send',
      'roles_view',
      'roles_edit',
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
      'settings_edit_loyalty',
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
      'calendar_view_all',
      'bot_settings_view',
      'bookings_create',
      'bookings_view',
      'telephony_access',
      'services_view',
      'broadcasts_send',
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
      'broadcasts_send',
      'services_view',
      'settings_edit_loyalty',
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
    const normalizedRole = normalizeRole(role);
    return ROLES[normalizedRole]?.hierarchy_level || 0;
  }

  /**
   * Проверить, может ли manager_role управлять target_role
   *
   * Правила:
   * - Директор может управлять всеми ролями
   * - Админ может управлять только ролями из своего списка (НЕ director)
   * - Другие роли не могут управлять никем
   */
  static canManageRole(managerRole: string, targetRole: string, secondaryRole?: string): boolean {
    const normalizedManagerRole = normalizeRole(managerRole);
    const normalizedTargetRole = normalizeRole(targetRole);
    const normalizedSecondaryRole = normalizeRole(secondaryRole);

    // Директор может управлять всеми (включая других директоров)
    if (normalizedManagerRole === 'director' || normalizedSecondaryRole === 'director') {
      return true;
    }

    // Проверяем основную роль
    const managerData = ROLES[normalizedManagerRole];
    if (managerData && managerData.can_manage_roles.includes(normalizedTargetRole)) {
      return true;
    }

    // Проверяем вторичную роль
    if (normalizedSecondaryRole) {
      const secData = ROLES[normalizedSecondaryRole];
      if (secData && secData.can_manage_roles.includes(normalizedTargetRole)) {
        return true;
      }
    }

    return false;
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
    const normalizedRole = normalizeRole(role);

    // Директор видит все роли (включая director)
    if (normalizedRole === 'director') {
      return Object.keys(ROLES);
    }

    // Остальные видят только те роли, которыми могут управлять
    const roleData = ROLES[normalizedRole];
    return roleData?.can_manage_roles || [];
  }

  /**
   * Проверить, есть ли у роли конкретное право
   */
  static hasPermission(role: string, permission: string, secondaryRole?: string): boolean {
    const normalizedRole = normalizeRole(role);
    const normalizedSecondaryRole = normalizeRole(secondaryRole);

    // Директор всегда имеет доступ
    if (normalizedRole === 'director' || normalizedSecondaryRole === 'director') {
      return true;
    }

    // Проверка основной роли
    const roleData = ROLES[normalizedRole];
    if (roleData) {
      if (roleData.permissions === '*') return true;
      if ((roleData.permissions as string[]).includes(permission)) return true;
    }

    // Проверка вторичной роли
    if (normalizedSecondaryRole) {
      const secData = ROLES[normalizedSecondaryRole];
      if (secData) {
        if (secData.permissions === '*') return true;
        if ((secData.permissions as string[]).includes(permission)) return true;
      }
    }

    return false;
  }

  /**
   * Получить все права роли
   */
  static getAllPermissions(role: string): string[] | '*' {
    const normalizedRole = normalizeRole(role);
    const roleData = ROLES[normalizedRole];
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

  static canViewAllUsers(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'users_view', secondaryRole);
  }

  static canCreateUsers(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'users_create', secondaryRole);
  }

  static canEditUsers(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'users_edit', secondaryRole);
  }

  static canDeleteUsers(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'users_delete', secondaryRole);
  }

  static canChangeUserRole(assignerRole: string, targetRole: string, secondaryRole?: string): boolean {
    return RoleHierarchy.canManageRole(assignerRole, targetRole, secondaryRole);
  }

  // === КЛИЕНТЫ ===

  static canViewAllClients(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'clients_view', secondaryRole);
  }

  static canViewClientContacts(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'clients_view', secondaryRole);
  }

  static canCreateClients(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'clients_create', secondaryRole);
  }

  static canEditClients(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'clients_edit', secondaryRole);
  }

  static canDeleteClients(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'clients_delete', secondaryRole);
  }

  static canExportClients(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'clients_export', secondaryRole);
  }

  // === ЗАПИСИ ===

  static canViewAllBookings(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'bookings_view', secondaryRole);
  }

  static canCreateBookings(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'bookings_create', secondaryRole);
  }

  static canEditBookings(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'bookings_edit', secondaryRole);
  }

  static canDeleteBookings(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'bookings_delete', secondaryRole);
  }

  // === КАЛЕНДАРЬ ===

  static canViewAllCalendars(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'calendar_view_all', secondaryRole);
  }

  // === АНАЛИТИКА ===

  /**
   * Проверить доступ к аналитике (ОБНОВЛЕНО: только admin, director, manager)
   * 
   * ВАЖНО: Это соответствует backend/api/analytics.py ANALYTICS_ROLES
   */
  static canViewAnalytics(role: string, secondaryRole?: string): boolean {
    // Включаем проверку всех типов доступа к аналитике
    return (
      RoleHierarchy.hasPermission(role, 'analytics_view', secondaryRole) ||
      RoleHierarchy.hasPermission(role, 'analytics_view_anonymized', secondaryRole) ||
      RoleHierarchy.hasPermission(role, 'analytics_view_stats_only', secondaryRole)
    );
  }

  static canViewFullAnalytics(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'analytics_view', secondaryRole);
  }

  /**
   * Проверить доступ к дашборду (то же что и аналитика)
   */
  static canViewDashboard(role: string): boolean {
    return this.canViewAnalytics(role);
  }

  static canExportData(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'analytics_view', secondaryRole);
  }

  static canViewFinancials(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'settings_edit_finance', secondaryRole) ||
      RoleHierarchy.hasPermission(role, 'analytics_view', secondaryRole);
  }

  // === УСЛУГИ ===

  static canViewServices(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'services_view', secondaryRole);
  }

  static canEditServices(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'services_edit', secondaryRole);
  }

  // === НАСТРОЙКИ ===

  static canViewSettings(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'settings_view', secondaryRole);
  }

  static canEditSettings(role: string, secondaryRole?: string): boolean {
    return (
      RoleHierarchy.hasPermission(role, 'settings_edit', secondaryRole) ||
      RoleHierarchy.hasPermission(role, 'settings_edit_branding', secondaryRole) ||
      RoleHierarchy.hasPermission(role, 'settings_edit_finance', secondaryRole) ||
      RoleHierarchy.hasPermission(role, 'settings_edit_integrations', secondaryRole) ||
      RoleHierarchy.hasPermission(role, 'settings_edit_loyalty', secondaryRole) ||
      RoleHierarchy.hasPermission(role, 'settings_edit_schedule', secondaryRole)
    );
  }

  static canEditFinancialSettings(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'settings_edit_finance', secondaryRole);
  }

  static canEditBranding(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'settings_edit_branding', secondaryRole);
  }

  static canEditIntegrations(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'settings_edit_integrations', secondaryRole);
  }

  static canEditLoyalty(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'settings_edit_loyalty', secondaryRole);
  }

  static canEditSchedule(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'settings_edit_schedule', secondaryRole);
  }

  static canViewBotSettings(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'bot_settings_view', secondaryRole);
  }

  // === РАССЫЛКИ ===

  static canSendBroadcasts(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'broadcasts_send', secondaryRole);
  }

  // === INSTAGRAM ===

  static canViewInstagramChat(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'instagram_chat_view', secondaryRole);
  }

  // === ЗАДАЧИ ===

  static canViewTasks(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'tasks_view', secondaryRole) ||
      RoleHierarchy.hasPermission(role, 'tasks_view_own', secondaryRole);
  }

  // === ВНУТРЕННЯЯ СВЯЗЬ ===

  static canUseStaffChat(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'staff_chat_own', secondaryRole);
  }

  // === РОЛИ ===

  static canViewRoles(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'roles_view', secondaryRole);
  }

  static canEditRoles(role: string, secondaryRole?: string): boolean {
    return RoleHierarchy.hasPermission(role, 'roles_edit', secondaryRole);
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
export function usePermissions(role: string, secondaryRole?: string) {
  return {
    // Пользователи
    canViewAllUsers: PermissionChecker.canViewAllUsers(role, secondaryRole),
    canCreateUsers: PermissionChecker.canCreateUsers(role, secondaryRole),
    canEditUsers: PermissionChecker.canEditUsers(role, secondaryRole),
    canDeleteUsers: PermissionChecker.canDeleteUsers(role, secondaryRole),

    // Клиенты
    canViewAllClients: PermissionChecker.canViewAllClients(role, secondaryRole),
    canViewClientContacts: PermissionChecker.canViewClientContacts(role, secondaryRole),
    canCreateClients: PermissionChecker.canCreateClients(role, secondaryRole),
    canEditClients: PermissionChecker.canEditClients(role, secondaryRole),
    canDeleteClients: PermissionChecker.canDeleteClients(role, secondaryRole),
    canExportClients: PermissionChecker.canExportClients(role, secondaryRole),

    // Записи
    canViewAllBookings: PermissionChecker.canViewAllBookings(role, secondaryRole),
    canCreateBookings: PermissionChecker.canCreateBookings(role, secondaryRole),
    canEditBookings: PermissionChecker.canEditBookings(role, secondaryRole),
    canDeleteBookings: PermissionChecker.canDeleteBookings(role, secondaryRole),

    // Календарь
    canViewAllCalendars: PermissionChecker.canViewAllCalendars(role, secondaryRole),

    // Аналитика
    canViewAnalytics: PermissionChecker.canViewAnalytics(role, secondaryRole),
    canViewFullAnalytics: PermissionChecker.canViewFullAnalytics(role, secondaryRole),
    canExportData: PermissionChecker.canExportData(role, secondaryRole),

    // Услуги
    canViewServices: PermissionChecker.canViewServices(role, secondaryRole),
    canEditServices: PermissionChecker.canEditServices(role, secondaryRole),

    // Настройки
    canViewSettings: PermissionChecker.canViewSettings(role, secondaryRole),
    canEditSettings: PermissionChecker.canEditSettings(role, secondaryRole),
    canEditFinancialSettings: PermissionChecker.canEditFinancialSettings(role, secondaryRole),
    canEditBranding: PermissionChecker.canEditBranding(role, secondaryRole),
    canEditIntegrations: PermissionChecker.canEditIntegrations(role, secondaryRole),
    canEditLoyalty: PermissionChecker.canEditLoyalty(role, secondaryRole),
    canEditSchedule: PermissionChecker.canEditSchedule(role, secondaryRole),
    canViewBotSettings: PermissionChecker.canViewBotSettings(role, secondaryRole),

    // Рассылки
    canSendBroadcasts: PermissionChecker.canSendBroadcasts(role, secondaryRole),

    // Instagram
    canViewInstagramChat: PermissionChecker.canViewInstagramChat(role, secondaryRole),

    // Задачи
    canViewTasks: PermissionChecker.canViewTasks(role, secondaryRole),

    // Внутренняя связь
    canUseStaffChat: PermissionChecker.canUseStaffChat(role, secondaryRole),

    // Финансы
    canViewFinancials: PermissionChecker.canViewFinancials(role, secondaryRole),

    // Роли
    canViewRoles: PermissionChecker.canViewRoles(role, secondaryRole),
    canEditRoles: PermissionChecker.canEditRoles(role, secondaryRole),

    // Дополнительно
    role: role,
    secondaryRole: secondaryRole,
    roleLevel: Math.max(ROLES[role]?.hierarchy_level || 0, secondaryRole ? ROLES[secondaryRole]?.hierarchy_level || 0 : 0),
  };
}
