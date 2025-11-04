import Image from "next/image";
import { Phone, User, IdCard, File, FileAudio, PauseCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
// import { getTMA } from "../actions/tma/get";

interface DataCall {
    callerNumber: string;
    extension: string;
    uniqueId: string;
    linkedId: string;
    protocol: string;
    metadata: any;
    timestamp?: string;
}

interface DataLoginVerde {
    login: string;
    password: string;
    ramal: string;
}

interface QueuePause {
    extension: string;
    paused: boolean;
    pausedReason: string;
    queue: string;
    startTime?: number;
    elapsedTime?: string;
}

interface TempoMedioAtendimentoData {
    user_id: number;
    nome_usuario: string;
    ramal: string;
    tempo_medio_atendimento_segundos: number;
    total_atendimentos: number;
    qtd_pausas_bloqueios: number;
    total_tempo_logado: number;
    qtd_media_bloqueio: number;
    tempo_medio_bloqueio: number;
}

export default function Header({ dataCall, dataLoginVerde, queuesInPaused, isLoggedIn, onLogout }: { 
  dataCall: DataCall, 
  dataLoginVerde: DataLoginVerde, 
  queuesInPaused: QueuePause[], 
  isLoggedIn: boolean,
  onLogout: () => void
}) {
    const [pausedQueues, setPausedQueues] = useState<QueuePause[]>([]);
    // const [tma, setTma] = useState<number | null>(null);
    // const [tmaError, setTmaError] = useState(false);
    const [tempoMedioAtendimento, setTempoMedioAtendimento] = useState<TempoMedioAtendimentoData | null>(null);
    const [tmaRamalError, setTmaRamalError] = useState(false);

    // Variáveis derivadas para facilitar o uso dos dados
    const tempoMedioSegundos = tempoMedioAtendimento?.tempo_medio_atendimento_segundos || 0;
    const tempoMedioMinutos = Math.round(tempoMedioSegundos / 60);
    const totalAtendimentos = tempoMedioAtendimento?.total_atendimentos || 0;
    const nomeUsuario = tempoMedioAtendimento?.nome_usuario || '';
    const userId = tempoMedioAtendimento?.user_id || 0;
    const qtdPausasBloqueios = tempoMedioAtendimento?.qtd_pausas_bloqueios || 0;
    const totalTempoLogado = tempoMedioAtendimento?.total_tempo_logado || 0;
    const qtdMediaBloqueio = tempoMedioAtendimento?.qtd_media_bloqueio || 0;
    const tempoMedioBloqueio = tempoMedioAtendimento?.tempo_medio_bloqueio || 0;
    const totalTempoLogadoHoras = Math.round(totalTempoLogado / 3600); // Converte para horas
    const tempoMedioBloqueioMinutos = Math.round(tempoMedioBloqueio / 60); // Converte para minutos

    useEffect(() => {
        const timer = setInterval(() => {
            setPausedQueues(current =>
                current.map(queue => {
                    if (!queue.startTime) return queue;

                    const elapsedSeconds = Math.floor((Date.now() - queue.startTime) / 1000);
                    const minutes = Math.floor(elapsedSeconds / 60);
                    const seconds = elapsedSeconds % 60;

                    return {
                        ...queue,
                        elapsedTime: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                    };
                })
            );
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        setPausedQueues(queuesInPaused.map(queue => ({
            ...queue,
            startTime: queue.paused ? (queue.startTime || Date.now()) : undefined,
            elapsedTime: queue.paused ? (queue.elapsedTime || '00:00') : undefined
        })));
    }, [queuesInPaused]);

    const handleLogout = () => {
        console.log('🚪 [Header] Iniciando processo de logout...');
        localStorage.removeItem('base64Token');
        localStorage.removeItem('tokenVerde');
        console.log('🗑️ [Header] Tokens removidos do localStorage');
        onLogout();
    }

    // Função para calcular os últimos 30 dias
    const getLast30Days = () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        
        const formatDate = (date: Date) => {
            return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        };
        
        return {
            startDate: formatDate(startDate),
            endDate: formatDate(endDate)
        };
    };

    // useEffect(() => {
    //     const fetchTMA = async () => {
    //         console.log("pegando tma");
    //         if (dataLoginVerde.ramal) {
    //             try {
    //                 const tmaData = await getTMA(dataLoginVerde.ramal);
    //                 if (tmaData) {
    //                     setTma(tmaData.tma);
    //                     setTmaError(false);
    //                 } else {
    //                     setTmaError(true);
    //                 }
    //             } catch (error) {
    //                 console.error('Error fetching TMA:', error);
    //                 setTmaError(true);
    //             }
    //         }
    //     };

    //     // Fetch TMA immediately
    //     fetchTMA();

    //     // Set up interval to fetch TMA every 10 seconds
    //     const interval = setInterval(fetchTMA, 10000);

    //     // Clean up interval on component unmount
    //     return () => clearInterval(interval);
    // }, [dataLoginVerde.ramal]);

    // useEffect para buscar tempo médio de atendimento por ramal
    useEffect(() => {
        const fetchTempoMedioAtendimentoPorRamal = async () => {
            console.log("🚀 [Header] Buscando tempo médio de atendimento por ramal...");
            if (dataLoginVerde.ramal) {
                try {
                    const { startDate, endDate } = getLast30Days();
                    console.log(`📅 [Header] Período: ${startDate} a ${endDate}, Ramal: ${dataLoginVerde.ramal}`);
                    
                    const params = new URLSearchParams({
                        ramal: dataLoginVerde.ramal,
                        startDate: startDate,
                        endDate: endDate
                    });

                    const response = await fetch(`/api/reports/tempo_medio_atendimento_por_usuario_completo?${params}`);
                    
                    if (!response.ok) {
                        throw new Error(`Erro HTTP: ${response.status}`);
                    }

                    const result = await response.json();
                    console.log('✅ [Header] Dados TMA por ramal recebidos:', result);
                    
                    if (result.success && result.data && result.data.length > 0) {
                        setTempoMedioAtendimento(result.data[0]); // Pega o primeiro resultado
                        setTmaRamalError(false);
                        console.log('📊 [Header] TMA por ramal definido:', result.data[0]);
                    } else {
                        console.warn('⚠️ [Header] Nenhum dado encontrado para TMA por ramal');
                        setTmaRamalError(true);
                        setTempoMedioAtendimento(null);
                    }
                } catch (error) {
                    console.error('💥 [Header] Erro ao buscar TMA por ramal:', error);
                    setTmaRamalError(true);
                    setTempoMedioAtendimento(null);
                }
            }
        };

        // Buscar TMA por ramal imediatamente
        fetchTempoMedioAtendimentoPorRamal();

        // Configurar intervalo para buscar TMA por ramal a cada 5 minutos (300000ms)
        const interval = setInterval(fetchTempoMedioAtendimentoPorRamal, 300000);

        // Limpar intervalo quando o componente for desmontado
        return () => clearInterval(interval);
    }, [dataLoginVerde.ramal]);

    return (
        <header className="bg-primary text-primary-foreground py-2">
            <div className="container mx-auto px-4">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
                        <div className="flex items-center gap-3">
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
                            {isLoggedIn && (
                                <>
                                    <Separator orientation="vertical" className="h-14 bg-white/40" />
                                    <div className="flex flex-col items-start">
                                        <p className="text-xs opacity-90">Login: {dataLoginVerde.login}</p>
                                        <p className="text-xs opacity-90">Ramal: {dataLoginVerde.ramal}</p>
                                        <div className="flex items-center gap-1">
                                            <p className="text-xs opacity-90">&nbsp;</p>
                                        </div>
                                        <Button size="sm" onClick={handleLogout} className="w-full mt-1 bg-white/20 hover:bg-white/30 transition-colors">Logout</Button>
                                    </div>
                                </>
                            )}
                            {isLoggedIn && (
                                <>
                                    <div className="flex flex-col items-start">
                                        <p className="text-xs opacity-90" title="Quantidade de Chamadas Atendidas">QCA: {totalAtendimentos}</p>
                                        <p className="text-xs opacity-90" title="Quantidade de Pausas e Bloqueios">QPB: {qtdPausasBloqueios}</p>
                                        <p className="text-xs opacity-90" title="Tempo Total Logado">TTL: {totalTempoLogadoHoras}</p>                               
                                        <Button size="sm" className="w-full mt-1 bg-white/20 hover:bg-white/30 transition-colors visible-hidden"></Button>
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <p className="text-xs opacity-90" title="Tempo Médio de Atendimento">TMA: {tempoMedioMinutos}</p>
                                        <p className="text-xs opacity-90" title="Quantidade Média de Bloqueio">QMB: {qtdMediaBloqueio}</p>
                                        <p className="text-xs opacity-90" title="Tempo Médio de Bloqueio">TMB: {tempoMedioBloqueioMinutos}</p>                               
                                        <Button size="sm" className="w-full mt-1 bg-white/20 hover:bg-white/30 transition-colors visible-hidden"></Button>
                                    </div>
                                </>
                            )}
                            {pausedQueues.length > 0 && (
                                <>
                                    <Separator orientation="vertical" className="h-14 bg-white/40" />
                                    <div className="grid grid-rows-2 grid-cols-4 gap-2">
                                        {pausedQueues.filter(q => q.paused).map((queue) => (
                                            <div key={queue.queue} className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-md">
                                                <PauseCircle className="w-3 h-3" />
                                                <span>{queue.queue} - {queue.pausedReason} - {queue.elapsedTime}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        {dataCall.callerNumber && (
                            <div className="flex flex-col gap-1.5 items-end">
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    <p className="text-xs">
                                        <span className="font-medium">Número:</span> {dataCall.callerNumber}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <p className="text-xs">
                                        <span className="font-medium">Ramal:</span> {dataCall.extension}
                                    </p>
                                </div>
                                {dataCall.protocol && (
                                    <div className="flex items-center gap-2">
                                        <FileAudio className="w-4 h-4" />
                                        <p className="text-xs">
                                            <span className="font-medium">Protocolo:</span> {dataCall.protocol}
                                        </p>
                                    </div>
                                )}
                                {dataCall.metadata && (
                                    <>
                                        {dataCall.metadata.cpf && (
                                            <div className="flex items-center gap-2">
                                                <IdCard className="w-4 h-4" />
                                                <p className="text-xs">
                                                    <span className="font-medium">CPF:</span> {dataCall.metadata.cpf}
                                                </p>
                                            </div>
                                        )}
                                        {dataCall.metadata.processo && (
                                            <div className="flex items-center gap-2">
                                                <File className="w-4 h-4" />
                                                <p className="text-xs">
                                                    <span className="font-medium">Processo:</span> {dataCall.metadata.processo}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
} 