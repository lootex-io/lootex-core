export default function CollectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 h-[calc(100dvh-56px)] overflow-hidden min-h-0">
      {children}
    </div>
  );
}
