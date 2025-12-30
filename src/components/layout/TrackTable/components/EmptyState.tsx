import { Music } from 'lucide-react';

/**
 * Estado visual cuando no hay tracks en la biblioteca
 */
export const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
      <Music className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-600" />
      <p className="text-lg">No tracks in library</p>
      <p className="text-sm mt-2">Import a library to get started</p>
    </div>
  );
};
