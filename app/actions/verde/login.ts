'use server'

export async function loginVerde(base64Token: string, loginData: any) {
    console.log(base64Token)
    console.log('===== LOGIN DATA =====')
    try {
        //const baseUrl = process.env.NODE_ENV === 'development' ? 'https://desenvolvimento2.verde.rj.def.br/api/verde/usuario/login' : 'https://verde.rj.def.br/api/verde/usuario/login'
        //const baseUrl = 'https://verde.rj.def.br/api/verde/usuario/login';
        const baseUrl = process.env.ENDPOINT_LOGIN;
        if (!baseUrl) {
            console.log('===== ENDPOINT_LOGIN environment variable is not defined =====')
            throw new Error('ENDPOINT_LOGIN environment variable is not defined');
        }
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': base64Token
            }
        })
        console.log(`Base URL Login: ${baseUrl}`);
        console.log('===== RESPONSE =====')
        console.log(response)
        console.log('===== RESPONSE =====')

        if (!response.ok) {
            return {
                sucesso: false,
                resultado: {
                    token: null
                }
            }
        }
        const data = await response.json()
        return data
    } catch (error) {
        console.error('Erro ao realizar login:', error)
        throw new Error('Erro ao realizar login')
    }
}