// frontend/src/components/merchandise/AdminProductList.jsx
import React, { useState } from 'react';
import { ActionButton } from '../dashboard/ActionButton';
import { Check, Edit3, Save } from 'lucide-react';

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
          <div key={i} className="h-32 border border-[#e5e4de] bg-white/50 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="border border-[#e5e4de] bg-[#f7f6f2] p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e5e4de]">
            <div>
              <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/50">
                Product ID: #{product.id}
              </span>
              <h4 className="font-serif text-2xl text-[#1c1c1c]">
                {product.name}
              </h4>
            </div>
            <div className="font-mono text-base font-bold text-[#5F3F56]">
              Base Price: ₹{Number(product.price).toFixed(2)}
            </div>
          </div>

          {/* Size Variant Stock Controls */}
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#1c1c1c]/60 block mb-2 font-semibold">
              Live Size-Level Inventory
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {product.sizes?.map((s) => {
                const key = `${product.id}-${s.size}`;
                const inputValue = stockInputs[key] !== undefined ? stockInputs[key] : s.stock;
                const isSaving = savingKey === key;
                const isSaved = successKey === key;

                return (
                  <div
                    key={s.size}
                    className="p-3 bg-white/80 border border-[#e5e4de] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#5F3F56]">
                        Size: {s.size}
                      </span>
                      <span className={`font-mono text-[10px] ${
                        Number(s.stock) <= 0
                          ? 'text-red-600 font-bold'
                          : Number(s.stock) === 1
                          ? 'text-amber-600 font-bold'
                          : 'text-[#1c1c1c]/60'
                      }`}>
                        {Number(s.stock) <= 0 ? 'Out of Stock' : `${s.stock} in stock`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={inputValue}
                        onChange={(e) => handleInputChange(product.id, s.size, e.target.value)}
                        className="w-full p-1.5 bg-white border border-[#e5e4de] font-mono text-xs text-center focus:outline-none focus:border-[#5F3F56]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveStock(product.id, s.size, s.stock)}
                        disabled={isSaving}
                        className={`p-1.5 border font-mono text-xs transition-all ${
                          isSaved
                            ? 'bg-green-100 border-green-300 text-green-800'
                            : 'bg-[#1c1c1c] text-white border-[#1c1c1c] hover:bg-[#5F3F56]'
                        }`}
                        title="Update stock count"
                      >
                        {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminProductList;
