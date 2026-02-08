FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

COPY src ./src
COPY data ./data

EXPOSE 3000

CMD ["bun", "start"]
