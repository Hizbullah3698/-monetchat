#!/bin/bash
cd /home/administrator/monetchat
setsid docker compose up -d --build > deploy.log 2>&1 &
