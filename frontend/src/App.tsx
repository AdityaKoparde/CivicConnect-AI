import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, isStaffRole } from './lib/auth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import RequireAuth from './components/RequireAuth';
import Landing from './pages/Landing';
import Chat from './pages/Chat';
import Track from './pages/Track';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Overview from './pages/dashboard/Overview';
import CitizenHome from './pages/dashboard/CitizenHome';
import Complaints from './pages/dashboard/Complaints';
import ComplaintDetail from './pages/dashboard/ComplaintDetail';
import Officers from './pages/dashboard/Officers';
import Audit from './pages/dashboard/Audit';

/** Citizens get a personal home; staff get the analytics overview. */
function DashboardHome() {
  const { user } = useAuth();
  if (!user) return null;
  return isStaffRole(user.role) ? <Overview /> : <CitizenHome />;
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/track" element={<Track />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="complaints/:id" element={<ComplaintDetail />} />
            <Route
              path="officers"
              element={
                <RequireAuth roles={['SUPER_ADMIN', 'DEPARTMENT_ADMIN']}>
                  <Officers />
                </RequireAuth>
              }
            />
            <Route
              path="audit"
              element={
                <RequireAuth roles={['SUPER_ADMIN']}>
                  <Audit />
                </RequireAuth>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
