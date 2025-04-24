'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, PhoneCallIcon, ClockIcon, UsersIcon, DownloadIcon, SearchIcon, XIcon, ActivityIcon } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { searchCallRecords, getAdminDashboardStats } from "../actions/callRecords";
import { loginAdmin } from "../actions/admin/login/actions";
import { generateCSV } from "../actions/admin/export";
import { CallRecord } from "../types/types";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState('');

    // Filtros e pesquisa
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    const [statusCall, setStatusCall] = useState<string | null>('all');
    const [optionFilter, setOptionFilter] = useState<string | null>(null);
    const [exportingReport, setExportingReport] = useState(false);

    // Dados e paginação
    const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const recordsPerPage = 20;

    // Dashboard stats
    const [stats, setStats] = useState({
        totalCalls: 0,
        activeCalls: 0,
        avgDuration: 0,
        callsToday: 0
    });

    // Modificar o estado para incluir a estrutura correta de paginação
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
    });

    useEffect(() => {
        const storedAuth = localStorage.getItem('admin_auth');
        if (storedAuth) {
            try {
                const authData = JSON.parse(storedAuth);
                loginAdmin(authData.username, authData.password, authData.expiresAt).then(result => {
                    if (result.success) {
                        setIsAuthenticated(true);
                        fetchCallRecords();
                    } else {
                        router.push('/admin/login');
                        localStorage.removeItem('admin_auth');
                    }
                });
            } catch (e) {
                localStorage.removeItem('admin_auth');
            }
        } else {
            router.push('/admin/login');
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('admin_auth');
        setIsAuthenticated(false);
    };

    useEffect(() => {
        if (isAuthenticated) {
            loadDashboardData();
        }
    }, [isAuthenticated]);

    const loadDashboardData = async () => {
        try {
            console.log('Carregando dados do dashboard');
            const dashboardStats = await getAdminDashboardStats();
            setStats(dashboardStats);

            // Configurar atualização automática a cada 10 segundos
            const interval = setInterval(async () => {
                try {
                    const updatedStats = await getAdminDashboardStats();
                    setStats(updatedStats);
                    console.log('Dados do dashboard atualizados automaticamente');
                } catch (error) {
                    console.error('Erro ao atualizar dados do dashboard:', error);
                }
            }, 10000); // 10 segundos

            // Retornar a função de limpeza
            return () => {
                console.log('Limpando intervalo de atualização do dashboard');
                clearInterval(interval);
            };
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
        }
    };

    const fetchCallRecords = async (page: number = currentPage) => {
        setLoading(true);
        setError('');

        try {
            // Formatar datas apenas se estiverem definidas
            const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : null;
            const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : null;

            console.log('Buscando registros com:', {
                searchQuery,
                startDate: startDateStr,
                endDate: endDateStr,
                statusCall,
                optionFilter,
                page
            });

            const result = await searchCallRecords(
                searchQuery || null,
                startDateStr,
                endDateStr,
                statusCall,
                page,
                recordsPerPage,
                optionFilter
            );

            console.log('Resultado da busca:', result);

            if (result.success) {
                setCallRecords(result.records as CallRecord[]);
                setPagination(result.pagination as { total: number; page: number; limit: number; totalPages: number });
                setTotalRecords(result.pagination?.total || 0);
            } else {
                setCallRecords([]);
                setTotalRecords(0);
                setError(result.message || 'Nenhum registro encontrado');
            }
        } catch (error) {
            console.error('Erro ao buscar registros:', error);
            setError('Erro ao buscar registros');
            setCallRecords([]);
            setTotalRecords(0);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchCallRecords(1);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setStartDate(undefined);
        setEndDate(undefined);
        setStatusCall('all');
        setOptionFilter(null);
        setCurrentPage(1);
        fetchCallRecords(1);
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        fetchCallRecords(newPage);
    };

    const handleExportReport = async () => {
        setExportingReport(true);
        try {
            const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : null;
            const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : null;

            const result = await generateCSV(
                searchQuery || null,
                statusCall,
                startDateStr,
                endDateStr,
                optionFilter
            );

            if (result.success) {
                // Criar um blob com o conteúdo CSV
                const blob = new Blob([result.content as BlobPart], { type: 'text/csv;charset=utf-8;' });

                // Criar um link para download e clicar nele
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = result.filename as string;
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert('Erro ao gerar relatório: ' + result.message);
            }
        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
            alert('Erro ao exportar relatório');
        } finally {
            setExportingReport(false);
        }
    };

    if (!isAuthenticated) {
        return
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
            <div className="container mx-auto px-4">
                {/* Dashboard Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total de Ligações</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center">
                                <PhoneCallIcon className="h-4 w-4 text-muted-foreground mr-2" />
                                <div className="text-2xl font-bold">{stats.totalCalls}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Ligações Ativas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center">
                                <PhoneCallIcon className="h-4 w-4 text-green-500 mr-2" />
                                <div className="text-2xl font-bold">{stats.activeCalls}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Duração Média (min)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center">
                                <ClockIcon className="h-4 w-4 text-muted-foreground mr-2" />
                                <div className="text-2xl font-bold">{stats.avgDuration}</div>
                            </div>
                        </CardContent>
                    </Card> 

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Ligações Hoje</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center">
                                <UsersIcon className="h-4 w-4 text-muted-foreground mr-2" />
                                <div className="text-2xl font-bold">{stats.callsToday}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Progresso URA</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center">
                                <ActivityIcon className="h-4 w-4 text-blue-500 mr-2" />
                                <div className="text-2xl font-bold">
                                    {Math.round(stats.activeCalls * 0.2)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filtros e Pesquisa */}
                <Card className="mb-8">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Pesquisar Ligações</CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportReport}
                            disabled={exportingReport}
                            className="ml-auto"
                        >
                            <DownloadIcon className="h-4 w-4 mr-2" />
                            {exportingReport ? 'Gerando...' : 'Exportar CSV'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="searchValue" className="block text-sm font-medium mb-1">
                                            Pesquisar (Telefone/Protocolo/Processo)
                                        </label>
                                        <Input
                                            id="searchValue"
                                            placeholder="Digite o valor..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Opção URA</label>
                                        <Input
                                            id="searchValue"
                                            placeholder="Digite o valor..."
                                            value={optionFilter || ''}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                setOptionFilter(value);
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Status</label>
                                    <Select value={statusCall || "all"} onValueChange={(value) => setStatusCall(value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Filtrar por status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="active">Ativos</SelectItem>
                                            <SelectItem value="finished">Finalizados</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="md:col-span-1 flex items-end space-x-2">
                                    <Button type="submit" className="flex-1">
                                        <SearchIcon className="h-4 w-4 mr-2" />
                                        Buscar
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handleClearFilters}>
                                        <XIcon className="h-4 w-4 mr-2" />
                                        Limpar
                                    </Button>
                                </div>

                                <div className="md:col-span-4">
                                    <div className="flex space-x-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">Data Inicial</label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full justify-start text-left font-normal"
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {startDate ? (
                                                            format(startDate, "dd/MM/yyyy", { locale: pt })
                                                        ) : (
                                                            <span>Selecione a data</span>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={startDate}
                                                        onSelect={setStartDate}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">Data Final</label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full justify-start text-left font-normal"
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {endDate ? (
                                                            format(endDate, "dd/MM/yyyy", { locale: pt })
                                                        ) : (
                                                            <span>Selecione a data</span>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={endDate}
                                                        onSelect={setEndDate}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Tabela de Resultados */}
                <Card>
                    <CardHeader>
                        <CardTitle>Registros de Ligações</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-4">Carregando...</div>
                        ) : error ? (
                            <div className="text-center text-red-500 py-4">{error}</div>
                        ) : callRecords.length === 0 ? (
                            <div className="text-center py-4">Nenhum registro encontrado. Tente ajustar os filtros.</div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID</TableHead>
                                            <TableHead>Data/Hora</TableHead>
                                            <TableHead>Telefone</TableHead>
                                            <TableHead>Opção URA</TableHead>
                                            <TableHead>Sub-opção URA</TableHead>
                                            <TableHead>Protocolo</TableHead>
                                            <TableHead>Processo</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {callRecords.map((record) => (
                                            <TableRow key={record._id}>
                                                <TableCell className="font-mono text-xs">{record._id}</TableCell>
                                                <TableCell>
                                                    {format(new Date(record.datetime), "dd/MM/yyyy HH:mm:ss", { locale: pt })}
                                                </TableCell>
                                                <TableCell>{record.customer_number}</TableCell>
                                                <TableCell>{record.metadata.option || '-'}</TableCell>
                                                <TableCell>{record.metadata.suboption || '-'}</TableCell>
                                                <TableCell>{record.protocol || '-'}</TableCell>
                                                <TableCell>{record.metadata.processo || '-'}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-row gap-1 justify-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${record.active
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {record.active ? 'Ativo' : 'Finalizado'}
                                                        </span>

                                                        {(() => {
                                                            const callTime = new Date(record.datetime);
                                                            const hours = callTime.getHours();
                                                            const isBusinessHours = hours >= 8 && hours < 18;

                                                            return (
                                                                <span className={`px-2 py-1 rounded-full text-xs ${isBusinessHours
                                                                    ? 'bg-blue-100 text-blue-800'
                                                                    : 'bg-orange-100 text-orange-800'
                                                                    }`}>
                                                                    {isBusinessHours ? 'Comercial' : 'Fora do horário'}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Paginação */}
                                {totalRecords > 0 && (
                                    <div className="mt-4">
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                                                        aria-disabled={currentPage === 1}
                                                    />
                                                </PaginationItem>

                                                {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                                                    const pageNumber = i + 1;
                                                    return (
                                                        <PaginationItem key={pageNumber}>
                                                            <PaginationLink
                                                                onClick={() => handlePageChange(pageNumber)}
                                                                isActive={currentPage === pageNumber}
                                                            >
                                                                {pageNumber}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    );
                                                })}

                                                {pagination.totalPages > 5 && (
                                                    <>
                                                        <PaginationItem>
                                                            <PaginationEllipsis />
                                                        </PaginationItem>
                                                        <PaginationItem>
                                                            <PaginationLink
                                                                onClick={() => handlePageChange(pagination.totalPages)}
                                                                isActive={currentPage === pagination.totalPages}
                                                            >
                                                                {pagination.totalPages}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    </>
                                                )}

                                                <PaginationItem>
                                                    <PaginationNext
                                                        onClick={() => handlePageChange(Math.min(currentPage + 1, pagination.totalPages))}
                                                        aria-disabled={currentPage === pagination.totalPages}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
