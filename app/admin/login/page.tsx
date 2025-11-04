'use client'

import { loginAdmin } from "@/app/actions/admin/login/actions";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorLogin, setErrorLogin] = useState('');
    const router = useRouter();

    useEffect(() => {
        const checkExistingAuth = async () => {
            console.log('🔍 [AdminLogin] Verificando autenticação existente...');
            
            const storedAuth = localStorage.getItem('admin_auth');
            if (storedAuth) {
                try {
                    const authData = JSON.parse(storedAuth);
                    console.log('📋 [AdminLogin] Auth existente encontrada, validando...');
                    
                    const result = await loginAdmin(authData.username, authData.password, authData.expiresAt);
                    if (result.success) {
                        console.log('✅ [AdminLogin] Auth válida, redirecionando para admin');
                        router.push('/admin');
                    } else {
                        console.log('❌ [AdminLogin] Auth inválida, removendo do localStorage');
                        localStorage.removeItem('admin_auth');
                    }
                } catch (error) {
                    console.error('💥 [AdminLogin] Erro ao validar auth existente:', error);
                    localStorage.removeItem('admin_auth');
                }
            } else {
                console.log('ℹ️ [AdminLogin] Nenhuma auth existente encontrada');
            }
        };

        checkExistingAuth();
    }, [router]);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log('🔐 [AdminLogin] Tentativa de login iniciada', {
            username,
            timestamp: new Date().toISOString()
        });

        const expiresAt = new Date().getTime() + 1000 * 60 * 60 * 24; // 24 horas
        
        try {
            const result = await loginAdmin(username, password, expiresAt);
            
            if (result.success) {
                console.log('✅ [AdminLogin] Login bem-sucedido');
                
                const authData = { username, password, expiresAt };
                localStorage.setItem('admin_auth', JSON.stringify(authData));
                console.log('💾 [AdminLogin] Dados salvos no localStorage');
                
                router.push('/admin');
            } else {
                console.error('❌ [AdminLogin] Falha no login:', result.error);
                setErrorLogin(result.error || 'Erro ao fazer login');
            }
        } catch (error) {
            console.error('💥 [AdminLogin] Erro durante login:', error);
            setErrorLogin('Erro interno do servidor');
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header similar ao admin principal */}
            <header className="bg-primary text-primary-foreground py-2 mb-8">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center sm:justify-start">
                            <div className="flex items-center gap-3">
                                <Image
                                    src="/images/dprj.png"
                                    alt="Defensoria Publica do Rio de Janeiro"
                                    width={60}
                                    height={24}
                                    priority
                                    className="hidden sm:block"
                                />
                                <div className="text-center sm:text-left">
                                    <h1 className="text-xl font-bold">Sistema de Registros</h1>
                                    <p className="text-sm opacity-90">Painel Administrativo</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Container principal centralizado */}
            <div className="flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    {/* Card do formulário com borda verde */}
                    <div className="bg-white rounded-2xl shadow-xl border-4 border-green-500 overflow-hidden">
                        {/* Header do card com fundo verde */}
                        <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center">
                            <h2 className="text-3xl font-bold text-white mb-3">Acesso Administrativo</h2>
                            <p className="text-green-100 text-lg">Digite suas credenciais para continuar</p>
                        </div>

                        {/* Conteúdo do formulário */}
                        <div className="p-8">
                            {errorLogin && (
                                <div className="mb-6 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                                    <span className="text-red-500">⚠️</span>
                                    {errorLogin}
                                </div>
                            )}

                            <form className="space-y-6" onSubmit={handleLogin}>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                                            👤 Usuário
                                        </label>
                                        <Input
                                            id="username"
                                            name="username"
                                            type="text"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 rounded-lg transition-colors"
                                            placeholder="Digite seu usuário"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                                            🔒 Senha
                                        </label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 rounded-lg transition-colors"
                                            placeholder="Digite sua senha"
                                        />
                                    </div>
                                </div>

                                <Button 
                                    type="submit" 
                                    className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                                >
                                    🚀 Entrar
                                </Button>
                            </form>
                        </div>

                        {/* Footer do card */}
                        <div className="bg-gray-50 px-8 py-4 text-center border-t">
                            <p className="text-xs text-gray-500">
                                Defensoria Pública do Estado do Rio de Janeiro
                            </p>
                        </div>
                    </div>

                    {/* Informações adicionais */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Sistema seguro de gerenciamento administrativo
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}