// frontend/src/pages/dashboard/MerchandiseDashboard.jsx
import React from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardStat from '../../components/dashboard/DashboardStat';
import DashboardSection from '../../components/dashboard/DashboardSection';
import { ShoppingBag, PackageCheck, AlertTriangle, Tag } from 'lucide-react';

/**
 * MerchandiseDashboard Page Skeleton
 * Admin and Store management dashboard for catalog, sizes, inventory levels, and order history.
 */
export const MerchandiseDashboard = () => {
  return (
    <DashboardShell activeRole="admin">
      <DashboardHeader
        title="Merchandise & Store"
        subtitle="Catalog management, size inventory levels, member discounts, and customer orders."
        badge="Catalog Management"
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <DashboardStat label="Total Products" value="2" change="Club Hoodie, Club T-Shirt" icon={ShoppingBag} />
        <DashboardStat label="Hoodie Size L Stock" value="1" change="Oversell test item" icon={AlertTriangle} />
        <DashboardStat label="Member Discount" value="10%" change="Active member benefit" icon={Tag} />
        <DashboardStat label="Total Orders" value="0" change="Pending + Paid transactions" icon={PackageCheck} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DashboardSection
          title="Product Inventory by Size"
          subtitle="Real-time stock quantities for XS, S, M, L, XL"
        >
          <div className="p-6 border border-border bg-hover font-mono text-xs text-muted">
            Catalog inventory table ready.
          </div>
        </DashboardSection>

        <DashboardSection
          title="Orders & Transactions"
          subtitle="Customer purchase history, pending checkouts, and paid orders"
        >
          <div className="p-6 border border-border bg-hover font-mono text-xs text-muted">
            Order management workflow ready.
          </div>
        </DashboardSection>
      </div>
    </DashboardShell>
  );
};

export default MerchandiseDashboard;
