import { NavLink } from "react-router-dom";
import { ArrowLeft, Gem, LayoutDashboard, LogOut, Percent, Package } from "lucide-react";

const navigation = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Manage Jewellery", icon: Package },
  { to: "/admin/gold-rates", label: "Gold Rates", icon: Percent },
];

export default function AdminLayout({ logout, children }) {
  return (
    <div className="adminShell">
      <aside className="adminSidebar" aria-label="Admin navigation">
        <NavLink className="adminBrand" to="/admin">
          <span className="adminBrandMark"><Gem size={19} /></span>
          <span><b>AMIR JEWELLERS</b><small>OWNER WORKSPACE</small></span>
        </NavLink>
        <span className="adminNavLabel">WORKSPACE</span>
        <nav className="adminNav">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `adminNavLink${isActive ? " active" : ""}`}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="adminSidebarBottom">
          <NavLink className="adminNavLink" to="/">
            <ArrowLeft size={17} aria-hidden="true" /><span>View Website</span>
          </NavLink>
          <button className="adminNavLink adminLogout" type="button" onClick={logout}>
            <LogOut size={17} aria-hidden="true" /><span>Logout</span>
          </button>
        </div>
      </aside>
      <div className="adminMain">
        <header className="adminTopbar">
          <span>Owner workspace</span>
          <NavLink to="/">View public website <ArrowLeft size={14} /></NavLink>
        </header>
        <main className="adminContent">{children}</main>
      </div>
    </div>
  );
}
