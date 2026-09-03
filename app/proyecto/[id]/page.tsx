{/* NAVEGACIÓN PESTAÑAS TIPO APP */}
        <div className="bg-slate-200/50 p-1.5 rounded-2xl inline-flex flex-wrap md:flex-nowrap gap-1 w-full md:w-auto overflow-x-auto print:hidden shadow-inner border border-slate-200/50">
          {(['pricing', 'stock', 'financiador', 'cobros', 'ubicacion'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-bold capitalize transition-all duration-300 rounded-xl whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab
                  ? 'bg-white text-indigo-700 shadow-[0_2px_10px_rgb(0,0,0,0.06)] scale-100'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 scale-95'
              }`}
            >
              {tab === 'pricing' && <Calculator className="w-4 h-4" />}
              {tab === 'stock' && <Building2 className="w-4 h-4" />}
              {tab === 'financiador' && <Wallet className="w-4 h-4" />}
              {tab === 'cobros' && <Receipt className="w-4 h-4" />}
              {tab === 'ubicacion' && <MapPin className="w-4 h-4" />}
              {tab === 'pricing' ? 'Pricing Model' : tab === 'stock' ? 'Inventario' : tab === 'financiador' ? 'Financiador' : tab === 'cobros' ? 'Cuentas Ctes' : 'Ubicación'}
            </button>
          ))}
        </div>
