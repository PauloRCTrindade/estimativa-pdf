import { useState } from 'react';
import { Login } from './Login';
import { Signup } from './Signup';

interface AuthPageProps {
  onAuthSuccess?: () => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,120,120,0.08),transparent)]" />
      
      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold">
            EP
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Estimativa PDF
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie estimativas de desenvolvimento
          </p>
        </div>

        {/* Auth Forms */}
        {isLogin ? (
          <Login
            onLoginSuccess={onAuthSuccess}
            onSwitchToSignup={() => setIsLogin(false)}
          />
        ) : (
          <Signup
            onSignupSuccess={onAuthSuccess}
            onSwitchToLogin={() => setIsLogin(true)}
          />
        )}
      </div>
    </div>
  );
}
