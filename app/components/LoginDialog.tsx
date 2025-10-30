'use client'

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { loginVerde } from '../actions/verde/login';
import { useToast } from "@/hooks/use-toast";

interface LoginData {
  login: string;
  password: string;
  ramal: string;
}

export default function LoginDialog({ onLogin }: { onLogin: (loginData: LoginData) => void }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false);
  const [loginData, setLoginData] = useState<LoginData>({
    login: process.env.NODE_ENV === 'development' ? 'ufrj_supervisor' : '',
    password: process.env.NODE_ENV === 'development' ? 'cpp@DPGE13' : '',
    ramal: process.env.NODE_ENV === 'development' ? '1528' : ''
  });

  const handleLogin = async () => {
    console.log(`handleLgin - Called!`);
    if (loginData.ramal.length !== 4 || isNaN(parseInt(loginData.ramal))) {
      toast({
        title: 'Erro',
        description: 'Ramal inválido'
      })
      return
    }
    const stringTokenData = `${loginData.login}:${loginData.password}:toolbar:toolbaracesso`
    const base64Token = Buffer.from(stringTokenData).toString('base64')

    const response = await loginVerde(base64Token, loginData);

    console.log(`loginVerde - response: ${JSON.stringify(response)}`);

    if (response.sucesso) {
      localStorage.setItem('base64Token', base64Token);
      localStorage.setItem('tokenVerde', JSON.stringify({
        login: loginData.login,
        extension: loginData.ramal,
        token: response.resultado.token,
        expiration: new Date(Date.now() + (15 * 60 * 60 * 1000)).getTime()
      }))
      onLogin(loginData);
      setOpen(false);
    } else {
      toast({
        title: 'Erro',
        description: 'Login ou senha inválidos',
        variant: 'destructive'
      })
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Login Verde</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Login Verde</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Login"
            value={loginData.login}
            required
            onChange={(e) => setLoginData(prev => ({ ...prev, login: e.target.value }))}
          />
          <Input
            type="password"
            placeholder="Senha"
            value={loginData.password}
            onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
            required
          />
          <Input
            placeholder="Ramal"
            value={loginData.ramal}
            required
            type="number"
            onChange={(e) => setLoginData(prev => ({ ...prev, ramal: e.target.value.replace(/\D/g, '') }))}
          />
          <Button className="w-full" onClick={handleLogin}>
            Logar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 