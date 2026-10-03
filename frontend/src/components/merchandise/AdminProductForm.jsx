// frontend/src/components/merchandise/AdminProductForm.jsx
import React, { useState } from 'react';
import { ActionButton } from '../dashboard/ActionButton';
import merchandiseService from '../../services/merchandise.service';
import { Plus, X, AlertCircle } from 'lucide-react';

export const AdminProductForm = ({ onProductCreated, onCancel }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('/images/hoodie.png');
  const [sizes, setSizes] = useState([
    { size: 'S', stock: 10 },
    { size: 'M', stock: 15 },
    { size: 'L', stock: 5 },
    { size: 'XL', stock: 5 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStockChange = (index, value) => {
    const updated = [...sizes];
    updated[index].stock = Math.max(0, parseInt(value, 10) || 0);
    setSizes(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await merchandiseService.createProduct({
        name,
        price: parseFloat(price),
        image_url: imageUrl,
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
    <form onSubmit={handleSubmit} className="border border-[#e5e4de] bg-[#f7f6f2] p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[#e5e4de] pb-3">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-[#5F3F56] font-semibold block mb-1">
            Admin Inventory Action
          </span>
          <h3 className="font-serif text-2xl text-[#1c1c1c]">Create New Merchandise Item</h3>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-[#1c1c1c]/50 hover:text-[#1c1c1c]">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 font-mono text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
            Product Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. CampusCore Zip Jacket"
            className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
            Unit Price (₹) *
          </label>
          <input
            type="number"
            required
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 950.00"
            className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
          />
        </div>
      </div>

      <div>
        <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70 mb-1">
          Image Asset Path
        </label>
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="/images/jacket.png"
          className="w-full p-2.5 bg-white border border-[#e5e4de] font-mono text-xs focus:outline-none focus:border-[#5F3F56]"
        />
      </div>

      {/* Initial Size Inventory */}
      <div className="space-y-3">
        <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70">
          Initial Size-Level Stock Allocations
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {sizes.map((s, idx) => (
            <div key={s.size} className="p-3 bg-white/70 border border-[#e5e4de] space-y-1">
              <span className="font-mono text-xs font-bold text-[#5F3F56] block">
                Size {s.size}
              </span>
              <input
                type="number"
                min="0"
                value={s.stock}
                onChange={(e) => handleStockChange(idx, e.target.value)}
                className="w-full p-1.5 bg-white border border-[#e5e4de] font-mono text-xs text-center"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-[#e5e4de] flex justify-end gap-3">
        {onCancel && (
          <ActionButton variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </ActionButton>
        )}
        <ActionButton type="submit" variant="primary" disabled={loading}>
          <Plus className="w-3.5 h-3.5" />
          <span>{loading ? 'Creating...' : 'Create Product & Allocate Stock'}</span>
        </ActionButton>
      </div>
    </form>
  );
};

export default AdminProductForm;
