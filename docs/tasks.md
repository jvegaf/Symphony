# Tasks - Symphony Milestone 0

## Milestone 0: Setup Inicial (Semana 1)

**Objetivo:** Establecer la base técnica del proyecto con estructura de directorios, configuración de herramientas, setup de testing y CI/CD.

**Criterios de Éxito:**
- ✅ Proyecto Tauri + React funcional con build exitoso
- ✅ Tests configurados con cobertura del 80%
- ✅ Base de datos SQLite con esquema inicial
- ✅ CI/CD funcional para builds automáticos
- ✅ Documentación completa de setup

---

## Tarea 1: Inicializar Proyecto Tauri con React y TypeScript

**Prioridad:** Alta  
**Dependencias:** Ninguna  
**Estimación:** 2 horas  

### Descripción
Crear estructura base del proyecto usando el CLI de Tauri con plantilla de React y TypeScript.

### Pasos de Implementación

1. **Instalar prerrequisitos**
   ```bash
   # Verificar instalación de Rust
   rustc --version
   cargo --version
   
   # Verificar Node.js 18+
   node --version
   npm --version
   ```

2. **Crear proyecto Tauri**
   ```bash
   npm create tauri-app@latest
   # Opciones:
   # - Project name: symphony
   # - Package manager: npm
   # - Frontend template: React + TypeScript
   # - Tauri version: 2.0
   ```

3. **Verificar estructura generada**
   ```
   symphony/
   ├── src/              # Frontend React
   ├── src-tauri/        # Backend Rust
   ├── package.json
   ├── tsconfig.json
   └── vite.config.ts
   ```

