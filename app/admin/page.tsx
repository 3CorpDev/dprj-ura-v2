
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Tabs from './components/tabs';

export default function AdminPage() {
const [isAuthenticated, setIsAuthenticated] = useState(false);

const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
};

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