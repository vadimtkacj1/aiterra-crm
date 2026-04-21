import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { Env } from "../config/Env";

type TokenGetter = () => string | null;
type OnUnauthorized = () => void;


export class HttpClient {
  private readonly client: AxiosInstance;

  constructor(env: Env, getAccessToken: TokenGetter, onUnauthorized?: OnUnauthorized) {
    this.client = axios.create({
      baseURL: env.apiBaseUrl || undefined,
      timeout: 30_000,
      headers: { "Content-Type": "application/json" },
    });

    this.client.interceptors.request.use((config) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // When the server returns 401 the stored token is expired or invalid.
    // Clear it immediately and send the user to the login page.
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          const url = String(error.config?.url ?? "");
          const isLoginAttempt = url.includes("/auth/login");
          // Wrong password returns 401 — must not trigger global logout / hard redirect.
          if (!isLoginAttempt) {
            onUnauthorized?.();
          }
        }
        return Promise.reject(error);
      },
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.client.get<T>(url, config);
    return data;
  }

  async post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.client.post<T>(url, body, config);
    return data;
  }

  async put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.client.put<T>(url, body, config);
    return data;
  }

  async delete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.client.delete<T>(url, config);
    return data as T;
  }

  /** Binary download (CSV, PDF) with auth headers. */
  async getBlob(url: string, config?: AxiosRequestConfig): Promise<Blob> {
    const { data } = await this.client.get<Blob>(url, { ...config, responseType: "blob" });
    return data;
  }
}
