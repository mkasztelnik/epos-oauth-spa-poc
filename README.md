# OauthPoc

This is simple POC showing authorization in Unity epos aai and invoking external
secured API.

## API server

When additional headers need to be forwarded into upstream from
authorization response than lua nginx module should be used.
The simplest way to have lua support in nginx is to use openresty
(https://openresty.org/en/). After sources are downloaded and extracted
from the archive we can compile openresty (or nginx with `lua`, `cjson`
and `http_ssl` modules can be compiled):

```
./configure --prefix=/home/marek/epos/openresty --with-http_ssl_module
make
make install
```

Next we need to create simple nginx configuration with CORS settings and
authorization check (`$OPENRESTY_HOME/nginx/conf/nginx.conf`):

```
server {
    listen       8081;
    server_name  localhost;

    location / {
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            #
            # Custom headers and headers various browsers *should* be OK with but aren't
            #
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            #
            # Tell client that this pre-flight info is valid for 20 days
            #
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        if ($request_method = 'POST') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range';
        }
        if ($request_method = 'GET') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range';
        }

        access_by_lua_block {
          local res = ngx.location.capture("/auth")

          if res.status == 200 then
            local cjson = require("cjson")
            local value = cjson.decode(res.body)
            ngx.req.set_header("X-Auth-UserId", value["sub"])
            ngx.req.set_header("X-Auth-Scope", value["scope"])
          else
            ngx.exit(ngx.HTTP_UNAUTHORIZED)
          end
        }

        proxy_pass http://127.0.0.1:$server_port/api;
    }

    location = /auth {
      internal;
      proxy_pass https://epos-aai.cyfronet.pl/oauth2/tokeninfo;
      proxy_pass_request_body off;
      proxy_set_header Content-Length "";
    }

    location = /api {
      content_by_lua_block {
        ngx.say(ngx.req.raw_header(true))
      }
    }

    location = /50x.html {
        root   html;
    }
}
```

Now we can start our "API" server:

```
#start
$OPENRESTY_HOME/bin/openresty

#restart
$OPENRESTY_HOME/bin/openresty -s reload
```

## Starting SPA application

```
npm install
ng server --open
```

## AAI configuration

All configuration can be found in `src/app/auth.config.ts`. The important thing
is to add:

```
disableAtHashCheck: true,
```

since parameter `at_hash` is optional and Unity is not adding this value into
generated `JWT` id token.
