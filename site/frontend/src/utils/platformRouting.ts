export interface PlatformGates {
  site_enabled: boolean;
  crm_enabled: boolean;
  product_mode: string;
  business_type: string;
}

export const DEFAULT_PLATFORM_GATES: PlatformGates = {
  site_enabled: true,
  crm_enabled: true,
  product_mode: 'both',
  business_type: 'beauty',
};

export const toBooleanFlag = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
};

export const normalizeRole = (inputRole?: string): string => {
  if (!inputRole) {
    return '';
  }
  if (inputRole === 'saler') {
    return 'sales';
  }
  return inputRole;
};

export const normalizePlatformGates = (rawValue: unknown): PlatformGates => {
  if (typeof rawValue !== 'object' || rawValue === null) {
    return DEFAULT_PLATFORM_GATES;
  }

  const value = rawValue as Partial<PlatformGates>;

  return {
    site_enabled: toBooleanFlag(value.site_enabled, DEFAULT_PLATFORM_GATES.site_enabled),
    crm_enabled: toBooleanFlag(value.crm_enabled, DEFAULT_PLATFORM_GATES.crm_enabled),
    product_mode: typeof value.product_mode === 'string' ? value.product_mode : DEFAULT_PLATFORM_GATES.product_mode,
    business_type: typeof value.business_type === 'string' ? value.business_type : DEFAULT_PLATFORM_GATES.business_type,
  };
};

const getRoleHomePath = (role?: string): string => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'director') return '/crm/dashboard';
  if (normalizedRole === 'admin') return '/crm/dashboard';
  if (normalizedRole === 'accountant') return '/crm/dashboard';
  if (normalizedRole === 'manager') return '/manager/dashboard';
  if (normalizedRole === 'sales') return '/sales/clients';
  if (normalizedRole === 'marketer') return '/marketer/analytics';
  if (normalizedRole === 'employee') return '/employee/dashboard';
  if (normalizedRole === 'client') return '/account';

  return '/';
};

export const getRoleHomePathByGates = (
  role: string | undefined,
  siteSuiteEnabled: boolean,
  crmSuiteEnabled: boolean,
): string => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'client') {
    if (siteSuiteEnabled) {
      return '/account/dashboard';
    }
    if (crmSuiteEnabled) {
      return '/crm/login';
    }
    return '/';
  }

  if (crmSuiteEnabled) {
    return getRoleHomePath(normalizedRole);
  }

  if (siteSuiteEnabled) {
    if (['admin', 'director', 'accountant'].includes(normalizedRole)) {
      return '/admin/dashboard';
    }
    return '/';
  }

  return '/';
};

export const getUnauthenticatedSitePathByGates = (
  siteSuiteEnabled: boolean,
  crmSuiteEnabled: boolean,
): string => {
  if (siteSuiteEnabled) {
    return '/login';
  }
  if (crmSuiteEnabled) {
    return '/crm/login';
  }
  return '/';
};

export const getUnauthenticatedCrmPathByGates = (
  siteSuiteEnabled: boolean,
  crmSuiteEnabled: boolean,
): string => {
  if (crmSuiteEnabled) {
    return '/crm/login';
  }
  if (siteSuiteEnabled) {
    return '/login';
  }
  return '/';
};
