import { ResourceNormalizer } from './resource-normalizer.util';

describe('ResourceNormalizer', () => {
  describe('generatePermissionVariations', () => {
    it('should generate both singular and plural variations', () => {
      // Test with singular resource
      const userVariations = ResourceNormalizer.generatePermissionVariations(
        'user',
        'read',
      );
      expect(userVariations).toEqual(['user:read', 'users:read']);

      // Test with plural resource
      const usersVariations = ResourceNormalizer.generatePermissionVariations(
        'users',
        'create',
      );
      expect(usersVariations).toEqual(['user:create', 'users:create']);

      // Test with project/projects
      const projectVariations = ResourceNormalizer.generatePermissionVariations(
        'project',
        'update',
      );
      expect(projectVariations).toEqual(['project:update', 'projects:update']);

      const projectsVariations =
        ResourceNormalizer.generatePermissionVariations('projects', 'delete');
      expect(projectsVariations).toEqual(['project:delete', 'projects:delete']);
    });

    it('should handle irregular plurals', () => {
      const employeeVariations =
        ResourceNormalizer.generatePermissionVariations('employee', 'read');
      expect(employeeVariations).toEqual(['employee:read', 'employees:read']);

      const employeesVariations =
        ResourceNormalizer.generatePermissionVariations('employees', 'update');
      expect(employeesVariations).toEqual([
        'employee:update',
        'employees:update',
      ]);
    });
  });

  describe('getBothForms', () => {
    it('should correctly identify and convert common business terms', () => {
      expect(ResourceNormalizer.getBothForms('user')).toEqual({
        singular: 'user',
        plural: 'users',
      });

      expect(ResourceNormalizer.getBothForms('users')).toEqual({
        singular: 'user',
        plural: 'users',
      });

      expect(ResourceNormalizer.getBothForms('project')).toEqual({
        singular: 'project',
        plural: 'projects',
      });

      expect(ResourceNormalizer.getBothForms('employees')).toEqual({
        singular: 'employee',
        plural: 'employees',
      });
    });
  });
});

// Console test examples
console.log('🧪 Testing ResourceNormalizer:');
console.log(
  'user -> variations:',
  ResourceNormalizer.generatePermissionVariations('user', 'read'),
);
console.log(
  'users -> variations:',
  ResourceNormalizer.generatePermissionVariations('users', 'create'),
);
console.log(
  'project -> variations:',
  ResourceNormalizer.generatePermissionVariations('project', 'update'),
);
console.log(
  'projects -> variations:',
  ResourceNormalizer.generatePermissionVariations('projects', 'delete'),
);
console.log(
  'employee -> variations:',
  ResourceNormalizer.generatePermissionVariations('employee', 'read'),
);
console.log(
  'employees -> variations:',
  ResourceNormalizer.generatePermissionVariations('employees', 'update'),
);
