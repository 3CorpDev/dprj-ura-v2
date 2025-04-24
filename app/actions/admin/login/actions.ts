'use server'

interface AdminCredentials {
    username: string;
    password: string;
}

const validCredentials: AdminCredentials[] = [
    { username: 'admin', password: 'defensoria2024' }
];

export async function loginAdmin(username: string, password: string, expiresAt: number) {
    if (!username || !password || !expiresAt) {
        return {
            success: false,
            error: 'Credenciais inválidas'
        };
    }

    try {

        if (expiresAt < new Date().getTime()) {
            return {
                success: false,
                error: 'Sessão expirada'
            };
        }
        
        const isValid = validCredentials.some(
            cred => cred.username === username && cred.password === password && expiresAt > new Date().getTime()
        );


        if (!isValid) {
            return {
                success: false,
                error: 'Credenciais inválidas'
            };
        }

        return {
            success: true,
            data: {
                username,
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return {
            success: false, 
            error: 'Erro ao processar login'
        };
    }
}
