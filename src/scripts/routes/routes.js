
import HomePage from '../pages/home/home-page';
import AboutPage from '../pages/about/about-page';
import LoginPage from '../pages/auth/login-page';
import RegisterPage from '../pages/auth/register-page';
import AddStoryPage from '../pages/add-story/add-story-page';
import AddStoryAuthPage from '../pages/add-story/add-story-auth-page';

const routes = {
  '/': new HomePage(),
  '/about': new AboutPage(),
  '/login': new LoginPage(),
  '/register': new RegisterPage(),
  '/stories': new AddStoryAuthPage(),
  '/stories/guest': new AddStoryPage(),
  '/stories/:id': new AddStoryPage(),
};

export default routes;
