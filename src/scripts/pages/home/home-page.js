import { getAllStories } from '../../data/api';
import { initPushToggle } from '../../data/push';

function storyCard(story) {
  const date = new Date(story.createdAt).toLocaleString();
  const lat = story.lat;
  const lon = story.lon;
  return `
    <article class="story-card">
      <img src="${story.photoUrl}" alt="photo-${story.id}" class="story-photo" />
      <div class="story-body">
        <h3 class="story-name">${story.name}</h3>
        <time class="story-time">${date}</time>
        <p class="story-desc">${story.description}</p>
        <div class="story-actions">
          <button class="btn view" data-id="${story.id}">Lihat selengkapnya</button>
          ${ lat != null && lon != null
              ? `<button class="btn track-location" data-lat="${lat}" data-lon="${lon}">Lihat Lokasi</button>`
              : ''
          }
        </div>
      </div>
    </article>
  `;
}

export default class HomePage {
  async render() {
    return `
      <section class="container">
        <div class="home-header">
          <h1>Peta Cerita</h1>
          <div class="home-actions">
            <a href="#/stories" class="btn primary" style="text-decoration: none;">Tambah Cerita</a>
            <!-- Push toggle placed next to Add Story on Home page -->
            <button id="push-toggle" class="push-toggle" style="display:none;">Subscribe</button>
          </div>
        </div>
        <div id="map-root" style="position: relative;">
          <div id="home-map"></div>
        </div>
        <div class="filter-controls" id="filter-wrapper">
          <label>
            <input type="checkbox" id="filter-location" />
            Tampilkan cerita yang hanya memiliki lokasi
          </label>
        </div>
        <div id="stories-root">
          <p id="stories-loading">Memuat Cerita...</p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const root = document.querySelector('#stories-root');
    const loadingEl = document.querySelector('#stories-loading');
    const mapRoot = document.querySelector('#map-root');
    const mapEl = document.querySelector('#home-map');
    const filterWrapper = document.querySelector('#filter-wrapper');
    const filterCheckbox = document.querySelector('#filter-location');
    let map;
    let markers = [];
    let allStories = [];

    const token = localStorage.getItem('token');
    if (!token) {
      if (loadingEl) loadingEl.remove();
      if (filterWrapper) filterWrapper.style.display = 'none';

      if (mapRoot) {
        mapRoot.innerHTML = `
          <div id="home-map" style="filter: blur(2px);"></div>
          <div class="login-overlay">
            <div class="login-message">
              <p>Anda harus login untuk melihat cerita pengguna lain.</p>
              <a href="#/login" class="btn login-btn">Login</a>
            </div>
          </div>
        `;
      }

      return;
    }

    try {
      const res = await getAllStories({ page: 1, size: 40, location: 0 });
      if (loadingEl) loadingEl.remove();

      if (res && res.listStory && res.listStory.length) {
        allStories = res.listStory;

        if (mapEl) {
          try {
            if (!window.L) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
              document.head.appendChild(link);

              const script = document.createElement('script');
              script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
              document.body.appendChild(script);
              await new Promise((resolve) => (script.onload = resolve));
            }

            map = L.map(mapEl, { scrollWheelZoom: true }).setView([0, 0], 2);

            const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; OpenStreetMap contributors',
            });

            const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
              maxZoom: 19,
              attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            });

            const baseMaps = {
              "Street": openStreetMap,
              "Satellite": satelliteMap,
            };

            openStreetMap.addTo(map);
            L.control.layers(baseMaps).addTo(map);

          } catch (mapErr) {
            console.error('Map init error', mapErr);
          }
        }

        const renderStories = (filterLocationOnly = false) => {
          let storiesToShow = allStories;
          if (filterLocationOnly) {
            storiesToShow = allStories.filter(
              (s) =>
                s.lat != null &&
                s.lon != null &&
                !Number.isNaN(Number(s.lat)) &&
                !Number.isNaN(Number(s.lon))
            );
          }

          markers.forEach((m) => map.removeLayer(m));
          markers = [];

          const listHtml = storiesToShow.map((s) => storyCard(s)).join('');
          root.innerHTML = `<div class="stories-list">${listHtml}</div>`;

          if (map && window.L) {
            storiesToShow.forEach((s) => {
              const lat = s.lat;
              const lon = s.lon;
              if ( lat != null && lon != null ) {
                const m = L.marker([Number(lat), Number(lon)])
                  .addTo(map)
                  .bindPopup(
                    `<strong>${s.name}</strong><br/>${new Date(
                      s.createdAt
                    ).toLocaleString()}`
                  );
                markers.push(m);
              }
            });

            if (markers.length) {
              const group = L.featureGroup(markers);
              map.fitBounds(group.getBounds().pad(0.2));
            } else {
              map.setView([0, 0], 2);
            }
          }
        };

        renderStories();
        filterCheckbox.addEventListener('change', (e) => {
          renderStories(e.target.checked);
        });

        const showStoryModal = (story) => {
          const modalId = 'story-detail-modal';
          const oldModal = document.getElementById(modalId);
          if (oldModal) oldModal.remove();

          const modal = document.createElement('div');
          modal.id = modalId;
          modal.className = 'story-modal-overlay';
          modal.innerHTML = `
            <div class="story-modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
              <img src="${story.photoUrl}" alt="photo-${story.id}" class="story-modal-photo" />
              <div class="story-modal-body">
                <h3 id="modal-title">${story.name}</h3>
                <div class="story-modal-scrollable-content">
                  <time>${new Date(story.createdAt).toLocaleString()}</time>
                  <p>${story.description}</p>
                </div>
                <div class="story-modal-footer">
                  <button class="btn close-modal-btn">Tutup</button>
                </div>
              </div>
            </div>
          `;

          document.body.appendChild(modal);

          const closeButton = modal.querySelector('.close-modal-btn');
          const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
          const focusableContent = modal.querySelectorAll(focusableElements);
          const firstFocusableElement = focusableContent[0];
          const lastFocusableElement = focusableContent[focusableContent.length - 1];

          const closeModal = () => {
            modal.remove();
            document.removeEventListener('keydown', keydownHandler);
          };

          const keydownHandler = (e) => {
            if (e.key === 'Escape') {
              closeModal();
            } else if (e.key === 'Tab') {
              if (e.shiftKey && document.activeElement === firstFocusableElement) {
                lastFocusableElement.focus();
                e.preventDefault();
              } else if (!e.shiftKey && document.activeElement === lastFocusableElement) {
                firstFocusableElement.focus();
                e.preventDefault();
              }
            }
          };

          document.addEventListener('keydown', keydownHandler);
          closeButton.addEventListener('click', closeModal);
          modal.addEventListener('click', (e) => {
            if (e.target === modal) {
              closeModal();
            }
          });

          // Set initial focus to the modal content or the close button
          closeButton.focus();
        };

        root.addEventListener('click', (event) => {
          if (event.target.classList.contains('view')) {
            const storyId = event.target.dataset.id;
            const story = allStories.find((s) => s.id === storyId);
            if (story) {
              showStoryModal(story);
            }
            return;
          }

          if (event.target.classList.contains('track-location')) {
            const button = event.target;
            const lat = parseFloat(button.dataset.lat);
            const lon = parseFloat(button.dataset.lon);

            if (map && !Number.isNaN(lat) && !Number.isNaN(lon)) {
              map.setView([lat, lon], 15);
              const marker = markers.find((m) => {
                const markerLatLng = m.getLatLng();
                return markerLatLng.lat === lat && markerLatLng.lng === lon;
              });
              if (marker) marker.openPopup();

              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }
        });
      } else {
        root.innerHTML = '<p>Cerita tidak ditemukan.</p>';
      }
    } catch (err) {
      if (loadingEl) loadingEl.remove();
      root.innerHTML = `<p class="error">Gagal memuat cerita</p>`;
      console.error('Error', err);
    }

    // Ensure push toggle is initialized for the Home page (button exists in this page)
    try {
      await initPushToggle('push-toggle');
    } catch (e) {
      // ignore push init errors
    }
  }
}
