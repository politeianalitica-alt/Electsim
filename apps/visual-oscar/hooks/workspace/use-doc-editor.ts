"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { DocBlock, DocMeta, DocWithBlocks } from "@/types/docs";
import { docRepository } from "@/lib/docs/doc-repository";

export function useDocEditor(docId: string, workspaceId: string) {
  const [doc, setDoc] = useState<DocWithBlocks | null>(
    () => docRepository.getDocWithBlocks(docId, workspaceId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const updateDoc = useCallback(
    (patch: Partial<DocMeta & { blocks: DocBlock[] }>) => {
      setDoc(prev => (prev ? { ...prev, ...patch } : prev));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setIsSaving(true);
      saveTimer.current = setTimeout(() => {
        docRepository.saveDoc(docId, patch);
        setIsSaving(false);
        setLastSavedAt(new Date().toISOString());
      }, 1500);
    },
    [docId]
  );

  return { doc, updateDoc, isSaving, lastSavedAt };
}
