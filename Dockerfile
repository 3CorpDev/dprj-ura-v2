# Use a imagem oficial do Node.js como base
FROM node:20-alpine

# Defina o diretório de trabalho no container
WORKDIR /app

# Copie os arquivos de configuração do projeto
COPY package.json package-lock.json ./

# Instale as dependências do projeto
# RUN npm ci --only=production
RUN npm ci

# Copie o resto dos arquivos do projeto
COPY . .

# Limpe o cache e a pasta .next
RUN rm -rf .next

# Construa a aplicação Next.js
RUN npm run build

# Exponha a porta necessária
EXPOSE 3000

# Inicie a aplicação
CMD ["npm", "run", "start"]