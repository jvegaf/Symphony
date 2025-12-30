/**
 * Tests para componente CreatePlaylistDialog
 * Modal para crear nuevas playlists
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreatePlaylistDialog } from "./CreatePlaylistDialog";

// Mock invoke
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("CreatePlaylistDialog", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ id: 1 });
  });

  it("debería renderizar cuando isOpen es true", () => {
    render(<CreatePlaylistDialog {...defaultProps} />, { wrapper: createWrapper() });

    expect(screen.getByText("Crear Playlist")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nombre de la playlist")).toBeInTheDocument();
  });

  it("no debería renderizar cuando isOpen es false", () => {
    render(<CreatePlaylistDialog {...defaultProps} isOpen={false} />, {
      wrapper: createWrapper(),
    });

    expect(screen.queryByText("Crear Playlist")).not.toBeInTheDocument();
  });

  it("debería deshabilitar botón crear si nombre está vacío", () => {
    render(<CreatePlaylistDialog {...defaultProps} />, { wrapper: createWrapper() });

    const createButton = screen.getByRole("button", { name: /crear/i });
    expect(createButton).toBeDisabled();
  });

  it("debería habilitar botón crear cuando hay nombre", async () => {
    render(<CreatePlaylistDialog {...defaultProps} />, { wrapper: createWrapper() });

    const input = screen.getByPlaceholderText("Nombre de la playlist");
    await userEvent.type(input, "Mi Playlist");

    const createButton = screen.getByRole("button", { name: /crear/i });
    expect(createButton).not.toBeDisabled();
  });

  it("debería llamar onClose al cancelar", async () => {
    const onClose = vi.fn();
    render(<CreatePlaylistDialog {...defaultProps} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("debería crear playlist y llamar onSuccess", async () => {
    const onSuccess = vi.fn();
    mockInvoke.mockResolvedValue({ id: 1, name: "Test Playlist" });

    render(<CreatePlaylistDialog {...defaultProps} onSuccess={onSuccess} />, {
      wrapper: createWrapper(),
    });

    const nameInput = screen.getByPlaceholderText("Nombre de la playlist");
    await userEvent.type(nameInput, "Test Playlist");

    const createButton = screen.getByRole("button", { name: /crear/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("create_playlist", {
        name: "Test Playlist",
        description: null,
      });
    });
  });

  it("debería limpiar campos al cerrar", async () => {
    const { rerender } = render(<CreatePlaylistDialog {...defaultProps} />, {
      wrapper: createWrapper(),
    });

    const nameInput = screen.getByPlaceholderText("Nombre de la playlist");
    await userEvent.type(nameInput, "Test");

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <CreatePlaylistDialog {...defaultProps} isOpen={false} />
      </QueryClientProvider>
    );

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <CreatePlaylistDialog {...defaultProps} isOpen={true} />
      </QueryClientProvider>
    );

    const newInput = screen.getByPlaceholderText("Nombre de la playlist");
    expect(newInput).toHaveValue("");
  });
});
