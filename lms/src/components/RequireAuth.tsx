import { Navigate, useLocation } from 'react-router-dom';
import { defaultPathByRole, type AppRole } from '@/lib/auth';
import { useAuth } from '@/hooks/use-auth';

type Props = {
  allowedRoles: AppRole[];
  children: React.ReactNode;
};

const RequireAuth = ({ allowedRoles, children }: Props) => {
  const { isAuthenticated, isInitializing, role } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !role) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={defaultPathByRole(role)} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
