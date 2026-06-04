import type { DocMeta, DocBlock, DocTemplate, DocWithBlocks } from "@/types/docs";
import { docsMockData } from "./docs-mock-data";
import { generateId } from "@/lib/workspace/agent-utils";
import { hydrate, persist } from "@/lib/workspace/persist";

const PKEY = "politeia:ws:docs";
hydrate(PKEY, docsMockData);

export const docRepository = {
  getDocs(workspaceId: string): DocMeta[] {
    return docsMockData.filter(d => d.workspaceId === workspaceId);
  },

  getDocWithBlocks(docId: string, workspaceId: string): DocWithBlocks | null {
    return docsMockData.find(d => d.id === docId && d.workspaceId === workspaceId) ?? null;
  },

  createDoc(workspaceId: string, template: DocTemplate, title?: string): DocWithBlocks {
    const now = new Date().toISOString();
    const newDoc: DocWithBlocks = {
      id: generateId("doc"),
      workspaceId,
      title: title ?? template.name,
      kind: template.kind,
      status: "draft",
      authorId: "u1",
      createdAt: now,
      updatedAt: now,
      tags: [...template.tags],
      relatedIssueIds: [],
      clientVisible: false,
      blocks: template.blocks.map(b => ({ ...b })),
    };
    docsMockData.push(newDoc);
    persist(PKEY, docsMockData);
    return newDoc;
  },

  /** Crea un documento a partir de texto plano (p. ej. una salida de IA),
   *  convirtiendo cada párrafo en un bloque. Devuelve el doc creado. */
  createDocFromText(
    workspaceId: string,
    title: string,
    text: string,
    kind: DocWithBlocks["kind"] = "analysis",
  ): DocWithBlocks {
    const now = new Date().toISOString();
    const paras = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    const blocks: DocBlock[] = (paras.length ? paras : [text.trim() || "—"]).map(p => ({
      id: generateId("blk"),
      type: "paragraph",
      content: p,
    }));
    const newDoc: DocWithBlocks = {
      id: generateId("doc"),
      workspaceId,
      title: title.trim() || "Documento de IA",
      kind,
      status: "draft",
      authorId: "u1",
      createdAt: now,
      updatedAt: now,
      tags: ["ia"],
      relatedIssueIds: [],
      clientVisible: false,
      blocks,
    };
    docsMockData.push(newDoc);
    persist(PKEY, docsMockData);
    return newDoc;
  },

  saveDoc(docId: string, patch: Partial<DocWithBlocks>) {
    const idx = docsMockData.findIndex(d => d.id === docId);
    if (idx !== -1) {
      docsMockData[idx] = {
        ...docsMockData[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      persist(PKEY, docsMockData);
    }
  },

  deleteDoc(docId: string) {
    const idx = docsMockData.findIndex(d => d.id === docId);
    if (idx !== -1) {
      docsMockData.splice(idx, 1);
      persist(PKEY, docsMockData);
    }
  },

  getVersionsMock(docId: string) {
    return [
      { id: "v1", docId, savedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), savedBy: "u1", label: "Versión 1", blocks: [] as DocBlock[] },
      { id: "v2", docId, savedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),  savedBy: "u3", label: "Cambios crisis", blocks: [] as DocBlock[] },
      { id: "v3", docId, savedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),       savedBy: "u3", label: "Actual",         blocks: [] as DocBlock[] },
    ];
  },
};
