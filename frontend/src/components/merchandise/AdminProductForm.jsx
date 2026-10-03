// frontend/src/components/merchandise/AdminProductForm.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import merchandiseService from '../../services/merchandise.service';
import {
  Plus,
  X,
  AlertCircle,
  ShoppingBag,
  Sparkles,
  Tag,
  DollarSign,
  Package,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

const PRESET_IMAGES = [
  { label: 'Hoodie', url: '/images/hoodie.png' },
  { label: 'T-Shirt', url: '/images/tshirt.png' },
  { label: 'Cap', url: '/images/cap.png' },
  { label: 'Tote Bag', url: '/images/tote.png' },
  { label: 'Mug', url: '/images/mug.png' },
];

const CATEGORIES = ['Apparel', 'Accessories', 'Stationery', 'Drinkware', 'Limited Edition'];

export const AdminProductForm = ({ onProductCreated, onCancel }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Apparel');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('/images/hoodie.png');
  const [sizes, setSizes] = useState([
    { size: 'S', stock: 10 },
    { size: 'M', stock: 15 },
    { size: 'L', stock: 10 },
    { size: 'XL', stock: 5 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStockChange = (index, value) => {
    const updated = [...sizes];
    updated[index].stock = Math.max(0, parseInt(value, 10) || 0);
    setSizes(updated);
  };

  const totalStockUnits = sizes.reduce((acc, s) => acc + (parseInt(s.stock, 10) || 0), 0);
  const parsedPrice = parseFloat(price) || 0;
  const projectedInventoryValuation = totalStockUnits * parsedPrice;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError('Product name is required.');
      setLoading(false);
      return;
    }

    if (parsedPrice <= 0) {
      setError('Please provide a valid unit price greater than 0.');
      setLoading(false);
      return;
    }

    try {
      const res = await merchandiseService.createProduct({
        name: name.trim(),
        price: parsedPrice,
        image_url: imageUrl || '/images/hoodie.png',
        sizes,
      });
      onProductCreated?.(res?.data || res);
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-white border border-[#e2e8f0] shadow-[0_25px_60px_-15px_rgba(95,63,86,0.35),0_0_0_1px_rgba(255,255,255,0.8)] max-w-4xl w-full rounded-sm overflow-hidden my-4">
      {/* 3D Specular Top Rim */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

      {/* Modal Header */}
      <div className="p-6 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-xs border border-primary/20">
                Store Operations
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Merchandise Provisioning Console
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              Create New Merchandise Item
            </h3>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Form & Live Preview Grid */}
      <form onSubmit={handleSubmit}>
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 max-h-[75vh] overflow-y-auto">
          {/* Left Column: Form Inputs (Spans 7 cols) */}
          <div className="lg:col-span-7 space-y-5 text-xs">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 font-mono text-xs flex items-center gap-2 rounded-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Item Identity */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Item Essentials</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Step 1 of 3</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CampusCore Zip Jacket"
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-medium rounded-xs outline-none transition-all shadow-2xs placeholder:text-slate-400"
                />
              </div>

              {/* Category Pills */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Product Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border rounded-xs transition-colors cursor-pointer ${
                        category === cat
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Pricing & Media */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  <span>Pricing & Media Assets</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Step 2 of 3</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Unit Base Price (₹) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="1"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 950.00"
                      className="w-full px-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-mono font-bold rounded-xs outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Image Asset Path
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="/images/jacket.png"
                      className="w-full px-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-primary text-xs text-slate-900 font-mono rounded-xs outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Image Presets */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Or select preset asset:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded-xs border transition-colors cursor-pointer ${
                        imageUrl === preset.url
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Size & Stock Allocations */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-primary" />
                  <span>Size-Level Inventory Allocation</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Step 3 of 3</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {sizes.map((s, idx) => (
                  <div
                    key={s.size}
                    className="p-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xs space-y-1.5 transition-all shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary">
                        Size {s.size}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Units</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={s.stock}
                      onChange={(e) => handleStockChange(idx, e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 focus:border-primary font-mono text-xs text-center font-bold text-slate-900 rounded-xs outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Live 3D Merchandise Card Preview (Spans 5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-primary" />
                  <span>Live Product Preview</span>
                </span>
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-xs">
                  Real-time
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-4">
                How this item will appear to campus members in the official store catalog.
              </p>

              {/* 3D Product Mockup Card */}
              <div
                className="relative rounded-sm bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-5 shadow-xl border border-slate-700 overflow-hidden"
                style={{
                  boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.4), 0 0 15px rgba(95, 63, 86, 0.25)',
                }}
              >
                {/* Top Accent Rim */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-primary" />

                {/* Product Image Placeholder / Mockup */}
                <div className="relative w-full h-40 bg-slate-950/60 rounded-xs border border-slate-800 flex items-center justify-center overflow-hidden mb-4 group">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={name || 'Product'}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                      className="max-h-32 object-contain filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-105 duration-300"
                    />
                  ) : null}
                  <div
                    className="flex flex-col items-center justify-center text-slate-500"
                    style={{ display: imageUrl ? 'none' : 'flex' }}
                  >
                    <ShoppingBag className="w-10 h-10 text-slate-600 mb-1" />
                    <span className="text-[10px] font-mono">Catalog Asset</span>
                  </div>
                  <span className="absolute top-2 right-2 text-[9px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xs uppercase">
                    {category}
                  </span>
                </div>

                {/* Product Title & Price */}
                <div className="space-y-1 mb-3">
                  <h4 className="text-base font-extrabold text-white tracking-tight line-clamp-1">
                    {name || 'CampusCore Merchandise'}
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      ₹{parsedPrice > 0 ? parsedPrice.toFixed(2) : '0.00'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">incl. campus taxes</span>
                  </div>
                </div>

                {/* Size Pills */}
                <div className="pt-2 border-t border-slate-700/80 space-y-1.5">
                  <span className="text-[9px] uppercase font-mono text-slate-400 block">
                    Available Variants & Stock
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {sizes.map((s) => (
                      <span
                        key={s.size}
                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-xs text-[10px] font-mono flex items-center gap-1 text-slate-200"
                      >
                        <span className="font-bold text-[#C4A6B8]">{s.size}:</span>
                        <span>{s.stock}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Valuation Box */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Total Units Allocated:</span>
                <strong className="text-slate-900">{totalStockUnits} Units</strong>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Projected Catalog Value:</span>
                <strong className="text-emerald-700">₹{projectedInventoryValuation.toLocaleString()}</strong>
              </div>
              <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                Orders trigger automated real-time size decrement across checkout sessions.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50/90 border-t border-border flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-5 py-2.5 border border-border bg-white hover:bg-slate-100 text-slate-700 font-bold uppercase text-[11px] tracking-wider rounded-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[11px] tracking-wider rounded-xs transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? 'Creating Catalog Item...' : 'Save & Publish Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminProductForm;
