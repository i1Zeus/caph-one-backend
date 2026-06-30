/**
 * Utility for normalizing resource names to handle both plural and singular forms
 */
export class ResourceNormalizer {
  /**
   * Common irregular plurals mapping
   */
  private static readonly IRREGULAR_PLURALS: Record<string, string> = {
    // Irregular plurals
    person: 'people',
    people: 'person',
    child: 'children',
    children: 'child',
    foot: 'feet',
    feet: 'foot',
    tooth: 'teeth',
    teeth: 'tooth',
    mouse: 'mice',
    mice: 'mouse',
    man: 'men',
    men: 'man',
    woman: 'women',
    women: 'woman',

    // Words ending in 'y' -> 'ies'
    company: 'companies',
    companies: 'company',
    city: 'cities',
    cities: 'city',
    category: 'categories',
    categories: 'category',
    activity: 'activities',
    activities: 'activity',

    // Words ending in 'f' or 'fe' -> 'ves'
    leaf: 'leaves',
    leaves: 'leaf',
    life: 'lives',
    lives: 'life',
    knife: 'knives',
    knives: 'knife',
    wife: 'wives',
    wives: 'wife',
    half: 'halves',
    halves: 'half',

    // Common business terms
    invoice: 'invoices',
    invoices: 'invoice',
    employee: 'employees',
    employees: 'employee',
    workspace: 'workspaces',
    workspaces: 'workspace',
    role: 'roles',
    roles: 'role',
    permission: 'permissions',
    permissions: 'permission',
    user: 'users',
    users: 'user',
    project: 'projects',
    projects: 'project',
    task: 'tasks',
    tasks: 'task',
    client: 'clients',
    clients: 'client',
    lead: 'leads',
    leads: 'lead',
    account: 'accounts',
    accounts: 'account',
    transaction: 'transactions',
    transactions: 'transaction',
    file: 'files',
    files: 'file',
    comment: 'comments',
    comments: 'comment',
    report: 'reports',
    reports: 'report',
    projectstage: 'projectstages',
    projectstages: 'projectstage',
    taskstage: 'taskstages',
    taskstages: 'taskstage',
  };

  /**
   * Convert singular to plural
   */
  static toPlural(word: string): string {
    const lower = word.toLowerCase();

    // Check irregular plurals first
    if (this.IRREGULAR_PLURALS[lower]) {
      return this.IRREGULAR_PLURALS[lower];
    }

    // If it's already plural, return as-is
    if (this.isPlural(lower)) {
      return lower;
    }

    // Apply regular pluralization rules
    if (
      lower.endsWith('s') ||
      lower.endsWith('x') ||
      lower.endsWith('z') ||
      lower.endsWith('ch') ||
      lower.endsWith('sh')
    ) {
      return lower + 'es';
    }

    if (
      lower.endsWith('y') &&
      !['a', 'e', 'i', 'o', 'u'].includes(lower[lower.length - 2])
    ) {
      return lower.slice(0, -1) + 'ies';
    }

    if (lower.endsWith('f')) {
      return lower.slice(0, -1) + 'ves';
    }

    if (lower.endsWith('fe')) {
      return lower.slice(0, -2) + 'ves';
    }

    // Default: just add 's'
    return lower + 's';
  }

  /**
   * Convert plural to singular
   */
  static toSingular(word: string): string {
    const lower = word.toLowerCase();

    // Check irregular plurals first
    if (this.IRREGULAR_PLURALS[lower]) {
      return this.IRREGULAR_PLURALS[lower];
    }

    // If it's already singular, return as-is
    if (!this.isPlural(lower)) {
      return lower;
    }

    // Apply regular singularization rules
    if (lower.endsWith('ies')) {
      return lower.slice(0, -3) + 'y';
    }

    if (lower.endsWith('ves')) {
      return lower.slice(0, -3) + 'f';
    }

    if (lower.endsWith('es')) {
      // Check if it's a word that just adds 'es'
      const withoutEs = lower.slice(0, -2);
      if (
        withoutEs.endsWith('s') ||
        withoutEs.endsWith('x') ||
        withoutEs.endsWith('z') ||
        withoutEs.endsWith('ch') ||
        withoutEs.endsWith('sh')
      ) {
        return withoutEs;
      }
      // Otherwise, it might be irregular, so just remove 's'
      return lower.slice(0, -1);
    }

    if (lower.endsWith('s')) {
      return lower.slice(0, -1);
    }

    // If we can't determine, return as-is
    return lower;
  }

  /**
   * Get both forms of a resource name
   */
  static getBothForms(word: string): { singular: string; plural: string } {
    const lower = word.toLowerCase();

    if (this.isPlural(lower)) {
      return {
        singular: this.toSingular(lower),
        plural: lower,
      };
    } else {
      return {
        singular: lower,
        plural: this.toPlural(lower),
      };
    }
  }

  /**
   * Simple heuristic to check if a word is likely plural
   */
  private static isPlural(word: string): boolean {
    const lower = word.toLowerCase();

    // Check if it's a known plural
    const knownPlurals = Object.values(this.IRREGULAR_PLURALS);
    if (knownPlurals.includes(lower)) {
      return true;
    }

    // Check if it's a known singular
    const knownSingulars = Object.keys(this.IRREGULAR_PLURALS);
    if (knownSingulars.includes(lower)) {
      return false;
    }

    // Heuristic: words ending in 's' are likely plural (not perfect but good enough)
    return (
      lower.endsWith('s') ||
      lower.endsWith('ies') ||
      lower.endsWith('ves') ||
      lower.endsWith('es')
    );
  }

  /**
   * Generate permission variations for a resource:action pair
   */
  static generatePermissionVariations(
    resource: string,
    action: string,
  ): string[] {
    const { singular, plural } = this.getBothForms(resource);

    return [`${singular}:${action}`, `${plural}:${action}`];
  }
}
