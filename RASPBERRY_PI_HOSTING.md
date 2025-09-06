# Hosting Wedding Website on Raspberry Pi

## Prerequisites
- Raspberry Pi (3B+ or newer recommended)
- MicroSD card (8GB minimum)
- Raspberry Pi OS installed
- Internet connection

## Step 1: Install Node.js
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20 recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 2: Setup the Application
```bash
# Clone or copy your wedding website
cd /home/pi
git clone [your-repo] wedding-site
# OR copy files via USB/SCP

cd wedding-site
npm install
```

## Step 3: Configure Environment
```bash
# Copy and edit environment file
cp env.example .env
nano .env

# Set your production values:
# PORT=3000
# ADMIN_PASSWORD=your-secure-password
# SUPABASE_URL=your-supabase-url
# SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_KEY=your-service-key
```

## Step 4: Setup PM2 (Process Manager)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your app with PM2
pm2 start server.js --name wedding-site

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the command it outputs
```

## Step 5: Setup Nginx (Optional but Recommended)
```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/wedding

# Add this configuration:
```

```nginx
server {
    listen 80;
    server_name _;  # Or your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/wedding /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 6: Network Access

### Option A: Local Network Only
- Access via: `http://[raspberry-pi-ip]`
- Find IP: `hostname -I`

### Option B: Internet Access
1. **Port Forwarding**:
   - Forward port 80 to your Pi's IP
   - Use Dynamic DNS service (DuckDNS, No-IP)

2. **Cloudflare Tunnel** (Recommended):
```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm
sudo mv cloudflared-linux-arm /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# Setup tunnel (follow Cloudflare docs)
cloudflared tunnel login
cloudflared tunnel create wedding-site
```

3. **Tailscale** (For family/friends):
```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Connect
sudo tailscale up

# Share your Tailscale IP with guests
```

## Performance Optimization

### 1. Enable Swap (for low-memory Pis)
```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Set CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### 2. Optimize Node.js
```bash
# In your PM2 config
pm2 start server.js --name wedding-site --max-memory-restart 200M
```

### 3. Enable Nginx Caching
Add to Nginx config:
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|txt)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}
```

## Monitoring

### 1. Check App Status
```bash
pm2 status
pm2 logs wedding-site
```

### 2. Monitor Resources
```bash
htop  # Install with: sudo apt install htop
pm2 monit
```

### 3. Setup Alerts (Optional)
```bash
# PM2 email alerts
pm2 install pm2-auto-pull
pm2 set pm2-auto-pull:email your-email@example.com
```

## Backup Strategy

### 1. Database Backup
- Supabase handles this automatically
- Download backups from Supabase dashboard

### 2. Local Logs Backup
```bash
# Create backup script
nano /home/pi/backup-logs.sh
```

```bash
#!/bin/bash
tar -czf /home/pi/backups/logs-$(date +%Y%m%d).tar.gz /home/pi/.pm2/logs/
find /home/pi/backups -name "logs-*.tar.gz" -mtime +30 -delete
```

```bash
chmod +x /home/pi/backup-logs.sh
# Add to crontab
crontab -e
# Add: 0 2 * * * /home/pi/backup-logs.sh
```

## Security Hardening

### 1. Firewall Setup
```bash
sudo apt install ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Fail2ban (Optional)
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 3. SSL Certificate (if public)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Troubleshooting

### App Won't Start
```bash
# Check logs
pm2 logs wedding-site --lines 100
# Check port usage
sudo lsof -i :3000
```

### High CPU/Memory
```bash
# Restart app
pm2 restart wedding-site
# Check for memory leaks
pm2 describe wedding-site
```

### Network Issues
```bash
# Check if app is running
curl http://localhost:3000
# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

## Estimated Performance
- **Concurrent Users**: 50-100 easily
- **Response Time**: <100ms local, <500ms internet
- **Uptime**: 99%+ with proper setup
- **Power Usage**: ~5-10W

## Cost Comparison
- **Raspberry Pi**: ~$50-100 one-time
- **Electricity**: ~$1-2/month
- **VS Cloud Hosting**: $5-20/month ongoing

Perfect for a wedding website! 🎉
