import { RefreshCw } from 'lucide-react';

/**
 * Estado visual durante carga de tracks
 */
export const LoadingState = () => {
  return (
    <div className="flex items-center justify-center py-12">
      <RefreshCw className="animate-spin w-8 h-8 text-blue-500 dark:text-blue-400" />
      <span className="ml-3 text-gray-700 dark:text-gray-300">Loading tracks...</span>
    </div>
  );
};
