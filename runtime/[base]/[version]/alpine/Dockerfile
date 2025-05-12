ARG BASE
ARG VERSION
FROM ${BASE}:${VERSION}-alpine

# Instala dependencias necesarias (equivalentes a apt-get en Alpine)
RUN apk add --no-cache git curl python3 make g++

# Crea usuario no root (en Alpine se usa adduser -D)
RUN adduser -D coder

# Crea el directorio del proyecto y ajusta permisos
RUN mkdir -p /home/coder/project && chown -R coder:coder /home/coder/project

WORKDIR /home/coder/project

# Cambia a usuario no root
USER coder

# Instala code-server localmente en node_modules
RUN npm install code-server

# Expone el puerto por defecto de code-server
EXPOSE 8080

# Comando para ejecutar code-server desde node_modules
CMD ["npx", "code-server", "--bind-addr", "0.0.0.0:8080", "--auth", "none", "/home/coder/project"]
