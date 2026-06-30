import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Metadata keys
export const AUTH_ACTION_KEY = 'auth_action';
export const AUTH_RESOURCE_KEY = 'auth_resource';
export const AUTH_SKIP_KEY = 'auth_skip';

/**
 * Universal Auth decorator - automatically detects resource and action
 * @param action - Optional action override (create, read, update, delete)
 * @param resource - Optional resource override (defaults to controller name)
 */
export function Auth(action?: string, resource?: string) {
  const decorators = [UseGuards(AuthGuard('jwt'))];

  if (action) {
    decorators.push(SetMetadata(AUTH_ACTION_KEY, action));
  }

  if (resource) {
    decorators.push(SetMetadata(AUTH_RESOURCE_KEY, resource));
  }

  return applyDecorators(...decorators);
}

/**
 * Skip authentication entirely
 */
export function Public() {
  return SetMetadata(AUTH_SKIP_KEY, true);
}

/**
 * Authenticated only (no permission checks)
 */
export function AuthOnly() {
  return applyDecorators(
    UseGuards(AuthGuard('jwt')),
    SetMetadata(AUTH_SKIP_KEY, true),
  );
}
