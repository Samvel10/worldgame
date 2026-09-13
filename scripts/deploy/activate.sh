#!/usr/bin/env bash
set -euo pipefail
release="$1"
[[ "$release" =~ ^[a-zA-Z0-9._-]+$ ]] || exit 2
base=/opt/worldgame
release_path="$base/releases/$release"
[[ -f "$release_path/dist/index.html" && -f "$release_path/server/index.mjs" ]] || exit 3
export PATH=/opt/node22/bin:$PATH
cd "$release_path"
npm ci --omit=dev --ignore-scripts --no-audit --no-fund
id worldgame >/dev/null 2>&1 || useradd --system --home /var/lib/worldgame --shell /usr/sbin/nologin worldgame
install -d -m 700 /var/backups/worldgame
install -d -m 750 -o worldgame -g worldgame /var/lib/worldgame
# Back up this project only; leave other hosted services untouched.
tar -czf "/var/backups/worldgame/before-$release.tgz" -C / etc/systemd/system/worldgame-battle.service etc/apache2/sites-available/armworldgame.duckdns.org-le-ssl.conf opt/worldgame/server/data var/lib/worldgame
previous=$(readlink "$base/current" || true)
rollback() {
  trap - ERR
  tar -xzf "/var/backups/worldgame/before-$release.tgz" -C / etc/systemd/system/worldgame-battle.service etc/apache2/sites-available/armworldgame.duckdns.org-le-ssl.conf
  if [[ -n "$previous" ]]; then
    ln -s "$previous" "$base/rollback-link"
    mv -Tf "$base/rollback-link" "$base/current"
  fi
  systemctl daemon-reload
  systemctl restart worldgame-battle
  apache2ctl configtest && systemctl reload apache2
  echo "Activation failed; previous service and Apache configuration restored." >&2
  exit 1
}
trap rollback ERR
systemctl stop worldgame-battle
if [[ -f "$base/server/data/accounts.json" && ! -f /var/lib/worldgame/accounts.json ]]; then
  cp "$base/server/data/accounts.json" /var/lib/worldgame/accounts.json
fi
chown -R worldgame:worldgame /var/lib/worldgame
ln -s "$release_path" "$base/current-next"
mv -Tf "$base/current-next" "$base/current"
cat > /etc/systemd/system/worldgame-battle.service <<'UNIT'
[Unit]
Description=Worldgame Battle and accounts
After=network.target
[Service]
User=worldgame
Group=worldgame
WorkingDirectory=/opt/worldgame/current
Environment=NODE_ENV=production
Environment=PORT=8799
Environment=HOST=127.0.0.1
Environment=TRUST_PROXY=1
Environment=BARRIK_DATA_DIR=/var/lib/worldgame
ExecStart=/opt/node22/bin/node server/index.mjs
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/worldgame
PrivateTmp=true
UMask=0077
MemoryMax=512M
[Install]
WantedBy=multi-user.target
UNIT
python3 - <<'PY'
p='/etc/apache2/sites-available/armworldgame.duckdns.org-le-ssl.conf'
s=open(p).read().replace('/opt/worldgame/dist','/opt/worldgame/current/dist')
if 'ProxyPass /api/' not in s:
 s=s.replace(' ProxyPreserveHost On',''' ProxyPreserveHost On
 RequestHeader set X-Forwarded-Proto "https"
 RequestHeader set X-Real-IP "expr=%{REMOTE_ADDR}"
 ProxyPass /api/ http://127.0.0.1:8799/api/
 ProxyPassReverse /api/ http://127.0.0.1:8799/api/
 AddOutputFilterByType DEFLATE application/json application/javascript text/css text/html
 <FilesMatch "^(index\\.html|sw\\.js|manifest\\.webmanifest)$">
  Header set Cache-Control "no-cache, must-revalidate"
 </FilesMatch>''')
open(p,'w').write(s)
PY
a2enmod headers deflate >/dev/null
apache2ctl configtest
systemctl daemon-reload
systemctl start worldgame-battle
systemctl reload apache2
systemctl is-active worldgame-battle
curl --retry 5 --retry-connrefused --retry-delay 1 --fail --silent http://127.0.0.1:8799/api/session
trap - ERR
