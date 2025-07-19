import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import UserCard from './UserCard';
import OrderCard from './OrderCard';
import ProductCard from './ProductCard';
import TicketCard from './TicketCard';

// Loading skeleton component that matches card layouts
function CardSkeleton({ type = 'default' }) {
  const getSkeletonLayout = () => {
    switch (type) {
      case 'user':
        return (
          <div className="max-w-sm mx-auto p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'order':
        return (
          <div className="max-w-sm mx-auto p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
              </div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse w-16"></div>
            </div>
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-24"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-32 mt-1"></div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-28"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16 mt-1"></div>
              </div>
            </div>
          </div>
        );
      
      case 'product':
        return (
          <div className="max-w-sm mx-auto p-3 border rounded-lg bg-white dark:bg-gray-800 shadow-md">
            <div className="flex flex-col space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
              <div className="flex items-center justify-between">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse w-20"></div>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
            </div>
          </div>
        );
      
      case 'ticket':
        return (
          <div className="max-w-sm mx-auto p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md">
            <div className="flex justify-between items-start mb-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse w-16"></div>
            </div>
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-24 mb-2"></div>
                <div className="space-y-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-3/4"></div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16 mb-1"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-28"></div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16 mb-1"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-24"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-32 mt-1"></div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="max-w-sm mx-auto p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="animate-pulse">
      {getSkeletonLayout()}
    </div>
  );
}

// Error fallback component that renders markdown-style content
function CardErrorFallback({ error, resetErrorBoundary, data, type }) {
  console.error(`ServerCardWrapper error for ${type}:`, error);
  
  // Enhanced fallback to markdown-style rendering with better error handling
  const renderMarkdownFallback = () => {
    if (!data) {
      return (
        <div className="max-w-sm mx-auto p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="text-center">
            <div className="text-gray-500 dark:text-gray-400 text-sm">No data available</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Component: {type}
            </div>
          </div>
        </div>
      );
    }
    
    switch (type) {
      case 'user':
        return (
          <div className="max-w-sm mx-auto p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md">
            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-base font-semibold mb-2">Customer Information</h3>
              <ul className="text-sm space-y-1">
                <li><strong>Name:</strong> {data.name || 'Unknown'}</li>
                {data.email && <li><strong>Email:</strong> {data.email}</li>}
                {data.phone && data.phone !== 'Not provided' && <li><strong>Phone:</strong> {data.phone}</li>}
                {data.address && data.address !== 'Not provided' && <li><strong>Address:</strong> {data.address}</li>}
              </ul>
            </div>
          </div>
        );
      
      case 'order':
        return (
          <div className="max-w-sm mx-auto p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md">
            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-base font-semibold mb-2">Order #{data.id}</h3>
              <ul className="text-sm space-y-1">
                <li><strong>Status:</strong> {data.status}</li>
                {data.customer && <li><strong>Customer:</strong> {data.customer.name}</li>}
                {data.product && <li><strong>Product:</strong> {data.product.name}</li>}
                {data.product?.price && <li><strong>Price:</strong> ${data.product.price}</li>}
                {data.orderDate && <li><strong>Date:</strong> {new Date(data.orderDate).toLocaleDateString()}</li>}
              </ul>
            </div>
          </div>
        );
      
      case 'product':
        return (
          <div className="max-w-sm mx-auto p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md">
            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-base font-semibold mb-2">{data.name}</h3>
              <ul className="text-sm space-y-1">
                <li><strong>Price:</strong> ${data.price}</li>
                <li><strong>Stock:</strong> {data.stock > 0 ? `${data.stock} available` : 'Out of stock'}</li>
                {data.description && <li><strong>Description:</strong> {data.description}</li>}
              </ul>
            </div>
          </div>
        );
      
      case 'ticket':
        return (
          <div className="max-w-sm mx-auto p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md">
            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-base font-semibold mb-2">Ticket #{data.id}</h3>
              <ul className="text-sm space-y-1">
                <li><strong>Status:</strong> {data.status}</li>
                <li><strong>Issue:</strong> {data.issue}</li>
                {data.customer && <li><strong>Customer:</strong> {data.customer.name}</li>}
                {data.createdAt && <li><strong>Created:</strong> {new Date(data.createdAt).toLocaleDateString()}</li>}
              </ul>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="max-w-sm mx-auto p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md">
            <div className="prose dark:prose-invert max-w-none">
              <pre className="text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded">
      <div className="flex">
        <div className="ml-3">
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
            Component rendering failed, showing fallback view
          </p>
          {renderMarkdownFallback()}
          <button
            onClick={resetErrorBoundary}
            className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 underline"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

// Component mapper
const COMPONENT_MAP = {
  user: UserCard,
  customer: UserCard, // Alias for user
  order: OrderCard,
  product: ProductCard,
  ticket: TicketCard,
  support_ticket: TicketCard, // Alias for ticket
};

// Main ServerCardWrapper component
export default function ServerCardWrapper({ 
  type, 
  data, 
  loading = false, 
  error = null,
  className = '',
  fallbackToMarkdown = true 
}) {
  // Validate required props
  if (!type) {
    console.error('ServerCardWrapper: type prop is required');
    return null;
  }

  // Handle loading state
  if (loading) {
    return <CardSkeleton type={type} />;
  }

  // Handle error state
  if (error) {
    if (fallbackToMarkdown) {
      return <CardErrorFallback error={error} data={data} type={type} />;
    }
    return (
      <div className="max-w-sm mx-auto p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load {type} data: {error.message}
        </p>
      </div>
    );
  }

  // Handle no data
  if (!data) {
    return (
      <div className="max-w-sm mx-auto p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          No {type} data available
        </p>
      </div>
    );
  }

  // Get the appropriate component
  const Component = COMPONENT_MAP[type.toLowerCase()];
  
  if (!Component) {
    console.error(`ServerCardWrapper: Unknown component type "${type}"`);
    if (fallbackToMarkdown) {
      return <CardErrorFallback error={new Error(`Unknown type: ${type}`)} data={data} type={type} />;
    }
    return null;
  }

  // Render with error boundary
  return (
    <div className={className}>
      <ErrorBoundary
        FallbackComponent={(props) => (
          <CardErrorFallback {...props} data={data} type={type} />
        )}
        onError={(error, errorInfo) => {
          console.error(`ServerCardWrapper error boundary caught error for ${type}:`, error, errorInfo);
        }}
      >
        <Suspense fallback={<CardSkeleton type={type} />}>
          <Component {...{ [type === 'customer' ? 'user' : type]: data }} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

// Export individual skeleton components for reuse
export { CardSkeleton, CardErrorFallback };

// Export component map for external use
export { COMPONENT_MAP };