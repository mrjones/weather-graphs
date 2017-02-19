FROM ubuntu:16.04
MAINTAINER Matt Jones <jonesmr@gmail.com>

ENV PATH /root/.cargo/bin:$PATH

RUN apt-get update && apt-get install -y \
    curl
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y && \
    cargo --version

COPY target/release/nwschart-server /deploy/server
COPY d3dash.html /deploy/static/d3dash.html
COPY nws.js /deploy/static/nws.js

EXPOSE 3000

ENTRYPOINT ["/deploy/server"]
CMD ["--port", "3000", "--static_dir", "/deploy/static"]
