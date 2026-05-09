import { useState } from 'react';
import { Login } from './Login';
import { Signup } from './Signup';

interface AuthPageProps {
  onAuthSuccess?: () => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📊 Estimativa PDF
          </h1>
          <p className="text-gray-600">
            Gerador de Estimativas de Desenvolvimento
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

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Desenvolvido com ❤️ por{' '}
            <a
              href="#"
              className="text-blue-600 hover:text-blue-700"
            >
              Paulo Trindade
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
