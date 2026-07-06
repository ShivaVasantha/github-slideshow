import { ALL_NAV } from "@sakthicloud/shared";

// Every module the prototype already built maps 1:1 onto a feature folder.
// Until each is migrated (model → schema → route → hook → component → WS),
// this placeholder documents the target so the shell is navigable end-to-end.
export function ModulePlaceholder({ moduleId }: { moduleId: string }) {
  const meta = ALL_NAV.find((n) => n.id === moduleId);
  return (
    <div className="sc-placeholder">
      <h1 className="sc-placeholder__title">{meta?.label ?? moduleId}</h1>
      <p className="sc-placeholder__section">{meta?.sec}</p>
      <p className="sc-placeholder__body">
        This module is entitled and routed. Its feature folder migrates from the prototype using the
        same six-part pattern proved by <strong>Rooms</strong>: Prisma model → Zod schema → Fastify
        route → TanStack Query hook → component → WebSocket live sync.
      </p>
    </div>
  );
}
