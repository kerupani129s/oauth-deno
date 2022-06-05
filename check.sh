#!/bin/bash
set -euoo pipefail posix
cd "$(dirname "$0")"

# 
deno check ./src/oauth.js
