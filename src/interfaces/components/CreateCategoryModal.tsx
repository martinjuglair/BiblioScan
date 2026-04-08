import { useState } from "react";

interface CreateCategoryModalProps {
  onConfirm: (name: string, emoji: string) => void;
  onCancel: () => void;
}

const EMOJI_OPTIONS = [
  "\ud83d\udcda", "\ud83d\udcd6", "\ud83d\udcd5", "\ud83d\udcd7", "\ud83d\udcd8", "\ud83d\udcd9",
  "\ud83e\uddd9", "\ud83e\udd16", "\ud83d\ude80", "\ud83c\udf1f", "\u2764\ufe0f", "\ud83d\udd25",
  "\ud83c\udfa8", "\ud83c\udfb5", "\ud83c\udfac", "\ud83c\udf0d", "\ud83c\udf3f", "\ud83d\udc3e",
  "\ud83c\udfc6", "\ud83e\udde9", "\ud83d\udd2e", "\ud83d\udca1", "\ud83c\udf53", "\ud83c\udf08",
];

export function CreateCategoryModal({ onConfirm, onCancel }: CreateCategoryModalProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("\ud83d\udcda");

  const handleSubmit = () => {
    if (name.trim()) onConfirm(name.trim(), emoji);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm mx-auto p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-hero">
        <h2 className="text-lg font-bold text-text-primary">Nouvelle catégorie</h2>

        {/* Emoji picker */}
        <div>
          <label className="text-sm text-text-secondary block mb-1.5 font-medium">Icône</label>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                  emoji === e
                    ? "bg-brand-grape/10 ring-2 ring-brand-grape scale-110"
                    : "bg-surface-subtle hover:bg-surface-input"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Name input */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: BD, Romans, Mangas..."
          className="input-rect w-full"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) handleSubmit();
          }}
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
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
