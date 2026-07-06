import { z } from "zod";

// Roles as stored by the backend (upper-case) — normalised to lower-case in the app.
export const Role = z.enum([
  "OWNER",
  "MANAGER",
  "FRONT_DESK_SUPERVISOR",
  "RECEPTIONIST",
  "ACCOUNTANT",
  "HOUSEKEEPING",
  "NIGHT_AUDITOR",
  "STAFF",
]);
export type Role = z.infer<typeof Role>;

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const AuthUser = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: Role,
  phone: z.string().optional().default(""),
  allowedModules: z.array(z.string()).nullable().optional(),
});
export type AuthUser = z.infer<typeof AuthUser>;

export const PropertyRef = z.object({
  id: z.string(),
  name: z.string(),
});
export type PropertyRef = z.infer<typeof PropertyRef>;

export const Tenant = z.object({
  id: z.string(),
  name: z.string(),
  addons: z.array(z.string()).default([]),
  roomBand: z.string().optional(),
  plan: z.string().optional(),
});
export type Tenant = z.infer<typeof Tenant>;

export const LoginResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: AuthUser,
  tenant: Tenant,
  properties: z.array(PropertyRef).default([]),
});
export type LoginResponse = z.infer<typeof LoginResponse>;

export const RefreshResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type RefreshResponse = z.infer<typeof RefreshResponse>;
