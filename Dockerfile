# Arc Voxel Quest: game page + anti-cheat API + leaderboard indexer, one Bun process.
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
# Hosts such as Hugging Face Spaces use 7860; override with PORT.
ENV PORT=7860
EXPOSE 7860
# Secrets are passed as environment variables, never baked into the image:
#   GAME_SIGNER_PRIVATE_KEY (required), RELAYER_PRIVATE_KEY (optional, enables free-gas saves),
#   WALLETCONNECT_PROJECT_ID (optional).
CMD ["bun", "server.mjs"]
