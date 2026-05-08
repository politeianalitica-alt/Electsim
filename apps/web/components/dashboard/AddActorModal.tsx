"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Plus } from "lucide-react";
import { endpoints } from "@/lib/api/endpoints";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const PARTIES = ["PSOE", "PP", "VOX", "Sumar", "Junts", "ERC", "PNV", "Bildu", "Podemos", "Ciudadanos", "Independiente"];

export function AddActorModal({ onClose, onCreated }: Props) {
  const [name, setName]   = useState("");
  const [party, setParty] = useState("Independiente");
  const [role, setRole]   = useState("");
  const [bio, setBio]     = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => endpoints.actors.create({ name: name.trim(), party, role: role.trim(), bio: bio.trim() }),
    onSuccess: () => onCreated(),
    onError:   () => setError("Error al crear el actor. Inténtalo de nuevo."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setError("");
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg2 border border-border1 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-text1">Añadir nuevo actor</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-bg3 transition">
            <X className="w-5 h-5 text-text2" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text2 mb-1 block">Nombre completo *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Carmen García López"
              className="w-full bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 placeholder:text-muted focus:outline-none focus:border-cyan1"
            />
          </div>

          <div>
            <label className="text-xs text-text2 mb-1 block">Partido / Afiliación</label>
            <select
              value={party}
              onChange={e => setParty(e.target.value)}
              className="w-full bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 focus:outline-none focus:border-cyan1"
            >
              {PARTIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-text2 mb-1 block">Cargo / Rol</label>
            <input
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="Ej: Ministra de Transportes"
              className="w-full bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 placeholder:text-muted focus:outline-none focus:border-cyan1"
            />
          </div>

          <div>
            <label className="text-xs text-text2 mb-1 block">Descripción breve</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={2}
              placeholder="Breve descripción..."
              className="w-full bg-bg3 border border-border1 rounded px-3 py-2 text-sm text-text1 placeholder:text-muted focus:outline-none focus:border-cyan1 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red1">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-md bg-bg3 border border-border1 text-sm text-text2 hover:text-text1 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-2 rounded-md bg-cyan1 text-bg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-cyan1/90 transition"
            >
              <Plus className="w-4 h-4" />
              {mutation.isPending ? "Creando..." : "Añadir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
