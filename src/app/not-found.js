import Link from "next/link";
import ClientRedirect from "./ClientRedirect";
import { getLayoutData } from "@/services/layout.service";

export default async function NotFoundPage() {
  let custom404 = null;

  try {
    const layout = await getLayoutData();
    custom404 = layout?.rawSettings?.websiteSettings?.custom404 || null;
  } catch (e) {
    console.error("Failed to load custom 404 settings:", e);
  }

  const title = custom404?.title || "Page Not Found";
  const description =
    custom404?.description ||
    "Oops! The page you are looking for does not exist or has been moved.";
  const buttonText = custom404?.buttonText || "Go Home";
  const buttonLink = custom404?.buttonLink || "/";
  const redirectOn404 = custom404?.redirectOn404 ?? false;
  const redirectUrl = custom404?.redirectUrl || "/";
  const redirectDelay = custom404?.redirectDelay ?? 5;
  const image = custom404?.image || null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12 font-sans">
      <div className="bg-white rounded-3xl p-10 md:p-14 shadow-sm border border-gray-100 text-center max-w-lg mx-auto space-y-6">
        {/* 404 Graphic or Custom Image */}
        {image ? (
          <div className="flex justify-center mb-4">
            <img src={image} alt="Not Found Graphic" className="max-h-48 rounded-xl object-contain" />
          </div>
        ) : (
          <div className="text-8xl font-black text-primary/80 mb-2 tracking-tighter leading-none font-ui">
            404
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
          {title}
        </h1>

        <p className="text-gray-650 text-sm sm:text-base leading-relaxed">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href={buttonLink}
            className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-white rounded-full font-bold uppercase tracking-widest text-xs px-6 py-3.5 transition-all shadow-sm text-center"
          >
            {buttonText}
          </Link>

        </div>

        {/* Auto-redirect when enabled */}
        {redirectOn404 && (
          <ClientRedirect url={redirectUrl} delay={redirectDelay} />
        )}
      </div>
    </div>
  );
}
