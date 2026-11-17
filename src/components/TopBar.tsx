export type ActiveTab = 'dashboard' | 'mapa' | 'ai';

interface TopBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export function TopBar({ activeTab, onTabChange }: TopBarProps) {
  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'dashboard', label: 'Panel Analítico' },
    { id: 'mapa', label: 'Mapa Territorial de Deserción' },
    { id: 'ai', label: 'Modelo Random Forest' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 overflow-visible">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 min-h-16 flex flex-nowrap items-center justify-between gap-4 sm:gap-8 overflow-visible">
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className="py-3 text-lg font-bold tracking-tight text-[#0F2D52] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2D52] cursor-pointer"
        >
          Aula Conectada Rural
        </button>

        <nav
          aria-label="Navegación principal"
          className="flex flex-nowrap items-center gap-2 sm:gap-4 overflow-visible whitespace-nowrap"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`relative px-3.5 py-2.5 text-sm whitespace-nowrap shrink-0 rounded-t-md transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2D52] ${
                  isActive
                    ? 'text-[#0F2D52] font-semibold bg-[#EFF6FF]/80'
                    : 'text-slate-600 font-medium hover:text-[#0F2D52] hover:bg-slate-50'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[3px] bg-[#0F2D52] rounded-t-sm"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

