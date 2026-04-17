/**
 * Small "Lu" badge overlay for book cover images.
 * Position the parent as `relative` and place this inside.
 */
export function ReadBadge() {
  return (
    <div
      className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
      style={{ background: "linear-gradient(135deg, #FB6538 0%, #FF8B5F 100%)" }}
    >
      Lu
    </div>
  );
}
