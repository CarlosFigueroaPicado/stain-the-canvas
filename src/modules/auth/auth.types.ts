export interface AuthResult {
  ok: boolean;
  error?: string;
}

export interface AdminUser {
  id: string;
  app_metadata?: Record<string, any>;
}
