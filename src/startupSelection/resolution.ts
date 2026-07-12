import type { StartupExampleResolution } from "./types";

type ExampleRegistryEntry = { id: string };

function containsCanonicalId(registry: readonly ExampleRegistryEntry[], id: string | null | undefined): id is string {
  if (!id) return false;
  return registry.some((entry) => Object.prototype.hasOwnProperty.call(entry, "id") && entry.id === id);
}

export function resolveStartupExampleId(
  storedId: string | null | undefined,
  exampleRegistry: readonly ExampleRegistryEntry[],
  defaultExampleId: string
): StartupExampleResolution {
  if (containsCanonicalId(exampleRegistry, storedId)) {
    return { status: "resolved", exampleId: storedId, source: "stored" };
  }
  if (containsCanonicalId(exampleRegistry, defaultExampleId)) {
    return { status: "resolved", exampleId: defaultExampleId, source: "default" };
  }
  const first = exampleRegistry.find(
    (entry) => Object.prototype.hasOwnProperty.call(entry, "id") && typeof entry.id === "string" && entry.id.length > 0
  );
  return first
    ? { status: "resolved", exampleId: first.id, source: "registry-fallback" }
    : { status: "unavailable" };
}
