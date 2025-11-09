import { register } from '../../data/api';

export default class RegisterPage {
  async render() {
    return `
      <section class="container">
        <h1 style="text-align:center;">Register</h1>
        <form id="register-form" class="auth-form">
          <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" required placeholder="Nama kamu" />
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" required placeholder="user@example.com" />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" minlength="8" required placeholder="Minimal 8 karakter" />
          </div>

          <div class="form-actions">
            <button type="submit" class="btn primary">Register</button>
          </div>
        </form>
        <p>Sudah memiliki akun? <a href="#/login">Login</a></p>
      </section>
    `;
  }

  async afterRender() {
    const form = document.getElementById('register-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (password.length < 8) {
        alert('Password harus lebih dari 8 karakter');
        return;
      }

      try {
        const result = await register({ name, email, password });
        if (!result.error) {
          alert('User berhasil dibuat');
          window.location.hash = '#/login';
        } else {
          alert('Registrasi gagal');
        }
      } catch (err) {
        console.error(err);
        alert('Error');
      }
    });
  }
}
