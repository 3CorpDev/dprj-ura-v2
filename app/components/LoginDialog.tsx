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
  console.log('🚀 [LoginDialog] Componente inicializado', {
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });

  const { toast } = useToast()
  const [open, setOpen] = useState(false);
  const [loginData, setLoginData] = useState<LoginData>({
    login: process.env.NODE_ENV === 'development' ? '30949580' : '',
    password: process.env.NODE_ENV === 'development' ? 'cpp@DPGE13' : '',
    ramal: process.env.NODE_ENV === 'development' ? '1000' : ''
  });

  console.log('⚙️ [LoginDialog] Estado inicial configurado', {
    hasLogin: !!loginData.login,
    hasPassword: !!loginData.password,
    hasRamal: !!loginData.ramal,
    isDevelopment: process.env.NODE_ENV === 'development',
    timestamp: new Date().toISOString()
  });

  const handleLogin = async () => {
    console.log('🔐 [LoginDialog] handleLogin iniciado', {
      timestamp: new Date().toISOString(),
      loginLength: loginData.login.length,
      passwordLength: loginData.password.length,
      ramal: loginData.ramal,
      userAgent: navigator.userAgent
    });

    // Validação do ramal
    console.log('🔍 [LoginDialog] Validando ramal', {
      ramal: loginData.ramal,
      length: loginData.ramal.length,
      isNumeric: !isNaN(parseInt(loginData.ramal)),
      parsedValue: parseInt(loginData.ramal)
    });

    if (loginData.ramal.length !== 4 || isNaN(parseInt(loginData.ramal))) {
      console.error('❌ [LoginDialog] Validação de ramal falhou', {
        ramal: loginData.ramal,
        length: loginData.ramal.length,
        isNumeric: !isNaN(parseInt(loginData.ramal)),
        expectedLength: 4
      });
      toast({
        title: 'Erro',
        description: 'Ramal inválido'
      })
      return
    }

    console.log('✅ [LoginDialog] Validação de ramal passou');
    // Gerando token
    const stringTokenData = `${loginData.login}:${loginData.password}:toolbar:toolbaracesso`
    console.log('🔑 [LoginDialog] Gerando token de autenticação', {
      stringFormat: `${loginData.login}:***:toolbar:toolbaracesso`,
      tokenLength: stringTokenData.length,
      timestamp: new Date().toISOString()
    });

    const base64Token = Buffer.from(stringTokenData).toString('base64')
    console.log('🔐 [LoginDialog] Token base64 gerado', {
      tokenPrefix: base64Token.substring(0, 20) + '...',
      tokenLength: base64Token.length
    });

    // Chamada para a API
    console.log('📡 [LoginDialog] Iniciando chamada para loginVerde', {
      timestamp: new Date().toISOString()
    });

    let response;
    try {
      response = await loginVerde(base64Token, loginData);
      console.log('✅ [LoginDialog] Resposta recebida do loginVerde', {
        hasResponse: !!response,
        sucesso: response?.sucesso,
        hasToken: !!response?.resultado?.token,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [LoginDialog] Erro na chamada loginVerde', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      toast({
        title: 'Erro',
        description: 'Erro de conexão com o servidor',
        variant: 'destructive'
      });
      return;
    }

    console.log(`📊 [LoginDialog] Resposta completa do loginVerde:`, response);

    if (response.sucesso) {
      console.log('🎉 [LoginDialog] Login bem-sucedido, salvando dados no localStorage');
      
      // Dados para localStorage
      const tokenData = {
        login: loginData.login,
        extension: loginData.ramal,
        token: response.resultado.token,
        expiration: new Date(Date.now() + (15 * 60 * 60 * 1000)).getTime()
      };

      console.log('💾 [LoginDialog] Salvando no localStorage', {
        base64TokenLength: base64Token.length,
        tokenDataKeys: Object.keys(tokenData),
        expirationDate: new Date(tokenData.expiration).toISOString(),
        timestamp: new Date().toISOString()
      });

      try {
        localStorage.setItem('base64Token', base64Token);
        localStorage.setItem('tokenVerde', JSON.stringify(tokenData));
        console.log('✅ [LoginDialog] Dados salvos no localStorage com sucesso');
      } catch (error) {
        console.error('❌ [LoginDialog] Erro ao salvar no localStorage', {
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString()
        });
      }

      console.log('📞 [LoginDialog] Chamando callback onLogin', {
        loginDataKeys: Object.keys(loginData),
        timestamp: new Date().toISOString()
      });
      
      onLogin(loginData);
      
      console.log('🚪 [LoginDialog] Fechando dialog');
      setOpen(false);
    } else {
      console.error('❌ [LoginDialog] Falha no login', {
        sucesso: response.sucesso,
        resultado: response.resultado,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: 'Erro',
        description: 'Login ou senha inválidos',
        variant: 'destructive'
      })
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      console.log('🚪 [LoginDialog] Estado do dialog alterado', {
        previousState: open,
        newState: newOpen,
        timestamp: new Date().toISOString()
      });
      setOpen(newOpen);
    }}>
      <DialogTrigger asChild>
        <Button onClick={() => {
          console.log('👆 [LoginDialog] Botão "Login Verde" clicado', {
            timestamp: new Date().toISOString()
          });
        }}>Login Verde</Button>
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
            onChange={(e) => {
              console.log('📝 [LoginDialog] Campo login alterado', {
                newLength: e.target.value.length,
                isEmpty: !e.target.value,
                timestamp: new Date().toISOString()
              });
              setLoginData(prev => ({ ...prev, login: e.target.value }));
            }}
          />
          <Input
            type="password"
            placeholder="Senha"
            value={loginData.password}
            onChange={(e) => {
              console.log('🔒 [LoginDialog] Campo senha alterado', {
                newLength: e.target.value.length,
                isEmpty: !e.target.value,
                timestamp: new Date().toISOString()
              });
              setLoginData(prev => ({ ...prev, password: e.target.value }));
            }}
            required
          />
          <Input
            placeholder="Ramal"
            value={loginData.ramal}
            required
            type="number"
            onChange={(e) => {
              const cleanValue = e.target.value.replace(/\D/g, '');
              console.log('📞 [LoginDialog] Campo ramal alterado', {
                originalValue: e.target.value,
                cleanedValue: cleanValue,
                length: cleanValue.length,
                isValid: cleanValue.length === 4 && !isNaN(parseInt(cleanValue)),
                timestamp: new Date().toISOString()
              });
              setLoginData(prev => ({ ...prev, ramal: cleanValue }));
            }}
          />
          <Button className="w-full" onClick={() => {
            console.log('👆 [LoginDialog] Botão "Logar" clicado', {
              timestamp: new Date().toISOString(),
              formState: {
                hasLogin: !!loginData.login,
                hasPassword: !!loginData.password,
                hasRamal: !!loginData.ramal,
                ramalLength: loginData.ramal.length
              }
            });
            handleLogin();
          }}>
            Logar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 