#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const port = Number(process.argv[2] || 4173)
const htmlPath = join(root, 'dapp', 'index.html')

const server = createServer(async (req, res) => {
  try {
    const html = await readFile(htmlPath)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(html)
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(String(err))
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Arc Voxel Quest dApp running at http://127.0.0.1:${port}/`)
})
