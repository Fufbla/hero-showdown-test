FROM node:24-bookworm-slim
WORKDIR /app
COPY royale/multiplayer/package*.json ./royale/multiplayer/
RUN npm ci --omit=dev --ignore-scripts --prefix royale/multiplayer
COPY royale/*.mjs ./royale/
COPY royale/multiplayer/*.mjs ./royale/multiplayer/
RUN mkdir /data && chown node:node /data
ENV HOST=0.0.0.0 PORT=8080 ROYALE_DATA=/data/authority.sqlite
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","royale/multiplayer/server.mjs"]
