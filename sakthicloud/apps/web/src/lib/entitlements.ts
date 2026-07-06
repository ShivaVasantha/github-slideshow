// Re-export the shared entitlement contract so features import from one place.
// The map itself lives in @sakthicloud/shared and is identical to the backend's
// config/entitlements.js — one definition, both sides.
export {
  ADDON_CATALOG,
  ROOM_BANDS,
  MODULE_ADDON,
  moduleAddonId,
  isCoreModule,
  isModuleLocked,
} from "@sakthicloud/shared";
export type { AddonDef, RoomBand, Subscription } from "@sakthicloud/shared";
