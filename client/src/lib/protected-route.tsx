import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

<<<<<<< HEAD

export function ProtectedRoute({
  path,
  component: Component,
}: {
=======
// Define the interface to accept a component that takes params
interface ProtectedRouteProps {
>>>>>>> e55acd3ceaf73c0b91f5f1ce724038665b186a86
  path: string;
  component: (params: any) => React.JSX.Element | null;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // 1. Handle Loading State
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // 2. Handle Unauthorized Access
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // 3. Handle Successful Auth: Wrap in Route to inject params
  return (
    <Route path={path}>
      {(params) => <Component params={params} />}
    </Route>
  );
}