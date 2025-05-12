FROM node:18

# Instala code-server globalmente
RUN npm install -g --unsafe-perm code-server

# Crea un usuario no root recomendado
RUN useradd -m coder

# Crea la carpeta donde irá el código
RUN mkdir -p /home/coder/project && chown -R coder:coder /home/coder/project

WORKDIR /home/coder/project

# Cambia a usuario no root
USER coder

EXPOSE 8080

CMD ["code-server", "--bind-addr", "0.0.0.0:8080", "--auth", "none", "/home/coder/project"]
