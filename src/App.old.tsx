import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";
import { Card } from "./components/ui/Card";
import { useTheme } from "./hooks/useTheme";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const { theme, toggleTheme } = useTheme();

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Symphony
          </h1>
          <Button variant="secondary" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'} Cambiar tema
          </Button>
        </div>

        <Card title="Bienvenido a Tauri + React + Tailwind">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Esta es una aplicación de demostración con Tailwind CSS configurado.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              greet();
            }}
            className="space-y-4"
          >
            <Input
              label="Ingresa un nombre"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Tu nombre..."
            />
            <Button type="submit" variant="primary">
              Saludar
            </Button>
          </form>

          {greetMsg && (
            <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-md">
              <p className="text-primary-900 dark:text-primary-100">{greetMsg}</p>
            </div>
          )}
        </Card>

        <Card title="Componentes de UI">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Botones</h4>
              <div className="flex gap-2">
                <Button variant="primary">Primario</Button>
                <Button variant="secondary">Secundario</Button>
                <Button variant="primary" disabled>Deshabilitado</Button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Inputs</h4>
              <Input placeholder="Input normal" />
              <div className="mt-2">
                <Input label="Con etiqueta" placeholder="Escribe algo..." />
              </div>
              <div className="mt-2">
                <Input label="Con error" error="Este campo es requerido" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default App;
