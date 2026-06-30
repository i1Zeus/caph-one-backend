# Enhanced Audit System with Navigation Links

## Overview

The audit system has been enhanced to automatically generate navigation links for audit entries, allowing users to directly navigate to the relevant entities from the activities page in the frontend.

## How It Works

### Backend Enhancements

1. **Link Generation**: The `AuditService` now automatically generates navigation links based on:
   - Entity type (TASK, PROJECT, USER, WORKSPACE, LEAD, etc.)
   - Action type (CREATE, UPDATE, DELETE, etc.)
   - Available metadata (workspace slug, project ID, etc.)

2. **Metadata Collection**: The `AuditInterceptor` automatically extracts metadata from:
   - Request parameters
   - Request body
   - Response data
   - Related entity information

3. **Smart Routing**: Links are generated based on the frontend URL structure:
   - Tasks: `/tasks/{taskId}`
   - Projects: `/projects/{projectId}`
   - Leads: `/crm/edit/{leadId}` (for updates), `/crm` (for creates)
   - Workspaces: `/workspaces/{workspaceSlug}`
   - Comments: `/tasks/{taskId}` (parent task)

### Frontend Enhancements

1. **Visual Indicators**: Activity cards show:
   - Blue hover effect for clickable entries
   - "View" badge for entries with links
   - "Click to navigate" text hint

2. **Navigation**: Clicking on an activity card with a link automatically navigates to the relevant page

## Supported Entity Types and Links

| Entity Type | Action | Generated Link | Notes |
|-------------|--------|----------------|-------|
| TASK | CREATE, UPDATE | `/tasks/{taskId}` | Direct task view |
| TASK | DELETE | `null` | No link for deleted items |
| PROJECT | CREATE, UPDATE | `/projects/{projectId}` | Direct project view |
| PROJECT | DELETE | `null` | No link for deleted items |
| LEAD | CREATE | `/crm` | CRM list page |
| LEAD | UPDATE | `/crm/edit/{leadId}` | Lead edit page |
| LEAD | DELETE | `null` | No link for deleted items |
| WORKSPACE | CREATE, UPDATE | `/workspaces/{slug}` | Requires workspace slug |
| WORKSPACE | DELETE | `null` | No link for deleted items |
| COMMENT | CREATE, UPDATE | `/tasks/{taskId}` | Parent task view |
| TASKSTAGE | Any | `/projects/{projectId}/tasks` | Project tasks view |
| PROJECTSTAGE | Any | `/projects` | Projects list |
| LEADSTAGE | Any | `/crm` | CRM list |

## Usage Examples

### Automatic with @AutoAudit Decorator

```typescript
@Controller('tasks')
@AutoAudit('TASK')
export class TasksController {
  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @Request() req: any) {
    // The interceptor automatically generates links for TASK entities
    return this.tasksService.create(createTaskDto, req.user?.userId);
  }
}
```

### Manual Audit Logging

```typescript
// Creating a task with manual audit logging
await this.auditService.logCreate(
  'TASK',
  task.id,
  { title: task.title, description: task.description },
  userId,
  {
    projectId: task.projectId,
    workspaceSlug: 'my-workspace',
  }
);
// Generates link: /tasks/{task.id}

// Creating a lead
await this.auditService.logCreate(
  'LEAD',
  lead.id,
  { name: lead.name, email: lead.email },
  userId,
  {
    workspaceSlug: 'my-workspace',
    stageId: lead.stageId,
  }
);
// Generates link: /crm (for CREATE action)

// Updating a lead
await this.auditService.logUpdate(
  'LEAD',
  lead.id,
  oldValues,
  newValues,
  userId,
  {
    workspaceSlug: 'my-workspace',
    stageId: lead.stageId,
  }
);
// Generates link: /crm/edit/{lead.id} (for UPDATE action)
```

### Custom Link Generation

To add support for new entity types or custom link patterns, update the `generateNavigationLink` method in `AuditService`:

```typescript
private generateNavigationLink(
  entityType: string, 
  entityId: string, 
  actionType: string,
  metadata?: any
): string | null {
  switch (entityType.toUpperCase()) {
    case 'MY_CUSTOM_ENTITY':
      if (actionType === 'DELETE') return null;
      return `/my-custom-path/${entityId}`;
    
    // ... existing cases
  }
}
```

## Required Metadata for Link Generation

### For Workspace Links
- `workspaceSlug`: The workspace slug (required for workspace navigation)

### For Task Links
- No additional metadata required (uses taskId directly)

### For Project Links  
- No additional metadata required (uses projectId directly)

### For Lead Links
- `workspaceSlug`: Optional, for context
- `stageId`: Optional, for context

### For Comment Links
- `taskId`: Required to link to parent task
- `projectId`: Optional, for additional context

## Testing the Enhancement

1. **Create a new task** through the API or frontend
2. **Visit the activities page** (`/activities`)
3. **Look for the task creation entry** - it should have:
   - A blue "View" badge
   - Blue hover effect
   - "Click to navigate" text
4. **Click the activity card** - it should navigate to the task detail page

## Migration Notes

- The `link` field in the `ActionHistory` table is already migrated
- Existing audit entries will have `null` links
- New audit entries will automatically include generated links
- The frontend gracefully handles entries with and without links

## Troubleshooting

### Links Not Generating
1. Check that required metadata is being passed
2. Verify entity type matches the supported types
3. Ensure workspace slug is available for workspace-related entities

### Navigation Not Working
1. Check that the frontend routes match the generated links
2. Verify React Router is properly configured
3. Check for JavaScript errors in browser console

### Performance Considerations
- Link generation is lightweight and happens during audit logging
- No additional database queries are required for link generation
- Frontend navigation uses client-side routing (no page reload) 