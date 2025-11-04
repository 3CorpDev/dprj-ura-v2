'use client'

import Header from './components/Header';
import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from "socket.io-client";
import IframeView from './components/IframeView';
import LoginDialog from './components/LoginDialog';
import { useToast } from "@/hooks/use-toast"
import { getUniqueIdByCallerNumber } from './actions/callRecords';

interface LoginData {
  login: string;
  password: string;
  ramal: string;
}

interface DataCall {
  callerNumber: string;
  extension: string;
  uniqueId: string;
  linkedId: string;
  protocol: string;
  metadata: any;
  timestamp?: string;
}

interface QueuePause {
  extension: string;
  paused: boolean;
  pausedReason: string;
  queue: string;
  startTime?: number;
  elapsedTime?: string;
}

export default function Home() {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dataLoginVerde, setDataLoginVerde] = useState<LoginData>({
    login: '',
    password: '',
    ramal: '',
  });
  const [dataCall, setDataCall] = useState<DataCall>({
    callerNumber: '',
    extension: '',
    uniqueId: '',
    linkedId: '',
    protocol: '',
    timestamp: '',
    metadata: {},
  });
  const [queuesInPaused, setQueuesInPaused] = useState<QueuePause[]>([]);

  // Usar useRef para manter a referência do socket
  const socketRef = useRef<Socket | null>(null);

  const cleanupSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const initializeSocket = useCallback((ramal: string) => {
    // Limpa socket existente antes de criar novo
    cleanupSocket();

    // Cria nova conexão
    const newSocket = io("/", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,
    });

    newSocket.on("connect", () => {
      console.log("Socket conectado");
    });

    newSocket.on("queueCallerJoin", async (event) => {
      if (event.extension == dataLoginVerde.ramal || event.extension == ramal) {
        const dataReturnCall = await getUniqueIdByCallerNumber(event);
        if (dataReturnCall) {
          setDataCall({
            ...event,
            protocol: dataReturnCall.protocol,
            uniqueId: dataReturnCall.uniqueid,
            metadata: dataReturnCall.metadata,
            timestamp: event.timestamp
          });
          toast({
            title: 'Nova chamada recebida',
            description: `Chamada do número ${event.callerNumber}`
          });

          const tokenVerde = JSON.parse(localStorage.getItem('tokenVerde') || '{}');

          if (process.env.NODE_ENV === 'development') {
            window.open(`https://desenvolvimento2.verde.rj.def.br/verde/pages/pessoa/busca-pessoa.xhtml?telPessoa=${event.callerNumber}&token=${tokenVerde.token}&uniqueid=${dataReturnCall.uniqueid}`, '_blank');
          } else {
            window.open(`https://verde.rj.def.br/verde/pages/pessoa/busca-pessoa.xhtml?telPessoa=${event.callerNumber}&token=${tokenVerde.token}&uniqueid=${dataReturnCall.uniqueid}`, '_blank');
          }
        } else {
          toast({
            title: 'Erro ao buscar registro',
            description: `Não foi possível encontrar o registro do número ${event.callerNumber}`
          });
        }
      }
    });

    newSocket.on("queueCallerLeave", (event) => {
      if (event.extension == dataLoginVerde.ramal || event.extension == ramal) {
        setDataCall({
          callerNumber: '',
          extension: '',
          uniqueId: '',
          linkedId: '',
          protocol: '',
          timestamp: '',
          metadata: {},
        });
        toast({
          title: 'Chamada encerrada',
          description: `Chamada do número ${event.callerNumber}`
        });
      }
    });

    newSocket.on("queueMemberPause", (event: { extension: string, paused: boolean, pausedReason: string, queue: string }) => {
      if (event.extension == dataLoginVerde.ramal || event.extension == ramal) {
        if (event.paused) {
          setQueuesInPaused(current => [
            ...current.filter(q => q.queue !== event.queue),
            {
              extension: event.extension,
              paused: event.paused,
              pausedReason: event.pausedReason,
              queue: event.queue,
              startTime: Date.now()
            }
          ]);
          toast({
            title: 'Pausa iniciada',
            description: `Pausa "${event.pausedReason}" iniciada com sucesso`
          });
        } else {
          setQueuesInPaused(current => current.filter(q => q.queue !== event.queue));
          toast({
            title: 'Pausa finalizada',
            description: `Pausa "${event.pausedReason}" finalizada com sucesso`
          });
        }
      }
    });

    newSocket.on("queueMemberRemoved", async (event: { extension: string, queue: string }) => {
      if (event.extension == dataLoginVerde.ramal || event.extension == ramal) {
        const activePauses = queuesInPaused.filter(q => q.paused && q.extension === event.extension);

        for (const pause of activePauses) {
          toast({
            title: 'Pausa finalizada',
            description: `Pausa "${pause.pausedReason}" finalizada com sucesso`
          });
        }

        setQueuesInPaused([]);
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Socket desconectado");
    });

    socketRef.current = newSocket;
  }, [cleanupSocket]);

  const handleLoginVerde = useCallback((loginData: LoginData) => {
    console.log('✅ [HomePage] handleLoginVerde chamado', loginData);
    setIsLoggedIn(true);
    initializeSocket(loginData.ramal);
    setDataLoginVerde(loginData);
  }, [initializeSocket]);

  const handleLogout = useCallback(() => {
    console.log('🚪 [HomePage] handleLogout chamado - limpando estado');
    setIsLoggedIn(false);
    setDataLoginVerde({
      login: '',
      password: '',
      ramal: '',
    });
    setDataCall({
      callerNumber: '',
      extension: '',
      uniqueId: '',
      linkedId: '',
      protocol: '',
      timestamp: '',
      metadata: {},
    });
    setQueuesInPaused([]);
    cleanupSocket();
    console.log('✅ [HomePage] Estado limpo e socket desconectado');
  }, [cleanupSocket]);

  useEffect(() => {
    const savedLoginData = localStorage.getItem('base64Token');
    const savedTokenVerde = localStorage.getItem('tokenVerde');
    if (savedLoginData && savedTokenVerde) {
      const tokenVerde = JSON.parse(savedTokenVerde);
      if (tokenVerde.expiration > new Date().getTime()) {
        setIsLoggedIn(true);
        initializeSocket(tokenVerde.extension);
        setDataLoginVerde({
          login: tokenVerde.login,
          password: tokenVerde.password,
          ramal: tokenVerde.extension,
        });
      }
    }

    // Cleanup ao desmontar componente
    return () => {
      cleanupSocket();
    };
  }, [initializeSocket, cleanupSocket]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        dataCall={dataCall} 
        dataLoginVerde={dataLoginVerde} 
        queuesInPaused={queuesInPaused} 
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />
      <main className="container mx-auto px-4 mt-4">
        {isLoggedIn ? (
          <IframeView />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <h2 className="text-2xl font-semibold text-gray-700">Bem-vindo</h2>
            <p className="text-gray-500">Por favor, faça login para acessar o sistema</p>
            <LoginDialog onLogin={handleLoginVerde} />
          </div>
        )}
      </main>
    </div>
  );
}
