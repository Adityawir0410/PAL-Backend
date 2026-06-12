# CI/CD Pipeline — Jenkins + Docker + AWS EC2

Implementasi **Continuous Integration / Continuous Deployment (CI/CD) pipeline** berbasis Jenkins untuk otomatisasi proses *build*, *test*, dan *deployment* aplikasi Node.js berkontainerisasi ke AWS EC2.

> Proyek ini merupakan bagian dari mata kuliah **Penyediaan dan Automasi Layanan**
> Program Studi Teknik Informatika, Universitas Brawijaya — 2026

---

## Daftar Isi

- [Arsitektur Sistem](#arsitektur-sistem)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Prasyarat](#prasyarat)
- [Struktur Repositori](#struktur-repositori)
- [Setup Infrastruktur AWS EC2](#setup-infrastruktur-aws-ec2)
- [Instalasi dan Konfigurasi Jenkins](#instalasi-dan-konfigurasi-jenkins)
- [Konfigurasi Jenkins Credentials](#konfigurasi-jenkins-credentials)
- [Konfigurasi GitHub Webhook](#konfigurasi-github-webhook)
- [Alur Pipeline CI/CD](#alur-pipeline-cicd)
- [Menjalankan Unit Test](#menjalankan-unit-test)
- [Environment Variables](#environment-variables)
- [Verifikasi Deployment](#verifikasi-deployment)
- [Troubleshooting](#troubleshooting)
- [Anggota Kelompok](#anggota-kelompok)

---

## Arsitektur Sistem

```
Developer
    │
    │  git push → branch main
    ▼
GitHub Repository
    │
    │  HTTP POST (Webhook)
    ▼
Jenkins Server (EC2 #1 — port 8080)
    │
    ├─ [Stage 1] Checkout     → clone repo dari GitHub
    ├─ [Stage 2] Build        → npm ci --only=production
    ├─ [Stage 3] Test         → Jest (43 unit tests)
    │       │
    │    GAGAL? ──────────────→ Pipeline BERHENTI
    │
    ├─ [Stage 4] Docker Build → build image + tag
    ├─ [Stage 5] Docker Push  → push ke Docker Hub
    └─ [Stage 6] Deploy       → SSH → docker pull + docker run
                                        │
                                        ▼
                              EC2 Deploy Server (#2 — port 3000)
                              Docker Container berjalan
```

---

## Teknologi yang Digunakan

| Komponen | Teknologi | Versi |
|----------|-----------|-------|
| CI/CD Orchestrator | Jenkins | 2.555.2 |
| Version Control | GitHub | - |
| Pipeline Definition | Groovy DSL (Jenkinsfile) | - |
| Containerization | Docker | 29.5.2 |
| Container Registry | Docker Hub | - |
| Cloud Infrastructure | AWS EC2 (Ubuntu 26.04 LTS) | t2.medium / t2.micro |
| Aplikasi Target | Node.js + Express | 18.x |
| Unit Testing | Jest | 29.7.0 |
| Trigger Mekanisme | GitHub Webhook | - |
| Secrets Management | Jenkins Credentials Store | - |

---

## Prasyarat

Sebelum memulai, pastikan hal berikut tersedia:

- [ ] Akun **AWS** dengan akses EC2 (minimal 2 instance)
- [ ] Akun **Docker Hub** dengan repository yang sudah dibuat
- [ ] Akun **GitHub** dengan repositori yang berisi kode aplikasi
- [ ] File **SSH key pair** (`.pem`) untuk akses EC2
- [ ] Node.js 18.x untuk pengembangan lokal

---

## Struktur Repositori

```
.
├── Jenkinsfile              # Definisi pipeline CI/CD (6 stage)
├── Dockerfile               # Konfigurasi Docker image
├── .dockerignore            # File yang dikecualikan dari Docker image
├── .gitignore               # File yang dikecualikan dari Git (termasuk *.pem)
├── package.json             # Dependencies dan script npm
├── server.js                # Entry point aplikasi
├── tests/
│   ├── ValidationUtils.test.js   # 30 unit tests validasi input
│   └── GeocodingUtils.test.js    # 13 unit tests geolokasi
└── README.md
```

---

## Setup Infrastruktur AWS EC2

### EC2 #1 — Jenkins Server

1. Buat EC2 instance dengan konfigurasi:
   - **AMI**: Ubuntu Server 26.04 LTS
   - **Instance Type**: t2.medium
   - **Security Group**: buka port `8080` (Jenkins), `22` (SSH)

2. SSH ke instance:
```bash
ssh -i "your-key.pem" ubuntu@<IP_EC2_JENKINS>
```

3. Install Java (dependensi Jenkins):
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y openjdk-17-jdk
```

4. Install Jenkins:
```bash
curl -fsSL https://pkg.jenkins.io/debian/jenkins.io-2023.key | \
  sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian binary/" | \
  sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt update
sudo apt install -y jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins
```

5. Install Docker di Jenkins server:
```bash
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

6. Install Node.js (untuk stage Build & Test):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

7. Akses Jenkins dashboard di browser:
```
http://<IP_EC2_JENKINS>:8080
```

8. Ambil initial admin password:
```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

---

### EC2 #2 — Deploy Server

1. Buat EC2 instance dengan konfigurasi:
   - **AMI**: Ubuntu Server 26.04 LTS
   - **Instance Type**: t2.micro
   - **Security Group**: buka port `3000` (aplikasi), `22` (SSH)

2. SSH ke instance:
```bash
ssh -i "your-key.pem" ubuntu@<IP_EC2_DEPLOY>
```

3. Install Docker:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
sudo systemctl enable docker
sudo systemctl start docker
```

4. Verifikasi instalasi Docker:
```bash
docker --version
sudo systemctl status docker
```

5. Buat file environment variables aplikasi:
```bash
nano /home/ubuntu/.env
```

Isi dengan variabel yang dibutuhkan (lihat bagian [Environment Variables](#environment-variables)).

---

## Instalasi dan Konfigurasi Jenkins

### Install Plugin

Setelah login ke Jenkins, install plugin berikut melalui:
**Manage Jenkins → Plugin Manager → Available Plugins**

| Plugin | Fungsi |
|--------|--------|
| **Git Plugin** | Clone repositori GitHub |
| **Docker Pipeline Plugin** | Eksekusi perintah Docker di pipeline |
| **SSH Agent Plugin** | Koneksi SSH ke EC2 Deploy |

### Buat Pipeline Job

1. Klik **"New Item"**
2. Masukkan nama: `gatotkota-pipeline`
3. Pilih **"Pipeline"** → klik **OK**
4. Di bagian **Pipeline**:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: `https://github.com/<username>/<repo>.git`
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
5. Di bagian **Build Triggers**:
   - Centang **"GitHub hook trigger for GITScm polling"**
6. Klik **Save**

---

## Konfigurasi Jenkins Credentials

Navigasi ke: **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**

Tambahkan 4 credentials berikut:

### 1. Docker Hub Credentials
- **Kind**: Username with Password
- **ID**: `dockerhub-credentials`
- **Username**: username Docker Hub kamu
- **Password**: Access Token Docker Hub (bukan password akun!)

> Cara buat Access Token: Docker Hub → Account Settings → Security → New Access Token

### 2. Docker Image Name
- **Kind**: Secret text
- **ID**: `docker-image-name`
- **Secret**: `<username-dockerhub>/<nama-repo>` (contoh: `adityawirayudha/gatotkota-backend`)

### 3. EC2 Host
- **Kind**: Secret text
- **ID**: `ec2-host`
- **Secret**: IP publik EC2 Deploy server (contoh: `3.91.158.158`)

> ⚠️ Jika EC2 di-stop lalu di-start ulang, IP akan berubah. Update credential ini setiap kali IP berubah.

### 4. EC2 SSH Key
- **Kind**: SSH Username with Private Key
- **ID**: `ec2-ssh-key`
- **Username**: `ubuntu`
- **Private Key**: Enter directly → paste isi file `.pem`

---

## Konfigurasi GitHub Webhook

1. Buka repositori GitHub → **Settings → Webhooks → Add webhook**
2. Isi konfigurasi:

| Field | Nilai |
|-------|-------|
| Payload URL | `http://<IP_EC2_JENKINS>:8080/github-webhook/` |
| Content Type | `application/json` |
| Which events | Just the push event |
| Active | ✅ Dicentang |

3. Klik **"Add webhook"**
4. Verifikasi di tab **Recent Deliveries** — harus muncul centang hijau ✅ setelah push pertama

> ⚠️ Jika IP Jenkins berubah (EC2 di-restart), update Payload URL di sini.

---

## Alur Pipeline CI/CD

Pipeline didefinisikan dalam `Jenkinsfile` menggunakan Declarative Pipeline syntax (Groovy DSL).

### Stage 1: Checkout
```groovy
checkout scm
```
Meng-clone repositori dari GitHub ke workspace Jenkins.

### Stage 2: Build
```groovy
sh 'npm ci --only=production'
```
Menginstal dependensi production secara deterministik berdasarkan `package-lock.json`.

### Stage 3: Test ⚠️ Quality Gate
```groovy
sh 'npm ci'
sh 'npm test'
```
Menjalankan seluruh unit test. **Jika ada test yang gagal, pipeline berhenti dan Deploy tidak dieksekusi.**

### Stage 4: Docker Build
```groovy
sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} ."
sh "docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest"
```
Membangun Docker image dengan dua tag: build number (untuk traceability) dan `latest`.

### Stage 5: Docker Push
```groovy
sh "echo ${DOCKER_HUB_CREDENTIALS_PSW} | docker login -u ${DOCKER_HUB_CREDENTIALS_USR} --password-stdin"
sh "docker push ${DOCKER_IMAGE}:${DOCKER_TAG}"
sh "docker push ${DOCKER_IMAGE}:latest"
```
Push image ke Docker Hub menggunakan credentials yang tersimpan aman di Jenkins.

### Stage 6: Deploy
```groovy
sshagent(['ec2-ssh-key']) {
    sh """
        ssh -o StrictHostKeyChecking=no ubuntu@${EC2_HOST} '
            docker pull ${DOCKER_IMAGE}:latest &&
            docker stop gatotkota-backend || true &&
            docker rm gatotkota-backend || true &&
            docker run -d \
                --name gatotkota-backend \
                -p 3000:3000 \
                --env-file /home/ubuntu/.env \
                --restart unless-stopped \
                ${DOCKER_IMAGE}:latest
        '
    """
}
```
SSH ke EC2 Deploy, pull image terbaru, dan jalankan container baru.

---

## Menjalankan Unit Test

### Lokal
```bash
npm install
npm test
```

### Output yang Diharapkan
```
PASS tests/ValidationUtils.test.js
PASS tests/GeocodingUtils.test.js

Test Suites: 2 passed, 2 total
Tests:       43 passed, 43 total
Snapshots:   0 total
Time:        ~12s
```

### Deskripsi Test Suite

| File | Fungsi yang Diuji | Jumlah Test |
|------|------------------|-------------|
| `ValidationUtils.test.js` | validateEmail, validatePassword, validateUsername, validatePhone, validateLoginData, sanitizeInput | 30 |
| `GeocodingUtils.test.js` | validateCoordinates, isWithinIndonesia, calculateDistance, extractProvinceFromAddress | 13 |
| **Total** | | **43** |

---

## Environment Variables

Buat file `/home/ubuntu/.env` di EC2 Deploy server dengan variabel berikut:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
PORT=3000
NODE_ENV=production
CORS_ORIGIN=*
```

> ⚠️ File `.env` **tidak boleh** di-commit ke Git. Sudah tercantum di `.gitignore`.
> ⚠️ File `.env` **tidak masuk** ke Docker image. Sudah tercantum di `.dockerignore`.
> ⚠️ Jika EC2 Deploy menggunakan instance baru, buat ulang file `.env` secara manual via SSH.

---

## Verifikasi Deployment

Setelah pipeline selesai, verifikasi aplikasi berjalan dengan mengakses endpoint health check:

```
http://<IP_EC2_DEPLOY>:3000/health
```

Response yang diharapkan:
```json
{
  "status": "OK",
  "timestamp": "2026-06-12T14:22:50.665Z",
  "service": "Infrastructure Report Backend"
}
```

### Cek Container di EC2 Deploy
```bash
ssh -i "your-key.pem" ubuntu@<IP_EC2_DEPLOY>
docker ps
docker logs gatotkota-backend
```

---

## Troubleshooting

### Pipeline tidak ter-trigger otomatis setelah push
- Pastikan **"GitHub hook trigger for GITScm polling"** dicentang di Configure pipeline
- Cek Payload URL webhook sudah menggunakan IP Jenkins yang benar
- Verifikasi di GitHub → Settings → Webhooks → Recent Deliveries

### IP EC2 berubah setelah instance di-restart
EC2 mendapat IP baru setiap kali di-stop dan di-start (kecuali pakai Elastic IP):
1. Update credential `ec2-host` di Jenkins dengan IP Deploy baru
2. Update Payload URL webhook di GitHub dengan IP Jenkins baru
3. Buat ulang file `.env` di EC2 Deploy baru via SSH

### Container tidak berjalan / restart loop
```bash
docker logs gatotkota-backend
```
Kemungkinan penyebab: environment variables di `.env` salah atau tidak lengkap.

### `npm: not found` di Jenkins
Node.js belum terinstall di EC2 Jenkins:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Permission denied pada file `.pem` (Windows)
```powershell
icacls "path\to\key.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

### Docker permission denied di Jenkins
```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

---

## Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

**Keunggulan desain:**
- `node:18-alpine` — image ringan (~180MB vs ~1GB Ubuntu)
- Layer caching — `package*.json` disalin duluan agar layer dependensi di-cache
- `npm ci --only=production` — deterministik, tanpa devDependencies (Jest tidak masuk image)

---

## Anggota Kelompok

| Nama | NIM | Peran |
|------|-----|-------|
| Ahmad Adzka Najhan | 235150200111037 | Setup AWS EC2, Instalasi Jenkins |
| Ananda Fifadlika | 235150207111045 | Dockerfile, Docker Hub |
| Anak Agung Ngurah Aditya Wirayudha | 235150207111067 | Jenkinsfile, Unit Test, GitHub Webhook |

---

> **Mata Kuliah:** Penyediaan dan Automasi Layanan
> **Dosen:** Widhi Yahya, S.Kom., M.T., M.Sc., Ph.D.
> **Program Studi:** Teknik Informatika, Universitas Brawijaya — 2026
