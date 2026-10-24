# Docker infrastructure

`docker-compose.dev.yml` starts PostgreSQL and the Pikafish worker for local
development. The worker image downloads the pinned Pikafish release during its
build and verifies its SHA-256 checksum before including the engine.

The worker listens on port `4000` by default. Compose sets `PORT`, `POOL_SIZE`
and `QUEUE_CAP`; `PIKAFISH_PATH` is set in the image to the bundled engine.
The worker service is limited to 2 CPUs and 1 GiB of memory.
