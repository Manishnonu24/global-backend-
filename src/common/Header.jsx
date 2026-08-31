'use client';


import Image from "next/image";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { logout } from "../app/redux/actions/action";
import Button from "./Button"; // Import the Button component
import ScrollToTopLink from "./ScrollToTopLink"; // Import the ScrollToTopLink component
import Link from "next/link";

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const auth = useSelector((state) => state.auth);
  const userMenuRef = useRef(null);
  const [expandedMobileIndices, setExpandedMobileIndices] = useState({});

  const [isScrolled, setIsScrolled] = useState(false);
  const [headerConfig, setHeaderConfig] = useState(null);

  useEffect(() => {
    setHydrated(true);
    // Add event listener for clicks outside the user menu
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [userMenuRef]);
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      dispatch(logout()); // Reset Redux auth state
      setShowUserMenu(false);
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const defaultNavLinks = [
    { href: '/', label: 'Home' },
    { href: '/about-us', label: 'About Us' },
    { href: '/blogs', label: 'Blogs' },
    { href: '/magazine', label: 'Magazines' },
    { href: '/contact-us', label: 'Contact Us' },
  ];

  const [dynamicNavLinks, setDynamicNavLinks] = useState(null);
  const [logoSrc, setLogoSrc] = useState("https://earthbyhumans.s3-eu-central-2.ionoscloud.com/statics/Final-logo-ebh.gif");

  useEffect(() => {
    const siteId = process.env.NEXT_PUBLIC_SITE_ID || "AHP";

    async function fetchHeaderData() {
      try {
        // Fetch header configuration (logo)
        const res = await fetch(`/api/header?siteId=${siteId}`);
        if (res.ok) {
          const json = await res.json();
          const headerData = json.data?.header || json.header;
          if (headerData) {
            setHeaderConfig(headerData);
            const logoUrl = headerData.logoUrl || headerData.logo;
            if (logoUrl) setLogoSrc(logoUrl);
          }
        }
      } catch (err) {
        console.error("Failed to fetch header config:", err);
      }

      try {
        // Fetch main menu navigation items from database settings
        const navRes = await fetch(`/api/navigation/main?siteId=${siteId}`);
        if (navRes.ok) {
          const json = await navRes.json();
          const items = json.data?.items || json.items;
          if (Array.isArray(items) && items.length > 0) {
            const mapped = items.map((item) => ({
              label: item.label,
              href: item.url || item.href || "/",
              badge: item.badge,
              children: item.children || [],
            }));
            setDynamicNavLinks(mapped);
          }
        }
      } catch (err) {
        console.error("Failed to fetch main navigation links:", err);
      }
    }

    fetchHeaderData();
  }, []);

  const navLinks = dynamicNavLinks || defaultNavLinks;

  const isSticky = headerConfig?.sticky !== false;
  const isTransparent = headerConfig?.transparent === true;
  const isLogoCenter = headerConfig?.layout === "logo-center";

  return (
    <>
      {/* Announcement Bar */}
      {headerConfig?.announcementBar?.enabled && (
        <div
          style={{
            backgroundColor: headerConfig.announcementBar.bgColor || "#2563eb",
            color: headerConfig.announcementBar.textColor || "#ffffff",
          }}
          className="text-center py-2 text-xs font-bold w-full z-50 flex items-center justify-center gap-1.5"
        >
          {headerConfig.announcementBar.link ? (
            <Link href={headerConfig.announcementBar.link} className="hover:underline flex items-center gap-1.5">
              {headerConfig.announcementBar.text}
            </Link>
          ) : (
            <span>{headerConfig.announcementBar.text}</span>
          )}
        </div>
      )}

      <header
        className={`w-full z-40 transition-all duration-300 ${
          isSticky ? "fixed" : "relative"
        } ${
          headerConfig?.announcementBar?.enabled && isSticky ? "top-8" : "top-0"
        } ${
          isScrolled || !isTransparent
            ? "bg-white shadow-md text-black"
            : "bg-transparent text-white"
        }`}
      >
        <div className="max-w-[1350px] mx-auto px-4 sm:px-6">
          <div
            className={`flex items-center justify-between relative py-2 ${
              isLogoCenter ? "xl:flex-col xl:gap-2 xl:py-3" : "h-20"
            }`}
          >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              {headerConfig?.logoType === "text" ? (
                <span className="text-xl font-bold hover:text-green-600 transition">
                  {headerConfig.logoText || "Earth By Humans"}
                </span>
              ) : (
                <Image
                  src={logoSrc}
                  alt="Earth by Humans Logo"
                  width={160}
                  height={80}
                  className="h-20 w-48 object-contain"
                />
              )}
            </Link>

            {/* Desktop Menu */}
            <nav className="hidden xl:flex gap-6 lg:gap-8 items-center">
              {navLinks.map((item) => {
                const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                if (hasChildren) {
                  return (
                    <div key={item.label} className="relative group py-4">
                      <button className="flex items-center gap-1 transition duration-300 hover:text-green-600 font-bold cursor-pointer">
                        {item.label}
                        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180" />
                      </button>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-2 hidden group-hover:block z-50 text-black">
                        {item.children.map((child) => (
                          <ScrollToTopLink
                            key={child.url || child.href}
                            href={child.url || child.href || "/"}
                            className="block px-4 py-2.5 text-sm hover:bg-gray-50 hover:text-green-600 font-semibold"
                          >
                            {child.label}
                          </ScrollToTopLink>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <ScrollToTopLink
                    key={item.href}
                    href={item.href}
                    className={`transition duration-300 hover:text-green-600 font-bold relative ${
                      pathname === item.href ? "text-[#3853a4]" : ""
                    }`}
                  >
                    {item.label}
                    {item.badge && (
                      <span className="absolute -top-5 -right-6 py-0.5 px-1.5 rounded-2xl text-[9px] border italic bg-white animate-pulse text-green-600 font-bold whitespace-nowrap">
                        {item.badge}
                      </span>
                    )}
                  </ScrollToTopLink>
                );
              })}
            </nav>

            {/* Desktop CTA Button */}
            {headerConfig?.ctaText && headerConfig?.ctaLink && (
              <div className="hidden xl:block">
                <Link href={headerConfig.ctaLink}>
                  <Button
                    className="text-xs px-5 py-2.5 rounded-full font-bold"
                    bgColor="bg-green-600"
                    animatedColor1="bg-blue-700"
                    animatedColor2="bg-blue-700"
                  >
                    {headerConfig.ctaText}
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Icon */}
            <button onClick={() => setShowMenu(!showMenu)} className="xl:hidden z-50 p-2">
              {showMenu ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>

          {/* Mobile Nav Menu */}
          {showMenu && (
            <nav className="xl:hidden absolute top-full left-0 right-0 z-50 bg-white shadow-lg text-black border-t border-gray-100">
              <div className={`bg-white transition-all duration-300 ease-in-out overflow-hidden w-full shadow-lg ${showMenu ? "max-h-screen py-4 px-6" : "max-h-0 py-0 px-0"}`}>
                <nav className="flex flex-col gap-4 text-left">
                  {navLinks.map((item, idx) => {
                    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                    if (hasChildren) {
                      const isExpanded = !!expandedMobileIndices[idx];
                      return (
                        <div key={idx} className="flex flex-col border-b border-gray-100 pb-2">
                          <div className="flex items-center justify-between py-2">
                            <span className="font-bold">{item.label}</span>
                            <button
                              onClick={() => setExpandedMobileIndices(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              className="p-2 text-gray-500 cursor-pointer"
                            >
                              <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="flex flex-col pl-4 bg-gray-50/50 rounded-lg py-1 mt-1 space-y-2">
                              {item.children.map((child, cIdx) => (
                                <ScrollToTopLink
                                  key={cIdx}
                                  href={child.url || child.href || "/"}
                                  onClick={() => setShowMenu(false)}
                                  className="py-2 text-sm font-semibold text-gray-700 hover:text-green-600"
                                >
                                  {child.label}
                                </ScrollToTopLink>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <ScrollToTopLink
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMenu(false)}
                        className={`py-2 border-b border-gray-100 ${pathname === item.href ? "text-[#3853a4]" : "text-black"} hover:text-green-600 font-bold`}
                      >
                        {item.label}
                      </ScrollToTopLink>
                    );
                  })}

                  {/* Mobile CTA Button */}
                  {headerConfig?.ctaText && headerConfig?.ctaLink && (
                    <div className="pt-2">
                      <Link href={headerConfig.ctaLink} onClick={() => setShowMenu(false)}>
                        <Button
                          className="w-full text-xs py-3 rounded-xl font-bold text-center justify-center"
                          bgColor="bg-green-600"
                          animatedColor1="bg-blue-700"
                          animatedColor2="bg-blue-700"
                        >
                          {headerConfig.ctaText}
                        </Button>
                      </Link>
                    </div>
                  )}
                </nav>
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;
