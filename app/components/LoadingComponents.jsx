"use client";
// Enhanced loading components for progressive data display
import { Loader2, Wifi, WifiOff, Database, Search, Cpu, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Streaming indicator component
export function StreamingIndicator({ isStreaming = true, message = "Loading..." }) {
  if (!isStreaming) return null;
  
  return (
    <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
        <span className="text-sm text-blue-700 dark:text-blue-300">{message}</span>
      </div>
    </div>
  );
}

// Progressive data display component
export function ProgressiveDataDisplay({ 
  children, 
  isLoading = false, 
  hasError = false, 
  isEmpty = false,
  loadingMessage = "Loading data...",
  emptyMessage = "No data available",
  errorMessage = "Failed to load data"
}) {
  if (hasError) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center space-x-2">
          <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">{errorMessage}</span>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return <StreamingIndicator isStreaming={true} message={loadingMessage} />;
  }
  
  if (isEmpty) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400">{emptyMessage}</span>
      </div>
    );
  }
  
  return children;
}

// Connection status indicator
export function ConnectionStatus({ isConnected = true, isRetrying = false }) {
  if (isConnected && !isRetrying) return null;
  
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg ${
      isRetrying 
        ? 'bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
        : 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
    }`}>
      {isRetrying ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-yellow-600 dark:text-yellow-400" />
          <span className="text-sm text-yellow-700 dark:text-yellow-300">Reconnecting...</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">Connection lost</span>
        </>
      )}
    </div>
  );
}

// Enhanced skeleton loader with animation variations
export function EnhancedSkeleton({ 
  type = 'default', 
  count = 1, 
  className = '',
  animationType = 'pulse' // 'pulse', 'wave', 'shimmer'
}) {
  const getAnimationClass = () => {
    switch (animationType) {
      case 'wave':
        return 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[wave_1.5s_ease-in-out_infinite]';
      case 'shimmer':
        return 'relative overflow-hidden bg-gray-200 dark:bg-gray-700 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent';
      default:
        return 'animate-pulse bg-gray-200 dark:bg-gray-700';
    }
  };

  const baseClass = `rounded ${getAnimationClass()} ${className}`;

  const renderSkeleton = () => {
    switch (type) {
      case 'text':
        return <div className={`h-4 ${baseClass}`} />;
      case 'title':
        return <div className={`h-6 ${baseClass}`} />;
      case 'avatar':
        return <div className={`w-10 h-10 rounded-full ${baseClass}`} />;
      case 'button':
        return <div className={`h-10 w-24 ${baseClass}`} />;
      case 'card':
        return (
          <div className={`p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md ${className}`}>
            <div className="space-y-3">
              <div className={`h-6 w-3/4 ${baseClass}`} />
              <div className={`h-4 w-full ${baseClass}`} />
              <div className={`h-4 w-2/3 ${baseClass}`} />
            </div>
          </div>
        );
      default:
        return <div className={`h-4 ${baseClass}`} />;
    }
  };

  if (count === 1) {
    return renderSkeleton();
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  );
}

// Data loading progress indicator
export function DataLoadingProgress({ 
  current = 0, 
  total = 100, 
  label = "Loading data...",
  showPercentage = true 
}) {
  const percentage = Math.min(Math.round((current / total) * 100), 100);
  
  return (
    <div className="w-full max-w-sm mx-auto p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {showPercentage && (
          <span className="text-sm text-gray-500 dark:text-gray-400">{percentage}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Batch loading indicator for multiple items
export function BatchLoadingIndicator({ 
  items = [], 
  loadedCount = 0,
  totalCount = 0,
  isComplete = false 
}) {
  if (isComplete) return null;
  
  return (
    <div className="flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center space-x-3">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <span>Loading items...</span>
          {totalCount > 0 && (
            <span className="ml-2 font-medium">
              {loadedCount}/{totalCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Enhanced streaming status indicator with tool-specific icons
export function StreamingStatusIndicator({ 
  status = 'idle', 
  currentStep = null, 
  totalSteps = null,
  toolType = null,
  className = '' 
}) {
  const statusConfig = {
    idle: { color: 'gray', text: 'Ready', icon: null },
    connecting: { color: 'blue', text: 'Connecting...', icon: 'connecting' },
    streaming: { color: 'green', text: 'Streaming', icon: 'streaming' },
    processing: { color: 'yellow', text: 'Processing', icon: 'processing' },
    querying: { color: 'blue', text: 'Querying database', icon: 'database' },
    searching: { color: 'purple', text: 'Searching', icon: 'search' },
    error: { color: 'red', text: 'Error', icon: 'error' },
    complete: { color: 'green', text: 'Complete', icon: 'complete' }
  };

  const config = statusConfig[status] || statusConfig.idle;

  const getStatusIcon = () => {
    // Tool-specific icons
    if (toolType === 'database') return <Database className="w-3 h-3 animate-pulse text-blue-500" />;
    if (toolType === 'search') return <Search className="w-3 h-3 animate-pulse text-purple-500" />;
    if (toolType === 'processing') return <Cpu className="w-3 h-3 animate-pulse text-yellow-500" />;

    // Status-specific icons
    switch (config.icon) {
      case 'connecting':
        return <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full" />;
      case 'streaming':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-3 bg-green-500 rounded-full"
                animate={{ scaleY: [1, 1.5, 1] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
        );
      case 'processing':
        return <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />;
      case 'database':
        return <Database className="w-3 h-3 animate-pulse text-blue-500" />;
      case 'search':
        return <Search className="w-3 h-3 animate-pulse text-purple-500" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'complete':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <motion.div 
      className={`flex items-center space-x-2 ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-center w-4 h-4">
        {getStatusIcon()}
      </div>
      <span className={`text-sm text-${config.color}-600 dark:text-${config.color}-400`}>
        {config.text}
      </span>
      {currentStep && totalSteps && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ({currentStep}/{totalSteps})
        </span>
      )}
    </motion.div>
  );
}

