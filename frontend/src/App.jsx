import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login           from "./pages/Login";
import Register        from "./pages/Register";
import Dashboard       from "./pages/Dashboard";
import Files           from "./pages/Files";
import Usage           from "./pages/Usage";
import Billing         from "./pages/Billing";
import AdminDashboard  from "./pages/AdminDashboard";
import AdminUsers      from "./pages/AdminUsers";
import AdminInvoices   from "./pages/AdminInvoices";
import AdminTasks from "./pages/AdminTasks";
import AIChat from "./components/AIChat";
import "./App.css";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center
                    bg-gradient-to-br from-brand-800 to-brand-600">
      <div className="text-center text-white">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white
                        rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading)    return <LoadingScreen />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isLoggedIn, isAdmin, loading } = useAuth();
  if (loading)     return <LoadingScreen />;
  if (!isLoggedIn) return <Navigate to="/login"    replace />;
  if (!isAdmin)    return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isLoggedIn, isAdmin, loading } = useAuth();
  if (loading)   return <LoadingScreen />;
  if (isLoggedIn) return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  return children;
}

function AppRoutes() {
  const { isLoggedIn } = useAuth();
  
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public */}
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* User pages */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/files"     element={<PrivateRoute><Files /></PrivateRoute>} />
        <Route path="/usage"     element={<PrivateRoute><Usage /></PrivateRoute>} />
        <Route path="/billing"   element={<PrivateRoute><Billing /></PrivateRoute>} />

        {/* Admin pages */}
        <Route path="/admin"          element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users"    element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/invoices" element={<AdminRoute><AdminInvoices /></AdminRoute>} />
        <Route path="/admin/tasks"    element={<AdminRoute><AdminTasks /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      
      {isLoggedIn && <AIChat />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}