export function EmptyEditorState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-lg rounded-2xl border border-default bg-panel px-6 py-8 text-center shadow-sm">
        <div className="ui-brand-mark">Cross++ IDE</div>
        <h2 className="mt-3 text-xl text-primary">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-secondary">{description}</p>
      </div>
    </div>
  );
}
