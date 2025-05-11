FROM node:18

# Instala code-server globalmente
RUN npm install -g --unsafe-perm code-server

# Crea un usuario no root recomendado
RUN useradd -m coder

# Variables de entorno para la rama y repo
ARG GIT_BRANCH=dev
ARG GIT_REPO=https://github.com/tuusuario/turepo.git

ENV GIT_BRANCH=${GIT_BRANCH}
ENV GIT_REPO=${GIT_REPO}

# Crea la carpeta donde irá el código
RUN mkdir -p /home/coder/project && chown -R coder:coder /home/coder/project

WORKDIR /home/coder/project

# Clona solo si no existe .git
RUN [ -n "$GIT_REPO" ] && [ ! -d ".git" ] && git clone --branch "$GIT_BRANCH" "$GIT_REPO" . || echo "No se clona el repo (GIT_REPO vacío o ya existe .git), continuando..."

# Cambia a usuario no root
USER coder

EXPOSE 8080

CMD ["code-server", "--bind-addr", "0.0.0.0:8080", "--auth", "none", "/home/coder/project"]
