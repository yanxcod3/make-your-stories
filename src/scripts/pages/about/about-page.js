export default class AboutPage {
  async render() {
    return `
      <section class="container">
        <h1>About "Make Your Stories"</h1>
        <p>
          Selamat datang di <strong>Make Your Stories</strong>, sebuah platform di mana setiap perjalanan, setiap momen, dan setiap pengalaman dapat dibagikan. Kami percaya bahwa setiap orang memiliki cerita untuk diceritakan, dan platform kami dirancang untuk membantu Anda membagikannya kepada dunia.
          <br><br>
          Projek ini dirancang untuk menyelesaikan modul Proyek Pertama pada kelas Belajar Pengembangan Web Intermediate.
        </p>
      </section>
    `;
  }

  async afterRender() {
    // Do your job here
  }
}
