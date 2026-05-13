import type { Json } from "@/types/database.types";
import type { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = ReturnType<typeof createServiceClient>;

export async function logAuditEvent(
  service: ServiceClient,
  input: {
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    details?: Json | null;
  }
) {
  // `audit_logs` is introduced by a migration; until generated Database types are refreshed,
  // the Supabase client types will not know about it. Keep this call intentionally untyped.
  const fromAny = (service as unknown as { from: (table: string) => unknown }).from;
  const auditTable = fromAny("audit_logs") as {
    insert: (value: unknown) => { throwOnError: () => Promise<unknown> };
  };

  await auditTable.insert({
      actor_id: input.actor_id,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      details: input.details ?? null,
    }).throwOnError();
}
