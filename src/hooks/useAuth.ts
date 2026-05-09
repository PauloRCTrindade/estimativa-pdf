import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Usar o mesmo cliente Supabase - apenas com import.meta.env para frontend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão configurados em .env.local');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar se já está logado
  const checkAuth = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase.auth.getSession();
      
      if (err) throw err;
      
      if (data.session?.user) {
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || '',
          user_metadata: data.session.user.user_metadata,
        });
      }
    } catch (err) {
      console.error('Erro ao verificar autenticação:', err);
    } finally {
      setLoading(false);
    }
  };

  // Login com email e senha
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (err) throw new Error(err.message);

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          user_metadata: data.user.user_metadata,
        });
      }

      return { success: true, user: data.user };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Signup com email e senha
  const signup = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (err) throw new Error(err.message);

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          user_metadata: data.user.user_metadata,
        });
      }

      return { 
        success: true, 
        user: data.user,
        message: 'Verifique seu email para confirmar a conta'
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: err } = await supabase.auth.signOut();
      if (err) throw err;

      setUser(null);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer logout';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Resetar senha
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (err) throw err;

      return { success: true, message: 'Email de reset enviado' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao resetar senha';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    checkAuth,
    resetPassword,
    isAuthenticated: !!user,
  };
}
