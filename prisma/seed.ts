import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Super Admin role seeding...');

  // Create only the Super Admin role
  console.log('👑 Creating Super Admin role...');
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {
      description: 'Full system access and control',
      color: '#DC2626',
      isSystem: true,
    },
    create: {
      name: 'Super Admin',
      description: 'Full system access and control',
      color: '#DC2626',
      isSystem: true,
    },
  });
  console.log(`✅ Created/Updated role: ${superAdminRole.name}`);

  // Create comprehensive permissions for all models
  console.log('🔐 Creating comprehensive permissions...');
  const models = [
    'users',
    'projects',
    'tasks',
    'workspaces',
    'files',
    'leads',
    'employees',
    'accounts',
    'transactions',
    'invoices',
    'roles',
    'permissions',
    'projectstages',
    'taskstages',
    'comments',
    'clients',
    'salaries',
    'attendances',
    'leaves',
    'jobs',
    'leadstages',
    'currencies',
    'taxes',
  ];
  const actions = ['create', 'read', 'update', 'delete'];

  const permissions = [];

  // Create standard CRUD permissions for all models
  for (const model of models) {
    for (const action of actions) {
      const permission = await prisma.permission.upsert({
        where: { name: `${model}:${action}` },
        update: {
          description: `Can ${action} ${model}`,
        },
        create: {
          name: `${model}:${action}`,
          description: `Can ${action} ${model}`,
          resource: model,
          action: action,
        },
      });
      permissions.push(permission);
    }
  }

  // Add special administrative permissions
  const specialPermissions = [
    {
      name: 'admin:all',
      description: 'Full administrative access',
      resource: 'admin',
      action: 'all',
    },
    {
      name: 'role-management:all',
      description: 'Full access to role management system',
      resource: 'role-management',
      action: 'all',
    },
    {
      name: 'settings:all',
      description: 'Full access to all settings',
      resource: 'settings',
      action: 'all',
    },
    {
      name: 'system:all',
      description: 'Full system-level access',
      resource: 'system',
      action: 'all',
    },
  ];

  for (const permissionData of specialPermissions) {
    const permission = await prisma.permission.upsert({
      where: { name: permissionData.name },
      update: {
        description: permissionData.description,
      },
      create: permissionData,
    });
    permissions.push(permission);
  }

  console.log(`✅ Created/Updated ${permissions.length} permissions`);

  // Assign ALL permissions to Super Admin role
  console.log('🔗 Assigning all permissions to Super Admin role...');
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    });
  }
  console.log(
    `✅ Assigned ALL ${permissions.length} permissions to Super Admin role`,
  );

  // Create or find user husseinnajah.it@gmail.com
  console.log('👤 Creating/Finding user husseinnajah.it@gmail.com...');

  // Hash the password
  const hashedPassword = await bcrypt.hash('password123456', 10);

  const targetUser = await prisma.user.upsert({
    where: { email: 'husseinnajah.it@gmail.com' },
    update: {
      password: hashedPassword, // Update password if user exists
      isDeleted: false, // Restore user if it was soft-deleted
    },
    create: {
      name: 'Super Admin',
      email: 'husseinnajah.it@gmail.com',
      password: hashedPassword,
      phone: '+9647730281556', // Required field, using placeholder
      isDeleted: false,
    },
  });

  console.log(
    `✅ Created/Found user: ${targetUser.name} (${targetUser.email})`,
  );

  // Create default workspace
  console.log('🏢 Creating default workspace...');
  const defaultWorkspace = await prisma.workspace.upsert({
    where: { slug: 'iZeus-erp' },
    update: {
      name: 'iZeus ERP',
      description: 'Default workspace for iZeus ERP system',
      isDeleted: false, // Restore workspace if it was soft-deleted
    },
    create: {
      name: 'iZeus ERP',
      description: 'Default workspace for iZeus ERP system',
      slug: 'iZeus-erp',
      isDeleted: false,
    },
  });
  console.log(
    `✅ Created/Found workspace: ${defaultWorkspace.name} (${defaultWorkspace.slug})`,
  );

  // Connect user to workspace as OWNER
  console.log('🔗 Connecting user to workspace...');
  const workspaceUser = await prisma.workspaceUser.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: defaultWorkspace.id,
        userId: targetUser.id,
      },
    },
    update: {
      role: 'OWNER', // Ensure the user is the owner
    },
    create: {
      workspaceId: defaultWorkspace.id,
      userId: targetUser.id,
      role: 'OWNER',
    },
  });
  console.log(`✅ Connected user to workspace as OWNER`);
  console.log(`   Workspace User ID: ${workspaceUser.id}`);
  console.log(`   Workspace ID: ${workspaceUser.workspaceId}`);
  console.log(`   User ID: ${workspaceUser.userId}`);
  console.log(`   Role: ${workspaceUser.role}`);

  // Remove any existing roles for this user (clean slate)
  await prisma.userRole.deleteMany({
    where: { userId: targetUser.id },
  });
  console.log('🧹 Removed any existing roles from user');

  // Assign Super Admin role to the user
  await prisma.userRole.create({
    data: {
      userId: targetUser.id,
      roleId: superAdminRole.id,
    },
  });
  console.log(
    `✅ Assigned Super Admin role to ${targetUser.name} (${targetUser.email})`,
  );

  console.log('🎉 Super Admin role seeding completed successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log(`👑 Role created: Super Admin`);
  console.log(`🔐 Permissions created/updated: ${permissions.length}`);
  console.log(`👤 User assigned: ${targetUser.name} (${targetUser.email})`);
  console.log(
    `🏢 Workspace created: ${defaultWorkspace.name} (${defaultWorkspace.slug})`,
  );
  console.log(`🔗 User connected to workspace as: OWNER`);
  console.log('');

  // Verification: Check that the user can see the workspace
  console.log('🔍 Verifying workspace visibility...');
  const userWorkspaces = await prisma.workspace.findMany({
    where: {
      isDeleted: false,
      members: {
        some: {
          userId: targetUser.id,
        },
      },
    },
    include: {
      members: {
        where: {
          userId: targetUser.id,
        },
        select: {
          userId: true,
          role: true,
        },
      },
    },
  });

  if (userWorkspaces.length > 0) {
    console.log(
      `✅ User can see ${userWorkspaces.length} workspace(s):`,
    );
    for (const ws of userWorkspaces) {
      const member = ws.members[0];
      console.log(
        `   - ${ws.name} (${ws.slug}) as ${member?.role || 'UNKNOWN'}`,
      );
    }
  } else {
    console.log(
      `❌ WARNING: User cannot see any workspaces! This may indicate an issue.`,
    );
  }

  // Verification: Check user roles and permissions
  console.log('🔍 Verifying user role and permissions...');
  const userRolesCheck = await prisma.userRole.findMany({
    where: { userId: targetUser.id },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  if (userRolesCheck.length > 0) {
    console.log(`✅ User has ${userRolesCheck.length} role(s):`);
    for (const ur of userRolesCheck) {
      const permCount = ur.role.rolePermissions.length;
      console.log(`   - ${ur.role.name} (${permCount} permissions)`);
      // Show first few permissions as sample
      const samplePerms = ur.role.rolePermissions.slice(0, 3).map(rp => rp.permission.name).join(', ');
      console.log(`     Sample: ${samplePerms}${ur.role.rolePermissions.length > 3 ? '...' : ''}`);
    }
  } else {
    console.log(
      `❌ WARNING: User has no roles! This may indicate an issue.`,
    );
  }

  console.log('');
  console.log('🚀 Super Admin user is now ready with full system access!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
