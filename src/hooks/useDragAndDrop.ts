/**
 * Hook para manejar drag and drop de tracks
 *
 * Soporta:
 * - Arrastrar tracks a playlists (agregar)
 * - Reordenar tracks dentro de una playlist
 *
 * @module hooks/useDragAndDrop
 */
import { useState, useCallback, DragEvent } from "react";

/** Tipos de elementos que se pueden arrastrar */
export type DragItemType = "tracks" | "playlist-track";

/** Datos del elemento siendo arrastrado */
export interface DragData {
  type: DragItemType;
  trackIds: string[];
  /** Índice original (solo para reordenamiento) */
  sourceIndex?: number;
}

/** Estado del drag and drop */
export interface DragState {
  isDragging: boolean;
  dragData: DragData | null;
  dropTargetId: string | null;
}

/**
 * Hook para manejar estado global de drag and drop
 */
export const useDragAndDrop = () => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragData: null,
    dropTargetId: null,
  });

  /**
   * Inicia el drag con los datos del elemento
   */
  const startDrag = useCallback((data: DragData, e: DragEvent) => {
    // Configurar datos para el evento nativo
    e.dataTransfer.setData("application/json", JSON.stringify(data));
    e.dataTransfer.effectAllowed = "move";

    setDragState({
      isDragging: true,
      dragData: data,
      dropTargetId: null,
    });
  }, []);

  /**
   * Finaliza el drag
   */
  const endDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      dragData: null,
      dropTargetId: null,
    });
  }, []);

  /**
   * Actualiza el target actual del drop
   */
  const setDropTarget = useCallback((targetId: string | null) => {
    setDragState((prev) => ({
      ...prev,
      dropTargetId: targetId,
    }));
  }, []);

  /**
   * Extrae datos del evento de drop
   */
  const getDropData = useCallback((e: DragEvent): DragData | null => {
    try {
      const jsonData = e.dataTransfer.getData("application/json");
      if (jsonData) {
        return JSON.parse(jsonData) as DragData;
      }
    } catch {
      // Ignorar errores de parsing
    }
    return null;
  }, []);

  return {
    ...dragState,
    startDrag,
    endDrag,
    setDropTarget,
    getDropData,
  };
};

export default useDragAndDrop;
