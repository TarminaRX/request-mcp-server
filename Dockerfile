FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
COPY local_packages ./local_packages

RUN bun install --frozen-lockfile --production

COPY src ./src

EXPOSE 9797

CMD ["bun", "run", "src/mcp.ts"]
