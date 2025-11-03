'use server'

export async function loginVerde(base64Token: string, loginData: any) {
    console.log('🚀 [LoginVerde] Função loginVerde iniciada', {
        timestamp: new Date().toISOString(),
        tokenLength: base64Token.length,
        tokenPrefix: base64Token.substring(0, 20) + '...',
        loginDataKeys: Object.keys(loginData),
        environment: process.env.NODE_ENV
    });

    console.log('📋 [LoginVerde] Dados de login recebidos', {
        login: loginData.login,
        ramal: loginData.ramal,
        hasPassword: !!loginData.password,
        passwordLength: loginData.password?.length || 0
    });

    console.log('🔑 [LoginVerde] Token base64 recebido:', base64Token.substring(0, 50) + '...');
    
    try {
        console.log('🔧 [LoginVerde] Configurando URL base');
        
        const baseUrl = process.env.ENDPOINT_LOGIN;
        console.log('🌐 [LoginVerde] Variável de ambiente ENDPOINT_LOGIN', {
            isDefined: !!baseUrl,
            value: baseUrl || 'undefined',
            environment: process.env.NODE_ENV
        });

        if (!baseUrl) {
            console.error('❌ [LoginVerde] ENDPOINT_LOGIN não definido', {
                allEnvVars: Object.keys(process.env).filter(key => key.includes('ENDPOINT')),
                timestamp: new Date().toISOString()
            });
            throw new Error('ENDPOINT_LOGIN environment variable is not defined');
        }

        console.log('✅ [LoginVerde] URL base configurada:', baseUrl);
        console.log('📡 [LoginVerde] Iniciando requisição HTTP', {
            url: baseUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': base64Token.substring(0, 30) + '...'
            },
            timestamp: new Date().toISOString()
        });

        let response;
        const requestStartTime = Date.now();

        try {
            response = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': base64Token
                }
            });

            const requestDuration = Date.now() - requestStartTime;
            console.log('📨 [LoginVerde] Resposta HTTP recebida', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                url: response.url,
                duration: `${requestDuration}ms`,
                headers: {
                    contentType: response.headers.get('content-type'),
                    contentLength: response.headers.get('content-length'),
                    server: response.headers.get('server')
                },
                timestamp: new Date().toISOString()
            });

        } catch (fetchError) {
            const requestDuration = Date.now() - requestStartTime;
            console.error('❌ [LoginVerde] Erro na requisição HTTP', {
                error: fetchError instanceof Error ? fetchError.message : fetchError,
                duration: `${requestDuration}ms`,
                url: baseUrl,
                timestamp: new Date().toISOString()
            });
            throw fetchError;
        }

        if (!response.ok) {
            console.error('❌ [LoginVerde] Resposta HTTP não OK', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                timestamp: new Date().toISOString()
            });

            // Tentar ler o corpo da resposta para mais detalhes
            let errorBody = '';
            try {
                errorBody = await response.text();
                console.error('📄 [LoginVerde] Corpo da resposta de erro:', errorBody);
            } catch (bodyError) {
                console.error('❌ [LoginVerde] Não foi possível ler o corpo da resposta de erro:', bodyError);
            }

            return {
                sucesso: false,
                resultado: {
                    token: null
                }
            }
        }

        console.log('✅ [LoginVerde] Resposta HTTP OK, processando dados JSON');
        
        let data;
        try {
            data = await response.json();
            console.log('📊 [LoginVerde] JSON parseado com sucesso', {
                dataKeys: Object.keys(data),
                hasSucesso: 'sucesso' in data,
                hasResultado: 'resultado' in data,
                sucessoValue: data.sucesso,
                hasToken: data.resultado?.token ? true : false,
                timestamp: new Date().toISOString()
            });
        } catch (jsonError) {
            console.error('❌ [LoginVerde] Erro ao parsear JSON', {
                error: jsonError instanceof Error ? jsonError.message : jsonError,
                timestamp: new Date().toISOString()
            });
            throw new Error('Erro ao processar resposta do servidor');
        }

        console.log('🎯 [LoginVerde] Retornando dados:', {
            sucesso: data.sucesso,
            hasResultado: !!data.resultado,
            hasToken: !!data.resultado?.token,
            tokenLength: data.resultado?.token?.length || 0
        });

        return data
    } catch (error) {
        console.error('💥 [LoginVerde] Erro geral na função loginVerde', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : typeof error,
            timestamp: new Date().toISOString(),
            baseUrl: process.env.ENDPOINT_LOGIN,
            tokenProvided: !!base64Token,
            loginDataProvided: !!loginData
        });
        
        throw new Error('Erro ao realizar login')
    }
}