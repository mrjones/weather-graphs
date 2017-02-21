FROM ubuntu:16.04
MAINTAINER Matt Jones <jonesmr@gmail.com>

COPY bin/server /deploy/server
COPY d3dash.html /deploy/static/d3dash.html
COPY nws.js /deploy/static/nws.js

EXPOSE 3000

ENTRYPOINT ["/deploy/server"]
CMD ["--port", "3000", "--static_dir", "/deploy/static"]
