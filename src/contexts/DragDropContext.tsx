/**
 * Contexto para drag and drop de tracks
 * 
 * Provee estado compartido entre TrackTable y Sidebar
 * para arrastrar tracks a playlists y reordenar
 * 
 * @module contexts/DragDropContext
 */
import { createContext, useContext, ReactNode } from "react";
import { useDragAndDrop, DragData, DragState } from "../hooks/useDragAndDrop";
import type { DragEvent } from "react";

interface DragDropContextValue extends DragState {
  startDrag: (data: DragData, e: DragEvent) => void;
  endDrag: () => void;
  setDropTarget: (targetId: string | null) => void;
  getDropData: (e: DragEvent) => DragData | null;
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

interface DragDropProviderProps {
  children: ReactNode;
}

/**
 * Provider para el contexto de drag and drop
 */
export const DragDropProvider = ({ children }: DragDropProviderProps) => {
  const dragDrop = useDragAndDrop();
  
  return (
    <DragDropContext.Provider value={dragDrop}>
      {children}
    </DragDropContext.Provider>
  );
};

/**
 * Hook para acceder al contexto de drag and drop
 * @throws Error si se usa fuera del provider
 */
export const useDragDropContext = (): DragDropContextValue => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error("useDragDropContext debe usarse dentro de DragDropProvider");
  }
  return context;
};

/**
 * Hook opcional que no lanza error si no hay provider
 * Útil para componentes que pueden usarse con o sin drag and drop
 */
export const useDragDropContextOptional = (): DragDropContextValue | null => {
  return useContext(DragDropContext);
};

export default DragDropContext;
