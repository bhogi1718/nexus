export const DesktopLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop layout - children will handle full experience */}
      {children}
    </div>
  );
};
