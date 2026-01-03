import { useGetAllSettings, useUpdateSetting } from '../useSettings';

/**
 * Hook para gestionar el estado de primer arranque de la aplicación
 *
 * Este hook determina si es la primera vez que se ejecuta la app
 * y proporciona una función para marcar la configuración inicial como completada.
 *
 * @returns {Object} Estado y funciones del primer arranque
 * @returns {boolean} isFirstRun - true si es el primer arranque (firstRunCompleted === false)
 * @returns {boolean} isLoading - true mientras se cargan los settings
 * @returns {Function} completeFirstRun - Función para marcar el primer arranque como completado
 * @returns {boolean} isUpdating - true mientras se actualiza el setting
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isFirstRun, completeFirstRun, isLoading } = useFirstRun();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <>
 *       {isFirstRun && <OnboardingModal onComplete={completeFirstRun} />}
 *       <MainApp />
 *     </>
 *   );
 * }
 * ```
 */
export function useFirstRun() {
  const { data: settings, isLoading } = useGetAllSettings();
  const updateSetting = useUpdateSetting();

  // AIDEV-NOTE: isFirstRun es true cuando el flag NO está completado
  const isFirstRun = settings?.app.firstRunCompleted === false;

  /**
   * Marca el primer arranque como completado
   * Esto evitará que el onboarding se muestre en futuros arranques
   */
  const completeFirstRun = () => {
    updateSetting.mutate({
      key: 'app.first_run_completed',
      value: 'true',
      valueType: 'boolean',
    });
  };

  return {
    isFirstRun,
    isLoading,
    completeFirstRun,
    isUpdating: updateSetting.isPending,
  };
}
