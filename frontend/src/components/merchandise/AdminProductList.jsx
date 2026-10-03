// frontend/src/components/merchandise/AdminProductList.jsx
import React, { useState } from 'react';
import { Check, Edit3, Save, Package, ShoppingBag, AlertTriangle } from 'lucide-react';
import { ThreeDCard } from '../dashboard/charts/ThreeDCharts';

export const AdminProductList = ({
  products = [],
  onUpdateStock,
  loading = false,
}) => {
  const [stockInputs, setStockInputs] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [successKey, setSuccessKey] = useState(null);

  const handleInputChange = (productId, size, value) => {
    const key = `${productId}-${size}`;
    setStockInputs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveStock = async (productId, size, currentStock) => {
    const key = `${productId}-${size}`;
    const newStockVal = stockInputs[key] !== undefined ? stockInputs[key] : currentStock;
    const stockNum = parseInt(newStockVal, 10);

    if (isNaN(stockNum) || stockNum < 0) return;

    setSavingKey(key);
    try {
      await onUpdateStock?.(productId, size, stockNum);
      setSuccessKey(key);
      setTimeout(() => setSuccessKey(null), 1500);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-36 border border-border bg-white animate-pulse rounded-xs" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="p-12 border border-border bg-white text-center font-mono text-xs text-slate-500">
        No catalog items match your search.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {products.map((product) => {
        const totalStock = (product.sizes || []).reduce(
          (sum, s) => sum + (parseInt(s.stock, 10) || 0),
          0
        );

        return (
          <ThreeDCard
            key={product.id}
            className="p-6 space-y-4"
            accentGlow="rgba(95, 63, 86, 0.15)"
          >
            {/* Product Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-xs flex items-center justify-center overflow-hidden shrink-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                      className="w-10 h-10 object-contain"
                    />
                  ) : null}
                  <div
                    className="w-full h-full flex items-center justify-center text-slate-400"
                    style={{ display: product.image_url ? 'none' : 'flex' }}
                  >
                    <ShoppingBag className="w-5 h-5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-slate-400">
                      ID: #{product.id}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.2 rounded-xs font-bold uppercase ${
                      totalStock <= 0
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : totalStock <= 10
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {totalStock <= 0 ? 'Out of Stock' : `${totalStock} in stock`}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 tracking-tight">
                    {product.name}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">
                    Base Unit Price
                  </span>
                  <span className="font-mono text-lg font-bold text-slate-900">
                    ₹{Number(product.price).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Size Variant Stock Controls */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  Size Variant Stock Allocation
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Direct warehouse inventory update
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {product.sizes?.map((s) => {
                  const key = `${product.id}-${s.size}`;
                  const inputValue = stockInputs[key] !== undefined ? stockInputs[key] : s.stock;
                  const isSaving = savingKey === key;
                  const isSaved = successKey === key;

                  return (
                    <div
                      key={s.size}
                      className="p-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xs space-y-2 transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-primary">
                          Size: {s.size}
                        </span>
                        <span
                          className={`font-mono text-[10px] font-bold ${
                            Number(s.stock) <= 0
                              ? 'text-rose-600'
                              : Number(s.stock) <= 3
                              ? 'text-amber-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {Number(s.stock) <= 0 ? 'Depleted' : `${s.stock} left`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={inputValue}
                          onChange={(e) => handleInputChange(product.id, s.size, e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 font-mono text-xs text-center font-bold text-slate-900 rounded-xs focus:outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveStock(product.id, s.size, s.stock)}
                          disabled={isSaving}
                          className={`p-2 border font-mono text-xs rounded-xs transition-all cursor-pointer ${
                            isSaved
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                              : 'bg-primary text-white border-primary hover:bg-primary/90'
                          }`}
                          title="Save stock value"
                        >
                          {isSaved ? (
                            <Check className="w-3.5 h-3.5 text-emerald-800" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ThreeDCard>
        );
      })}
    </div>
  );
};

export default AdminProductList;