4. **Configurar TypeScript strict mode**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noImplicitReturns": true,
       "noFallthroughCasesInSwitch": true
     }
   }
   ```

5. **Probar build**
   ```bash
   npm install
   npm run tauri dev    # Verificar modo desarrollo
   npm run build        # Verificar build de producción
   ```

### Resultado Esperado
- Aplicación Tauri funcional con ventana vacía
- Build exitoso sin errores de TypeScript
- Hot reload funcionando en modo dev

### Validación
- [ ] `npm run tauri dev` abre ventana de aplicación
- [ ] No hay errores de TypeScript
- [ ] Build de producción genera ejecutable

---

## Tarea 2: Configurar Tailwind CSS y Setup UI Base

**Prioridad:** Alta  
**Dependencias:** Tarea 1  
**Estimación:** 3 horas  

### Descripción
Instalar y configurar Tailwind CSS con soporte para modo oscuro y crear componentes base de UI.

### Pasos de Implementación

1. **Instalar Tailwind CSS**
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

2. **Configurar Tailwind**
   ```javascript
   // tailwind.config.js
   export default {
     content: [
       "./index.html",
       "./src/**/*.{js,ts,jsx,tsx}",
     ],
     darkMode: 'class',
     theme: {
       extend: {
         colors: {
           primary: { /* colores personalizados */ },
           background: { /* colores de fondo */ },
         },
       },
     },
     plugins: [],
   }
   ```

3. **Agregar directivas Tailwind**
   ```css
   /* src/styles/globals.css */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   
   @layer base {
     body {
       @apply bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100;
     }
   }
   ```

4. **Crear estructura de componentes base**
   ```
   src/
   ├── components/
   │   └── ui/
   │       ├── Button.tsx
   │       ├── Input.tsx
   │       ├── Card.tsx
   │       └── Modal.tsx
   └── styles/
       ├── globals.css
       └── themes.css
   ```

5. **Implementar componentes base**
   ```typescript
   // src/components/ui/Button.tsx
   interface ButtonProps {
     variant?: 'primary' | 'secondary';
     children: React.ReactNode;
     onClick?: () => void;
   }
   
   export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, onClick }) => {
     // Implementación con Tailwind classes
   };
   ```

6. **Configurar modo oscuro**
   ```typescript
   // src/hooks/useTheme.ts
   export const useTheme = () => {
     const [theme, setTheme] = useState<'light' | 'dark'>('dark');
     
     useEffect(() => {
       if (theme === 'dark') {
         document.documentElement.classList.add('dark');
       } else {
         document.documentElement.classList.remove('dark');
       }
     }, [theme]);
     
     return { theme, setTheme };
   };
   ```

### Resultado Esperado
- Tailwind funcionando con clases aplicadas correctamente
- Modo oscuro cambiable dinámicamente
- Componentes base reutilizables documentados

### Validación
- [ ] Clases Tailwind se aplican correctamente
- [ ] Modo oscuro funciona con toggle
- [ ] Componentes base renderizan correctamente
- [ ] No hay errores de TypeScript

---

## Tarea 3: Setup de Testing (Vitest + Cargo Test)

**Prioridad:** Alta  
**Dependencias:** Tarea 1, Tarea 2  
**Estimación:** 4 horas  

### Descripción
Configurar frameworks de testing para frontend (Vitest) y backend (cargo test) con objetivo de cobertura del 80%.

### Pasos de Implementación

1. **Instalar Vitest y dependencias**
   ```bash
   npm install -D vitest @vitest/ui jsdom
   npm install -D @testing-library/react @testing-library/jest-dom
   npm install -D @testing-library/user-event
   npm install -D @vitest/coverage-v8
   ```

2. **Configurar Vitest**
   ```typescript
   // vitest.config.ts
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   
   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: ['./src/test/setup.ts'],
       coverage: {
         provider: 'v8',
         reporter: ['text', 'html', 'json'],
         exclude: [
           'node_modules/',
           'src/test/',
           '**/*.test.{ts,tsx}',
         ],
         thresholds: {
           lines: 80,
           functions: 80,
           branches: 80,
           statements: 80,
         },
       },
     },
   });
   ```

3. **Crear archivos de setup**
   ```typescript
   // src/test/setup.ts
   import '@testing-library/jest-dom';
   import { vi } from 'vitest';
   
   // Mock Tauri API
   vi.mock('@tauri-apps/api/tauri', () => ({
     invoke: vi.fn(),
   }));
   
   vi.mock('@tauri-apps/api/event', () => ({
     listen: vi.fn(),
   }));
   ```

4. **Crear test de ejemplo**
   ```typescript
   // src/components/ui/Button.test.tsx
   import { describe, it, expect, vi } from 'vitest';
   import { render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import { Button } from './Button';
   
   describe('Button', () => {
     it('debería renderizar correctamente', () => {
       render(<Button>Click me</Button>);
       expect(screen.getByText('Click me')).toBeInTheDocument();
     });
     
     it('debería llamar onClick cuando se hace click', async () => {
       const handleClick = vi.fn();
       render(<Button onClick={handleClick}>Click me</Button>);
       
       await userEvent.click(screen.getByText('Click me'));
       expect(handleClick).toHaveBeenCalledOnce();
     });
   });
   ```

5. **Configurar scripts de testing**
   ```json
   // package.json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest --coverage",
       "test:run": "vitest run"
     }
   }
   ```

6. **Configurar cargo test**
   ```toml
   # src-tauri/Cargo.toml
   [dev-dependencies]
   tokio = { version = "1", features = ["full", "test-util"] }
   ```

7. **Crear test de ejemplo en Rust**
   ```rust
   // src-tauri/src/lib.rs
   #[cfg(test)]
   mod tests {
       use super::*;
   
       #[test]
       fn test_example() {
           assert_eq!(2 + 2, 4);
       }
   }
   ```

8. **Instalar cargo-tarpaulin para cobertura**
   ```bash
   cargo install cargo-tarpaulin
   ```

### Resultado Esperado
- Tests frontend ejecutables con `npm test`
- Tests backend ejecutables con `cargo test`
- Reporte de cobertura generado
- Tests pasan al 100%

### Validación
- [ ] `npm test` ejecuta tests sin errores
- [ ] `npm run test:coverage` genera reporte
- [ ] `cargo test` ejecuta tests de Rust
- [ ] `cargo tarpaulin` genera reporte de cobertura
- [ ] Cobertura inicial ≥ 80%

---

## Tarea 4: Implementar Esquema SQLite Inicial

**Prioridad:** Alta  
**Dependencias:** Tarea 1  
**Estimación:** 4 horas  

### Descripción
Crear base de datos SQLite con esquema completo: tracks, waveforms, beatgrids, cue_points, loops, playlists, playlist_tracks, settings.

### Pasos de Implementación

1. **Agregar dependencias de SQLite**
   ```toml
   # src-tauri/Cargo.toml
   [dependencies]
   rusqlite = { version = "0.31", features = ["bundled"] }
   serde = { version = "1.0", features = ["derive"] }
   serde_json = "1.0"
   thiserror = "1.0"
   ```

2. **Crear módulo de base de datos**
   ```
   src-tauri/src/
   └── db/
       ├── mod.rs
       ├── schema.rs
       ├── models.rs
       ├── queries.rs
       └── migrations/
           └── 001_initial_schema.sql
   ```

3. **Definir esquema SQL**
   ```sql
   -- src-tauri/src/db/migrations/001_initial_schema.sql
   -- (Ver diseño completo en design.md)
   
   CREATE TABLE tracks ( ... );
   CREATE TABLE waveforms ( ... );
   CREATE TABLE beatgrids ( ... );
   CREATE TABLE cue_points ( ... );
   CREATE TABLE loops ( ... );
   CREATE TABLE playlists ( ... );
   CREATE TABLE playlist_tracks ( ... );
   CREATE TABLE settings ( ... );
   
   -- Índices
   CREATE INDEX idx_tracks_artist ON tracks(artist);
   -- ... más índices
   
   -- Triggers
   CREATE TRIGGER update_tracks_timestamp ...
   ```

4. **Implementar modelos de datos**
   ```rust
   // src-tauri/src/db/models.rs
   use serde::{Deserialize, Serialize};
   
   #[derive(Debug, Clone, Serialize, Deserialize)]
   pub struct Track {
       pub id: i64,
       pub path: String,
       pub title: String,
       pub artist: String,
       // ... más campos
   }
   
   #[derive(Debug, Clone, Serialize, Deserialize)]
   pub struct Playlist {
       pub id: i64,
       pub name: String,
       // ... más campos
   }
   ```

5. **Implementar sistema de migraciones**
   ```rust
   // src-tauri/src/db/schema.rs
   use rusqlite::{Connection, Result};
   
   pub fn initialize_database(conn: &Connection) -> Result<()> {
       // Crear tabla de migraciones
       conn.execute(
           "CREATE TABLE IF NOT EXISTS migrations (
               version INTEGER PRIMARY KEY,
               applied_at TEXT DEFAULT CURRENT_TIMESTAMP
           )",
           [],
       )?;
       
       // Aplicar migraciones
       apply_migration(conn, 1, include_str!("migrations/001_initial_schema.sql"))?;
       
       // Habilitar WAL mode para mejor concurrencia
       conn.execute("PRAGMA journal_mode=WAL", [])?;
       conn.execute("PRAGMA synchronous=NORMAL", [])?;
       
       Ok(())
   }
   
   fn apply_migration(conn: &Connection, version: i64, sql: &str) -> Result<()> {
       let applied: bool = conn
           .query_row(
               "SELECT 1 FROM migrations WHERE version = ?1",
               [version],
               |_| Ok(true),
           )
           .unwrap_or(false);
       
       if !applied {
           conn.execute_batch(sql)?;
           conn.execute(
               "INSERT INTO migrations (version) VALUES (?1)",
               [version],
           )?;
       }
       
       Ok(())
   }
   ```

6. **Crear queries básicas**
   ```rust
   // src-tauri/src/db/queries.rs
   use rusqlite::{Connection, Result};
   use super::models::Track;
   
   pub fn insert_track(conn: &Connection, track: &Track) -> Result<i64> {
       conn.execute(
           "INSERT INTO tracks (path, title, artist, duration, bitrate, format)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
           (&track.path, &track.title, &track.artist, track.duration, track.bitrate, &track.format),
       )?;
       Ok(conn.last_insert_rowid())
   }
   
   pub fn get_all_tracks(conn: &Connection) -> Result<Vec<Track>> {
       let mut stmt = conn.prepare("SELECT * FROM tracks ORDER BY artist, title")?;
       let tracks = stmt.query_map([], |row| {
           Ok(Track {
               id: row.get(0)?,
               path: row.get(1)?,
               title: row.get(2)?,
               artist: row.get(3)?,
               // ... mapear más campos
           })
       })?;
       tracks.collect()
   }
   ```

7. **Inicializar DB en main.rs**
   ```rust
   // src-tauri/src/main.rs
   use std::sync::Mutex;
   use rusqlite::Connection;
   
   mod db;
   
   fn main() {
       let db_path = /* obtener path de app data */;
       let conn = Connection::open(db_path).expect("Failed to open database");
       
       db::schema::initialize_database(&conn).expect("Failed to initialize database");
       
       tauri::Builder::default()
           .manage(Mutex::new(conn))
           .run(tauri::generate_context!())
           .expect("error while running tauri application");
   }
   ```

8. **Crear tests**
   ```rust
   // src-tauri/src/db/queries.rs
   #[cfg(test)]
   mod tests {
       use super::*;
       use rusqlite::Connection;
   
       #[test]
       fn test_insert_and_get_track() {
           let conn = Connection::open_in_memory().unwrap();
           crate::db::schema::initialize_database(&conn).unwrap();
           
           let track = Track {
               id: 0,
               path: "/music/test.mp3".to_string(),
               title: "Test Track".to_string(),
               artist: "Test Artist".to_string(),
               duration: 180.0,
               bitrate: 320,
               format: "mp3".to_string(),
           };
           
           let id = insert_track(&conn, &track).unwrap();
           assert!(id > 0);
           
           let tracks = get_all_tracks(&conn).unwrap();
           assert_eq!(tracks.len(), 1);
           assert_eq!(tracks[0].title, "Test Track");
       }
   }
   ```

### Resultado Esperado
- Base de datos SQLite funcional con esquema completo
- Migraciones ejecutables
- Queries básicas implementadas y testeadas
- Tests pasando al 100%

### Validación
- [ ] Base de datos se crea correctamente
- [ ] Todas las tablas existen
- [ ] Índices creados
- [ ] Tests de queries pasan
- [ ] No hay errores de compilación

---

## Tarea 5: Configurar CI/CD con GitHub Actions

**Prioridad:** Media  
**Dependencias:** Tarea 1, Tarea 3  
**Estimación:** 3 horas  

### Descripción
Setup de workflows de GitHub Actions para builds automáticos, testing y releases en Windows y Linux.

### Pasos de Implementación

1. **Crear estructura de workflows**
   ```
   .github/
   └── workflows/
       ├── ci.yml          # Tests y linting
       ├── build.yml       # Builds de desarrollo
       └── release.yml     # Releases oficiales
   ```

2. **Workflow de CI (Tests)**
   ```yaml
   # .github/workflows/ci.yml
   name: CI
   
   on:
     push:
       branches: [ main ]
     pull_request:
       branches: [ main ]
   
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '18'
             cache: 'npm'
         
         - name: Setup Rust
           uses: dtolnay/rust-toolchain@stable
         
         - name: Install dependencies
           run: npm ci
         
         - name: Run frontend tests
           run: npm run test:run
         
         - name: Run backend tests
           working-directory: ./src-tauri
           run: cargo test
         
         - name: Check coverage
           run: npm run test:coverage
         
         - name: Upload coverage reports
           uses: codecov/codecov-action@v3
   ```

3. **Workflow de Build**
   ```yaml
   # .github/workflows/build.yml
   name: Build
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     build:
       strategy:
         matrix:
           os: [ubuntu-latest, windows-latest]
       runs-on: ${{ matrix.os }}
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '18'
         
         - name: Setup Rust
           uses: dtolnay/rust-toolchain@stable
         
         - name: Install dependencies (Ubuntu)
           if: matrix.os == 'ubuntu-latest'
           run: |
             sudo apt-get update
             sudo apt-get install -y libwebkit2gtk-4.0-dev \
               build-essential \
               curl \
               wget \
               libssl-dev \
               libgtk-3-dev \
               libayatana-appindicator3-dev \
               librsvg2-dev
         
         - name: Install dependencies
           run: npm ci
         
         - name: Build application
           run: npm run tauri build
         
         - name: Upload artifacts
           uses: actions/upload-artifact@v3
           with:
             name: symphony-${{ matrix.os }}
             path: |
               src-tauri/target/release/bundle/**/*
   ```

4. **Workflow de Release**
   ```yaml
   # .github/workflows/release.yml
   name: Release
   
   on:
     push:
       tags:
         - 'v*'
   
   jobs:
     release:
       strategy:
         matrix:
           os: [ubuntu-latest, windows-latest]
       runs-on: ${{ matrix.os }}
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '18'
         
         - name: Setup Rust
           uses: dtolnay/rust-toolchain@stable
         
         - name: Install dependencies (Ubuntu)
           if: matrix.os == 'ubuntu-latest'
           run: |
             sudo apt-get update
             sudo apt-get install -y libwebkit2gtk-4.0-dev \
               build-essential \
               curl \
               wget \
               libssl-dev \
               libgtk-3-dev \
               libayatana-appindicator3-dev \
               librsvg2-dev
         
         - name: Install dependencies
           run: npm ci
         
         - name: Build application
           run: npm run tauri build
         
         - name: Create Release
           uses: softprops/action-gh-release@v1
           with:
             files: |
               src-tauri/target/release/bundle/**/*
             draft: false
             prerelease: false
           env:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```

5. **Agregar badges al README**
   ```markdown
   # Symphony
   
   [![CI](https://github.com/jvegaf/Symphony/workflows/CI/badge.svg)](https://github.com/jvegaf/Symphony/actions)
   [![Build](https://github.com/jvegaf/Symphony/workflows/Build/badge.svg)](https://github.com/jvegaf/Symphony/actions)
   [![codecov](https://codecov.io/gh/jvegaf/Symphony/branch/main/graph/badge.svg)](https://codecov.io/gh/jvegaf/Symphony)
   ```

### Resultado Esperado
- Workflows ejecutándose automáticamente en push/PR
- Builds exitosos en Windows y Linux
- Coverage reports subidos a Codecov
- Releases automáticos con tag de versión

### Validación
- [ ] Workflow de CI ejecuta en cada push
- [ ] Tests pasan en CI
- [ ] Builds generan artefactos correctamente
- [ ] Release workflow se activa con tags
- [ ] Badges en README funcionan

---

## Checklist Final del Milestone 0

### Estructura del Proyecto
- [ ] Proyecto Tauri inicializado correctamente
- [ ] TypeScript configurado en modo strict
- [ ] Estructura de directorios según design.md

### Desarrollo Frontend
- [ ] Tailwind CSS instalado y funcionando
- [ ] Modo oscuro implementado
- [ ] Componentes base de UI creados
- [ ] Tests de componentes pasando

### Desarrollo Backend
- [ ] Base de datos SQLite funcionando
- [ ] Esquema completo implementado
- [ ] Migraciones funcionando
- [ ] Queries básicas implementadas
- [ ] Tests de Rust pasando

### Testing
- [ ] Vitest configurado
- [ ] React Testing Library setup
- [ ] cargo test funcionando
- [ ] Cobertura ≥ 80%
- [ ] Scripts de testing en package.json

### CI/CD
- [ ] Workflow de CI funcionando
- [ ] Workflow de Build funcionando
- [ ] Workflow de Release configurado
- [ ] Badges en README

### Documentación
- [ ] requirements.md completo
- [ ] design.md completo
- [ ] tasks.md completo (este documento)
- [ ] README.md actualizado con instrucciones

---

## Próximos Pasos (Milestone 1)

Una vez completado el Milestone 0, proceder con:

1. **Milestone 1 - Core Audio (Semanas 2-3)**
   - Implementar decodificador de audio con Symphonia
   - Crear reproductor con Rodio
   - Generar waveforms
   - Comandos Tauri de audio
   - UI de AudioPlayer y WaveformViewer

Ver [implementation-plan.md](./implementation-plan.md) para detalles completos.

---

## Referencias

- [Requisitos](./requirements.md)
- [Diseño Arquitectónico](./design.md)
- [Plan de Implementación](./implementation-plan.md)
- [Estándares de Testing](./.github/instructions/testing.instructions.md)
- [Estándares de Git](./.github/instructions/git-workflow.instructions.md)
