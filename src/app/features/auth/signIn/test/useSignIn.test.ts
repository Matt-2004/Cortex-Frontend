import { act, renderHook, waitFor } from "@testing-library/react";
import { useSignIn } from "../hooks/useSignIn";
import { signInAction } from "../utils/signInAction";
import { token_integration } from "@/app/shared/utils/AuthUtils/CookieIntegration";
import { useToast } from "@/app/features/toast/hooks/useToast";

jest.mock("../utils/signInAction", () => ({
  signInAction: jest.fn(),
}));

jest.mock("@/app/shared/utils/AuthUtils/CookieIntegration", () => ({
  token_integration: jest.fn(),
}));

jest.mock("@/app/features/toast/hooks/useToast", () => ({
  useToast: jest.fn(),
}));

const mockedSignInAction = signInAction as jest.Mock;
const mockedTokenIntegration = token_integration as jest.Mock;
const mockedUseToast = useToast as jest.Mock;

describe("useSignIn", () => {
  const mockHandleToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseToast.mockReturnValue({
      handleToast: mockHandleToast,
    });
  });

  it("returns initial form data and pending state", () => {
    const { result } = renderHook(() => useSignIn());

    expect(result.current.isPending).toBe(false);

    expect(result.current.formData).toEqual({
      usernameOrEmail: "",
      password: "",
      rememberMe: false,
    });
  });

  it("updates form data using setFormData", async () => {
    const { result } = renderHook(() => useSignIn());

    act(() => {
      result.current.setFormData({
        usernameOrEmail: "test@gmail.com",
        password: "password123",
        rememberMe: true,
      });
    });

    expect(result.current.formData).toEqual({
      usernameOrEmail: "test@gmail.com",
      password: "password123",
      rememberMe: true,
    });
  });

  it("submits login form successfully", async () => {
    mockedSignInAction.mockResolvedValue({
      isSuccess: true,
      message: "Login successful",
      data: {
        access_token: "access-token",
        refresh_token: "refresh-token",
      },
      status: 200,
    });

    const { result } = renderHook(() => useSignIn());

    act(() => {
      result.current.setFormData({
        usernameOrEmail: "test@gmail.com",
        password: "password123",
        rememberMe: true,
      });
    });

    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.handleFormSubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();

    expect(mockedSignInAction).toHaveBeenCalledTimes(1);

    const submittedFormData = mockedSignInAction.mock.calls[0][0] as FormData;

    expect(submittedFormData.get("usernameOrEmail")).toBe("test@gmail.com");
    expect(submittedFormData.get("password")).toBe("password123");

    expect(mockedTokenIntegration).toHaveBeenCalledWith(
      {
        access_token: "access-token",
        refresh_token: "refresh-token",
      },
      true,
    );

    expect(mockHandleToast).toHaveBeenCalledWith(
      {
        isSuccess: true,
        message: "Login successful",
        data: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
        status: 200,
      },
      "/",
    );

    // Stays locked after success until the redirect, to prevent double submits.
    expect(result.current.isPending).toBe(true);
  });

  it("does not save tokens when login fails", async () => {
    mockedSignInAction.mockResolvedValue({
      isSuccess: false,
      message: "Invalid credentials",
      data: null,
      status: 401,
    });

    const { result } = renderHook(() => useSignIn());

    act(() => {
      result.current.setFormData({
        usernameOrEmail: "wrong@gmail.com",
        password: "wrongpassword",
        rememberMe: false,
      });
    });

    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.handleFormSubmit(mockEvent);
    });

    expect(mockedSignInAction).toHaveBeenCalledTimes(1);

    expect(mockedTokenIntegration).not.toHaveBeenCalled();

    expect(mockHandleToast).toHaveBeenCalledWith(
      {
        isSuccess: false,
        message: "Invalid credentials",
        data: null,
        status: 401,
      },
      "/",
    );

    expect(result.current.isPending).toBe(false);
  });

  it("sets isPending to true while submit is running", async () => {
    let resolveSignInAction: (value: unknown) => void;

    mockedSignInAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignInAction = resolve;
        }),
    );

    const { result } = renderHook(() => useSignIn());

    act(() => {
      result.current.setFormData({
        usernameOrEmail: "test@gmail.com",
        password: "password123",
        rememberMe: false,
      });
    });

    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.FormEvent<HTMLFormElement>;

    act(() => {
      result.current.handleFormSubmit(mockEvent);
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await act(async () => {
      resolveSignInAction!({
        isSuccess: false,
        message: "Invalid credentials",
        data: null,
        status: 401,
      });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });
});
