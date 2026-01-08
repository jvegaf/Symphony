<script lang="ts">
/**
 * Componente Toast para notificaciones
 *
 * Muestra notificaciones temporales en la esquina superior derecha.
 * Se cierra automáticamente después de la duración especificada.
 *
 * @example
 * ```svelte
 * <Toast
 *   message="Error al reproducir archivo"
 *   type="error"
 *   duration={5000}
 *   onClose={() => setError(null)}
 * />
 * ```
 */

interface Props {
	/** Mensaje a mostrar */
	message: string;
	/** Tipo de toast (error, success, info, warning) */
	type?: 'error' | 'success' | 'info' | 'warning';
	/** Duración en milisegundos (0 = permanente) */
	duration?: number;
	/** Callback al cerrar */
	onClose?: () => void;
}

let { message, type = 'info', duration = 5000, onClose }: Props = $props();

let isVisible = $state(true);

// Auto-close after duration
$effect(() => {
	if (duration > 0) {
		const timer = setTimeout(() => {
			isVisible = false;
			onClose?.();
		}, duration);

		return () => clearTimeout(timer);
	}
});

const handleClose = () => {
	isVisible = false;
	onClose?.();
};

const bgColorClass = {
	error: 'bg-red-600',
	success: 'bg-green-600',
	info: 'bg-blue-600',
	warning: 'bg-yellow-600'
}[type];

const iconClass = {
	error: '❌',
	success: '✅',
	info: 'ℹ️',
	warning: '⚠️'
}[type];
</script>

{#if isVisible}
	<div class="fixed right-4 top-4 z-50 animate-slide-in">
		<div class="flex items-center gap-3 rounded-lg {bgColorClass} px-4 py-3 text-white shadow-lg">
			<span class="text-lg">{iconClass}</span>
			<p class="text-sm font-medium">{message}</p>
			<button
				type="button"
				onclick={handleClose}
				class="ml-2 text-white/80 transition-colors hover:text-white"
				aria-label="Cerrar notificación"
			>
				✕
			</button>
		</div>
	</div>
{/if}
