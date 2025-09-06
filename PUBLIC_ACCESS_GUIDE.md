# Making Your Wedding Website Public

## Option 1: Cloudflare Tunnel (Recommended) - FREE
No port forwarding, automatic SSL, DDoS protection

### Step 1: Create Cloudflare Account
1. Go to https://dash.cloudflare.com/sign-up
2. Sign up for free account

### Step 2: Install Cloudflared on Raspberry Pi
```bash
# For Raspberry Pi (ARM architecture)
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared-linux-arm64.deb

# Or for older 32-bit Raspberry Pi
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.deb
sudo dpkg -i cloudflared-linux-arm.deb
```

### Step 3: Authenticate with Cloudflare
```bash
cloudflared tunnel login
# This opens a browser - login and select your domain (or use the free .trycloudflare.com)
```

### Step 4: Create Tunnel
```bash
cloudflared tunnel create wedding-site
# This creates a tunnel and gives you a UUID
```

### Step 5: Create Configuration
```bash
mkdir ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Add this content:
```yaml
tunnel: YOUR-TUNNEL-UUID
credentials-file: /home/pi/.cloudflared/YOUR-TUNNEL-UUID.json

ingress:
  - hostname: wedding.yourdomain.com  # Or use generated domain
    service: http://localhost:3000
  - service: http_status:404
```

### Step 6: Route Traffic
```bash
# If using your own domain:
cloudflared tunnel route dns wedding-site wedding.yourdomain.com

# Or get a free subdomain:
cloudflared tunnel run wedding-site
# This gives you a URL like: https://something.trycloudflare.com
```

### Step 7: Run as Service
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### Your site is now available at:
- With custom domain: `https://wedding.yourdomain.com`
- With free domain: `https://[generated].trycloudflare.com`

---

## Option 2: Tailscale (For Invited Guests Only) - FREE
Private network - guests need Tailscale app

### Step 1: Install Tailscale
```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

### Step 2: Connect
```bash
sudo tailscale up
# Follow the link to authenticate
```

### Step 3: Access Your Site
- Your site: `http://[your-tailscale-ip]:3000`
- Find your IP: `tailscale ip -4`

### Step 4: Share with Guests
Send guests:
1. Install Tailscale: https://tailscale.com/download
2. Join link: [your sharing link]
3. Visit: http://[your-tailscale-ip]:3000

---

## Option 3: Traditional Port Forwarding
More complex, requires static IP or DDNS

### Step 1: Set Static IP for Pi
```bash
sudo nano /etc/dhcpcd.conf
```

Add at the end:
```
interface eth0  # or wlan0 for WiFi
static ip_address=192.168.1.100/24  # Adjust to your network
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
```

### Step 2: Configure Router
1. Access router admin (usually 192.168.1.1)
2. Find "Port Forwarding" or "Virtual Server"
3. Add rule:
   - External Port: 80
   - Internal IP: 192.168.1.100 (your Pi)
   - Internal Port: 3000
   - Protocol: TCP

### Step 3: Setup Dynamic DNS (if no static IP)
Use DuckDNS (free):

```bash
# Install DuckDNS
mkdir ~/duckdns
cd ~/duckdns
nano duck.sh
```

Add:
```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=YOUR-SUBDOMAIN&token=YOUR-TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
```

```bash
chmod +x duck.sh
# Add to crontab
crontab -e
# Add: */5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

Your site: `http://your-subdomain.duckdns.org`

---

## Option 4: Ngrok (Quick Testing) - LIMITED FREE
Good for temporary access

### Install
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

### Use
```bash
# Sign up at ngrok.com and get auth token
ngrok config add-authtoken YOUR-TOKEN

# Expose your site
ngrok http 3000
# Gives you: https://random-string.ngrok.io
```

---

## Option 5: PageKite - PAID
Simple but costs money

```bash
curl -s https://pagekite.net/pk/ |sudo bash
pagekite.py 3000 yourname.pagekite.me
```

---

## Security Checklist Before Going Public

### 1. Strong Admin Password
```bash
# Update your .env file
ADMIN_PASSWORD=VeryStrongPassword123!
```

### 2. Rate Limiting (Already Built-in)
Your app has rate limiting on RSVP endpoint

### 3. Install Fail2ban
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Firewall
```bash
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

### 5. Monitor Access
```bash
# Watch live access
pm2 logs wedding-site

# Check nginx logs (if using)
sudo tail -f /var/log/nginx/access.log
```

---

## Quick Decision Guide

### Use Cloudflare Tunnel if:
✅ You want the easiest setup
✅ You need DDoS protection
✅ You want automatic SSL
✅ You don't want to deal with port forwarding

### Use Tailscale if:
✅ Only invited guests need access
✅ You want maximum privacy
✅ You don't need a public URL

### Use Port Forwarding if:
✅ You're comfortable with networking
✅ You have a static IP
✅ You want full control

### Use Ngrok if:
✅ Just testing temporarily
✅ Need something working in 5 minutes
✅ Don't mind the random URL

---

## Domain Setup (Optional)

If you want `wedding.yourdomain.com`:

### 1. Buy Domain
- Namecheap: ~$10/year
- Google Domains: ~$12/year
- Cloudflare: ~$8/year

### 2. Point to Your Service
- **Cloudflare Tunnel**: Automatic with tunnel setup
- **Port Forwarding**: A record → Your IP
- **Tailscale**: Use MagicDNS

---

## Testing Your Public Access

### 1. From Another Network
Use mobile data to test:
```bash
curl https://your-public-url
```

### 2. Check SSL
https://www.ssllabs.com/ssltest/

### 3. Load Test (Optional)
```bash
# Install hey
wget https://hey-release.s3.us-east-2.amazonaws.com/hey_linux_arm64
chmod +x hey_linux_arm64

# Test with 50 concurrent users
./hey_linux_arm64 -n 1000 -c 50 https://your-site
```

---

## Sharing with Guests

### Create a Nice Link
1. **QR Code Generator**: https://qr-code-generator.com
2. **Link Shortener**: https://bit.ly

### Wedding Invitation Text
```
📱 RSVP Online:
https://wedding.yourdomain.com

Or scan QR code:
[QR Code Image]
```

---

## Troubleshooting

### Site Not Accessible
```bash
# Check if service is running
pm2 status
sudo systemctl status cloudflared

# Test locally first
curl http://localhost:3000
```

### SSL Certificate Issues
- Cloudflare Tunnel: Automatic
- Others: Use Let's Encrypt

### Slow Performance
- Check Pi resources: `htop`
- Restart services: `pm2 restart all`
- Clear caches

---

## Maintenance Mode

During the wedding day:
```bash
# Monitor live
pm2 logs wedding-site --lines 100

# Watch RSVPs come in
tail -f ~/.pm2/logs/wedding-site-out.log | grep "RSVP"
```

Good luck with your wedding! 🎉💍
