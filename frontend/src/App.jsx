import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api, token } from "./api.js";
import About from "./pages/About.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import Collection from "./pages/Collection.jsx";
import Contact from "./pages/Contact.jsx";
import Footer from "./components/Footer.jsx";
import GoldRate from "./pages/GoldRate.jsx";
import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import ProductManagement from "./pages/ProductManagement.jsx";
import GoldRateManagement from "./pages/GoldRateManagement.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";

export default function App() {
  const [products, setProducts] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productLoadError, setProductLoadError] = useState("");
  const [rateLoadError, setRateLoadError] = useState("");
  const [owner, setOwner] = useState(Boolean(token()));
  const [checkingOwner, setCheckingOwner] = useState(Boolean(token()));
  const navigate = useNavigate();
  const location = useLocation();

  async function reload() {
    setLoading(true);
    setProductLoadError("");
    setRateLoadError("");
    const [productResult, rateResult] = await Promise.allSettled([
      api("/products"),
      api("/gold-rates"),
    ]);

    if (
      productResult.status === "fulfilled" &&
      Array.isArray(productResult.value?.products)
    ) {
      setProducts(productResult.value.products);
    } else {
      const error =
        productResult.status === "rejected"
          ? productResult.reason
          : new Error("Product service returned an invalid response.");
      setProductLoadError(error.message);
      console.error(error);
    }

    if (
      rateResult.status === "fulfilled" &&
      Array.isArray(rateResult.value?.rates)
    ) {
      setRates(rateResult.value.rates);
    } else {
      const error =
        rateResult.status === "rejected"
          ? rateResult.reason
          : new Error("Gold rate service returned an invalid response.");
      setRateLoadError(error.message);
      console.error(error);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!token()) {
      setCheckingOwner(false);
      return;
    }

    let active = true;
    api("/auth/me")
      .catch((error) => {
        if (error.status === 401) {
          localStorage.removeItem("amir_owner_token");
          if (active) setOwner(false);
        } else {
          console.error(error);
        }
      })
      .finally(() => {
        if (active) setCheckingOwner(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setOwner(false);
      navigate("/login", { replace: true, state: { from: location.pathname } });
    }
    window.addEventListener("amir:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("amir:unauthorized", handleUnauthorized);
  }, [location.pathname, navigate]);

  async function login(email, password) {
    const result = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("amir_owner_token", result.token);
    setOwner(true);
    const returnTo = typeof location.state?.from === "string" &&
      location.state.from.startsWith("/admin")
      ? location.state.from
      : "/admin";
    navigate(returnTo, { replace: true });
  }

  function logout() {
    localStorage.removeItem("amir_owner_token");
    setOwner(false);
    navigate("/");
  }

  const isAdminRoute = location.pathname.startsWith("/admin") && location.pathname !== "/admin/login";
  const isHomeRoute = location.pathname === "/";
  const sharedPageProps = {
    products,
    rates,
    loading,
    productLoadError,
    rateLoadError,
    reload,
  };

  return (
    <div className={`app${isAdminRoute ? " app--admin" : ""}${isHomeRoute ? " app--home" : ""}`}>
      {!isAdminRoute && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<Home {...sharedPageProps} />} />
          <Route path="/collection" element={<Collection products={products} loading={loading} loadError={productLoadError} reload={reload} />} />
          <Route path="/product/:id" element={<ProductDetails products={products} rates={rates} loading={loading} loadError={productLoadError} />} />
          <Route path="/gold-rates" element={<GoldRate rates={rates} loading={loading} loadError={rateLoadError} reload={reload} />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={owner ? <Navigate to="/admin" replace /> : <AdminLogin login={login} />} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/admin" element={
            <ProtectedAdmin owner={owner} checkingOwner={checkingOwner}>
              <AdminLayout logout={logout}>
                <AdminDashboard {...sharedPageProps} />
              </AdminLayout>
            </ProtectedAdmin>
          } />
          <Route path="/admin/products" element={
            <ProtectedAdmin owner={owner} checkingOwner={checkingOwner}>
              <AdminLayout logout={logout}>
                <ProductManagement products={products} loading={loading} loadError={productLoadError} reload={reload} />
              </AdminLayout>
            </ProtectedAdmin>
          } />
          <Route path="/admin/gold-rates" element={
            <ProtectedAdmin owner={owner} checkingOwner={checkingOwner}>
              <AdminLayout logout={logout}>
                <GoldRateManagement rates={rates} loading={loading} loadError={rateLoadError} reload={reload} />
              </AdminLayout>
            </ProtectedAdmin>
          } />
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<section className="section empty"><h2>Page not found</h2><Link to="/">Return home</Link></section>} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
}

function ProtectedAdmin({ owner, checkingOwner, children }) {
  const location = useLocation();

  if (checkingOwner) {
    return <p className="adminAuthLoading" role="status">Verifying owner access…</p>;
  }
  if (!owner) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
