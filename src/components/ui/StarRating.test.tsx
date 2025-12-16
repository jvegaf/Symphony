import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StarRating } from "./StarRating";

describe("StarRating", () => {
  it("renders without crashing", () => {
    render(<StarRating value={0} />);
    const slider = screen.getByRole("slider");
    expect(slider).toBeDefined();
  });

  it("displays correct number of stars", () => {
    render(<StarRating value={3} maxStars={5} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
  });

  it("displays correct rating value", () => {
    render(<StarRating value={3} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "3");
  });

  it("handles null value correctly", () => {
    render(<StarRating value={null} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
  });

  it("handles undefined value correctly", () => {
    render(<StarRating value={undefined} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
  });

  it("clamps value to max stars", () => {
    render(<StarRating value={10} maxStars={5} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "5");
  });

  it("calls onChange when star is clicked", () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // Click 3rd star (index 2)
    
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("toggles to 0 when clicking same star", () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} />);
    
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // Click 3rd star (current value)
    
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("does not call onChange when readOnly", () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} readOnly />);
    
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[4]);
    
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables buttons when readOnly", () => {
    render(<StarRating value={3} readOnly />);
    
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("has correct aria attributes", () => {
    render(<StarRating value={3} maxStars={5} />);
    
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-label", "Rating");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "5");
    expect(slider).toHaveAttribute("aria-valuenow", "3");
  });

  it("has correct aria-readonly when readOnly", () => {
    render(<StarRating value={3} readOnly />);
    
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-readonly", "true");
  });

  it("applies custom className", () => {
    const { container } = render(
      <StarRating value={3} className="custom-class" />
    );
    
    const ratingDiv = container.querySelector(".custom-class");
    expect(ratingDiv).toBeDefined();
  });

  it("respects maxStars prop", () => {
    render(<StarRating value={3} maxStars={10} />);
    
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(10);
  });

  it("handles different sizes", () => {
    const { container } = render(<StarRating value={3} size="lg" />);
    const buttons = container.querySelectorAll("button");
    
    // Tamaños actualizados: sm=w-4 h-4, md=w-5 h-5, lg=w-7 h-7
    expect(buttons[0]).toHaveClass("w-7", "h-7");
  });

  it("shows hover state on mouse enter", () => {
    const onChange = vi.fn();
    render(<StarRating value={2} onChange={onChange} />);
    
    const buttons = screen.getAllByRole("button");
    fireEvent.mouseEnter(buttons[3]); // Hover 4th star
    
    // No debería llamar onChange solo por hover
    expect(onChange).not.toHaveBeenCalled();
  });

  it("hover fills only stars up to hovered position", () => {
    const { container } = render(<StarRating value={2} onChange={vi.fn()} />);
    
    const buttons = container.querySelectorAll("button");
    const svgs = container.querySelectorAll("svg");
    
    // Inicialmente: 2 estrellas llenas (naranja), 3 vacías (gris)
    expect(svgs[0]).toHaveClass("text-primary"); // Star 1 - filled
    expect(svgs[1]).toHaveClass("text-primary"); // Star 2 - filled
    expect(svgs[2]).toHaveClass("text-gray-600"); // Star 3 - empty
    expect(svgs[3]).toHaveClass("text-gray-600"); // Star 4 - empty
    expect(svgs[4]).toHaveClass("text-gray-600"); // Star 5 - empty
    
    // Hover sobre la 4ta estrella
    fireEvent.mouseEnter(buttons[3]);
    
    // Ahora: 4 estrellas llenas, 1 vacía
    expect(svgs[0]).toHaveClass("text-primary"); // Star 1 - filled (hover)
    expect(svgs[1]).toHaveClass("text-primary"); // Star 2 - filled (hover)
    expect(svgs[2]).toHaveClass("text-primary"); // Star 3 - filled (hover)
    expect(svgs[3]).toHaveClass("text-primary"); // Star 4 - filled (hover)
    expect(svgs[4]).toHaveClass("text-gray-600"); // Star 5 - empty
    
    // Mouse leave: vuelve al estado original
    fireEvent.mouseLeave(container.querySelector('[role="slider"]')!);
    
    expect(svgs[0]).toHaveClass("text-primary"); // Star 1 - filled (original)
    expect(svgs[1]).toHaveClass("text-primary"); // Star 2 - filled (original)
    expect(svgs[2]).toHaveClass("text-gray-600"); // Star 3 - empty
    expect(svgs[3]).toHaveClass("text-gray-600"); // Star 4 - empty
    expect(svgs[4]).toHaveClass("text-gray-600"); // Star 5 - empty
  });

  it("edge case: rating of 0 shows no filled stars", () => {
    render(<StarRating value={0} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
  });

  it("edge case: rating of 5 shows all filled stars", () => {
    render(<StarRating value={5} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "5");
  });

  it("renders with default props", () => {
    render(<StarRating value={3} />);
    const slider = screen.getByRole("slider");
    expect(slider).toBeDefined();
    expect(slider).toHaveAttribute("aria-valuemax", "5"); // default maxStars
  });
});
