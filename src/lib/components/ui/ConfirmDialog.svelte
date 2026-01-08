<script lang="ts">
  import Card from './Card.svelte';
  import Button from './Button.svelte';

  interface Props {
    /** Si el diálogo está visible */
    isOpen: boolean;
    /** Título del diálogo */
    title: string;
    /** Mensaje de confirmación */
    message: string;
    /** Callback al confirmar */
    onConfirm: () => void;
    /** Callback al cancelar */
    onCancel: () => void;
    /** Texto del botón confirmar (default: "Confirmar") */
    confirmText?: string;
    /** Texto del botón cancelar (default: "Cancelar") */
    cancelText?: string;
    /** Variante visual (default o destructive) */
    variant?: "default" | "destructive";
    /** Estado de carga durante confirmación */
    isLoading?: boolean;
  }

  /**
   * Modal de confirmación reutilizable
   * 
   * AIDEV-NOTE: Migrado de React a Svelte 5
   * - React.FC<Props> → let { ...props } = $props()
   * - Early return → {#if isOpen}
   * - onClick → onclick
   * - className → class (con lógica condicional)
   * - disabled={isLoading} se mantiene igual
   * 
   * @example
   * <ConfirmDialog 
   *   isOpen={showDialog} 
   *   title="¿Eliminar?" 
   *   message="Esta acción no se puede deshacer"
   *   onConfirm={handleDelete}
   *   onCancel={() => showDialog = false}
   *   variant="destructive"
   * />
   */
  let { 
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "default",
    isLoading = false,
  }: Props = $props();

  const confirmButtonClass = $derived(
    variant === "destructive"
      ? "bg-red-600 hover:bg-red-700"
      : ""
  );
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <Card class="w-full max-w-md p-6">
      <h3 class="text-xl font-bold mb-4">{title}</h3>
      <p class="mb-6 text-gray-600 dark:text-gray-400">{message}</p>
      <div class="flex justify-end space-x-2">
        <Button variant="secondary" onclick={onCancel}>
          {cancelText}
        </Button>
        <Button
          variant="primary"
          onclick={onConfirm}
          disabled={isLoading}
          class={confirmButtonClass}
        >
          {confirmText}
        </Button>
      </div>
    </Card>
  </div>
{/if}
