import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="bg-surface-alt">
      <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
        <div className="mx-auto max-w-screen-sm text-center">
          <h1 className="mb-4 font-display text-7xl tracking-tight font-extrabold lg:text-9xl text-brand-700">
            404
          </h1>
          <p className="mb-4 font-display text-3xl tracking-tight font-bold text-text-strong md:text-4xl">
            Página no encontrada.
          </p>
          <p className="mb-6 text-lg font-light text-text-muted">
            La página que buscás no existe o fue movida. Volvé al inicio para
            seguir trabajando.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-md bg-brand-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          >
            Ir a inicio
          </Link>
        </div>
      </div>
    </section>
  );
}
