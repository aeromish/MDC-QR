#!/bin/sh
set -e
echo "[entrypoint] Cho PostgreSQL san sang..."
# doi DB (toi da ~30s)
i=0
until node -e "const{Client}=require('pg');const c=new Client({host:process.env.DB_HOST,port:+process.env.DB_PORT,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_DATABASE});c.connect().then(()=>{c.end();process.exit(0)}).catch(()=>process.exit(1))" 2>/dev/null; do
  i=$((i+1)); if [ $i -gt 30 ]; then echo "[entrypoint] DB khong san sang, thoat."; exit 1; fi
  sleep 1
done
echo "[entrypoint] Chay migration..."
npm run migration:run
echo "[entrypoint] Seed (roles/permissions/admin)..."
npm run seed || echo "[entrypoint] seed bo qua (co the da seed truoc do)"
echo "[entrypoint] Khoi dong API..."
exec node dist/main.js
