I want you to containerize the **RAG Explorer** app (the one built from `prompt.md`) with Docker
and expose it so that other people, anywhere on the internet, can access and use it — not just on
my local machine or LAN.

The project already has a working local dev setup (Node/Express backend + Vite/React frontend +
local ChromaDB server + local Ollama for embeddings + Groq for the LLM answer). Your task is to
package all of that into Docker containers and put a public URL in front of it.

The application should do the following:

1. Build a **production Docker image** for the app: run `vite build` to produce a static
   frontend bundle, and have the Express server serve both the `/api/*` routes and the built
   frontend from a single container on one port (no separate frontend dev server in production).
2. Run **ChromaDB** as its own container (use the official `chromadb/chroma` image) with a
   persistent volume, instead of the local pip-installed `chroma` CLI used in dev.
3. Run **Ollama** as its own container (use the official `ollama/ollama` image) with a persistent
   volume for model weights, and pull the `nomic-embed-text` embedding model into that container
   (it does not share models with any Ollama already installed on the host).
4. Wire the app container to reach ChromaDB and Ollama via their **Docker network service names**
   (not `localhost`), using the existing `CHROMA_URL` / `OLLAMA_URL` env vars.
5. Mount the PDF source folder (`../data` relative to the app) into the app container as a
   **read-only volume** so ingestion can still find the PDF(s).
6. Keep the **Groq API key** out of the image — read it from a `.env` file at runtime
   (`env_file` in Compose), never baked into the Docker image itself.
7. Add a **public HTTPS tunnel** in front of the app container so people outside my network/LAN
   can reach it, without me configuring router port-forwarding or signing up for a paid service.
   A Cloudflare quick tunnel (`cloudflared tunnel --url ...`) is a good fit since it needs no
   account and gives back a `https://xxxx.trycloudflare.com` URL.
8. Since the app would now be reachable by strangers on the internet (and it calls my paid Groq
   API key on every question), add an **optional HTTP Basic Auth gate** in front of the whole app —
   off by default, turned on only if I set both a username and password env var, so I can lock it
   down without changing the default (open) behavior.
9. Tie all of the above together with a single `docker-compose.yml` covering: the ChromaDB
   service, the Ollama service, a one-shot service to pull the embedding model, the app service,
   and the tunnel service — so the whole thing can be brought up with a small number of commands.
10. Document the whole thing in the project's `README.md`: prerequisites, the exact commands to
    build and start everything, how to retrieve the public tunnel URL, the security caveat about
    exposing the app publicly, an approximate disk/RAM footprint for the stack, and how to tear it
    all down.

The goal is that someone else, with just Docker installed and their own Groq API key, can clone
this project, run a short sequence of `docker compose` commands, and get back a public URL that
lets anyone on the internet try the RAG pipeline — without needing Node, Python, Ollama, or
ChromaDB installed on their own machine.
