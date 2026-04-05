import { useState } from "react";

interface CreateCategoryModalProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function CreateCategoryModal({ onConfirm, onCancel }: CreateCategoryModalProps) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm mx-auto p-4 sm:p-5 pb-6 sm:pb-5 space-y-3 sm:space-y-4 shadow-hero">
        <h2 className="text-lg font-bold text-text-primary">Nouvelle catégorie</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: BD, Romans, Mangas..."
          className="input-rect w-full"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onConfirm(name.trim());
          }}
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Annuler
          </button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim()}
            className="btn-primary flex-1"
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}
