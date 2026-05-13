"use client";

import { useEffect, useMemo, useState } from "react";
import type { PoliticalActor, CrmFilter } from "@/types/crm";

// Carga diferida de Fuse para evitar bloqueos si la dep no está instalada
// todavía en el entorno de build.
type FuseLike = {
  search: (q: string) => { item: PoliticalActor }[];
};

export function useActorSearch(actors: PoliticalActor[]) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CrmFilter>({});
  const [fuse, setFuse] = useState<FuseLike | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod: any = await import("fuse.js");
        const Fuse = mod.default ?? mod;
        const instance = new Fuse(actors, {
          keys: [
            { name: "displayName", weight: 0.4 },
            { name: "role",        weight: 0.2 },
            { name: "institution", weight: 0.2 },
            { name: "party",       weight: 0.1 },
            { name: "tags",        weight: 0.1 },
          ],
          threshold: 0.35,
          includeScore: true,
          minMatchCharLength: 2,
        });
        if (!cancelled) setFuse(instance);
      } catch {
        // Fuse no disponible — fallback a búsqueda simple.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actors]);

  const results = useMemo(() => {
    let base: PoliticalActor[];
    const q = query.trim();
    if (q.length >= 2) {
      if (fuse) {
        base = fuse.search(q).map(r => r.item);
      } else {
        const lower = q.toLowerCase();
        base = actors.filter(a =>
          a.displayName.toLowerCase().includes(lower) ||
          a.role.toLowerCase().includes(lower) ||
          (a.party ?? "").toLowerCase().includes(lower)
        );
      }
    } else {
      base = actors;
    }

    if (filter.party?.length) base = base.filter(a => a.party && filter.party!.includes(a.party));
    if (filter.type?.length) base = base.filter(a => filter.type!.includes(a.type));
    if (filter.priority?.length) base = base.filter(a => filter.priority!.includes(a.priority));
    if (filter.tags?.length) base = base.filter(a => filter.tags!.some(t => a.tags.includes(t)));
    if (filter.issueId && filter.stance) {
      base = base.filter(a =>
        a.positions.some(p => p.issueId === filter.issueId && p.stance === filter.stance)
      );
    }

    return base;
  }, [actors, query, filter, fuse]);

  return { results, query, setQuery, filter, setFilter };
}
