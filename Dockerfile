# Use a imagem oficial do Node.js como base
FROM node:20-alpine

# Instale o pnpm globalmente
RUN npm install -g pnpm

# Defina o diretório de trabalho no container
WORKDIR /app

# Copie os arquivos de configuração do projeto
COPY package.json pnpm-lock.yaml ./

# Instale as dependências do projeto
RUN pnpm install --frozen-lockfile

# Copie o resto dos arquivos do projeto
COPY . .

# Limpe o cache e a pasta .next
RUN rm -rf .next
RUN pnpm dlx rimraf .next

# Construa a aplicação Next.js
RUN pnpm run build

# Exponha a porta necessária
EXPOSE 3000

# Adicione a entrada ao arquivo /etc/hosts e inicie a aplicação
CMD ["pnpm", "run", "start"]
#CMD ["pnpm", "run", "server:prod"]