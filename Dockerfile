# Usa uma imagem oficial do Node.js
FROM node:20

# Define a pasta de trabalho
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código
COPY . .

# Gera a versão de produção
RUN npm run build

# Instala o servidor estático "serve"
RUN npm install -g serve

# Expõe a porta 4173 (Vite Preview usa essa porta)
EXPOSE 4173

# Comando para iniciar o app
CMD ["serve", "-s", "dist", "-l", "4173"]
