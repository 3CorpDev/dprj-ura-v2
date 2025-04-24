'use client'

import { loginAdmin } from "@/app/actions/admin/login/actions";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorLogin, setErrorLogin] = useState('');
    const router = useRouter();

    useEffect(() => {
        const storedAuth = localStorage.getItem('admin_auth');
        if (storedAuth) {
            const authData = JSON.parse(storedAuth);
            loginAdmin(authData.username, authData.password, authData.expiresAt).then(result => {
                if (result.success) {
                    router.push('/admin');
                } else {
                    localStorage.removeItem('admin_auth');
                }
            });
        }
    }, []);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const result = await loginAdmin(username, password, new Date().getTime() + 1000 * 60 * 60 * 24);
        if (result.success) {
            router.push('/admin');
            localStorage.setItem('admin_auth', JSON.stringify({ username, password, expiresAt: new Date().getTime() + 1000 * 60 * 60 * 24 }));
        } else {
            setErrorLogin(result.error || 'Erro ao fazer login');
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
                <div className="text-center ">
                    <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
                    <p className="mt-2 text-gray-600">Faça login para acessar</p>
                </div>

                {errorLogin && <div className="p-3 text-sm text-red-500 bg-red-100 rounded">{errorLogin}</div>}

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                Usuário
                            </label>
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Senha
                            </label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full">
                        Entrar
                    </Button>
                </form>
            </div>
        </div>
    );
}