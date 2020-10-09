#!/bin/bash

pm2 stop 02-sm || true
pm2 start build/pm2_local.yaml
