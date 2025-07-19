"use client";

export default function OrderCard({ order }) {
  if (!order) return null;
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="max-w-sm mx-auto p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Order #{order.id}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatDate(order.order_date || order.orderDate)}
          </p>
        </div>
        {order.status && (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
        )}
      </div>
      
      <div className="space-y-3">
        {order.customer && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Customer
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-200">
              {order.customer.name || 'Unknown'}
            </div>
            {order.customer.email && (
              <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {order.customer.email}
              </div>
            )}
          </div>
        )}
        
        {order.product && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Product
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-200">
              {order.product.name}
            </div>
            {order.product.price && (
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {typeof order.product.price === 'number' ? '$' + order.product.price.toFixed(2) : order.product.price}
              </div>
            )}
          </div>
        )}
        
        {order.total !== undefined && (
          <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Total:
            </span>
            <span className="text-base font-bold text-blue-600 dark:text-blue-400">
              ${typeof order.total === 'number' ? order.total.toFixed(2) : order.total}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
