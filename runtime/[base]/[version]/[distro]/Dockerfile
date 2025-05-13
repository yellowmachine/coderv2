ARG BASE
ARG VERSION
ARG DISTRO

FROM ${BASE}:${VERSION}-${DISTRO}

RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    ca-certificates

# Descarga el .deb de la última versión de code-server
RUN wget https://github.com/coder/code-server/releases/download/v4.99.4/code-server_4.99.4_amd64.deb

# Instala code-server
RUN apt-get install -y ./code-server_4.99.4_amd64.deb && rm code-server_4.99.4_amd64.deb

RUN useradd -m coder
RUN mkdir -p /home/coder/project && chown -R coder:coder /home/coder/project
WORKDIR /home/coder/project
USER coder

EXPOSE 8080

CMD ["code-server", "--bind-addr", "0.0.0.0:8080", "--auth", "none", "/home/coder/project"]
