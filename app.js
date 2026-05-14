// UUID disesuaikan dengan program C++ ESP32 (menggunakan format hex standar BLE)
const SERVICE_UUID = 0x180A; 
const CHAR_NAME_UUID = 0x2A29;
const CHAR_ID_UUID = 0x2A25;

let bluetoothDevice = null;
let nameCharacteristic = null;
let idCharacteristic = null;
let pollInterval = null;

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const statusBadge = document.getElementById('statusBadge');

// --- 1. Fungsi Utama: Menghubungkan BLE ---
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

// --- 2. Fungsi Membaca Data Terpisah ---
async function readSensorData() {
    if (!nameCharacteristic || !idCharacteristic) return;

    try {
        const decoder = new TextDecoder('utf-8');

        // Baca Karakteristik Nama
        const nameValue = await nameCharacteristic.readValue();
        const nama = decoder.decode(nameValue);

        // Baca Karakteristik ID
        const idValue = await idCharacteristic.readValue();
        const id = decoder.decode(idValue);

        console.log(`Update Data -> Nama: ${nama}, ID: ${id}`);

        // Tampilkan ke antarmuka HTML
        document.getElementById('valNama').innerText = nama;
        document.getElementById('valId').innerText = id;
        document.getElementById('valLat').innerText = "Menunggu modul GPS...";
        document.getElementById('valLon').innerText = "Menunggu modul GPS...";
        
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
}

function updateStatus(text, className) {
    statusBadge.innerText = `Status: ${text}`;
    statusBadge.className = `status ${className}`;
}
