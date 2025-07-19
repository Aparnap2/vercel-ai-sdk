"use client";

export default function ProductCard({ product }) {
  if (!product) return null;
  
  return (
    <div className="max-w-sm mx-auto p-3 border rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex flex-col space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
            {product.name}
          </h3>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
          </p>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            product.stock > 0 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
          </div>
        </div>
        
        {product.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {product.description}
          </p>
        )}
        
        {product.stock > 0 && (
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">{product.stock} available</span>
          </div>
        )}
      </div>
    </div>
  );
}
