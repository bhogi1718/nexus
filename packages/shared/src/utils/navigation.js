/**
 * Navigation Adapter Interface
 *
 * Different platforms handle navigation differently:
 * - Web: window.location.href
 * - React Navigation: navigation.navigate('Login')
 * - React Router: router.navigate('/login')
 *
 * This abstraction allows shared code to handle redirects everywhere.
 */

/**
 * @typedef {Object} NavigationAdapter
 * @property {Function} redirectToLogin(): void
 * @property {Function} redirect(path: string): void
 */

/**
 * Web Navigation Adapter (window.location)
 * Used by browser-based frontends
 */
export const createWebNavigationAdapter = () => ({
  redirectToLogin() {
    window.location.href = '/login';
  },
  redirect(path) {
    window.location.href = path;
  }
});

/**
 * React Navigation Adapter
 * Used by React Native mobile app
 *
 * Usage:
 * import { useNavigation } from '@react-navigation/native';
 * const navigation = useNavigation();
 * const adapter = createReactNavigationAdapter(navigation);
 */
export const createReactNavigationAdapter = (navigation) => ({
  redirectToLogin() {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }]
    });
  },
  redirect(path) {
    // Convert web paths to screen names
    const screenName = path.replace('/', '').charAt(0).toUpperCase() + path.slice(2);
    navigation.navigate(screenName);
  }
});

/**
 * React Router Adapter
 * Used by desktop/mobile web that use React Router
 *
 * Usage:
 * const router = useNavigate(); // or useRouter()
 * const adapter = createReactRouterAdapter(router);
 */
export const createReactRouterAdapter = (router) => ({
  redirectToLogin() {
    router('/login');
  },
  redirect(path) {
    router(path);
  }
});

/**
 * Callback-based Navigation Adapter
 * Most flexible - apps provide their own redirect function
 *
 * Usage:
 * const adapter = createCallbackNavigationAdapter({
 *   onRedirectToLogin: () => { /* your code */ },
 *   onRedirect: (path) => { /* your code */ }
 * });
 */
export const createCallbackNavigationAdapter = (callbacks) => ({
  redirectToLogin() {
    callbacks?.onRedirectToLogin?.();
  },
  redirect(path) {
    callbacks?.onRedirect?.(path);
  }
});

// Export web adapter as default for browser usage
export default createWebNavigationAdapter();
