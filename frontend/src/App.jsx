import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, isAdmin } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProductivityProvider } from './context/ProductivityContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Calendar from './pages/Calendar';
import Employees from './pages/Employees';
import Profile from './pages/Profile';
import Storage from './pages/Storage';
import Meetings from './pages/Meetings';
import BugReports from './pages/BugReports';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProductivityProvider>
          <BrowserRouter>
            <NotificationProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="tasks/:id" element={<TaskDetail />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/:id" element={<ProjectDetail />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="meetings" element={<Meetings />} />
                <Route path="employees" element={<Employees />} />
                <Route path="profile" element={<Profile />} />
                <Route path="storage" element={<Storage />} />
                <Route path="bug-reports" element={<AdminRoute><BugReports /></AdminRoute>} />
              </Route>
            </Routes>
            </NotificationProvider>
          </BrowserRouter>
        </ProductivityProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
