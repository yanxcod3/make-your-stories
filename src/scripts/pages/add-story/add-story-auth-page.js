import { postStory } from '../../data/api';

export default class AddStoryAuthPage {
  async render() {
    return `
      <section class="container">
        <h1>Tambah Cerita</h1>
        <form id="add-story-form" class="add-story-form">
          <div class="form-group">
            <label for="description">Deskripsi</label>
            <textarea id="description" rows="4" required placeholder="Tulis ceritamu..."></textarea>
          </div>

          <div class="form-group">
            <label for="photo">Foto (maks 1MB)</label>
            <input type="file" id="photo" accept="image/*" required />
            <div style="margin-top: 8px;">
              <button type="button" id="camera-btn" class="btn">Gunakan Kamera</button>
            </div>
            <div id="camera-wrapper" class="camera-wrapper"></div>
            <small id="photo-info" class="muted"></small>
          </div>

          <div class="form-group">
            <label>Lokasi (opsional)</label>
            <div id="map" style="height: 320px; margin-bottom: 8px;"></div>
            <div class="coord-row">
              <input type="number" id="lat" step="any" placeholder="-7.3161658" />
              <input type="number" id="lon" step="any" placeholder="112.7255577" />
            </div>
            <small class="muted">Klik pada peta atau seret marker untuk memilih lokasi.</small>
          </div>

          <div class="form-actions" style="display:flex; align-items:center; gap:12px; justify-content:flex-end;">
            <button type="submit" class="btn primary">Kirim</button>
          </div>
        </form>
      </section>
    `;
  }

  async afterRender() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.hash = '#/stories/guest';
      return;
    }

    const form = document.getElementById('add-story-form');
    const photoInput = document.getElementById('photo');
    const photoInfo = document.getElementById('photo-info');
    const cameraBtn = document.getElementById('camera-btn');
    const cameraWrapper = document.getElementById('camera-wrapper');
    let stream = null;
    let videoEl = null;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraBtn.style.display = 'none';
      photoInfo.textContent = 'Fitur kamera tidak didukung di browser ini.';
    }

    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      if (!file) {
        photoInfo.textContent = '';
        return;
      }

      if (!file.type.startsWith('image/')) {
        photoInfo.textContent = 'File harus berupa gambar.';
        photoInput.value = '';
        return;
      }

      if (file.size > 1024 * 1024) {
        photoInfo.textContent = 'Ukuran file melebihi 1MB.';
        photoInput.value = '';
        return;
      }
    });

    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      cameraWrapper.classList.remove('active');
      cameraWrapper.innerHTML = '';
      videoEl = null;
    };

    cameraBtn.addEventListener('click', async () => {
      if (stream) {
        stopCamera();
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        cameraWrapper.classList.add('active');
        cameraWrapper.innerHTML = `
          <video id="camera-preview" class="camera-preview" autoplay playsinline></video>
          <div class="camera-controls">
            <button type="button" id="capture-btn" class="btn">Ambil Gambar</button>
            <button type="button" id="stop-camera-btn" class="btn">Tutup Kamera</button>
          </div>
        `;
        videoEl = document.getElementById('camera-preview');
        videoEl.srcObject = stream;

        document.getElementById('stop-camera-btn').addEventListener('click', stopCamera);

        document.getElementById('capture-btn').addEventListener('click', () => {
          const canvas = document.createElement('canvas');
          canvas.width = videoEl.videoWidth;
          canvas.height = videoEl.videoHeight;
          const context = canvas.getContext('2d');
          context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(capturedFile);
            photoInput.files = dataTransfer.files;
            photoInput.dispatchEvent(new Event('change'));

            stopCamera();
          }, 'image/jpeg');
        });
      } catch (err) {
        console.error("Error accessing camera:", err);
        let message = 'Gagal mengakses kamera. Pastikan Anda memberikan izin.';
        if (err.name === 'NotAllowedError') {
          message = 'Anda telah memblokir akses kamera. Mohon izinkan melalui pengaturan browser.';
        }
        alert(message);
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const description = document.getElementById('description').value.trim();
      const file = photoInput.files[0];
      const latVal = document.getElementById('lat').value;
      const lonVal = document.getElementById('lon').value;

      if (!description) {
        alert('Deskripsi diperlukan');
        return;
      }

      if (!file) {
        alert('Foto diperlukan');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Foto harus berupa gambar');
        return;
      }

      if (file.size > 1024 * 1024) {
        alert('Ukuran foto maksimal 1MB');
        return;
      }

      const formData = new FormData();
      formData.append('description', description);
      formData.append('photo', file);
      if (latVal) formData.append('lat', parseFloat(latVal));
      if (lonVal) formData.append('lon', parseFloat(lonVal));

      try {
        const res = await postStory(formData);
        if (!res.error) {
          alert(res.message);
          window.location.hash = '#/';
        } else {
          if (res.message && /token/i.test(res.message)) { // Cek jika error berhubungan dengan token
            localStorage.removeItem('token');
            window.location.hash = '#/stories/guest';
            return;
          }
          alert('Gagal mengirim cerita');
        }
      } catch (err) {
        console.error(err);
        alert('Error');
      }
    });

    function loadLeafletAssets() {
        return new Promise((resolve, reject) => {
            if (window.L) return resolve();

            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Error'));
            document.body.appendChild(script);
        });
    }

    try {
      await loadLeafletAssets();

      const defaultLat = parseFloat(document.getElementById('lat').placeholder);
      const defaultLon = parseFloat(document.getElementById('lon').placeholder);

      const map = L.map('map').setView([defaultLat, defaultLon], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([defaultLat, defaultLon], { draggable: true }).addTo(map);

      function updateInputsFromMarker() {
        const pos = marker.getLatLng();
        document.getElementById('lat').value = pos.lat.toFixed(6);
        document.getElementById('lon').value = pos.lng.toFixed(6);
      }

      function updateMarkerFromInputs() {
        const latVal = parseFloat(document.getElementById('lat').value);
        const lonVal = parseFloat(document.getElementById('lon').value);
        if (!Number.isNaN(latVal) && !Number.isNaN(lonVal)) {
          marker.setLatLng([latVal, lonVal]);
          map.setView([latVal, lonVal]);
        }
      }

      marker.on('dragend', updateInputsFromMarker);
      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        updateInputsFromMarker();
      });

      document.getElementById('lat').addEventListener('change', updateMarkerFromInputs);
      document.getElementById('lon').addEventListener('change', updateMarkerFromInputs);

      updateInputsFromMarker();
      setTimeout(() => map.invalidateSize(), 300);
    } catch (err) {
      console.error('Error', err);
    }
  }
}
