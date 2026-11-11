import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPassword from "../ui/resetPassword";
import { useSearchParams } from "next/navigation";
import { useResetPassword } from "../hooks/useResetPassword";

jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(),
}));

jest.mock("../hooks/useResetPassword", () => ({
  useResetPassword: jest.fn(),
}));

const mockedUseSearchParams = useSearchParams as jest.Mock;
const mockedUseResetPassword = useResetPassword as jest.Mock;

const mockHandleFormSubmit = jest.fn((e) => e.preventDefault());

const defaultFormData = {
  newPassword: "",
  confirmedPassword: "",
};

function mockSearchParams(token: string | null = "reset-token-123") {
  mockedUseSearchParams.mockReturnValue({
    get: jest.fn((key: string) => {
      if (key === "token") return token;
      return null;
    }),
  });
}

function mockUseResetPasswordWithState(overrides = {}) {
  mockedUseResetPassword.mockImplementation(() => {
    const [formData, setFormData] = React.useState(defaultFormData);

    return {
      isPending: false,
      handleFormSubmit: mockHandleFormSubmit,
      formData,
      setFormData,
      validationErrors: {},
      isFormValid: true,
      ...overrides,
    };
  });
}

const getNewPasswordInput = () => screen.getByTestId("new-password");
const getConfirmPasswordInput = () => screen.getByTestId("confirm-password");

describe("ResetPassword", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams("reset-token-123");
    mockUseResetPasswordWithState();
  });

  it("passes token from search params to useResetPassword", () => {
    render(<ResetPassword />);

    expect(mockedUseResetPassword).toHaveBeenCalledWith("reset-token-123");
  });

  it("passes null token to useResetPassword when token is missing", () => {
    mockSearchParams(null);

    render(<ResetPassword />);

    expect(mockedUseResetPassword).toHaveBeenCalledWith(null);
  });

  it("renders reset password form content", () => {
    render(<ResetPassword />);

    expect(screen.getByRole("heading", { name: /set a new password/i })).toBeInTheDocument();

    expect(
      screen.getByText(
        /your new password must be different from your previous one/i,
      ),
    ).toBeInTheDocument();

    expect(getNewPasswordInput()).toBeInTheDocument();
    expect(getConfirmPasswordInput()).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /update password/i }),
    ).toBeInTheDocument();
  });

  it("updates new password and confirm password inputs", async () => {
    const user = userEvent.setup();

    render(<ResetPassword />);

    await user.type(getNewPasswordInput(), "newPassword123");
    await user.type(getConfirmPasswordInput(), "newPassword123");

    expect(getNewPasswordInput()).toHaveValue("newPassword123");
    expect(getConfirmPasswordInput()).toHaveValue("newPassword123");
  });

  it("calls handleFormSubmit when form is submitted", async () => {
    const user = userEvent.setup();

    render(<ResetPassword />);

    await user.type(getNewPasswordInput(), "newPassword123");
    await user.type(getConfirmPasswordInput(), "newPassword123");

    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(mockHandleFormSubmit).toHaveBeenCalledTimes(1);
  });

  it("keeps the submit button enabled when the form is invalid so errors can be shown", () => {
    mockedUseResetPassword.mockReturnValue({
      isPending: false,
      handleFormSubmit: mockHandleFormSubmit,
      formData: defaultFormData,
      setFormData: jest.fn(),
      validationErrors: {},
      isFormValid: false,
    });

    render(<ResetPassword />);

    // A disabled button gives no feedback; the hook shows field errors instead.
    expect(
      screen.getByRole("button", { name: /update password/i }),
    ).toBeEnabled();
  });

  it("shows an invalid-link message instead of the form when the token is missing", () => {
    mockedUseResetPassword.mockReturnValue({
      isPending: false,
      handleFormSubmit: mockHandleFormSubmit,
      formData: defaultFormData,
      setFormData: jest.fn(),
      validationErrors: {},
      isFormValid: false,
      hasToken: false,
    });

    render(<ResetPassword />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /this reset link is invalid or incomplete/i,
    );
    expect(
      screen.getByRole("link", { name: /request a new reset link/i }),
    ).toHaveAttribute("href", "/auth/forgot-password");
    expect(
      screen.queryByRole("button", { name: /update password/i }),
    ).not.toBeInTheDocument();
  });

  it("shows loading state when reset password is pending", () => {
    mockedUseResetPassword.mockReturnValue({
      isPending: true,
      handleFormSubmit: mockHandleFormSubmit,
      formData: defaultFormData,
      setFormData: jest.fn(),
      validationErrors: {},
      isFormValid: true,
    });

    render(<ResetPassword />);

    expect(screen.getByRole("button", { name: /processing/i })).toBeDisabled();
  });

  it("shows the password checklist and shows field errors after blur", () => {
    mockedUseResetPassword.mockReturnValue({
      isPending: false,
      handleFormSubmit: mockHandleFormSubmit,
      formData: {
        newPassword: "123",
        confirmedPassword: "456",
      },
      setFormData: jest.fn(),
      validationErrors: {
        newPassword: "Password must be at least 8 characters",
        confirmedPassword: "Passwords do not match",
      },
      isFormValid: false,
    });

    render(<ResetPassword />);

    // The requirements checklist is always visible under the new password.
    const requirements = screen.getByRole("list", {
      name: /password requirements/i,
    });
    expect(requirements).toHaveTextContent(/at least 8 characters/i);
    expect(requirements).toHaveTextContent(/at least 1 uppercase letter/i);
    expect(requirements).toHaveTextContent(/at least 1 symbol/i);

    // Field errors only appear after the user leaves the field.
    expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
    fireEvent.blur(getConfirmPasswordInput());

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });
});
