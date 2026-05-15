if ('serviceWorker' in navigator) {
  // Gunakan 'service-worker.js' atau './service-worker.js'
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service Worker terdaftar!'))
    .catch(err => console.log('Service Worker gagal:', err));
}

// UUID disesuaikan dengan program C++ ESP32 (menggunakan format hex standar BLE)
const SERVICE_UUID = 0x180A; 
const CHAR_NAME_UUID = 0x2A29;
const CHAR_ID_UUID = 0x2A25;
const CHAR_LAT_UUID = 0x2A27; // Tambahan untuk Latitude
const CHAR_LNG_UUID = 0x2A28;

let bluetoothDevice = null;
let nameCharacteristic = null;
let idCharacteristic = null;
let latCharacteristic = null;
let lngCharacteristic = null;
let pollInterval = null;
let deferredPrompt;

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const statusBadge = document.getElementById('statusBadge');
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('Aplikasi berhasil diinstal');
            installBtn.style.display = 'none';
        }
        deferredPrompt = null;
    }
});

connectBtn.addEventListener('click', async () => {
    try {
        // Filter nama ditambahkan sesuai dengan awalan nama di ESP32
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: [SERVICE_UUID] }]
        });

        bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);
        updateStatus('Menghubungkan...', 'disconnected');

        const server = await bluetoothDevice.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        
        // Ambil kedua karakteristik secara terpisah
        nameCharacteristic = await service.getCharacteristic(CHAR_NAME_UUID);
        idCharacteristic = await service.getCharacteristic(CHAR_ID_UUID);
        latCharacteristic = await service.getCharacteristic(CHAR_LAT_UUID); // Ambil Lat
        lngCharacteristic = await service.getCharacteristic(CHAR_LNG_UUID); // Ambil Lng

        updateStatus('Terhubung - Membaca Data', 'connected');
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'block';

        await readSensorData();
        pollInterval = setInterval(readSensorData, 5000);

    } catch (error) {
        console.error('Koneksi gagal:', error);
        updateStatus('Gagal terhubung', 'disconnected');
    }
});

async function readSensorData() {
    if (!nameCharacteristic || !idCharacteristic || !latCharacteristic || !lngCharacteristic) return;

    try {
        const decoder = new TextDecoder('utf-8');

        // Baca Karakteristik Nama
        const nameValue = await nameCharacteristic.readValue();
        const nama = decoder.decode(nameValue);

        // Baca Karakteristik ID
        const idValue = await idCharacteristic.readValue();
        const id = decoder.decode(idValue);

        const latValue = await latCharacteristic.readValue();
        const latitude = decoder.decode(latValue);

        const lngValue = await lngCharacteristic.readValue();
        const longitude = decoder.decode(lngValue);

        console.log(`Update Data -> Nama: ${nama}, ID: ${id}`);

        // Tampilkan ke antarmuka HTML
        document.getElementById('valNama').innerText = nama;
        document.getElementById('valId').innerText = id;
        document.getElementById('valLat').innerText = latitude;
        document.getElementById('valLon').innerText = longitude;

        const mapsLink = document.getElementById('mapsLink');
        if (latitude && longitude && latitude !== "0.00000000") {
        mapsLink.href = `https://maps.google.com/?q=${latitude},${longitude}`;            mapsLink.style.display = 'inline';
        } else {
            mapsLink.style.display = 'none';
        }

        const now = new Date();
        document.getElementById('valTime').innerText = `Terakhir update: ${now.toLocaleTimeString()}`;

    } catch (error) {
        console.error('Gagal membaca karakteristik:', error);
    }
}

// --- 3. Disconnect Manual ---
disconnectBtn.addEventListener('click', () => {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
        bluetoothDevice.gatt.disconnect();
    }
});

// --- 4. Penanganan Terputus ---
function onDisconnected() {
    console.log('Device terputus.');
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
    updateStatus('Terputus (Out of Range)', 'disconnected');
    connectBtn.style.display = 'block';
    disconnectBtn.style.display = 'none';
    nameCharacteristic = null;
    idCharacteristic = null;
    latCharacteristic = null;
    lngCharacteristic = null;
}

function updateStatus(text, className) {
    statusBadge.innerText = `Status: ${text}`;
    statusBadge.className = `status ${className}`;
}
