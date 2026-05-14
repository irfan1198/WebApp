// Sesuaikan dengan UUID di ESP32
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

// Variabel Global untuk menyimpan state
let bluetoothDevice = null;
let dataCharacteristic = null;
let pollInterval = null;

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const statusBadge = document.getElementById('statusBadge');

// --- 1. Fungsi Utama: Menghubungkan BLE ---
connectBtn.addEventListener('click', async () => {
    try {
        // Minta user memilih device
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: [SERVICE_UUID] }]
        });

        // Daftarkan event listener jika tiba-tiba putus (out of range)
        bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

        updateStatus('Menghubungkan...', 'disconnected');

        // Connect ke GATT
        const server = await bluetoothDevice.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        dataCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

        updateStatus('Terhubung - Membaca Data', 'connected');
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'block';

        // Baca data pertama kali secara instan
        await readSensorData();

        // Mulai Polling: Ambil data setiap 5000 ms (5 detik)
        pollInterval = setInterval(readSensorData, 5000);

    } catch (error) {
        console.error('Koneksi dibatalkan atau gagal:', error);
        updateStatus('Gagal terhubung', 'disconnected');
    }
});

// --- 2. Fungsi Membaca dan Memilah Data ---
async function readSensorData() {
    if (!dataCharacteristic) return;

    try {
        const value = await dataCharacteristic.readValue();
        const decoder = new TextDecoder('utf-8');
        const rawData = decoder.decode(value);
        
        console.log('Data Masuk:', rawData);

        // Eksekusi Parsing CSV
        const parsed = rawData.split(',');
        if (parsed.length >= 4) {
            document.getElementById('valNama').innerText = parsed[0];
            document.getElementById('valId').innerText = parsed[1];
            document.getElementById('valLat').innerText = parsed[2];
            document.getElementById('valLon').innerText = parsed[3];
            
            // Update timestamp agar user tahu web tidak freeze
            const now = new Date();
            document.getElementById('valTime').innerText = `Terakhir update: ${now.toLocaleTimeString()}`;
        }
    } catch (error) {
        console.error('Gagal membaca karakteristik:', error);
    }
}

// --- 3. Fungsi Disconnect Manual ---
disconnectBtn.addEventListener('click', () => {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
        bluetoothDevice.gatt.disconnect();
    }
});

// --- 4. Event: Penanganan Jika Terputus ---
function onDisconnected() {
    console.log('Device terputus.');
    
    // Hentikan interval 5 detik agar browser tidak error mencari data
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }

    updateStatus('Terputus (Out of Range)', 'disconnected');
    connectBtn.style.display = 'block';
    disconnectBtn.style.display = 'none';
    dataCharacteristic = null;
}

// --- Fungsi Utility UI ---
function updateStatus(text, className) {
    statusBadge.innerText = `Status: ${text}`;
    statusBadge.className = `status ${className}`;
}

let deferredPrompt;
const installBtn = document.getElementById('installBtn');

// 1. Dengerin sinyal dari browser kalau web ini "Bisa Di-install"
window.addEventListener('beforeinstallprompt', (e) => {
    // Cegah browser memunculkan pop-up otomatis bawaan
    e.preventDefault();
    // Simpan event-nya ke variabel
    deferredPrompt = e;
    // Munculkan tombol install buatan kita
    installBtn.style.display = 'block';
});

// 2. Logika ketika tombol buatan kita diklik
installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        // Munculkan pop-up instalasi asli browser
        deferredPrompt.prompt();
        
        // Tunggu jawaban user (Install atau Cancel)
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        
        // Bersihkan variabel, karena prompt hanya bisa dipakai sekali
        deferredPrompt = null;
        // Sembunyikan kembali tombolnya
        installBtn.style.display = 'none';
    }
});

// 3. Sembunyikan tombol jika aplikasi sudah ter-install
window.addEventListener('appinstalled', () => {
    console.log('Aplikasi berhasil di-install!');
    installBtn.style.display = 'none';
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service Worker terdaftar!'))
    .catch(err => console.log('Service Worker gagal:', err));
}
