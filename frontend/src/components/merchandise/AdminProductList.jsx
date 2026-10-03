// frontend/src/components/merchandise/AdminProductList.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Save, ShoppingBag, Pencil, X, Image, AlertTriangle } from 'lucide-react';
import { ThreeDCard } from '../dashboard/charts/ThreeDCharts';
import merchandiseService from '../../services/merchandise.service';

// ─── Edit Product Modal ─────────────────────────────────────────────────────
const EditProductModal = ({ product, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: product.name || '',
    price: product.price || '',
    image_url: product.image_url || '',
    description: product.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'image_url') setImgError(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      setError('Name and price are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await merchandiseService.updateProduct(product.id, {
        name: form.name.trim(),
        price: parseFloat(form.price),
        image_url: form.image_url.trim() || null,
        description: form.description.trim() || null,
      });
      onSaved(updated);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to update product.');
    } finally {
      setSaving(false);
    }
  };

  const previewSrc = form.image_url.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="w-full max-w-2xl bg-white border border-border shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Edit Product</h3>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">ID #{product.id} · Update catalog details</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: image preview */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Product Image Preview
              </label>
              <div className="w-full aspect-square border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden rounded-sm">
                {previewSrc && !imgError ? (
                  <img
                    src={previewSrc}
                    alt="Product preview"
                    className="w-full h-full object-contain"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Image className="w-10 h-10" />
                    <span className="text-xs font-mono">No image</span>
                  </div>
                )}
              </div>

              {/* Quick-set buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick-set image</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('image_url', '/black_hoodie.jpg')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer rounded-xs"
                  >
                    🧥 Hoodie
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('image_url', '/black_tshirt.jpg')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer rounded-xs"
                  >
                    👕 T-Shirt
                  </button>
                </div>
              </div>
            </div>

            {/* Right: fields */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. CampusCore Hoodie"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                  required
                />
              </div>

              {/* Price */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Unit Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="e.g. 899.00"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono text-sm text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                  required
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Image URL
                </label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                  placeholder="/black_hoodie.jpg or https://..."
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono text-xs text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Short product description…"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono text-xs text-slate-900 focus:outline-none focus:border-primary focus:bg-white transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Stock Input Row ────────────────────────────────────────────────────────
const StockRow = ({ product, onUpdateStock }) => {
  const [stockInputs, setStockInputs] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [successKey, setSuccessKey] = useState(null);

  const handleInputChange = (size, value) => {
    setStockInputs((prev) => ({ ...prev, [size]: value }));
  };

  const handleSaveStock = async (size, currentStock) => {
    const key = `${product.id}-${size}`;
    const newVal = stockInputs[size] !== undefined ? stockInputs[size] : currentStock;
    const stockNum = parseInt(newVal, 10);
    if (isNaN(stockNum) || stockNum < 0) return;
    setSavingKey(key);
    try {
      await onUpdateStock?.(product.id, size, stockNum);
      setSuccessKey(key);
      setTimeout(() => setSuccessKey(null), 1500);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {product.sizes?.map((s) => {
        const key = `${product.id}-${s.size}`;
        const inputValue = stockInputs[s.size] !== undefined ? stockInputs[s.size] : s.stock;
        const isSaving = savingKey === key;
        const isSaved = successKey === key;
        return (
          <div key={s.size} className="p-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xs space-y-2 transition-all shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-primary">Size: {s.size}</span>
              <span className={`font-mono text-[10px] font-bold ${
                Number(s.stock) <= 0 ? 'text-rose-600' : Number(s.stock) <= 3 ? 'text-amber-600' : 'text-slate-500'
              }`}>
                {Number(s.stock) <= 0 ? 'Depleted' : `${s.stock} left`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={inputValue}
                onChange={(e) => handleInputChange(s.size, e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 font-mono text-xs text-center font-bold text-slate-900 rounded-xs focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => handleSaveStock(s.size, s.stock)}
                disabled={isSaving}
                className={`p-2 border font-mono text-xs rounded-xs transition-all cursor-pointer ${
                  isSaved ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-primary text-white border-primary hover:bg-primary/90'
                }`}
                title="Save stock"
              >
                {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Save className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export const AdminProductList = ({ products = [], onUpdateStock, onProductUpdated, loading = false }) => {
  const [editingProduct, setEditingProduct] = useState(null);

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
    <>
      <div className="space-y-6">
        {products.map((product) => {
          const totalStock = (product.sizes || []).reduce((sum, s) => sum + (parseInt(s.stock, 10) || 0), 0);

          return (
            <ThreeDCard key={product.id} className="p-6 space-y-4" accentGlow="rgba(95, 63, 86, 0.15)">
              {/* Product Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                <div className="flex items-center gap-4">
                  {/* Product Image */}
                  <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-sm flex items-center justify-center overflow-hidden shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full flex items-center justify-center text-slate-400"
                      style={{ display: product.image_url ? 'none' : 'flex' }}
                    >
                      <ShoppingBag className="w-6 h-6 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] uppercase font-bold text-slate-400">ID: #{product.id}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-xs font-bold uppercase ${
                        totalStock <= 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : totalStock <= 10
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {totalStock <= 0 ? 'Out of Stock' : `${totalStock} in stock`}
                      </span>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 tracking-tight">{product.name}</h4>
                    {product.description && (
                      <p className="text-xs text-slate-500 font-mono mt-0.5 line-clamp-1">{product.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Base Unit Price</span>
                    <span className="font-mono text-lg font-bold text-slate-900">₹{Number(product.price).toFixed(2)}</span>
                  </div>
                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => setEditingProduct(product)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold border border-slate-200 bg-slate-50 hover:bg-primary hover:text-white hover:border-primary text-slate-700 transition-all duration-200 cursor-pointer rounded-xs"
                    title="Edit product details"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
              </div>

              {/* Stock Controls */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    Size Variant Stock Allocation
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Direct warehouse inventory update</span>
                </div>
                <StockRow product={product} onUpdateStock={onUpdateStock} />
              </div>
            </ThreeDCard>
          );
        })}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingProduct && (
          <EditProductModal
            product={editingProduct}
            onClose={() => setEditingProduct(null)}
            onSaved={(updated) => {
              setEditingProduct(null);
              onProductUpdated?.(updated);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminProductList;
