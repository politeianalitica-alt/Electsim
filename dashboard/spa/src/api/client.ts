export interface OntologyTypeInfo {
  name: string;
  table: string;
  properties: string[];
  actions: string[];
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function listOntologyTypes() {
  return request<OntologyTypeInfo[]>("/ontology/types");
}

export function getOntologyObject(type: string, id: string) {
  return request(`/ontology/objects/${type}/${id}`);
}

export function executeAction(actionName: string, context: Record<string, unknown>) {
  return request(`/actions/${actionName}`, { method: "POST", body: JSON.stringify(context) });
}

export function getRisk() {
  return request("/analytics/pedersen");
}
