import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #navList = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.#navList = this.#navigationDrawer.querySelector('#nav-list');

    this._setupDrawer();
    this._updateNavLinks();
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#navigationDrawer.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      if (!this.#navigationDrawer.contains(event.target) && !this.#drawerButton.contains(event.target)) {
        this.#navigationDrawer.classList.remove('open');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
        }
      })
    });
  }

  _updateNavLinks() {
    if (!this.#navList) return;

    const token = localStorage.getItem('token');
    const hasLogin = !!this.#navList.querySelector('a[href="#/login"]');
    const hasRegister = !!this.#navList.querySelector('a[href="#/register"]');
    const hasLogout = !!this.#navList.querySelector('#logout-link');

    if (token) {
      if (!hasLogout) {
        this.#navList.querySelectorAll('a[href="#/login"], a[href="#/register"]').forEach((a) => {
          if (a && a.parentElement) a.parentElement.remove();
        });

        const li = document.createElement('li');
        li.innerHTML = '<a href="#" id="logout-link">Logout</a>';
        this.#navList.appendChild(li);

        const logoutLink = this.#navList.querySelector('#logout-link');
        if (logoutLink) {
          logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('userName');
            this._updateNavLinks();
            // Notify other modules (push) that auth state changed
            document.dispatchEvent(new Event('authchange'));
            window.location.hash = '#/';
          });
        }
      }
    } else {
      if (hasLogout) {
        const logoutEl = this.#navList.querySelector('#logout-link');
        if (logoutEl && logoutEl.parentElement) logoutEl.parentElement.remove();
      }

      if (!hasLogin) {
        const li = document.createElement('li');
        li.innerHTML = '<a href="#/login">Login</a>';
        this.#navList.appendChild(li);
      }
    }
  }

  async renderPage() {
    const url = getActiveRoute();
    const page = routes[url];

    this.#content.innerHTML = await page.render();
    await page.afterRender();
    this._updateNavLinks();
  }
}

export default App;
