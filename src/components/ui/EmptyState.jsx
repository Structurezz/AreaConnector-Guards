export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
          <Icon size={28} className="text-slate-400" />
        </div>
      )}
      <h3 className="text-slate-600 font-semibold mb-1">{title}</h3>
      {message && <p className="text-slate-400 text-sm mb-4">{message}</p>}
      {action}
    </div>
  );
}
