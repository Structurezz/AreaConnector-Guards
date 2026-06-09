export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <Icon size={28} className="text-white/30" />
        </div>
      )}
      <h3 className="text-white/70 font-semibold mb-1">{title}</h3>
      {message && <p className="text-white/40 text-sm mb-4">{message}</p>}
      {action}
    </div>
  );
}
