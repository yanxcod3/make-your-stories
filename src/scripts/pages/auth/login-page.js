import { login } from '../../data/api';

export default class LoginPage {
  async render() {
    return `
      <section class="container">
        <h1 style="text-align:center;">Login</h1>
        <form id="login-form" class="auth-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" required placeholder="user@example.com" />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" required placeholder="Password kamu" />
          </div>

          <div class="form-actions">
            <button type="submit" class="btn primary">Login</button>
          </div>
        </form>
        <p>Belum memiliki akun? <a href="#/register">Register</a></p>
      </section>
    `;
  }

  async afterRender() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      try {
        const result = await login({ email, password });
        if (!result.error && result.loginResult && result.loginResult.token) {
          localStorage.setItem('token', result.loginResult.token);
          localStorage.setItem('userId', result.loginResult.userId);
          localStorage.setItem('userName', result.loginResult.name);
          alert('Login berhasil');
            // Notify other modules that auth state changed (push module will refresh UI)
            document.dispatchEvent(new Event('authchange'));
          window.location.hash = '#/';
        } else {
          alert('Login gagal');
        }
      } catch (err) {
        console.error(err);
        alert('Error');
      }
    });
  }
}