// Progressive loading dots with enhanced animations
export function ProgressiveDots({ 
  count = 3, 
  size = 'sm', 
  color = 'blue',
  className = '' 
}) {
  const sizeClasses = {
    xs: 'w-1 h-1',
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`${sizeClasses[size]} bg-${color}-500 rounded-full`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  );
}

// Enhanced card skeleton with streaming progress
export function EnhancedCardSkeleton({ 
  type = 'default', 
  showProgress = false,
  progressText = null,
  streamingState = null,
  className = '' 
}) {
  const getSkeletonContent = () => {
    switch (type) {
      case 'user':
        return (
          <div className="flex items-start space-x-3">
            <motion.div 
              className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <div className="flex-1 space-y-2">
              <motion.div 
                className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
              />
              <div className="space-y-2">
                <motion.div 
                  className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div 
                  className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                />
              </div>
            </div>
          </div>
        );
      
      case 'order':
        return (
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <motion.div 
                className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div 
                className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
              />
            </div>
            <div className="space-y-2">
              <motion.div 
                className="h-3 bg-gray-200 dark:bg-gray-700 rounded"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div 
                className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              />
            </div>
          </div>
        );
      
      default:
        return (
          <div className="space-y-3">
            <motion.div 
              className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div 
              className="h-3 bg-gray-200 dark:bg-gray-700 rounded"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
            />
            <motion.div 
              className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
          </div>
        );
    }
  };

  return (
    <motion.div 
      className={`max-w-sm mx-auto p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-md ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {(showProgress || streamingState) && (
        <div className="mb-3 flex items-center space-x-2">
          <ProgressiveDots count={3} size="sm" color="blue" />
          {progressText && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{progressText}</span>
          )}
          {streamingState?.currentTool && (
            <StreamingStatusIndicator 
              status="processing" 
              toolType={streamingState.currentTool}
              className="ml-2"
            />
          )}
        </div>
      )}
      {getSkeletonContent()}
    </motion.div>
  );
}

// Export all components
export default {
  StreamingIndicator,
  ProgressiveDataDisplay,
  ConnectionStatus,
  EnhancedSkeleton,
  DataLoadingProgress,
  BatchLoadingIndicator,
  StreamingStatusIndicator,
  ProgressiveDots,
  EnhancedCardSkeleton
};