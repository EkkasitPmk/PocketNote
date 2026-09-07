import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardAssetTitle from "./DashboardAssetTitle";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

describe("DashboardAssetTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the asset title and default link to /assets", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
      })),
    );

    render(<DashboardAssetTitle language="en" />);

    const link = screen.getByRole("link", { name: /Assets/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/assets");
  });

  it("navigates to /settings?tab=assets on desktop when clicked", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(min-width: 1024px)",
      })),
    );

    render(<DashboardAssetTitle language="en" />);

    const link = screen.getByRole("link", { name: /Assets/i });
    fireEvent.click(link);

    expect(mockPush).toHaveBeenCalledWith("/settings?tab=assets");
  });

  it("does not intercept navigation on mobile when clicked", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
      })),
    );

    render(<DashboardAssetTitle language="en" />);

    const link = screen.getByRole("link", { name: /Assets/i });
    fireEvent.click(link);

    expect(mockPush).not.toHaveBeenCalled();
  });
});
