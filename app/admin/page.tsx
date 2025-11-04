
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Tabs from './components/tabs';
import { useRouter } from 'next/navigation';
import { loginAdmin } from '@/app/actions/admin/login/actions';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 [AdminPage] Verificando autenticação...');
      
      const storedAuth = localStorage.getItem('admin_auth');
      if (!storedAuth) {
        console.log('❌ [AdminPage] Nenhuma autenticação encontrada, redirecionando para login');
        router.push('/admin/login');
        setIsLoading(false);
        return;
      }

      try {
        const authData = JSON.parse(storedAuth);
        console.log('📋 [AdminPage] Dados de auth encontrados, validando...');
        
        const result = await loginAdmin(authData.username, authData.password, authData.expiresAt);
        
        if (result.success) {
          console.log('✅ [AdminPage] Autenticação válida');
          setIsAuthenticated(true);
        } else {
          console.log('❌ [AdminPage] Autenticação inválida:', result.error);
          localStorage.removeItem('admin_auth');
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('💥 [AdminPage] Erro ao validar autenticação:', error);
        localStorage.removeItem('admin_auth');
        router.push('/admin/login');
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    console.log('🚪 [AdminPage] Iniciando logout...');
    localStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
    console.log('✅ [AdminPage] Logout concluído, redirecionando para login');
    router.push('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // O useEffect já fará o redirecionamento
  }

  return (
    <>
        <header className="bg-primary text-primary-foreground py-2 mb-4">
            <div className="container mx-auto px-4">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
                        <div className="flex items-center gap-3 justify-between w-full">
                            <div className="flex items-center gap-3">
                                <Image
                                    src="/images/dprj.png"
                                    alt="Defensoria Publica do Rio de Janeiro"
                                    width={60}
                                    height={24}
                                    priority
                                    className="hidden sm:block"
                                />
                                <div>
                                    <h1 className="text-lg font-bold">Sistema de Registros</h1>
                                    <p className="text-xs opacity-90">Gerenciamento de chamadas</p>
                                </div>
                            </div>
                            <Button onClick={handleLogout} className="bg-white/20 hover:bg-white/30 transition-colors">Sair</Button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
        <div>
        <Tabs />
        </div>    
    </>

  );
}