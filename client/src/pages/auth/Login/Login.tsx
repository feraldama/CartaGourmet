import { useState, useEffect, useRef } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useAuth } from "../../../contexts/useAuth";
import { useNavigate } from "react-router-dom";
import {
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  LockClosedIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import logo from "../../../assets/img/logo.png";

interface Credentials {
  email: string;
  password: string;
}

function Login() {
  const [credentials, setCredentials] = useState<Credentials>({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(credentials);
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || "Credenciales incorrectas");
      } else {
        setError("Credenciales incorrectas");
      }
      setTimeout(() => setError(""), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const year = new Date().getFullYear();

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      {/* ── Panel de marca (oculto en móvil) ───────────────────────────── */}
      <aside className="relative hidden overflow-hidden bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Acentos decorativos */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl"
        />

        {/* Marca */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 shadow-elevated">
            <img src={logo} alt="Carta Gourmet" className="h-full w-full object-contain" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-white">
            Carta Gourmet
          </span>
        </div>

        {/* Mensaje central */}
        <div className="relative z-10 max-w-md">
          <div className="mb-6 h-1 w-16 rounded-full bg-amber-400" />
          <h1 className="font-display text-4xl font-extrabold leading-tight !text-white">
            Tu cocina, bajo control.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">
            Ventas, caja, inventario y reportes de tu negocio gastronómico en un
            solo lugar.
          </p>
        </div>

        <p className="relative z-10 text-sm text-slate-400">
          © {year} Carta Gourmet · Sistema de gestión gastronómica
        </p>
      </aside>

      {/* ── Panel del formulario ───────────────────────────────────────── */}
      <main className="flex flex-col justify-center bg-surface-alt px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          {/* Marca compacta (solo móvil) */}
          <div className="mb-10 flex flex-col items-center lg:hidden">
            <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-card">
              <img src={logo} alt="Carta Gourmet" className="h-full w-full object-contain" />
            </span>
            <span className="mt-3 font-display text-2xl font-bold tracking-tight text-text">
              Carta Gourmet
            </span>
          </div>

          <header className="mb-8">
            <h2 className="font-display text-3xl font-bold tracking-tight text-text-strong">
              Bienvenido de nuevo
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Ingresá tus credenciales para acceder al sistema.
            </p>
          </header>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 flex items-start gap-3 rounded-lg border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-800"
            >
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-danger-700" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Cerrar aviso"
                className="-m-1 cursor-pointer rounded p-1 text-danger-700 transition-colors hover:bg-danger-100"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Usuario */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text"
              >
                Usuario
              </label>
              <div className="relative mt-2">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-subtle" />
                <input
                  ref={emailInputRef}
                  id="email"
                  name="email"
                  type="text"
                  value={credentials.email}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  placeholder="tu.usuario"
                  className="block w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-3 text-base text-text shadow-xs outline-none transition placeholder:text-text-subtle focus:border-brand-700 focus:ring-2 focus:ring-brand-700/30 sm:text-sm"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text"
              >
                Contraseña
              </label>
              <div className="relative mt-2">
                <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-subtle" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={credentials.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="block w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-10 text-base text-text shadow-xs outline-none transition placeholder:text-text-subtle focus:border-brand-700 focus:ring-2 focus:ring-brand-700/30 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-text-subtle transition-colors hover:text-text-muted"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                    />
                  </svg>
                  Ingresando…
                </>
              ) : (
                <>
                  Ingresar
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-text-subtle lg:hidden">
            © {year} Carta Gourmet
          </p>
        </div>
      </main>
    </div>
  );
}

export default Login;
